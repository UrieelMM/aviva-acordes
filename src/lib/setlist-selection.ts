import type { SetlistRecord } from "@/lib/indexed-db";

export function getMostRecentSetlist(setlists: SetlistRecord[]) {
  return [...setlists].sort((a, b) =>
    b.date.localeCompare(a.date) ||
    b.createdAt.localeCompare(a.createdAt) ||
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];
}

export function getTodaySetlist(setlists: SetlistRecord[], now: Date) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todaySetlists = setlists.filter((setlist) => setlist.date === today)
    .sort((a, b) => a.time.localeCompare(b.time) || b.createdAt.localeCompare(a.createdAt));
  return todaySetlists.find((setlist) => setlist.time >= currentTime) ?? todaySetlists.at(-1);
}
