"""Invoked by the Step Functions state machine after its Wait step elapses.

Not an API Gateway route - this is a plain Lambda task target
(infra/statemachine/followup_flow.asl.json -> "SendReminder" state).
"""

from __future__ import annotations

from .. import config, repository
from ..agent.followup_agent import draft_and_send


def handle(event: dict, context=None) -> dict:
    followup_id = event["followupId"]
    patient_id = event["patientId"]
    use_llm = event.get("use_llm", config.USE_LLM_AGENT)

    result = draft_and_send(patient_id, use_llm=use_llm)
    repository.update_followup_status(followup_id, "notified")

    return {"followupId": followup_id, "patientId": patient_id, "result": result}
