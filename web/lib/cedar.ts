import { isAuthorized } from "@cedar-policy/cedar-wasm/nodejs";

/**
 * Real Cedar policy evaluation (via @cedar-policy/cedar-wasm - the official
 * WASM build of the same engine `cedarpy` wraps in the Python prototype),
 * not a reimplemented if-check. One rule: a doctor may only act on patients
 * they treat. The automated agent may read notes and send exactly one kind
 * of message, and nothing else - checked the same way.
 */
export const POLICY_TEXT = `
permit(
    principal,
    action in [
        Action::"view_patient",
        Action::"add_note",
        Action::"view_notes",
        Action::"search_notes",
        Action::"schedule_followup"
    ],
    resource
)
when {
    resource.doctor == principal
};

permit(
    principal == Agent::"followup_bot",
    action == Action::"get_patient_notes",
    resource
);

permit(
    principal == Agent::"followup_bot",
    action == Action::"send_notification",
    resource
)
when {
    context.messageKind == "followup_reminder"
};
`;

type EntityRef = { type: string; id: string };

export type AuthzDecision = {
  allowed: boolean;
  reason: string;
};

function patientEntities(patientId: string, owningDoctorId: string) {
  return [
    { uid: { type: "Doctor", id: owningDoctorId }, attrs: {}, parents: [] },
    {
      uid: { type: "Patient", id: patientId },
      attrs: { doctor: { __entity: { type: "Doctor", id: owningDoctorId } } },
      parents: [],
    },
  ];
}

function runAuthorization(
  principal: EntityRef,
  action: string,
  resource: EntityRef,
  entities: unknown[],
  context: Record<string, unknown> = {}
): AuthzDecision {
  const result = isAuthorized({
    principal,
    action: { type: "Action", id: action },
    resource,
    context: context as never,
    policies: { staticPolicies: POLICY_TEXT },
    entities: entities as never,
  });

  if (result.type === "failure") {
    return { allowed: false, reason: result.errors.map((e) => e.message).join("; ") || "Cedar evaluation failed" };
  }

  const { decision, diagnostics } = result.response;
  if (decision === "allow") {
    return { allowed: true, reason: "" };
  }
  const reasons = diagnostics.errors.map((e) => e.error.message);
  return { allowed: false, reason: reasons.join("; ") };
}

/** Can `doctorId` perform `action` on the patient owned by `owningDoctorId`? */
export function authorizeDoctor(
  doctorId: string,
  action: "view_patient" | "add_note" | "view_notes" | "search_notes" | "schedule_followup",
  patientId: string,
  owningDoctorId: string
): AuthzDecision {
  const decision = runAuthorization(
    { type: "Doctor", id: doctorId },
    action,
    { type: "Patient", id: patientId },
    patientEntities(patientId, owningDoctorId)
  );
  if (!decision.allowed && !decision.reason) {
    decision.reason = `doctor ${doctorId} does not own patient ${patientId}`;
  }
  return decision;
}

/** Can the follow-up agent perform `action` on this patient? */
export function authorizeAgent(
  action: "get_patient_notes" | "send_notification",
  patientId: string,
  owningDoctorId: string,
  context: Record<string, unknown> = {}
): AuthzDecision {
  return runAuthorization(
    { type: "Agent", id: "followup_bot" },
    action,
    { type: "Patient", id: patientId },
    patientEntities(patientId, owningDoctorId),
    context
  );
}
