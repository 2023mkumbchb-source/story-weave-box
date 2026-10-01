# Library pipeline (Ompath Study)

How the Year 1-4 libraries, share thumbnails and indexable pages are produced.

1. **Crawl** each public Drive folder (not capped at 50 files):  
   `node scripts/library/build/crawl2.cjs <folderId> <out.json>`
2. **Build** a year (merge sources, drop junk and duplicates, sort by subject -> type -> topic):  
   `build-year1.cjs`, `build-gen.cjs y2|y3`, `build-year4.cjs` (these read the crawl JSON files next to them).
3. **Relocate** misplaced files to the year the MKU timetable puts them (`build/relocate.cjs`), writing `public/data/yearN-library.json`.
4. `npm run library:finalize` gives every folder a permanent URL slug (idempotent).
5. `npm run library:og` renders the 1200x630 share thumbnails (needs Chrome).
6. `npm run build` runs `vite build` and then `scripts/library/prerender.mjs`, which writes a real HTML page per folder,
   course outline and timetable plus `dist/library-sitemap.xml`.
7. `node scripts/library/check-links.mjs` (occasionally) records dead Drive files in `public/data/broken-links.json`.
8. After editing course outlines or the timetable: `npm run library:outlines` / `node scripts/library/export-timetable.mjs`.

Titles, descriptions, credit and the report contact live in `src/data/libraries.json`.
