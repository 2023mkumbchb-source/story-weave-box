import type { Drug } from "@/clinical/extras/drugs";

export interface PDrug extends Drug { group: string }

export interface Condition {
  id: string; name: string; group: string;
  first: string[]; alt: string[]; avoid: string[]; monitor: string; pearl: string;
}

export interface Regimen { cancer: string; regimen: string; drugs: string; watch: string; note: string }
export interface Interaction { a: string; b: string; effect: string; why: string }
export interface Suffix { stem: string; meaning: string; example: string }
export interface AeLink { effect: string; drugs: string[]; note: string }
