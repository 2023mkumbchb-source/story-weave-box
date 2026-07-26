// Static Year 3 subunit -> semester lookup, confirmed against the MKU course
// outline. Units not listed here (Chemical Pathology, Clinical Chemistry,
// Hematopathology, Blood Transfusion, Basic Pharmacology) span multiple
// semesters under one subunit label and need per-article topic review before
// they can be split — they fall into "Other Units" until that's done.
export const YEAR3_SEMESTER: Record<string, 1 | 2 | 3> = {
  "General Pathology": 1,
  "Oncopathology": 1,
  "Genetic Disorders": 1,
  "Histopathology & Cytopathology": 1,
  "Bacteriology": 1,
  "Parasitology": 1,
  "Nutrition and Dietetics": 1,

  "Cardiovascular System Pathology": 2,
  "Respiratory System Pathology": 2,
  "Gastrointestinal Pathology": 2,
  "Female Reproductive System Pathology": 2,
  "Head & Neck Pathology": 2,
  "Endocrine and Metabolic Pathology": 2,
  "Research Methodology and Proposal Writing": 2,

  "Neuropathology": 3,
  "Bone and Soft Tissue Pathology": 3,
  "Breast Pathology": 3,
  "Dermatopathology": 3,
  "Male Reproductive and Urinary System Pathology": 3,
  "Immunopathology": 3,
  "Medical Mycology": 3,
  "Medical Virology": 3,
  "Clinical Techniques": 3,
  "Introduction to Clinical Techniques": 3,
  "Spot/Practical Examination": 3,
  "Community Health": 3,
};

export function getYear3Semester(subunitName: string): 1 | 2 | 3 | null {
  return YEAR3_SEMESTER[subunitName] ?? null;
}

export const OTHER_UNITS_LABEL = "Other Units";

/** Sort key so "Semester 1" < "Semester 2" < "Semester 3" < "Other Units". */
export function semesterGroupSortKey(label: string): number {
  const m = label.match(/^Semester (\d)$/);
  if (m) return Number(m[1]);
  return 99;
}
