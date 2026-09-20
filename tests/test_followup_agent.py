"""Guardrail tests using direct tool calls - no Ollama server required.

`agent.tool.<name>()` still runs through the registered Cedar intervention,
so this validates the actual enforcement path without needing a live model.
"""

import uuid

from adios import repository
from adios.agent.followup_agent import build_agent


def _patient():
    doctor_id = f"doc_{uuid.uuid4().hex[:8]}"
    patient = repository.create_patient(doctor_id, "Guardrail Test Patient", "guard@example.com")
    repository.add_note(patient.patient_id, doctor_id, "Recovering well.")
    return patient


def test_reminder_message_is_allowed():
    patient = _patient()
    agent = build_agent()

    result = agent.tool.send_notification(
        patient_id=patient.patient_id, message="How are you feeling?", message_kind="followup_reminder"
    )
    assert result["status"] == "success"


def test_non_reminder_message_is_denied():
    patient = _patient()
    agent = build_agent()

    result = agent.tool.send_notification(
        patient_id=patient.patient_id, message="Your bill is overdue", message_kind="billing_demand"
    )
    assert result["status"] == "error"
    assert "DENIED" in result["content"][0]["text"]


def test_get_patient_notes_is_allowed_for_the_agent():
    patient = _patient()
    agent = build_agent()

    result = agent.tool.get_patient_notes(patient_id=patient.patient_id)
    assert result["status"] == "success"
    assert "Recovering well" in result["content"][0]["text"]
