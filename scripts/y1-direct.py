#!/usr/bin/env python3
"""
Year 1 Drive -> OmpathStudy DIRECT DOWNLOAD publisher.

No text recognition, no document parsing. For every file in the Year 1 Drive folder:
  1. download the real file from Drive
  2. store it in Ompath's own file storage (study-resources bucket)
  3. publish a clean resource page with a tidy title and a direct download link

Modes:
  scan         -> refresh /tmp/y1/manifest.json + print the library summary
  run [limit]  -> publish (default). Idempotent: skips Drive IDs already published.
"""
import hashlib
import json
import os
import re
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor

import requests

GW = "https://connector-gateway.lovable.dev/google_drive"
DRIVE_HDRS = {
    "Authorization": "Bearer " + os.environ["LOVABLE_API_KEY"],
    "X-Connection-Api-Key": os.environ["GOOGLE_DRIVE_API_KEY"],
}

BASE = os.environ["EXT_SUPABASE_URL"].rstrip("/")
if BASE.endswith("/rest/v1"):
    BASE = BASE[: -len("/rest/v1")]
KEY = os.environ["EXT_SUPABASE_SERVICE_ROLE_KEY"]
SB_HDRS = {"apikey": KEY, "Authorization": "Bearer " + KEY}

ROOT_FOLDER = "1WlGy6RNS6ICDqik8DzJ9T5avvjjRE9Ng"
PUB_PREFIX = BASE + "/storage/v1/object/public/study-resources/"
MAX_UPLOAD = 250 * 1024 * 1024
WORKERS = 6

WORK = "/tmp/y1"
os.makedirs(WORK, exist_ok=True)
LOG = os.path.join(WORK, "direct.log")
_lock = threading.Lock()


def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    with _lock:
        print(line, flush=True)
        with open(LOG, "a") as fh:
            fh.write(line + "\n")


# ---------------------------------------------------------------- drive ------
def drive_get(path, params=None, stream=False, tries=4):
    for attempt in range(tries):
        try:
            r = requests.get(GW + path, headers=DRIVE_HDRS, params=params,
                             stream=stream, timeout=300)
        except requests.RequestException as exc:
            if attempt == tries - 1:
                raise
            log("retry drive (%s)" % exc)
            time.sleep(2 + attempt * 3)
            continue
        if r.status_code in (403, 429, 500, 502, 503):
            if attempt == tries - 1:
                r.raise_for_status()
            time.sleep(3 + attempt * 4)
            continue
        r.raise_for_status()
        return r
    raise RuntimeError("unreachable")


def list_children(folder_id):
    out, token = [], None
    while True:
        params = {
            "q": "'%s' in parents and trashed=false" % folder_id,
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
            "pageSize": "1000",
            "fields": "nextPageToken,files(id,name,mimeType,size,modifiedTime)",
            "orderBy": "name",
        }
        if token:
            params["pageToken"] = token
        data = drive_get("/drive/v3/files", params).json()
        out.extend(data.get("files", []))
        token = data.get("nextPageToken")
        if not token:
            return out


def walk():
    records, queue = [], [(ROOT_FOLDER, [])]
    while queue:
        fid, trail = queue.pop(0)
        for item in list_children(fid):
            if item["mimeType"] == "application/vnd.google-apps.folder":
                queue.append((item["id"], trail + [item["name"]]))
            else:
                records.append({
                    "id": item["id"],
                    "name": item["name"],
                    "mime": item["mimeType"],
                    "size": int(item.get("size") or 0),
                    "trail": trail,
                })
    return records


# ------------------------------------------------------------- classify -----
DISCIPLINE_PRIORITY = [
    (r"\bneuroanatomy\b", "Neuroanatomy"),
    (r"\bhistolog", "Histology"),
    (r"\bembryolog", "Embryology"),
    (r"\bgross anatomy\b", "Gross Anatomy"),
    (r"\banatomy\b", "Anatomy"),
    (r"\bphysiolog", "Physiology"),
    (r"\bbiochem", "Biochemistry"),
    (r"\boral biolog", "Oral Biology"),
    (r"\bbehaviou?ral", "Behavioural Sciences"),
    (r"\bict\b|\bcomputer", "ICT"),
]

