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
    folderHref: "https://drive.google.com/drive/folders/1Sj7h-BMDnt-jKvM1SHeT4EyfPooa0tQT",
    collections: [
      { label: "Books", href: "https://drive.google.com/drive/folders/1dteYMfzaBvx-KphKOSK8CnjvUsO-B6b2" },
      { label: "Beautiful notes", href: "https://drive.google.com/drive/folders/1EAp6R7TJL1o15emD1ON0UuJ3vGaZ7Hpc" },
      { label: "IMED 4.1", href: "https://drive.google.com/drive/folders/1DH7pUmaAozr8X5g9fxI_WyiYx0DseRQk" },
      { label: "IMED 4.2", href: "https://drive.google.com/drive/folders/12Vq-C1iaakUJfnGydgEqGyFLSyed3hVT" },
      { label: "IMED 4.3", href: "https://drive.google.com/drive/folders/1-lMU1rz6ug59bAHEzl57jPkLFl2JE5F5" },
      { label: "Revision", href: "https://drive.google.com/drive/folders/11hUk-fOSTnmrNPcIyxX_kLLds5GcznUs" },
    ],
  },
  {
    title: "Obstetrics & Gynaecology",
    description: "Obstetrics, gynaecology, block notes, books and revision materials.",
    folderHref: "https://drive.google.com/drive/folders/1-0K7EK35pdcdP91x1zc883br01eYUXWT",
    collections: [
      { label: "Obstetrics", href: "https://drive.google.com/drive/folders/1A9DYDmkXtFwNXp39q6bIMgRitosp4Mnd" },
      { label: "Gynaecology", href: "https://drive.google.com/drive/folders/124FRUtCWdsinS8OnTXGEkq39aP8-zdmE" },
      { label: "Obstetrics 4.1", href: "https://drive.google.com/drive/folders/1cF4mNxiF-CvsolpxZ6-3aq7zbj6z-FaE" },
      { label: "Obstetrics 4.2", href: "https://drive.google.com/drive/folders/1WlQs55xzUaq-Bcf1k4LCseUl61cILXhN" },
      { label: "Obstetrics 4.3", href: "https://drive.google.com/drive/folders/1TqS2Ut3rnMeTP9ahihVV4cLLs6_OK-2l" },
      { label: "Revision", href: "https://drive.google.com/drive/folders/1siGO6zsHoZLuPS5ignd5_9VG4RIuLuCm" },
    ],
  },
  {
    title: "Paediatrics & Child Health",
    description: "Paediatric teaching notes, books, block materials and exam revision.",
    folderHref: "https://drive.google.com/drive/folders/1Y-MldzA3MORD_WyOc90tsujNZ3pM6yDU",
    collections: [
      { label: "Books", href: "https://drive.google.com/drive/folders/1JoSCdmRpzNAKutks7iFX3tPG1m-C_Ad-" },
      { label: "Core notes", href: "https://drive.google.com/drive/folders/1zKGFh7UGv4GsCsX-kTDrKxrvm7bNmtXt" },
      { label: "Other notes", href: "https://drive.google.com/drive/folders/1v4wjX49I4-Pk9TRlog07xU5DtmiF0P0i" },
      { label: "Paediatrics 4.1", href: "https://drive.google.com/drive/folders/1oknTmTKpBVfG9VLIikLQorwMxBlGuKfE" },
      { label: "Paediatrics 4.2", href: "https://drive.google.com/drive/folders/1Tj1JkN9mJlWx6cK4bJwV8Z8tC_FmCmdM" },
      { label: "Paediatrics 4.3", href: "https://drive.google.com/drive/folders/1r_G58mMAZaTb1JW38SI0z8s6RhGPjE6C" },
      { label: "Revision", href: "https://drive.google.com/drive/folders/16F4KN2Xpt6q1xWCSam2G857qccx9zfGl" },
    ],
  },
  {
    title: "General Surgery",
    description: "Surgical presentations, emergencies, examination and management notes.",
    folderHref: "https://drive.google.com/drive/folders/1TE0DCLStgkWQtcjBvE-0ioqI2FKJBUH3",
    collections: [],
  },
  {
    title: "Clinical Pharmacology",
    description: "System-based pharmacology notes, cases, figures and drug reviews.",
    folderHref: "https://drive.google.com/drive/folders/1lCz9DiWJsGhMZyC4PucHV0a-ajIs8_m4",
    collections: [],
  },
  {
    title: "Mental Health",
    description: "Psychiatric assessment, psychopathology, DSM guidance and practice cases.",
    folderHref: "https://drive.google.com/drive/folders/1cus_YBXVE6d1cr3ZqAEAb8TY6LyearC_",
    collections: [],
  },
  {
    title: "Radiology",
    description: "Introductory radiology, skeletal lesions, chest trauma and spot cases.",
    folderHref: "https://drive.google.com/drive/folders/16MLrhNBlHIHbQpp0cJd67t4hxdGt0fOw",
    collections: [],
  },
];

export const YEAR4_SOURCE_FOLDER = "https://drive.google.com/drive/folders/1dpkY-mW92-rCiXAVjDLeaQHwqVhYvt0F";