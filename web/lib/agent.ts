import { authorizeAgent } from "./cedar";
import { getStore } from "./store";
import type { AgentLogEntry, FollowUp, Note, Patient } from "./types";

/**
 * The follow-up agent. Its message drafting here is a template function, not
 * a live LLM call - Strands Agents SDK (used in the original Python
 * prototype this extends) is Python-only and doesn't run in a Vercel/Node
 * environment. What IS real and identical to the prototype: every action
 * below goes through Cedar (via @cedar-policy/cedar-wasm), evaluating the
 * same policy - the agent can read notes and send a "followup_reminder", and
 * nothing else, checked on every call.
 */

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

function log(entry: Omit<AgentLogEntry, "id" | "at">) {
  const store = getStore();
  store.agentLog.unshift({ ...entry, id: id("log"), at: new Date().toISOString() });
}

function draftMessage(patient: Patient, notes: Note[]): string {
  const latest = notes[notes.length - 1];
  const context = latest ? latest.text.split(".")[0].toLowerCase() : "your recent visit";
  return (
    `Hi ${patient.name.split(" ")[0]}, this is a follow-up reminder regarding your ${patient.cancerType.toLowerCase()} care. ` +
    `Based on your last update (${context}), it's time for your next check-in - please book a visit with your care team soon.`
  );
}

export type ProcessResult = {
  patientId: string;
  patientName: string;
  status: "sent" | "denied" | "error";
  message?: string;
  log: AgentLogEntry[];
};

/** Run the guarded agent for one due follow-up. Mirrors adios.agent.followup_agent.draft_and_send. */
export function processFollowUp(followUp: FollowUp): ProcessResult {
  const store = getStore();
  const patient = store.patients.find((p) => p.id === followUp.patientId);
  if (!patient) throw new Error("unknown patient");

  const readDecision = authorizeAgent("get_patient_notes", patient.id, patient.doctorId);
  log({
    patientId: patient.id,
    action: "get_patient_notes",
    decision: readDecision.allowed ? "ALLOWED" : "DENIED",
    detail: readDecision.allowed ? "agent read patient notes" : readDecision.reason,
  });
  if (!readDecision.allowed) {
    return { patientId: patient.id, patientName: patient.name, status: "denied", log: recent(patient.id) };
  }

  const notes = store.notes.filter((n) => n.patientId === patient.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const message = draftMessage(patient, notes);

  const sendDecision = authorizeAgent("send_notification", patient.id, patient.doctorId, {
    messageKind: "followup_reminder",
  });
  log({
    patientId: patient.id,
    action: "send_notification",
    decision: sendDecision.allowed ? "ALLOWED" : "DENIED",
    detail: sendDecision.allowed ? `sent to ${patient.contact}: "${message}"` : sendDecision.reason,
  });

  if (!sendDecision.allowed) {
    return { patientId: patient.id, patientName: patient.name, status: "denied", log: recent(patient.id) };
  }

  followUp.status = "notified";
  return { patientId: patient.id, patientName: patient.name, status: "sent", message, log: recent(patient.id) };
}

function recent(patientId: string): AgentLogEntry[] {
  return getStore().agentLog.filter((l) => l.patientId === patientId).slice(0, 4);
}
