// Exports src/data/courseOutlines.ts to src/data/courseOutlines.json for the build-time prerender.
// Run after editing the outlines: `node scripts/library/export-outlines.mjs` (needs Node 22.6+ / 24 for TypeScript stripping).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { COURSE_OUTLINES } = await import(path.join(root, "src/data/courseOutlines.ts").replace(/\\/g, "/").replace(/^([A-Za-z]):/, "file:///$1:"));
fs.writeFileSync(path.join(root, "src/data/courseOutlines.json"), JSON.stringify(COURSE_OUTLINES));
console.log(`exported ${COURSE_OUTLINES.length} outlines, ${COURSE_OUTLINES.reduce((n, o) => n + o.sections.reduce((m, s) => m + s.items.length, 0), 0)} topics`);
