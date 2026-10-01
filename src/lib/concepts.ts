// The map behind "connected learning": which body system a piece of content is about, and which discipline
// (anatomy, histology, physiology, pathology …) it looks at that system from. Matching is by word stems on the
// title and the place the item lives (category / library folder), so anything published later is connected too.

export type SystemId = "cardiovascular" | "respiratory" | "gastrointestinal" | "renal" | "nervous" | "endocrine" | "reproductive" | "musculoskeletal" | "head-neck" | "blood-immunity" | "skin" | "cell-general" | "infection";
export type DisciplineId = "anatomy" | "embryology" | "histology" | "physiology" | "biochemistry" | "pathology" | "pharmacology" | "microbiology" | "clinical" | "other";

export interface SystemDef { id: SystemId; label: string; emoji: string; blurb: string; re: RegExp }
export interface DisciplineDef { id: DisciplineId; label: string; question: string; re: RegExp }

export const SYSTEMS: SystemDef[] = [
  { id: "cardiovascular", label: "Cardiovascular", emoji: "🫀", blurb: "Heart, vessels and circulation", re: /\b(heart|cardi\w*|coronar\w*|myocard\w*|valv\w*|aort\w*|atheroscl\w*|vascul\w*|arter\w*|vein\w*|venous|angina|infarct\w*|hypertens\w*|circulat\w*|pericard\w*|endocard\w*|aneurysm\w*|embol\w*|thromb\w*|ecg|rheumatic|shock)\b/i },
  { id: "respiratory", label: "Respiratory", emoji: "🫁", blurb: "Airways, lungs and breathing", re: /\b(lungs?|pulmon\w*|respirat\w*|bronch\w*|pleura\w*|trache\w*|laryn\w*|airways?|pneumon\w*|asthma|copd|alveol\w*|thora\w*|ventilat\w*|tubercul\w*|tb)\b/i },
  { id: "gastrointestinal", label: "Gastrointestinal", emoji: "🍽️", blurb: "Gut, liver, biliary tract and pancreas", re: /\b(gastr\w*|git|oesoph\w*|esoph\w*|stomach|intestin\w*|bowel|colon\w*|rectum|rectal|liver|hepat\w*|bili\w*|gall\w*|pancrea\w*|digest\w*|abdom\w*|duoden\w*|ileum|jejun\w*|appendi\w*|peritone\w*|malabsorp\w*|coeliac|crohn\w*|colitis|hernia)\b/i },
  { id: "renal", label: "Renal & urinary", emoji: "🧪", blurb: "Kidneys, bladder and urine", re: /\b(kidneys?|renal|nephr\w*|urinar\w*|bladder|ureter\w*|urethra\w*|glomerul\w*|dialysis|urine|urinalysis|prostat\w*)\b/i },
  { id: "nervous", label: "Nervous system", emoji: "🧠", blurb: "Brain, spinal cord and nerves", re: /\b(neuro\w*|brain|cerebr\w*|spinal|cranial|nerves?|synap\w*|neurons?|cns|csf|mening\w*|cortex|thalam\w*|cerebell\w*|tracts?|reflex\w*|epilep\w*|stroke|parkinson\w*|demyelin\w*|hydroceph\w*|ganglia|plexus)\b/i },
  { id: "endocrine", label: "Endocrine & metabolism", emoji: "🦋", blurb: "Hormones, glands and metabolic disease", re: /\b(endocrin\w*|pituitar\w*|thyroid\w*|adrenal\w*|parathyroid\w*|hormon\w*|insulin|diabet\w*|cortisol|glucagon|hypothalam\w*|obesity|pancreatic islets)\b/i },
  { id: "reproductive", label: "Reproductive & breast", emoji: "🤰", blurb: "Male and female reproductive systems, pregnancy", re: /\b(reproduct\w*|uter\w*|ovar\w*|testi\w*|gonad\w*|obstet\w*|gynae\w*|gynec\w*|pregnan\w*|placent\w*|labour|menstru\w*|cervi\w*|vagin\w*|vulva\w*|fallopian|breast\w*|sperm\w*|puberty|contracept\w*|fertil\w*|genital\w*|antenatal|puerper\w*)\b/i },
  { id: "musculoskeletal", label: "Musculoskeletal", emoji: "🦴", blurb: "Bones, joints, muscles and limbs", re: /\b(bones?|muscle\w*|skeletal|joints?|aponeuros\w*|fractur\w*|limbs?|arm|forearm|hand|thigh|leg|foot|pelvi\w*|vertebr\w*|spine|osteo\w*|arthr\w*|tendon\w*|ligament\w*|cartilage|myopath\w*|soft tissue|gluteal|shoulder|hip|knee|axilla|inguinal|perine\w*)\b/i },
  { id: "head-neck", label: "Head & neck", emoji: "👁️", blurb: "Skull, face, eye, ear, mouth and neck", re: /\b(head|neck|face|facial|eyes?|ocular|ears?|oral|dental|tooth|teeth|salivary|pharyn\w*|nasal|sinus\w*|orbit\w*|skull|scalp|mandib\w*|cranium)\b/i },
  { id: "blood-immunity", label: "Blood & immunity", emoji: "🩸", blurb: "Blood, haematology and the immune system", re: /\b(blood|haem\w*|hem[ao]\w*|anaemi\w*|anemi\w*|leuk\w*|lymph\w*|coagul\w*|platelet\w*|transfus\w*|marrow|sickle|thalass\w*|immun\w*|antibod\w*|antigen\w*|complement|hypersensitiv\w*|vaccin\w*|spleen|myeloma|plasma cell)\b/i },
  { id: "skin", label: "Skin", emoji: "🧴", blurb: "Skin and its diseases", re: /\b(skin|derma\w*|cutaneous|melanoma|melanocyt\w*|epiderm\w*|burns?|wounds?)\b/i },
  { id: "cell-general", label: "Cells, genetics & general principles", emoji: "🧬", blurb: "Cell biology, genetics, inflammation, neoplasia and general pathology", re: /\b(cells?|cellular|membranes?|inflammat\w*|necrosis|apoptosis|neoplas\w*|cancer\w*|tumou?rs?|oncolog\w*|oncopath\w*|carcino\w*|genetic\w*|chromosom\w*|dna|rna|genes?|mutation\w*|cytogenet\w*|molecular|repair|injury|adaptation|metaplasia|enzymes?|metabol\w*|proteins?|lipids?|carbohydrate\w*|nutrition\w*|vitamins?|minerals?|bioenerget\w*|glycoly\w*|gluconeogen\w*)\b/i },
  { id: "infection", label: "Infection & microbes", emoji: "🦠", blurb: "Bacteria, viruses, fungi, parasites and antimicrobials", re: /\b(bacteri\w*|virus\w*|viral|virolog\w*|mycolog\w*|fung\w*|parasit\w*|helminth\w*|protozoa\w*|malaria|hiv|infect\w*|sepsis|antimicrob\w*|antibiotic\w*|microb\w*|entomolog\w*|cholera|typhoid|hepatitis|herpes|candid\w*)\b/i },
];

