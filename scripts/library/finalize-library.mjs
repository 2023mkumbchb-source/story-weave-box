// Adds a permanent URL slug ("s") to every folder in each library data file.
// Idempotent: existing slugs are kept, so shared links never change. Run after rebuilding the data.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "src/data/libraries.json"), "utf8"));

export const slugify = (name) =>
  name.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "folder";

function assign(nodes) {
  const used = new Set(nodes.map((n) => n.s).filter(Boolean));
  for (const n of nodes) {
    if (!n.s) {
      let s = slugify(n.n), i = 2;
      while (used.has(s)) s = `${slugify(n.n)}-${i++}`;
      n.s = s; used.add(s);
    }
    if (n.d) assign(n.d);
  }
}

let folders = 0;
const count = (nodes) => nodes.forEach((n) => { folders++; if (n.d) count(n.d); });
for (const lib of registry.libraries) {
  const file = path.join(root, "public/data", lib.dataFile);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  assign(data.d);
  fs.writeFileSync(file, JSON.stringify(data));
  count(data.d);
  console.log(`${lib.slug}: ${data.d.map((s) => s.s).join(", ")}`);
}
console.log("folders slugged:", folders);
