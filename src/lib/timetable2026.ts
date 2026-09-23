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

export const YEAR_4_WEEKLY_TIMETABLE: TimetableSlot[] = [
  { day: "Monday", group1: "7–9 MBPE 4311 · 9:30–12 MBSG 4640a · 1–3 MBSG 4612 · 4–6 MBSG 4611", group2: "7–9 MBPE 4311 · 1–3 MBSG 4612 · 4–6 MBSG 4611" },
  { day: "Tuesday", group1: "7–9 MBOG 4211 · 9:30–12 MBSG 4613a · 1–3 MBSG 4626a · 4–6 MBPE 4312", group2: "7–9 MBOG 4211 · 9:30–12 MBSG 4613b · 1–3 MBSG 4626b · 4–6 MBPE 4312" },
  { day: "Wednesday", group1: "7–9 MBIM 4111 · 9:30–12 — · 1–3 — · 4–6 MBPL 4411", group2: "7–9 MBIM 4111 · 9:30–12 MBSG 4639b · 1–3 MBSG 4640b · 4–6 MBPL 4411" },
  { day: "Thursday", group1: "7–9 MBPS 4511 · 9:30–12 MBSG 4639a · 1–3 — · 4–6 MBIM 4112", group2: "7–9 MBPS 4511 · 9:30–12 — · 1–3 — · 4–6 MBIM 4112" },
  { day: "Friday", group1: "7–9 MBOG 4212 · 9:30–12 — · 1–3 — · 4–6 MBPS 4512", group2: "7–9 MBOG 4212 · 9:30–12 — · 1–3 — · 4–6 MBPS 4512" },
];
