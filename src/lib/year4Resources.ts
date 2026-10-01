export type Year4ResourceCollection = {
  label: string;
  href: string;
};

export type Year4ResourceGroup = {
  title: string;
  description: string;
  folderHref: string;
  collections: Year4ResourceCollection[];
};

export const YEAR4_RESOURCE_GROUPS: Year4ResourceGroup[] = [
  {
    title: "Internal Medicine",
    description: "Clinical medicine notes, books, block materials and revision resources.",
    folderHref: "/year-4-library?p=IMED",
    collections: [
      { label: "Books", href: "/year-4-library?p=IMED/BOOK" },
      { label: "Beautiful notes", href: "/year-4-library?p=IMED/I%20MED%20BEAUTIFUL%20NOTES" },
      { label: "IMED 4.1", href: "/year-4-library?p=IMED/IMED%204.1" },
      { label: "IMED 4.2", href: "/year-4-library?p=IMED/IMED%204.2" },
      { label: "IMED 4.3", href: "/year-4-library?p=IMED/IMED%204.3" },
      { label: "Revision", href: "/year-4-library?p=IMED/internal%20medicine%20revision" },
    ],
  },
  {
    title: "Obstetrics & Gynaecology",
    description: "Obstetrics, gynaecology, block notes, books and revision materials.",
    folderHref: "/year-4-library?p=OBSTERTICS",
    collections: [
      { label: "Obstetrics", href: "/year-4-library?p=OBSTERTICS/OBSTETRICS" },
      { label: "Gynaecology", href: "/year-4-library?p=OBSTERTICS/GYNECOLOGY" },
      { label: "Obstetrics 4.1", href: "/year-4-library?p=OBSTERTICS/OBSTETRICS%204.1" },
      { label: "Obstetrics 4.2", href: "/year-4-library?p=OBSTERTICS/OBSTETRICS%204.2" },
      { label: "Obstetrics 4.3", href: "/year-4-library?p=OBSTERTICS/OBSTETRICS%204.3" },
      { label: "Revision", href: "/year-4-library?p=OBSTERTICS/obs%20gyn%20revision" },
    ],
  },
  {
    title: "Paediatrics & Child Health",
    description: "Paediatric teaching notes, books, block materials and exam revision.",
    folderHref: "/year-4-library?p=PAEDS",
    collections: [
      { label: "Books", href: "/year-4-library?p=PAEDS/BOOKS" },
      { label: "Core notes", href: "/year-4-library?p=PAEDS/PAEDRIATICS" },
      { label: "Other notes", href: "/year-4-library?p=PAEDS/OTHER%20NOTES" },
      { label: "Paediatrics 4.1", href: "/year-4-library?p=PAEDS/PAEDS%204.1" },
      { label: "Paediatrics 4.2", href: "/year-4-library?p=PAEDS/PAEDS%204.2" },
      { label: "Paediatrics 4.3", href: "/year-4-library?p=PAEDS/PAEDS%204.3" },
      { label: "Revision", href: "/year-4-library?p=PAEDS/PAEDS%20REVISION" },
    ],
  },
  {
    title: "General Surgery",
    description: "Surgical presentations, emergencies, examination and management notes.",
    folderHref: "/year-4-library?p=SURGERY",
    collections: [],
  },
  {
    title: "Clinical Pharmacology",
    description: "System-based pharmacology notes, cases, figures and drug reviews.",
    folderHref: "/year-4-library?p=PHARMACOLOGY",
    collections: [],
  },
  {
    title: "Mental Health",
    description: "Psychiatric assessment, psychopathology, DSM guidance and practice cases.",
    folderHref: "/year-4-library?p=PSYCHIATRY",
    collections: [],
  },
  {
    title: "Radiology",
    description: "Introductory radiology, skeletal lesions, chest trauma and spot cases.",
    folderHref: "/year-4-library?p=RADIOLOGY%20DOWNLOADS",
    collections: [],
  },
];

export const YEAR4_SOURCE_FOLDER = "/year-4-library";