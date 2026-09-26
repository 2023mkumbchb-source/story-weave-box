#!/usr/bin/env python3
"""
Year 1 Drive -> OmpathStudy ingestion.

For every file in the Year 1 Google Drive folder:
  1. download the real file from Drive
  2. store it in Ompath's own file storage (study-resources bucket) so the
     learner downloads from ompathstudy.com, never from Google Drive
  3. pull the readable text out of it (pdftotext, OCR, slide decks, docs, images)
  4. publish it as an Ompath study resource with a direct download link

Modes:
  scan  -> build /tmp/y1/manifest.json and print a summary, write nothing
  run   -> ingest (default). Idempotent: skips anything already imported.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time
import hashlib
import urllib.parse

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
OCR_MAX_PAGES = 40
MIN_TEXT = 400

WORK = "/tmp/y1"
os.makedirs(WORK, exist_ok=True)
LOG = os.path.join(WORK, "run.log")


def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    with open(LOG, "a") as fh:
        fh.write(line + "\n")


# ---------------------------------------------------------------- drive ------
def drive_get(path, params=None, stream=False, tries=4):
    for attempt in range(tries):
        try:
            r = requests.get(
                GW + path,
                headers=DRIVE_HDRS,
                params=params,
                stream=stream,
                timeout=180,
            )
        except requests.RequestException as exc:
            if attempt == tries - 1:
                raise
            log("retry drive %s (%s)" % (path, exc))
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
    """Depth-first listing with the folder trail for every file."""
    records = []
    stack = [(ROOT_FOLDER, [])]
    while stack:
        fid, trail = stack.pop(0)
        for item in list_children(fid):
            if item["mimeType"] == "application/vnd.google-apps.folder":
                stack.append((item["id"], trail + [item["name"]]))
            else:
                records.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "mime": item["mimeType"],
                        "size": int(item.get("size") or 0),
                        "trail": trail,
                    }
                )
    return records


# ------------------------------------------------------------- extract ------
def sh(cmd, timeout=600):
    return subprocess.run(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout
    )


def ocr_pdf(path):
    tmp = os.path.join(WORK, "ocr")
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp, exist_ok=True)
    sh(["pdftoppm", "-r", "130", "-png", "-f", "1", "-l", str(OCR_MAX_PAGES), path,
        os.path.join(tmp, "p")], timeout=600)
    chunks = []
    for page in sorted(os.listdir(tmp)):
        if not page.endswith(".png"):
            continue
        res = sh(["tesseract", os.path.join(tmp, page), "stdout", "-l", "eng"], timeout=300)
        chunks.append(res.stdout.decode("utf-8", "replace"))
    shutil.rmtree(tmp, ignore_errors=True)
    return "\n".join(chunks)


def pdf_text(path):
    res = sh(["pdftotext", "-layout", path, "-"], timeout=300)
    text = res.stdout.decode("utf-8", "replace")
    if len(text.strip()) < MIN_TEXT:
        ocr = ocr_pdf(path)
        if len(ocr.strip()) > len(text.strip()):
            text = ocr
    return text


def office_text(path, mime, name):
    low = name.lower()
    if low.endswith(".ppt") or low.endswith(".doc") or low.endswith(".xls"):
        conv = os.path.join(WORK, "conv")
        shutil.rmtree(conv, ignore_errors=True)
        os.makedirs(conv, exist_ok=True)
        sh(["soffice", "--headless", "--convert-to",
            "pptx" if low.endswith(".ppt") else "docx",
            "--outdir", conv, path], timeout=600)
        produced = [os.path.join(conv, f) for f in os.listdir(conv)] if os.path.isdir(conv) else []
        if produced:
            path = produced[0]
    try:
        from markitdown import MarkItDown

        md = MarkItDown()
        return md.convert(path).text_content or ""
    except Exception:
        pass
    try:
        from pptx import Presentation

        prs = Presentation(path)
        out = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if shape.has_text_frame:
                    out.append(shape.text_frame.text)
        return "\n\n".join(out)
    except Exception:
        return ""


def image_text(path):
    res = sh(["tesseract", path, "stdout", "-l", "eng"], timeout=300)
    return res.stdout.decode("utf-8", "replace")


def extract_text(path, mime, name):
    low = name.lower()
    if mime == "application/pdf" or low.endswith(".pdf"):
        return pdf_text(path)
    if mime.startswith("application/vnd.openxmlformats") or mime.startswith(
        "application/msword"
    ) or re.search(r"\.(pptx?|docx?|xlsx?)$", low):
        return office_text(path, mime, name)
    if mime.startswith("image/"):
        return image_text(path)
    if low.endswith((".txt", ".md")) or mime == "text/plain":
        try:
            with open(path, "r", errors="replace") as fh:
                return fh.read()
        except OSError:
            return ""
    return ""


# ------------------------------------------------------------- classify -----
CATEGORY_RULES = [
    ("Past Papers", r"past\s*paper|previous\s*paper|\bpapers?\b|\bmsc\b|marking\s*scheme"),
    ("CATs & Tests", r"\bcat\s*[1-3]?\b|\bcat\b|\btest\b|\bquiz\b|\bmidterm\b|\bexam\b"),
    ("MCQs & Question Banks", r"\bmcq|multiple\s*choice|question\s*bank|\bq\.?bank"),
    ("Practical & Spotters", r"spot|spotters?|practical|viva|osce|histolog|slide\s*review"),
    ("Revision", r"revis|summary|summary|high\s*yield|marathon|revision"),
    ("Lecture Materials", r"lecture|slides?|presentation|notes?\s*\d|week\s*\d"),
    ("Notes", r"note|handout|chapter|manual|guide|textbook"),
]

UNIT_ALIASES = {
    "anatomy": "Anatomy",
    "anat": "Anatomy",
    "physiology": "Physiology",
    "physio": "Physiology",
    "biochemistry": "Biochemistry",
    "biochem": "Biochemistry",
    "oral biology": "Oral Biology",
    "oral": "Oral Biology",
    "behavioural sciences": "Behavioural Sciences",
    "behavioral sciences": "Behavioural Sciences",
    "behavioural science": "Behavioural Sciences",
    "psychology": "Behavioural Sciences",
    "ict": "ICT",
    "computer": "ICT",
    "histology": "Histology",
    "embryology": "Embryology",
}


def unit_of(rec):
    joined = " / ".join(rec["trail"]).lower()
    for alias, canonical in UNIT_ALIASES.items():
        if alias in joined:
            return canonical
    if rec["trail"]:
        return rec["trail"][0].strip()[:40] or "General"
    return "General"


def content_type_of(rec):
    blob = (rec["name"] + " " + " ".join(rec["trail"])).lower()
    for label, pattern in CATEGORY_RULES:
        if re.search(pattern, blob):
            return label
    return "Other Resources"


# --------------------------------------------------------------- storage ----
def storage_key(rec, suffix):
    digest = hashlib.sha1(rec["id"].encode()).hexdigest()[:8]
    unit = re.sub(r"[^a-z0-9]+", "-", unit_of(rec).lower()).strip("-") or "general"
    stem = re.sub(r"\.[A-Za-z0-9]{1,5}$", "", rec["name"])
    stem = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")[:60] or "file"
    return "year-1/%s/%s-%s%s" % (unit, digest, stem, suffix)


def upload(local_path, key, content_type):
    with open(local_path, "rb") as fh:
        r = requests.post(
            BASE + "/storage/v1/object/study-resources/" + key,
            headers=dict(SB_HDRS, **{"Content-Type": content_type, "x-upsert": "true"}),
            data=fh,
            timeout=600,
        )
    if r.status_code >= 300:
        raise RuntimeError("storage %s: %s" % (r.status_code, r.text[:200]))
    return PUB_PREFIX + key


# --------------------------------------------------------------- publish ----
def slugify(text):
    text = re.sub(r"&", " and ", text.lower())
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    return re.sub(r"[\s-]+", "-", text).strip("-")[:70]


def existing_refs():
    refs, offset = set(), 0
    while True:
        r = requests.get(
            BASE + "/rest/v1/articles",
            params={
                "select": "source_reference",
                "source_type": "eq.google_drive_year1",
                "order": "source_reference.asc",
                "limit": 1000,
                "offset": offset,
            },
            headers=SB_HDRS,
            timeout=120,
        )
        r.raise_for_status()
        rows = r.json()
        if not rows:
            return refs
        refs.update(row["source_reference"] for row in rows if row.get("source_reference"))
        offset += len(rows)


def clean_title(name):
    title = re.sub(r"\.[A-Za-z0-9]{1,5}$", "", name).replace("_", " ").strip()
    title = re.sub(r"\s+", " ", title)
    title = re.sub(r"^(copy of|final|finals?|new)\s+", "", title, flags=re.I)
    return title[:110] or "Untitled Year 1 resource"


def build_body(rec, title, unit, ctype, url, text):
    size_mb = rec["size"] / 1024.0 / 1024.0
    lines = [
        "# " + title,
        "",
        "**Year 1 · %s · %s**" % (unit, ctype),
    ]
    if rec["trail"]:
        lines += ["", "*Source collection: %s*" % " / ".join(rec["trail"])]
    lines += [
        "",
        "## Download",
        "",
        "[Download this file from OmpathStudy](%s)" % url,
        "",
        "File type: %s · Size: %.2f MB" % (os.path.splitext(rec["name"])[1].lstrip(".").upper() or "FILE", size_mb),
        "",
    ]
    if len(text.strip()) >= MIN_TEXT:
        lines += ["## Content", "", text.strip()[:120000]]
    else:
        lines += [
            "## About this resource",
            "",
            "This item is a %s file held in the Year 1 %s collection. It has no readable "
            "text layer, so the original file is available above for offline study."
            % (os.path.splitext(rec["name"])[1].lstrip(".") or rec["mime"], unit),
        ]
    return "\n".join(lines)


def publish(rec, title, unit, ctype, url, text):
    body = build_body(rec, title, unit, ctype, url, text)
    words = len(re.findall(r"\w+", body))
    meta = "%s – Year 1 %s %s on OmpathStudy. %s" % (
        title[:70],
        unit,
        ctype,
        "Read the content and download the file directly." if len(text.strip()) >= MIN_TEXT
        else "Download the file directly from OmpathStudy.",
    )
    payload = {
        "title": title,
        "slug": "year-1-%s-%s-%s" % (slugify(unit), slugify(title), hashlib.sha1(rec["id"].encode()).hexdigest()[:6]),
        "content": body,
        "published": True,
        "category": "Year 1: %s" % unit,
        "unit": unit,
        "content_type": ctype,
        "content_kind": "notes",
        "tags": ["Year 1", unit, ctype],
        "reading_time_minutes": max(1, int(words / 200)),
        "toc_enabled": words > 800,
        "meta_title": title[:70],
        "meta_description": meta[:158],
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
        data=json.dumps(payload),
        timeout=120,
    )
    if r.status_code >= 300:
        raise RuntimeError("article %s: %s" % (r.status_code, r.text[:300]))
    return True


# ------------------------------------------------------------------ run -----
def cmd_scan():
    recs = walk()
    with open(os.path.join(WORK, "manifest.json"), "w") as fh:
        json.dump(recs, fh)
    by_unit, by_type, total = {}, {}, 0
    for rec in recs:
        by_unit[unit_of(rec)] = by_unit.get(unit_of(rec), 0) + 1
        by_type[content_type_of(rec)] = by_type.get(content_type_of(rec), 0) + 1
        total += rec["size"]
    log("files=%d size=%.2f GB" % (len(recs), total / 1024.0 ** 3))
    for k, v in sorted(by_unit.items(), key=lambda kv: -kv[1]):
        log("  unit %-26s %d" % (k, v))
    for k, v in sorted(by_type.items(), key=lambda kv: -kv[1]):
        log("  type %-26s %d" % (k, v))


def is_video(rec):
    return rec["mime"].startswith("video/") or rec["name"].lower().endswith(".mp4")


def cmd_run(limit=None):
    manifest = os.path.join(WORK, "manifest.json")
    if os.path.exists(manifest):
        recs = json.load(open(manifest))
    else:
        recs = walk()
        json.dump(recs, open(manifest, "w"))
    done = existing_refs()
    log("already imported: %d" % len(done))
    recs = [r for r in recs if r["id"] not in done]
    recs.sort(key=lambda r: (is_video(r), r["size"]))
    if limit:
        recs = recs[:limit]
    log("to import: %d" % len(recs))
    ok = fail = skip = 0
    for i, rec in enumerate(recs, 1):
        name, size = rec["name"], rec["size"]
        if size > MAX_UPLOAD:
            log("SKIP-LARGE %s (%.1f MB)" % (name, size / 1024.0 ** 2))
            skip += 1
            continue
        local = os.path.join(WORK, "dl_" + rec["id"])
        try:
            with drive_get(
                "/drive/v3/files/" + rec["id"],
                {"alt": "media", "supportsAllDrives": "true"},
                stream=True,
            ) as r, open(local, "wb") as fh:
                for chunk in r.iter_content(1 << 20):
                    fh.write(chunk)
            text = extract_text(local, rec["mime"], name)
            title = clean_title(name)
            unit = unit_of(rec)
            ctype = content_type_of(rec)
            ext = os.path.splitext(name)[1][:8].lower()
            key = storage_key(rec, ext)
            url = upload(local, key, rec["mime"] or "application/octet-stream")
            publish(rec, title, unit, ctype, url, text)
            ok += 1
            log("OK [%d/%d] %s -> Year 1: %s / %s (%d chars)" % (i, len(recs), name[:70], unit, ctype, len(text)))
        except Exception as exc:
            fail += 1
            log("FAIL %s :: %s" % (name[:70], str(exc)[:200]))
        finally:
            if os.path.exists(local):
                os.remove(local)
    log("DONE ok=%d fail=%d skip=%d" % (ok, fail, skip))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "run"
    if mode == "scan":
        cmd_scan()
    else:
        cmd_run(int(sys.argv[2]) if len(sys.argv) > 2 else None)
