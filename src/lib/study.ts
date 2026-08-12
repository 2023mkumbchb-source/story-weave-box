import { supabase } from "@/integrations/supabase/client";
import type { ResourceType } from "./academic";

export type ProgressStatus = "not_started" | "in_progress" | "completed" | "difficult" | "revisit";

export interface ResourceProgress {
  resource_type: ResourceType;
  resource_id: string;
  status: ProgressStatus;
  progress_percent: number;
  last_position: string | null;
  last_opened_at: string;
}

export interface BookmarkRow {
  resource_type: ResourceType;
  resource_id: string;
  collection_name: string | null;
  created_at: string;
}

const LOCAL_PROGRESS = "study:progress";
const LOCAL_BOOKMARKS = "study:bookmarks";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota */ }
}

const db = supabase as unknown as { from: (t: string) => any };

/* ---------------- progress ---------------- */

export async function getProgress(userId: string | null): Promise<ResourceProgress[]> {
  if (!userId) return readLocal<ResourceProgress[]>(LOCAL_PROGRESS, []);
  const { data } = await db
    .from("user_resource_progress")
    .select("resource_type, resource_id, status, progress_percent, last_position, last_opened_at")
    .order("last_opened_at", { ascending: false })
    .limit(200);
  return (data || []) as ResourceProgress[];
}

export async function setProgress(
  userId: string | null,
  resource_type: ResourceType,
  resource_id: string,
  patch: Partial<Omit<ResourceProgress, "resource_type" | "resource_id">>,
) {
  if (!userId) {
    const list = readLocal<ResourceProgress[]>(LOCAL_PROGRESS, []);
    const idx = list.findIndex((p) => p.resource_type === resource_type && p.resource_id === resource_id);
    const base: ResourceProgress = {
      resource_type,
      resource_id,
      status: "in_progress",
      progress_percent: 0,
      last_position: null,
      last_opened_at: new Date().toISOString(),
      ...(idx >= 0 ? list[idx] : {}),
    };
    const next = { ...base, ...patch, last_opened_at: new Date().toISOString() };
    if (idx >= 0) list[idx] = next;
    else list.unshift(next);
    writeLocal(LOCAL_PROGRESS, list.slice(0, 100));
    return;
  }
  await db.from("user_resource_progress").upsert(
    {
      user_id: userId,
      resource_type,
      resource_id,
      last_opened_at: new Date().toISOString(),
      ...(patch.status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      ...patch,
    },
    { onConflict: "user_id,resource_type,resource_id" },
  );
}

/** Pushes local guest progress into the account after sign-in. */
export async function syncLocalProgress(userId: string) {
  const progress = readLocal<ResourceProgress[]>(LOCAL_PROGRESS, []);
  const bookmarks = readLocal<BookmarkRow[]>(LOCAL_BOOKMARKS, []);
  if (progress.length) {
    await db.from("user_resource_progress").upsert(
      progress.map((p) => ({ ...p, user_id: userId })),
      { onConflict: "user_id,resource_type,resource_id" },
    );
    writeLocal(LOCAL_PROGRESS, []);
  }
  if (bookmarks.length) {
    await db.from("user_bookmarks").upsert(
      bookmarks.map((b) => ({ ...b, user_id: userId })),
      { onConflict: "user_id,resource_type,resource_id" },
    );
    writeLocal(LOCAL_BOOKMARKS, []);
  }
}

/* ---------------- bookmarks ---------------- */

export async function getBookmarks(userId: string | null): Promise<BookmarkRow[]> {
  if (!userId) return readLocal<BookmarkRow[]>(LOCAL_BOOKMARKS, []);
  const { data } = await db
    .from("user_bookmarks")
    .select("resource_type, resource_id, collection_name, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data || []) as BookmarkRow[];
}

export async function toggleBookmark(
  userId: string | null,
  resource_type: ResourceType,
  resource_id: string,
  saved: boolean,
) {
  if (!userId) {
    const list = readLocal<BookmarkRow[]>(LOCAL_BOOKMARKS, []).filter(
      (b) => !(b.resource_type === resource_type && b.resource_id === resource_id),
    );
    if (saved) list.unshift({ resource_type, resource_id, collection_name: null, created_at: new Date().toISOString() });
    writeLocal(LOCAL_BOOKMARKS, list);
    return;
  }
  if (saved) {
    await db.from("user_bookmarks").upsert(
      { user_id: userId, resource_type, resource_id },
      { onConflict: "user_id,resource_type,resource_id" },
    );
  } else {
    await db
      .from("user_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("resource_type", resource_type)
      .eq("resource_id", resource_id);
  }
}

/* ---------------- topics ---------------- */

export interface TopicProgress {
  topic_id: string;
  status: string;
  confidence_level: number;
  correct_answers: number;
  attempted_questions: number;
}

export async function getTopicProgress(userId: string | null): Promise<TopicProgress[]> {
  if (!userId) return [];
  const { data } = await db
    .from("user_topic_progress")
    .select("topic_id, status, confidence_level, correct_answers, attempted_questions");
  return (data || []) as TopicProgress[];
}

export async function setTopicProgress(userId: string, topic_id: string, patch: Partial<TopicProgress>) {
  await db.from("user_topic_progress").upsert(
    { user_id: userId, topic_id, last_studied_at: new Date().toISOString(), ...patch },
    { onConflict: "user_id,topic_id" },
  );
}

/* ---------------- activity ---------------- */

export async function logActivity(
  userId: string | null,
  activity_type: string,
  extra: Record<string, unknown> = {},
) {
  if (!userId) return;
  await db.from("user_study_activity").insert({ user_id: userId, activity_type, ...extra });
}

export interface ActivityRow { created_at: string; activity_type: string; duration_seconds: number }

export async function getActivity(userId: string | null, days = 30): Promise<ActivityRow[]> {
  if (!userId) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await db
    .from("user_study_activity")
    .select("created_at, activity_type, duration_seconds")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  return (data || []) as ActivityRow[];
}

export function computeStreak(activity: ActivityRow[]): number {
  const days = new Set(activity.map((a) => a.created_at.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}
