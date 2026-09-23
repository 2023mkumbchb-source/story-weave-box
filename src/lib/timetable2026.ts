export const MBCHB_2026_TRIMESTER_1 = {
  label: "Trimester 1",
  startDate: "2026-09-07",
  teachingEndDate: "2026-12-04",
  catStartDate: "2026-12-08",
  catEndDate: "2026-12-12",
} as const;

export const YEAR_TEACHING_STAFF: Record<number, string[]> = {
  1: ["Dr. Gathara", "Dr. Mbira", "Dr. Hemedi", "Dr. Brian Wambua", "Dr. Yvonne Thuo", "Dr. Pere", "Dr. Kevin Mbogo", "Winnie Raey", "Dr. Ruth Mungai"],
  2: ["Dr. Katherine Pere", "Dr. Paul Sifuna", "Dr. Hemedy", "Dr. Mbira", "Dr. Wambua", "Dr. Joy Gatune", "Juma Alfred", "Mr. Peter Gitau", "Dr. Orata"],
  3: ["Dr. Kwansah Ndemo", "Mr. Peter Gitau", "Dr. Jonathan Ngala", "Emily Wahome", "Evelyne Kwamboka", "Dr. Noelle Orata", "Dr. Anthony Irungu", "Dr. Lillian Bosire"],
  4: ["Dr. Mark Siboe", "Dr. Mulongo", "Dr. Njuguna", "Dr. Rosslyn Ngugi", "Dr. Alex Mogere", "Dr. Muthoni Ritho", "Dr. Momanyi Mokaya", "Dr. Kinuthia", "Dr. Rose Munge", "Dr. Agisa", "Dr. Neema Araka", "Dr. Ndemo"],
  5: ["Dr. Kilonzo", "Dr. Cliff Muturi", "Dr. Nyangaresi", "Dr. Kiberenge", "Dr. Wairimu Mwaura"],
  6: ["Dr. Barrack Omondi", "Dr. Njuguna", "Dr. Kilonzo", "Dr. Laichena", "Dr. Okanga", "Dr. Alex Mogere", "Dr. Mogere", "Dr. Ruth", "Dr. Agisa", "Dr. Neema Araka", "Dr. Kendi"],
};

export type TimetableSlot = {
  day: string;
  group1: string;
  group2: string;
};

