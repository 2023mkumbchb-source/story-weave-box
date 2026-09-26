# Current tasks

- [ ] Import the Year 1 Drive library into Ompath: real files stored in Ompath's own storage, published as Year 1 resources with direct downloads and correct unit/content-type categories.
- [ ] Import the remaining Year 4 disciplines (Obstetrics & Gynaecology, Psychiatry, Surgery, most of Pharmacology, rest of Internal Medicine).
- [ ] Wire the Year 1/Year 4 downloads catalogue pages into the site navigation once their catalogue table exists on the live backend.
- [ ] Decide and apply the database access model (public read, admin-only write) for notes, question sets and categories.


- [x] Add the complete shared Year 4 Google Drive library to the Year 4 study hub, grouped by real clinical disciplines and source collections.
- [ ] Convert individual Year 4 source documents into native study articles as a separate content-ingestion pass.
- [x] Repair MCQ option shuffling so correct answer identity survives normalization, deduplication, persistence, reload, and scoring.
- [x] Add regression tests covering shuffled answers, duplicate removal, and repeated normalization.
- [ ] Audit the referenced 57-question quiz/PDF and identify incorrect or ambiguous answer keys.
- [ ] Verify the targeted tests and live exam flow.
- [x] Make locked subscriber reveal controls open the subscription/restore panel.
- [ ] Verify automatic reveal restoration with a signed-in active subscriber.
