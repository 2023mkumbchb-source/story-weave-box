import { describe, expect, it } from "vitest";
import { classifySupplementaryResource } from "@/lib/supplementary-resources";

describe("supplementary resource classification", () => {
  it("keeps HIV nephropathy in systemic pathology rather than virology", () => {
    expect(classifySupplementaryResource("FSGS & HIV Nephropathy", "Year 3: Male Reproductive and Urinary System Pathology")).toBe("Systemic Pathology");
  });

  it("keeps viral arthritis in bone and soft-tissue pathology", () => {
    expect(classifySupplementaryResource("Infectious Arthritis: Bacterial, TB & Viral", "Year 3: Bone and Soft Tissue Pathology")).toBe("Systemic Pathology");
  });

  it("includes standalone neuropathology and dermatopathology categories as systemic pathology", () => {
    expect(classifySupplementaryResource("CNS Tumours", "Year 3: Neuropathology")).toBe("Systemic Pathology");
    expect(classifySupplementaryResource("Inflammatory Skin Disease", "Year 3: Dermatopathology")).toBe("Systemic Pathology");
  });

  it("uses explicit infectious-disease categories", () => {
    expect(classifySupplementaryResource("Hepatitis Viruses", "Year 3: Medical Virology")).toBe("Medical Virology");
    expect(classifySupplementaryResource("Fungal Infections", "Year 3: Medical Mycology")).toBe("Medical Mycology");
    expect(classifySupplementaryResource("Malaria", "Year 2: Parasitology")).toBe("Year 2 Parasitology");
    expect(classifySupplementaryResource("Gram Positive Cocci", "Year 2: Microbiology")).toBe("Year 2 Microbiology");
  });

  it("does not import unrelated pharmacology, chemical pathology, genetics or renal flashcards into virology", () => {
    expect(classifySupplementaryResource("Antivirals", "Year 3: Basic Pharmacology I")).toBeNull();
    expect(classifySupplementaryResource("Chemical Pathology", "Year 3: Chemical Pathology I")).toBeNull();
    expect(classifySupplementaryResource("Genetic Disorders", "Year 3: Genetic Disorders")).toBeNull();
    expect(classifySupplementaryResource("FSGS & HIV Nephropathy", "Year 3: Male Reproductive and Urinary System Pathology")).not.toBe("Medical Virology");
  });
});