FILENAME_TYPES = [
    ("MCQs & Question Banks", r"\bmcq|multiple\s*choice|question\s*bank|\bq\.?bank"),
    ("Essays & SAQs", r"\bsaqs?\b|\blaqs?\b|essay|short\s*answer|long\s*answer"),
    ("CATs & Tests", r"\bcats?\s*[1-3]?\b|continuous\s*assessment|weekly\s*review\s*test|\bquiz\b|\bmidterm\b|\btest\b"),
    ("Past Papers", r"past\s*paper|previous\s*(year\s*)?paper|marking\s*scheme|\bpaper\s*[123]\b"
                    r"|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(19|20)\d{2}\b"),
    ("Practical & Spotters", r"\bpat\b|\bspots?\b|practical|viva|\bosce\b"),
    ("Revision", r"revis|summary|checklist|high\s*yield|marathon|key\s*points|\boutline\b"),
]

TRAIL_TYPES = [
    (r"\bspots?\b|\bpat\b|practical\s*session|lab\s*manual|exercise", "Practical & Spotters"),
    (r"weekly\s*review\s*test", "CATs & Tests"),
    (r"\bquestions?\b", "MCQs & Question Banks"),
    (r"\bnotes?\b", "Notes"),
    (r"\btextbooks?\b|\bbooks?\b", "Books & Reference"),
    (r"summary\s*of\s*modules", "Revision"),
    (r"\bmodules?\b|\bslides?\b|lecture", "Lecture Materials"),
]

VIDEO_EXT = (".mp4", ".mkv", ".mov", ".avi", ".webm")


def unit_of(rec):
    hay = (" / ".join(rec["trail"]) + " / " + rec["name"]).lower()
    for pattern, canonical in DISCIPLINE_PRIORITY:
        if re.search(pattern, hay):
            return canonical
    if rec["trail"]:
        return rec["trail"][0].strip()[:40] or "General"
    return "General"


def content_type_of(rec):
    low = rec["name"].lower()
    trail = " / ".join(rec["trail"]).lower()
    if low.endswith(VIDEO_EXT) or rec["mime"].startswith("video/"):
        return "Video Lectures"
    for label, pattern in FILENAME_TYPES:
        if re.search(pattern, low):
            return label
    for pattern, label in TRAIL_TYPES:
        if re.search(pattern, trail):
            return label
    if low.endswith((".pptx", ".ppt")):
        return "Lecture Materials"
    if low.endswith((".pdf", ".doc", ".docx")):
        return "Notes"
    return "Other Resources"


# ------------------------------------------------------------------ names ----
STOP_STEMS = {"desktop", "document", "doc", "scan", "scanned", "image", "img",
              "untitled", "new", "file", "copy", "final", "download", "photo",
              "picture", "screenshot", "whatsapp"}

SMALL = {"of", "and", "the", "in", "on", "for", "to", "a", "an", "with", "or"}
KEEP_UPPER = {"MCQ", "MCQS", "CAT", "CATS", "PAT", "SAQ", "SAQS", "LAQ", "LAQS",
              "ICT", "DNA", "RNA", "ATP", "CNS", "PNS", "GIT", "ECG", "BDS",
              "MBCHB", "OSCE", "TCA", "II", "III", "IV", "VI", "VII"}


def titlecase(text):
    words = []
    for i, raw in enumerate(text.split()):
        bare = re.sub(r"[^A-Za-z]", "", raw).upper()
        if bare in KEEP_UPPER:
            words.append(raw.upper())
        elif raw.lower() in SMALL and i:
            words.append(raw.lower())
        elif raw.isupper() or raw.islower():
            words.append(raw[:1].upper() + raw[1:].lower())
        else:
            words.append(raw)
    return " ".join(words)


