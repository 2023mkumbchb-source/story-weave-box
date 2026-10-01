// Exports the structured timetable (src/lib/timetable2026.ts) to src/data/timetable2026.json for the build-time prerender.
// Run after editing the timetable: `node scripts/library/export-timetable.mjs` (needs Node 22.6+ / 24).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const url = "file:///" + path.join(root, "src/lib/timetable2026.ts").replace(/\\/g, "/");
const { OFFICIAL_2026_SCHEDULES, YEAR_TEACHING_STAFF } = await import(url);
fs.writeFileSync(path.join(root, "src/data/timetable2026.json"), JSON.stringify({ schedules: OFFICIAL_2026_SCHEDULES, staff: YEAR_TEACHING_STAFF }));
console.log("exported timetable for", Object.keys(OFFICIAL_2026_SCHEDULES).length, "years");