export const YEAR_4_ROTATION_GRIDS: { label: string; slots: TimetableSlot[] }[] = [
  {
    label: "Published rotation grid 1",
    slots: [
      { day: "Monday", group1: "7–9 MBPE 4311 · 9:30–12 MBSG 4640a · 1–3 MBSG 4612 · 4–6 MBSG 4611", group2: "7–9 MBPE 4311 · 1–3 MBSG 4612 · 4–6 MBSG 4611" },
      { day: "Tuesday", group1: "7–9 MBOG 4211 · 9:30–12 MBSG 4613a · 1–3 MBSG 4626a · 4–6 MBPE 4312", group2: "7–9 MBOG 4211 · 9:30–12 MBSG 4613b · 1–3 MBSG 4626b · 4–6 MBPE 4312" },
      { day: "Wednesday", group1: "7–9 MBIM 4111 · 4–6 MBPL 4411", group2: "7–9 MBIM 4111 · 9:30–12 MBSG 4639b · 1–3 MBSG 4640b · 4–6 MBPL 4411" },
      { day: "Thursday", group1: "7–9 MBPS 4511 · 9:30–12 MBSG 4639a · 4–6 MBIM 4112", group2: "7–9 MBPS 4511 · 4–6 MBIM 4112" },
      { day: "Friday", group1: "7–9 MBOG 4212 · 4–6 MBPS 4512", group2: "7–9 MBOG 4212 · 4–6 MBPS 4512" },
    ],
  },
  {
    label: "Published rotation grid 2",
    slots: [
      { day: "Monday", group1: "7–9 MBPE 4311 · 9:30–12 MBIM 4139a · 1–3 MBSG 4612 · 4–6 MBSG 4611", group2: "7–9 MBPE 4311 · 9:30–12 MBIM 4139b · 1–3 MBSG 4612 · 4–6 MBSG 4611" },
      { day: "Tuesday", group1: "7–9 MBOG 4211 · 9:30–12 MBIM 4126a · 4–6 MBPE 4312", group2: "7–9 MBOG 4211 · 9:30–12 MBIM 4126b · 4–6 MBPE 4312" },
      { day: "Wednesday", group1: "7–9 MBIM 4111 · 9:30–12 MBIM 4113a · 1–3 MBIM 4140a · 4–6 MBPL 4411", group2: "7–9 MBIM 4111 · 9:30–12 MBIM 4113b · 1–3 MBIM 4140b · 4–6 MBPL 4411" },
      { day: "Thursday", group1: "7–9 MBPS 4511 · 4–6 MBIM 4112", group2: "7–9 MBPS 4511 · 4–6 MBIM 4112" },
      { day: "Friday", group1: "7–9 MBOG 4212 · 4–6 MBPS 4512", group2: "7–9 MBOG 4212 · 4–6 MBPS 4512" },
    ],
  },
  {
    label: "Published rotation grid 3",
    slots: [
      { day: "Monday", group1: "7–9 MBPE 4311 · 1–3 MBSG 4612 · 4–6 MBSG 4611", group2: "7–9 MBPE 4311 · 1–3 MBSG 4612 · 4–6 MBSG 4611" },
      { day: "Tuesday", group1: "7–9 MBOG 4211 · 9:30–12 MBOG 4213a · 4–6 MBPE 4312", group2: "7–9 MBOG 4211 · 9:30–12 MBOG 4213b · 4–6 MBPE 4312" },
      { day: "Wednesday", group1: "7–9 MBIM 4111 · 4–6 MBPL 4411", group2: "7–9 MBIM 4111 · 4–6 MBPL 4411" },
      { day: "Thursday", group1: "7–9 MBPS 4511 · 9:30–12 MBOG 4239a · 4–6 MBIM 4112", group2: "7–9 MBPS 4511 · 9:30–12 MBOG 4239b · 4–6 MBIM 4112" },
      { day: "Friday", group1: "7–9 MBOG 4212 · 9:30–12 MBOG 4240a · 1–3 MBOG 4226a · 4–6 MBPS 4512", group2: "7–9 MBOG 4212 · 9:30–12 MBOG 4240b · 1–3 MBOG 4226b · 4–6 MBPS 4512" },
    ],
  },
  {
    label: "Published rotation grid 4",
    slots: [
      { day: "Monday", group1: "7–9 MBPE 4311 · 9:30–12 MBPE 4313a · 1–3 MBSG 4612 · 4–6 MBSG 4611", group2: "7–9 MBPE 4311 · 9:30–12 MBPE 4313b · 1–3 MBSG 4612 · 4–6 MBSG 4611" },
      { day: "Tuesday", group1: "7–9 MBOG 4211 · 9:30–12 MBPE 4326a · 4–6 MBPE 4312", group2: "7–9 MBOG 4211 · 9:30–12 MBPE 4326b · 4–6 MBPE 4312" },
      { day: "Wednesday", group1: "7–9 MBIM 4111 · 9:30–12 MBPE 4339a · 1–3 MBPE 4340a · 4–6 MBPL 4411", group2: "7–9 MBIM 4111 · 9:30–12 MBPE 4339b · 1–3 MBPE 4340b · 4–6 MBPL 4411" },
      { day: "Thursday", group1: "7–9 MBPS 4511 · 4–6 MBIM 4112", group2: "7–9 MBPS 4511 · 4–6 MBIM 4112" },
      { day: "Friday", group1: "7–9 MBOG 4212 · 4–6 MBPS 4512", group2: "7–9 MBOG 4212 · 4–6 MBPS 4512" },
    ],
  },
  {
    label: "Published rotation grid 5",
    slots: [
      { day: "Monday", group1: "7–9 MBPE 4311 · 9:30–12 MBPS 4526a · 1–3 MBSG 4612 · 4–6 MBSG 4611", group2: "7–9 MBPE 4311 · 9:30–12 MBPS 4526b · 1–3 MBSG 4612 · 4–6 MBSG 4611" },
      { day: "Tuesday", group1: "7–9 MBOG 4211 · 4–6 MBPE 4312", group2: "7–9 MBOG 4211 · 4–6 MBPE 4312" },
      { day: "Wednesday", group1: "7–9 MBIM 4111 · 9:30–12 MBPS 4537a · 1–3 MBPS 4537a · 4–6 MBPL 4411", group2: "7–9 MBIM 4111 · 9:30–12 MBPS 4537b · 1–3 MBPS 4537b · 4–6 MBPL 4411" },
      { day: "Thursday", group1: "7–9 MBPS 4511 · 9:30–12 MBPS 4513a · 4–6 MBIM 4112", group2: "7–9 MBPS 4511 · 9:30–12 MBPS 4513b · 4–6 MBIM 4112" },
      { day: "Friday", group1: "7–9 MBOG 4212 · 4–6 MBPS 4512", group2: "7–9 MBOG 4212 · 4–6 MBPS 4512" },
    ],
  },
];
