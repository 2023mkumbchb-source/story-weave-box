import type { CaseDef, Rotation } from "./types";
import { MEDICINE_1 } from "./cases/medicine1";
import { MEDICINE_2 } from "./cases/medicine2";
import { MEDICINE_3 } from "./cases/medicine3";
import { MEDICINE_4 } from "./cases/medicine4";
import { OBGYN_1 } from "./cases/obgyn1";
import { OBGYN_2 } from "./cases/obgyn2";
import { PAEDS_1 } from "./cases/paeds1";
import { PAEDS_2 } from "./cases/paeds2";
import { SURGERY_1 } from "./cases/surgery1";
import { SURGERY_2 } from "./cases/surgery2";
import { PSYCH_1 } from "./cases/psych1";
import { PSYCH_2 } from "./cases/psych2";

// More cases can be added by dropping another file of CaseDef[] into ./cases and listing it here.
export const ALL_CASES: CaseDef[] = [...MEDICINE_1, ...MEDICINE_2, ...MEDICINE_3, ...MEDICINE_4, ...OBGYN_1, ...OBGYN_2, ...PAEDS_1, ...PAEDS_2, ...SURGERY_1, ...SURGERY_2, ...PSYCH_1, ...PSYCH_2];

export const getCase = (id: string) => ALL_CASES.find((c) => c.id === id);
export const casesFor = (rotation: Rotation) => ALL_CASES.filter((c) => c.rotation === rotation);
export { ROTATIONS, SKILLS, BODY_SYSTEMS } from "./types";
