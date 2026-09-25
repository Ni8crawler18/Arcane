import type { AgentLogEntry, Doctor, FollowUp, Note, Patient } from "./types";

/**
 * In-memory store, seeded on first import. This mirrors the same fallback
 * philosophy as the Python prototype (adios/db.py): a real deployment would
 * swap this for a hosted database (Postgres, DynamoDB, ...), but for a demo
 * dashboard this keeps setup to zero - no database to provision to try it.
 *
 * Kept on `globalThis` so Next.js dev-mode hot reloads don't wipe it.
 */

type Store = {
  doctors: Doctor[];
  patients: Patient[];
  notes: Note[];
  followUps: FollowUp[];
  agentLog: AgentLogEntry[];
};

const g = globalThis as unknown as { __oncofollowStore?: Store };

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

function seed(): Store {
  const doctors: Doctor[] = [
    { id: "dr_rao", name: "Dr. Ananya Rao", specialty: "Medical Oncology" },
    { id: "dr_khan", name: "Dr. Imran Khan", specialty: "Surgical Oncology" },
  ];

  const patientsSeed: Array<Omit<Patient, "id" | "createdAt"> & { notes: string[]; dueInDays: number; urgency: FollowUp["urgency"] }> = [
    {
      doctorId: "dr_rao",
      name: "Meera Iyer",
      contact: "meera.iyer@example.com",
      cancerType: "Breast cancer",
      stage: "Post-lumpectomy, 6 months out",
      notes: [
        "Lumpectomy completed, healing well, no signs of infection.",
        "3-month check: mammogram clear, mild lymphedema in left arm, referred to physiotherapy.",
        "6-month check: lymphedema improved, patient reports feeling well overall.",
      ],
      dueInDays: -3,
      urgency: "urgent",
    },
    {
      doctorId: "dr_rao",
      name: "Rohan Das",
      contact: "+91-91234-56789",
      cancerType: "Colorectal cancer",
      stage: "Post-chemotherapy, surveillance phase",
      notes: [
        "Completed final chemo cycle, moderate fatigue expected to ease over coming weeks.",
        "1-month post-chemo: bloodwork stable, scheduling surveillance CT.",
      ],
      dueInDays: 0,
      urgency: "urgent",
    },
    {
      doctorId: "dr_khan",
      name: "Vikram Nair",
      contact: "+91-98765-43210",
      cancerType: "Hodgkin lymphoma",
      stage: "In remission, annual surveillance",
      notes: [
        "1-year remission mark reached, patient asymptomatic.",
        "Annual scan clear, continuing routine surveillance schedule.",
      ],
      dueInDays: 45,
      urgency: "routine",
    },
    {
      doctorId: "dr_khan",
      name: "Sunita Verma",
      contact: "sunita.verma@example.com",
      cancerType: "Cervical cancer",
      stage: "Post-radiation, recurrence watch",
      notes: [
        "Radiation therapy completed, mild fibrosis noted, expected side effect.",
        "3-month check overdue - patient has not responded to two prior contact attempts.",
      ],
      dueInDays: -14,
      urgency: "urgent",
    },
  ];

  const patients: Patient[] = [];
  const notes: Note[] = [];
  const followUps: FollowUp[] = [];

  for (const p of patientsSeed) {
    const patientId = id("pat");
    const createdAt = daysFromNow(-120);
    patients.push({
      id: patientId,
      doctorId: p.doctorId,
      name: p.name,
      contact: p.contact,
      cancerType: p.cancerType,
      stage: p.stage,
      createdAt,
    });
    p.notes.forEach((text, i) => {
      notes.push({
        id: id("note"),
        patientId,
        doctorId: p.doctorId,
        text,
        createdAt: daysFromNow(-90 + i * 30),
      });
    });
    followUps.push({
      id: id("fu"),
      patientId,
      doctorId: p.doctorId,
      dueAt: daysFromNow(p.dueInDays),
      urgency: p.urgency,
      status: "pending",
      createdAt: daysFromNow(-30),
    });
  }

  return { doctors, patients, notes, followUps, agentLog: [] };
}

export function getStore(): Store {
  if (!g.__oncofollowStore) {
    g.__oncofollowStore = seed();
  }
  return g.__oncofollowStore;
}

export function resetStore(): Store {
  g.__oncofollowStore = seed();
  return g.__oncofollowStore;
}