// Order is the order a student is best advised to meet a system: structure → development → microscopic → function → chemistry → disease → drugs → infection → patients.
export const DISCIPLINES: DisciplineDef[] = [
  { id: "anatomy", label: "Anatomy", question: "Where is it and what is it next to?", re: /\b(anatom\w*|dissect\w*|gross|neuroanat\w*|surface|cadaver\w*)\b/i },
  { id: "embryology", label: "Embryology", question: "How did it develop?", re: /\b(embryo\w*|development of|developmental|foetal|fetal|congenital anomal\w*|organogenesis|gastrulation)\b/i },
  { id: "histology", label: "Histology", question: "What does it look like under the microscope?", re: /\b(histolog\w*|microscop\w*|epitheli\w*|connective tissue|staining|stains)\b/i },
  { id: "physiology", label: "Physiology", question: "How does it work?", re: /\b(physiolog\w*|homeostas\w*|blood pressure|cardiac output|excitation|membrane potential|neurophysiolog\w*)\b/i },
  { id: "biochemistry", label: "Biochemistry", question: "What chemistry drives it?", re: /\b(biochem\w*|metabol\w*|enzyme\w*|glycolysis|krebs|molecular|nitrogen|vitamins?|gluconeogen\w*|bioenerget\w*|genetics|cytogenet\w*)\b/i },
  { id: "pathology", label: "Pathology", question: "What goes wrong, and why?", re: /\b(patholog\w*|oncopath\w*|histopath\w*|cytopath\w*|neoplas\w*|dysplas\w*|necrosis|inflammation|haematopath\w*|hematopath\w*|immunopath\w*|neuropath\w*|dermatopath\w*|autopsy)\b/i },
  { id: "pharmacology", label: "Pharmacology", question: "Which drugs act on it?", re: /\b(pharmac\w*|drugs?|antibiotic\w*|therapeutic\w*|dosage|nsaids?|chemotherap\w*|prescri\w*)\b/i },
  { id: "microbiology", label: "Microbiology & immunology", question: "Which organisms and immune responses are involved?", re: /\b(microbio\w*|bacteri\w*|virolog\w*|mycolog\w*|parasit\w*|immunolog\w*|entomolog\w*|helminth\w*|protozoa\w*)\b/i },
  { id: "clinical", label: "Clinical", question: "How do patients present and how are they managed?", re: /\b(clinical|medicine|surgery|surgical|paediatric\w*|pediatric\w*|obstetric\w*|gynae\w*|psychiatr\w*|radiolog\w*|osce|examination of)\b/i },
];