def clean_title(rec):
    name = rec["name"]
    stem = re.sub(r"\.[A-Za-z0-9]{1,5}$", "", name)
    stem = stem.replace("_", " ").replace("+", " ")
    stem = re.sub(r"-(?=[A-Za-z])", " ", stem) if stem.count("-") > 1 else stem
    stem = re.sub(r"^\s*(copy of|copy|final|finals|new|document)\s+", "", stem, flags=re.I)
    stem = re.sub(r"^\s*\d{1,3}[\.\)\-]\s*", "", stem)
    stem = re.sub(r"\b(1|2|\(\d+\))\s*$", "", stem)
    stem = re.sub(r"\s+", " ", stem).strip(" -·")

    bare = re.sub(r"[^a-z0-9]", "", stem.lower())
    unit = unit_of(rec)
    ctype = content_type_of(rec)
    if not bare or bare in STOP_STEMS or len(bare) < 4 or bare.isdigit():
        # Unhelpful file name: name it from where it lives in the library.
        trail = [t for t in rec["trail"] if t]
        context = trail[-1] if trail else unit
        stem = "%s — %s" % (titlecase(context), ctype)
        if stem.lower().startswith(unit.lower()):
            return stem[:120]
        return ("%s: %s" % (unit, stem))[:120]

    title = titlecase(stem)
    if unit.lower() not in title.lower():
        title = "%s — %s" % (unit, title)
    return title[:120]


# --------------------------------------------------------------- storage ----
def slugify(text):
    text = re.sub(r"&", " and ", text.lower())
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    return re.sub(r"[\s-]+", "-", text).strip("-")[:70]


def storage_key(rec):
    digest = hashlib.sha1(rec["id"].encode()).hexdigest()[:8]
    unit = slugify(unit_of(rec)) or "general"
    ext = os.path.splitext(rec["name"])[1][:8].lower()
    stem = slugify(re.sub(r"\.[A-Za-z0-9]{1,5}$", "", rec["name"]))[:60] or "file"
    return "year-1/%s/%s-%s%s" % (unit, digest, stem, ext)


def upload(local_path, key, content_type):
    with open(local_path, "rb") as fh:
        r = requests.post(
            BASE + "/storage/v1/object/study-resources/" + key,
            headers=dict(SB_HDRS, **{"Content-Type": content_type or "application/octet-stream",
                                     "x-upsert": "true"}),
            data=fh, timeout=900,
        )
    if r.status_code >= 300:
        raise RuntimeError("storage %s: %s" % (r.status_code, r.text[:200]))
    return PUB_PREFIX + key


# --------------------------------------------------------------- publish ----
def human_size(size):
    if size >= 1024 ** 3:
        return "%.2f GB" % (size / 1024.0 ** 3)
    if size >= 1024 ** 2:
        return "%.1f MB" % (size / 1024.0 ** 2)
    return "%.0f KB" % max(1, size / 1024.0)


def build_body(rec, title, unit, ctype, url):
    ext = os.path.splitext(rec["name"])[1].lstrip(".").upper() or "FILE"
    lines = [
        "# " + title,
        "",
        "**Year 1 · %s · %s**" % (unit, ctype),
        "",
        "| Detail | Value |",
        "| --- | --- |",
        "| Year | Year 1 |",
        "| Unit | %s |" % unit,
        "| Resource type | %s |" % ctype,
        "| File format | %s |" % ext,
        "| File size | %s |" % human_size(rec["size"]),
        "| Original file name | %s |" % rec["name"],
    ]
    if rec["trail"]:
        lines.append("| Source collection | %s |" % " / ".join(rec["trail"]))
    lines += [
        "",
        "## Download",
        "",
        "[⬇ Download %s (%s · %s)](%s)" % (title, ext, human_size(rec["size"]), url),
        "",
        "The file is hosted on OmpathStudy and downloads straight to your device.",
    ]
    return "\n".join(lines)


