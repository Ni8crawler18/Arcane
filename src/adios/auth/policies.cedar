// Doctor-owns-patient access control for Adios.
//
// A doctor may only view/annotate/schedule follow-ups for patients they are
// the treating doctor for. This is the actual point of Cedar here: patient
// notes are sensitive, so "which doctor can see which patient's history" is
// a real requirement, not a demo prop.

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

// The automated follow-up agent may read a patient's notes - it only ever
// operates on a patient_id handed to it by the already-authorized scheduling
// flow (see repository.schedule_followup / auth.authorize), so re-checking
// doctor ownership here isn't needed - but it may send ONLY a low-risk
// "followup_reminder" message, never a free-form one. Anything else must go
// through a human.
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
    context.input.message_kind == "followup_reminder"
};