/** Subjects that should be studied alongside each other even before a system is known (gross anatomy ↔ histology ↔ embryology …). */
export const COMPANIONS: Record<DisciplineId, DisciplineId[]> = {
  anatomy: ["embryology", "histology", "physiology"],
  embryology: ["anatomy", "histology"],
  histology: ["anatomy", "embryology", "pathology"],
  physiology: ["anatomy", "biochemistry", "pharmacology"],
  biochemistry: ["physiology", "pathology"],
  pathology: ["anatomy", "histology", "physiology", "pharmacology", "microbiology"],
  pharmacology: ["physiology", "pathology", "microbiology"],
  microbiology: ["pathology", "pharmacology"],
  clinical: ["anatomy", "physiology", "pathology", "pharmacology"],
  other: [],
};

export const systemById = (id: SystemId) => SYSTEMS.find((s) => s.id === id)!;
export const disciplineById = (id: DisciplineId) => DISCIPLINES.find((d) => d.id === id) ?? { id: "other" as const, label: "General", question: "", re: /$^/ };

/**
 * `where` is the place the item lives (category or library trail) and counts triple for the discipline, because a folder
 * called "Histology" tells more than any title. Systems come from the title and place together, strongest two kept.
 */
export function classify(title: string, where = ""): { discipline: DisciplineId; systems: SystemId[] } {
  const scored = DISCIPLINES.map((d) => ({ id: d.id, s: (where.match(new RegExp(d.re.source, "gi"))?.length ?? 0) * 3 + (title.match(new RegExp(d.re.source, "gi"))?.length ?? 0) }));
  const best = scored.sort((a, b) => b.s - a.s)[0];
  const text = `${title} ${where}`;
  const systems = SYSTEMS.map((s) => ({ id: s.id, n: text.match(new RegExp(s.re.source, "gi"))?.length ?? 0 }))
    .filter((s) => s.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((s) => s.id);
  return { discipline: best && best.s > 0 ? best.id : "other", systems };
}