def publish(rec, url):
    unit, ctype = unit_of(rec), content_type_of(rec)
    title = clean_title(rec)
    body = build_body(rec, title, unit, ctype, url)
    ext = os.path.splitext(rec["name"])[1].lstrip(".").upper() or "FILE"
    payload = {
        "title": title,
        "slug": "year-1-%s-%s" % (slugify(title), hashlib.sha1(rec["id"].encode()).hexdigest()[:6]),
        "content": body,
        "published": True,
        "category": "Year 1: %s" % unit,
        "unit": unit,
        "content_type": ctype,
        "content_kind": "notes",
        "tags": ["Year 1", unit, ctype, "Download"],
        "reading_time_minutes": 1,
        "toc_enabled": False,
        "meta_title": title[:70],
        "meta_description": ("Download %s — Year 1 %s %s (%s, %s) on OmpathStudy."
                             % (title, unit, ctype, ext, human_size(rec["size"])))[:158],
        "original_notes": "",
        "source_type": "google_drive_year1",
        "source_reference": rec["id"],
    }
    year = re.search(r"(19|20)\d{2}", rec["name"])
    if year:
        payload["exam_year"] = year.group(0)
    r = requests.post(
        BASE + "/rest/v1/articles",
        headers=dict(SB_HDRS, **{"Content-Type": "application/json", "Prefer": "return=minimal"}),
        data=json.dumps(payload), timeout=120,
    )
    if r.status_code >= 300:
        raise RuntimeError("article %s: %s" % (r.status_code, r.text[:300]))
    return title, unit, ctype


def existing_refs():
    refs, offset = set(), 0
    while True:
        r = requests.get(BASE + "/rest/v1/articles", headers=SB_HDRS, timeout=120,
                         params={"select": "source_reference",
                                 "source_type": "eq.google_drive_year1",
                                 "order": "source_reference.asc",
                                 "limit": 1000, "offset": offset})
        r.raise_for_status()
        rows = r.json()
        if not rows:
            return refs
        refs.update(row["source_reference"] for row in rows if row.get("source_reference"))
        offset += len(rows)


# ------------------------------------------------------------------ run -----
def manifest_records(refresh=False):
    path = os.path.join(WORK, "manifest.json")
    if not refresh and os.path.exists(path):
        return json.load(open(path))
    recs = walk()
    json.dump(recs, open(path, "w"))
    return recs


def handle(rec, index, total):
    local = os.path.join(WORK, "dl_" + rec["id"])
    try:
        with drive_get("/drive/v3/files/" + rec["id"],
                       {"alt": "media", "supportsAllDrives": "true"},
                       stream=True) as r, open(local, "wb") as fh:
            for chunk in r.iter_content(1 << 21):
                fh.write(chunk)
        url = upload(local, storage_key(rec), rec["mime"])
        title, unit, ctype = publish(rec, url)
        log("OK [%d/%d] %s -> %s / %s" % (index, total, title[:70], unit, ctype))
        return True
    except Exception as exc:
        log("FAIL [%d/%d] %s :: %s" % (index, total, rec["name"][:60], str(exc)[:180]))
        return False
    finally:
        if os.path.exists(local):
            os.remove(local)


def cmd_run(limit=None):
    recs = manifest_records()
    done = existing_refs()
    recs = [r for r in recs if r["id"] not in done and r["size"] <= MAX_UPLOAD]
    recs.sort(key=lambda r: (r["name"].lower().endswith(VIDEO_EXT), r["size"]))
    if limit:
        recs = recs[:limit]
    total = len(recs)
    log("already published=%d to publish=%d" % (len(done), total))
    ok = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(handle, rec, i, total) for i, rec in enumerate(recs, 1)]
        for fut in futures:
            if fut.result():
                ok += 1
    log("DONE ok=%d fail=%d" % (ok, total - ok))


def cmd_scan():
    recs = manifest_records(refresh=True)
    by_unit, by_type, size = {}, {}, 0
    for rec in recs:
        by_unit[unit_of(rec)] = by_unit.get(unit_of(rec), 0) + 1
        by_type[content_type_of(rec)] = by_type.get(content_type_of(rec), 0) + 1
        size += rec["size"]
    log("files=%d size=%.2f GB" % (len(recs), size / 1024.0 ** 3))
    for k, v in sorted(by_unit.items(), key=lambda kv: -kv[1]):
        log("  unit %-24s %d" % (k, v))
    for k, v in sorted(by_type.items(), key=lambda kv: -kv[1]):
        log("  type %-24s %d" % (k, v))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "run"
    if mode == "scan":
        cmd_scan()
    else:
        cmd_run(int(sys.argv[2]) if len(sys.argv) > 2 else None)
