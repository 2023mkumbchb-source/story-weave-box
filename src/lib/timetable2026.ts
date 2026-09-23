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


export type OfficialScheduleRow = {
  day: string;
  group?: string;
  entries: string[];
};

export type OfficialScheduleTable = {
  label: string;
  timeBands: string[];
  rows: OfficialScheduleRow[];
};

export const OFFICIAL_2026_SCHEDULES: Record<number, OfficialScheduleTable[]> = {
  1: [{
    label: "Weekly teaching timetable",
    timeBands: ["7–8 AM","8–9 AM","9–10 AM","10–11 AM","11 AM–12 PM","12–1 PM","1–2 PM","2–3 PM","3–4 PM","4–5 PM","5–6 PM"],
    rows: [
      {day:"Monday",group:"A",entries:["MBHA 1112 · Auditorium","MBHA 1111 · Auditorium","MBMB 1211 · Auditorium","BMS 1102 · Auditorium"]},
      {day:"Tuesday",group:"A",entries:["MBMB 1212 · Auditorium","MBHA 1127 · Auditorium","MBMB 1223 · Auditorium"]},
      {day:"Wednesday",group:"A",entries:["MBMP 1311 · Auditorium","MBMP 1335A · Physiology Lab","MBMP 1335B · Physiology Lab"]},
      {day:"Thursday",group:"A",entries:["MBHA 1124 Ca · Dissection","MBHA 1124 Ba · Histology Lab","Biochemistry Practical a","BUCU 008 · Online"]},
      {day:"Thursday",group:"B",entries:["Biochemistry Practical b","MBHA 1124 Cb · Dissection Lab","MBHA 1124 Bb"]},
      {day:"Thursday",group:"C",entries:["MBHA 1124 Bc · Histology Lab","Biochemistry Practical c","MBHA 1124 Cc · Dissection"]},
      {day:"Friday",group:"A",entries:["MBMP 1335C · Physiology Lab","MBMP 1335D · Physiology Lab","MBMP 1322"]},
    ],
  }],
  2: [{
    label: "Weekly teaching timetable",
    timeBands: ["7–8 AM","8–9 AM","9–10 AM","10–11 AM","11 AM–12 PM","12–1 PM","1–2 PM","2–3 PM","3–4 PM","4–5 PM","5–6 PM"],
    rows: [
      {day:"Monday",group:"A",entries:["MBHA 2111 · CTA Hall","MBMP 2323A · CTA Hall","MBMP 2335A · Physiology Lab","MBMP 2335B · Physiology Lab"]},
      {day:"Tuesday",group:"A",entries:["MBMB 2212 · CTA Hall","MBMB 2211 · CTA Hall","MBHA 2133B · CTA Hall","MBHA 2100 · CTA Hall"]},
      {day:"Wednesday",group:"A",entries:["MBHA 2122 Ea · Dissection Lab","MBMM 2511 · Auditorium","MBMM 2411 · Auditorium"]},
      {day:"Wednesday",group:"B",entries:["Biochemistry Practical B"]},
      {day:"Wednesday",group:"C",entries:["MBHA 2122 Ac · Histology Lab"]},
      {day:"Thursday",group:"A",entries:["MBHA 2122 Aa · Histology Lab","Biochemistry Practical A"]},
      {day:"Thursday",group:"B",entries:["MBHA 2122 Ab · Histology Lab","MBHA 2122 Eb · Dissection Lab"]},
      {day:"Thursday",group:"C",entries:["Biochemistry Practical C","MBHA 2122 Ec · Dissection Lab"]},
      {day:"Friday",group:"A",entries:["MBMP 2311 · CTA Hall","MBMP 2335C · Physiology Lab"]},
    ],
  }],
  3: [{
    label: "Weekly teaching timetable",
    timeBands: ["7–8 AM","8–9 AM","9–10 AM","10–11 AM","11 AM–12 PM","12–1 PM","1–2 PM","2–3 PM","3–4 PM","4–5 PM"],
    rows: [
      {day:"Monday",group:"A",entries:["MBPA 3411 · CTA 6","MBPA 3412 · CTA 3","MBPA 3413 · CTA 3","MBPA 3414 · CTA Hall","MBPA 3611 · CTA Hall"]},
      {day:"Tuesday",group:"A",entries:["Microbiology Practical"]},
      {day:"Wednesday",group:"A",entries:["MBPL 3611 · CTA Hall"]},
      {day:"Thursday",group:"A",entries:["MBMM 3300 · CTA 6","MBMM 3311 · CTA 6"]},
      {day:"Friday",group:"A",entries:["MBPA 3511 · CTA 6","BND 3104 · CTA 6","MBPA 3538 · CTA 6"]},
    ],
  }],
  4: [
    {
      label:"General Surgery rotation grid",
      timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","4–6 PM"],
      rows:[
        {day:"Monday",group:"1",entries:["MBPE 4311 · CTA 3","Change over","MBSG 4640a","Lunch break","MBSG 4612 · CTA 4","Change over","MBSG 4611 · CTA 3"]},
        {day:"Tuesday",group:"1",entries:["MBOG 4211 · CTA 3","MBSG 4613a","MBSG 4626a","MBPE 4312 · CTA 3"]},
        {day:"Tuesday",group:"2",entries:["MBOG 4211 · CTA 3","MBSG 4613b","MBSG 4626b","MBPE 4312 · CTA 3"]},
        {day:"Wednesday",group:"1",entries:["MBIM 4111 · CTA Hall","MBPL 4411 · CTA Hall"]},
        {day:"Wednesday",group:"2",entries:["MBIM 4111 · CTA Hall","MBSG 4639b","MBSG 4640b","MBPL 4411 · CTA Hall"]},
        {day:"Thursday",group:"1",entries:["MBPS 4511 · CTA 6","MBSG 4639a","MBIM 4112 · CTA 3"]},
        {day:"Friday",group:"1",entries:["MBOG 4212 · CTA 3","MBPS 4512 · CTA 3"]},
      ],
    },
    {
      label:"Internal Medicine rotation grid",
      timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","4–6 PM"],
      rows:[
        {day:"Monday",group:"1",entries:["MBPE 4311 · CTA 3","Change over","MBIM 4139a","Lunch break","MBSG 4612 · CTA 4","Change over","MBSG 4611 · CTA 3"]},
        {day:"Monday",group:"2",entries:["MBPE 4311 · CTA 3","Change over","MBIM 4139b","Lunch break","MBSG 4612 · CTA 4","Change over","MBSG 4611 · CTA 3"]},
        {day:"Tuesday",group:"1",entries:["MBOG 4211 · CTA 3","MBIM 4126a","MBPE 4312 · CTA 3"]},
        {day:"Tuesday",group:"2",entries:["MBOG 4211 · CTA 3","MBIM 4126b","MBPE 4312 · CTA 3"]},
        {day:"Wednesday",group:"1",entries:["MBIM 4111 · CTA Hall","MBIM 4113a","MBIM 4140a","MBPL 4411 · CTA Hall"]},
        {day:"Wednesday",group:"2",entries:["MBIM 4111 · CTA Hall","MBIM 4113b","MBIM 4140b","MBPL 4411 · CTA Hall"]},
        {day:"Thursday",group:"1",entries:["MBPS 4511 · CTA 6","MBIM 4112 · CTA 3"]},
        {day:"Friday",group:"1",entries:["MBOG 4212 · CTA 3","MBPS 4512 · CTA 3"]},
      ],
    },
    {
      label:"Obstetrics & Gynaecology rotation grid",
      timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","4–6 PM"],
      rows:[
        {day:"Monday",group:"1",entries:["MBPE 4311 · CTA 3","Change over","Lunch break","MBSG 4612 · CTA 4","Change over","MBSG 4611 · CTA 3"]},
        {day:"Tuesday",group:"1",entries:["MBOG 4211 · CTA 3","MBOG 4213a","MBPE 4312 · CTA 3"]},
        {day:"Tuesday",group:"2",entries:["MBOG 4211 · CTA 3","MBOG 4213b","MBPE 4312 · CTA 3"]},
        {day:"Wednesday",group:"1",entries:["MBIM 4111 · CTA Hall","MBPL 4411 · CTA Hall"]},
        {day:"Thursday",group:"1",entries:["MBPS 4511 · CTA 6","MBOG 4239a","MBIM 4112 · CTA 3"]},
        {day:"Thursday",group:"2",entries:["MBPS 4511 · CTA 6","MBOG 4239b","MBIM 4112 · CTA 3"]},
        {day:"Friday",group:"1",entries:["MBOG 4212 · CTA 3","MBOG 4240a","MBOG 4226a","MBPS 4512 · CTA 3"]},
        {day:"Friday",group:"2",entries:["MBOG 4212 · CTA 3","MBOG 4240b","MBOG 4226b","MBPS 4512 · CTA 3"]},
      ],
    },
    {
      label:"Paediatrics & Child Health rotation grid",
      timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","4–6 PM"],
      rows:[
        {day:"Monday",group:"1",entries:["MBPE 4311 · CTA 3","Change over","MBPE 4313a","Lunch break","MBSG 4612 · CTA 4","Change over","MBSG 4611 · CTA 3"]},
        {day:"Monday",group:"2",entries:["MBPE 4311 · CTA 3","Change over","MBPE 4313b","Lunch break","MBSG 4612 · CTA 4","Change over","MBSG 4611 · CTA 3"]},
        {day:"Tuesday",group:"1",entries:["MBOG 4211 · CTA 3","MBPE 4326a","MBPE 4312 · CTA 3"]},
        {day:"Tuesday",group:"2",entries:["MBOG 4211 · CTA 3","MBPE 4326b","MBPE 4312 · CTA 3"]},
        {day:"Wednesday",group:"1",entries:["MBIM 4111 · CTA Hall","MBPE 4339a","MBPE 4340a","MBPL 4411 · CTA Hall"]},
        {day:"Wednesday",group:"2",entries:["MBIM 4111 · CTA Hall","MBPE 4339b","MBPE 4340b","MBPL 4411 · CTA Hall"]},
        {day:"Thursday",group:"1",entries:["MBPS 4511 · CTA 6","MBIM 4112 · CTA 3"]},
        {day:"Friday",group:"1",entries:["MBOG 4212 · CTA 3","MBPS 4512 · CTA 3"]},
      ],
    },
    {
      label:"Psychiatry & Mental Health rotation grid",
      timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","4–6 PM"],
      rows:[
        {day:"Monday",group:"1",entries:["MBPE 4311 · CTA 3","Change over","MBPS 4526a","Lunch break","Change over","MBPE 4312 · CTA 3","MBSG 4612 · CTA 4","Change over","MBSG 4611 · CTA 3"]},
        {day:"Monday",group:"2",entries:["MBPE 4311 · CTA 3","MBPS 4526b","MBPE 4312 · CTA 3","MBSG 4612 · CTA 4","MBSG 4611 · CTA 3"]},
        {day:"Tuesday",group:"1",entries:["MBOG 4211 · CTA 3","MBPE 4312 · CTA 3"]},
        {day:"Wednesday",group:"1",entries:["MBIM 4111 · CTA Hall","MBPS 4537a","MBPS 4537a","MBPL 4411 · CTA Hall"]},
        {day:"Wednesday",group:"2",entries:["MBIM 4111 · CTA Hall","MBPS 4537b","MBPS 4537b","MBPL 4411 · CTA Hall"]},
        {day:"Thursday",group:"1",entries:["MBPS 4511 · CTA 6","MBPS 4513a","MBIM 4112 · CTA 3"]},
        {day:"Thursday",group:"2",entries:["MBPS 4511 · CTA 6","MBPS 4513b","MBIM 4112 · CTA 3"]},
        {day:"Friday",group:"1",entries:["MBOG 4212 · CTA 3","MBPS 4512 · CTA 3"]},
      ],
    },
  ],
  5: [
    {label:"Orthopedics / Dental — 8 weeks",timeBands:["7–8 AM","8–9 AM","9–10 AM","10–11 AM","11 AM–12 PM","12–1 PM","1–2 PM","2–3 PM","3–4 PM","4–5 PM","5–6 PM"],rows:[
      {day:"Monday",entries:["MBCS 5411","MBCS 5722a","MBCS 5111"]},{day:"Tuesday",entries:["MBCS 5511"]},{day:"Wednesday",entries:["MBCS 5611","MBCS 5722b"]},{day:"Thursday",entries:["MBDS 5811","MBDS 5822 · Clinical Rotation"]},{day:"Friday",entries:["MBCS 5711","MBCS 5722c"]},
    ]},
    {label:"Anaesthesia / ENT — 4 weeks each",timeBands:["7–8 AM","8–9 AM","9–10 AM","10–11 AM","11 AM–12 PM","12–1 PM","1–2 PM","2–3 PM","3–4 PM","4–5 PM","5–6 PM"],rows:[
      {day:"Monday",entries:["MBCS 5411","MBCS 5622a","MBCS 5622b","MBCS 5111"]},{day:"Tuesday",entries:["MBCS 5511","MBCS 5522a","MBCS 5522b"]},{day:"Wednesday",entries:["MBCS 5611","MBCS 5622c"]},{day:"Friday",entries:["MBCS 5711","MBCS 5522c"]},
    ]},
    {label:"Radiology / Ophthalmology — 4 weeks each",timeBands:["7–8 AM","8–9 AM","9–10 AM","10–11 AM","11 AM–12 PM","12–1 PM","1–2 PM","2–3 PM","3–4 PM","4–5 PM","5–6 PM"],rows:[
      {day:"Monday",entries:["MBCS 5411","MBCS 5422a","MBCS 5422b","MBCS 5111"]},{day:"Tuesday",entries:["MBCS 5511"]},{day:"Wednesday",entries:["MBCS 5611"]},{day:"Thursday",entries:["MBCS 5122a","MBCS 5122b","MBCS 5122c","MBCS 5422c"]},{day:"Friday",entries:["MBCS 5711"]},
    ]},
    {label:"Public Health — 8 weeks",timeBands:["7–8 AM","8–9 AM","9–10 AM","10–11 AM","11 AM–12 PM","12–1 PM","1–2 PM","2–3 PM","3–4 PM","4–5 PM","5–6 PM"],rows:[
      {day:"Monday",entries:["MBCS 5411","MBPH 5200","MBCS 5111"]},{day:"Tuesday",entries:["MBCS 5511","MBPH 5100"]},{day:"Wednesday",entries:["MBCS 5611","MBPH 5200"]},{day:"Thursday",entries:["MBHR 5222"]},{day:"Friday",entries:["MBCS 5711","MBCS 5900"]},
    ]},
  ],
  6: [
    {label:"General Surgery — theory / rotations",timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","3–4 PM","4–6:30 PM"],rows:[
      {day:"Monday",group:"A",entries:["MBSG 6811 · CTA 3","Change over","MBSG 6813a","Lunch break","MBSG 6839a","Change over","MBPE 6612"]},
      {day:"Monday",group:"B",entries:["MBCS 5722a (B)","MBCS 5722b (B)"]},{day:"Tuesday",group:"A",entries:["MBIM 6712 · CTA 3","Theatre a","MBPS 6912","MBSG 6812"]},{day:"Tuesday",group:"B",entries:["MBSG 6813b"]},{day:"Wednesday",group:"A",entries:["MBPE 6611","MBSG 6826a","MBPS 6911"]},{day:"Wednesday",group:"B",entries:["MBSG 6826b","MBSG 6839b"]},{day:"Thursday",group:"A",entries:["MBOG 6512","MBSG 6840a","Theatre a","MBOG 6511"]},{day:"Thursday",group:"B",entries:["MBSG 6840b"]},{day:"Friday",group:"A",entries:["MBIM 6711","MBCS5722a (A)","MBCS 5722b (A)","Grandround"]},{day:"Friday",group:"B",entries:["Theatre b"]},
    ]},
    {label:"Internal Medicine — theory / rotations",timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","3–4 PM","4–6:30 PM"],rows:[
      {day:"Monday",group:"A",entries:["MBSG 6811","Change over","Lunch break","Change over","MBPE 6612"]},{day:"Tuesday",group:"A",entries:["MBIM 6712","MBIM 6740a","MBPS 6912","MBSG 6812"]},{day:"Tuesday",group:"B",entries:["MBIM 6740b"]},{day:"Wednesday",group:"A",entries:["MBPE 6611","MBPS 6911"]},{day:"Thursday",group:"A",entries:["MBOG 6512","MBIM 6726a","MBIM 6739a","MBOG 6511"]},{day:"Thursday",group:"B",entries:["MBIM 6726b","MBIM 6739b"]},{day:"Friday",group:"A",entries:["MBIM 6711","MBIM 6713a","Grandround"]},{day:"Friday",group:"B",entries:["MBIM 6713b"]},
    ]},
    {label:"Obstetrics & Gynaecology — theory / rotations",timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","3–4 PM","4–6:30 PM"],rows:[
      {day:"Monday",group:"A",entries:["MBSG 6811","Change over","Lunch break","Change over","MBPE 6612"]},{day:"Tuesday",group:"A",entries:["MBIM 6712","MBOG 6526a","MBPS 6912","MBSG 6812"]},{day:"Tuesday",group:"B",entries:["MBOG 6526b"]},{day:"Wednesday",group:"A",entries:["MBPE 6611","MBPS 6911"]},{day:"Thursday",group:"A",entries:["MBOG 6512","MBOG 6540a","MBOG 6539a","MBOG 6511"]},{day:"Thursday",group:"B",entries:["MBOG 6540b","MBOG 6539b"]},{day:"Friday",group:"A",entries:["MBIM 6711","MBOG 6513a","Grandround"]},{day:"Friday",group:"B",entries:["MBOG 6513b"]},
    ]},
    {label:"Paediatrics & Child Health — theory / rotations",timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","3–4 PM","4–6:30 PM"],rows:[
      {day:"Monday",group:"A",entries:["MBSG 6811","Change over","MBPE 6626a","Lunch break","MBPE 6640a","Change over","MBPE 6612"]},{day:"Monday",group:"B",entries:["MBPE 6626b","MBPE 6640b"]},{day:"Tuesday",group:"A",entries:["MBIM 6712","MBPS 6912","MBSG 6812"]},{day:"Wednesday",group:"A",entries:["MBPE 6611","MBPE 6613a","MBPE 6639a","MBPS 6911"]},{day:"Wednesday",group:"B",entries:["MBPE 6613b","MBPE 6639b"]},{day:"Thursday",group:"A",entries:["MBOG 6512","MBOG 6511"]},{day:"Friday",group:"A",entries:["MBIM 6711","Grandround"]},
    ]},
    {label:"Psychiatry & Mental Health — theory / rotations",timeBands:["7–9 AM","9–9:30 AM","9:30 AM–12 PM","12–1 PM","1–3 PM","3–4 PM","4–6:30 PM"],rows:[
      {day:"Monday",group:"A",entries:["MBSG 6811","Change over","MBPS 6926a","Lunch break","Change over","MBPE 6612"]},{day:"Monday",group:"B",entries:["MBPS 6926b"]},{day:"Tuesday",group:"A",entries:["MBIM 6712","MBPS 6939a","MBPS 6912","MBSG 6812"]},{day:"Tuesday",group:"B",entries:["MBPS 6939b"]},{day:"Wednesday",group:"A",entries:["MBPE 6611","MBPS 6913a","MBPS 6911"]},{day:"Wednesday",group:"B",entries:["MBPS 6913b"]},{day:"Thursday",group:"A",entries:["MBOG 6512","MBPS 6940a","MBOG 6511"]},{day:"Thursday",group:"B",entries:["MBPS 6940b"]},{day:"Friday",group:"A",entries:["MBIM 6711","Grandround"]},
    ]},
  ],
};
