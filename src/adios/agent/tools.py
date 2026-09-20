"""Tools the follow-up agent is allowed to call.

Kept deliberately small: reading notes and sending one kind of message. The
Cedar policy in adios/auth/policies.cedar is what actually enforces that
`send_notification` may only fire with message_kind="followup_reminder" -
these functions do the work, not the gating.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from strands import tool

from .. import config, repository

logger = logging.getLogger(__name__)


@tool
def get_patient_notes(patient_id: str) -> str:
    """Return the doctor's short notes on file for a patient, oldest first."""
    notes = repository.list_notes(patient_id)
    if not notes:
        return "No notes on file for this patient."
    return "\n".join(f"- ({n.created_at}) {n.text}" for n in notes)


def _sent_log_path() -> Path:
    d = Path(config.LOCAL_DATA_DIR)
    d.mkdir(parents=True, exist_ok=True)
    return d / "sent_notifications.jsonl"


@tool
def send_notification(patient_id: str, message: str, message_kind: str = "followup_reminder") -> str:
    """Send a follow-up message to a patient.

    message_kind must stay "followup_reminder" - that's the only kind of
    message this agent is authorized (via Cedar) to send unsupervised.
    """
    patient = repository.get_patient(patient_id)
    contact = patient.contact if patient else "unknown-contact"
    record = {
        "patientId": patient_id,
        "contact": contact,
        "message": message,
        "messageKind": message_kind,
        "sentAt": datetime.now(timezone.utc).isoformat(),
    }
    # Ship It track: swap this for an SNS publish() call. For Build It we
    # just log it locally so the demo is verifiable without any account.
    with _sent_log_path().open("a") as f:
        f.write(json.dumps(record) + "\n")
    logger.info("notification sent to %s (patient %s): %s", contact, patient_id, message)
    return f"Sent to {contact}: {message}"
