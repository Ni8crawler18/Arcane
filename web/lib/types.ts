export type Doctor = {
  id: string;
  name: string;
  specialty: string;
};

export type Patient = {
  id: string;
  doctorId: string;
  name: string;
  contact: string;
  cancerType: string;
  stage: string;
  createdAt: string;
};

export type Note = {
  id: string;
  patientId: string;
  doctorId: string;
  text: string;
  createdAt: string;
};

export type FollowUpStatus = "pending" | "notified";

export type FollowUp = {
  id: string;
  patientId: string;
  doctorId: string;
  dueAt: string;
  urgency: "routine" | "priority" | "urgent";
  status: FollowUpStatus;
  createdAt: string;
};

export type AgentLogEntry = {
  id: string;
  patientId: string;
  action: "get_patient_notes" | "send_notification";
  decision: "ALLOWED" | "DENIED";
  detail: string;
  at: string;
};
