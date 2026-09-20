"""The follow-up reminder agent.

Triggered by the Step Functions Wait step once a follow-up's duration has
elapsed (infra/statemachine/followup_flow.asl.json -> notify Lambda ->
adios.handlers.notify). It reads the doctor's notes for context, drafts a
short personalized reminder, and sends it - but every tool call is gated by
the same Cedar policy set the rest of the app uses, so it can never do
anything except read notes and send a "followup_reminder"-kind message.
"""

from __future__ import annotations

import os
from pathlib import Path

from strands import Agent
from strands.models.ollama import OllamaModel
from strands.vended_interventions.cedar import CedarAuthorization

from . import tools

_POLICIES = (Path(__file__).parent.parent / "auth" / "policies.cedar").read_text()

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL_ID = os.environ.get("OLLAMA_MODEL_ID", "llama3.2")


def build_agent() -> Agent:
    cedar = CedarAuthorization(policies=_POLICIES, principal={"type": "Agent", "id": "followup_bot"})
    model = OllamaModel(host=OLLAMA_HOST, model_id=OLLAMA_MODEL_ID)
    return Agent(
        model=model,
        tools=[tools.get_patient_notes, tools.send_notification],
        interventions=[cedar],
        system_prompt=(
            "You draft short, warm follow-up messages for patients on behalf of their doctor. "
            "Always call get_patient_notes first to understand the patient's condition, then call "
            "send_notification with message_kind='followup_reminder'. Keep messages under 3 sentences, "
            "reference their specific condition, and never give new medical advice - only ask how "
            "they're doing and invite them to book a visit if needed."
        ),
    )


def draft_and_send(patient_id: str, *, use_llm: bool = False) -> str:
    """Run the follow-up reminder flow for one patient.

    use_llm=False (default) drives the same guarded tools directly with a
    templated message, so the demo works with no Ollama server running.
    use_llm=True lets the agent's model draft the message itself - set this
    once you have `ollama serve` + a pulled model available locally.
    """
    agent = build_agent()

    if use_llm:
        result = agent(
            f"The patient with id {patient_id} is due for a follow-up. Draft and send their reminder."
        )
        return str(result)

    notes_summary = agent.tool.get_patient_notes(patient_id=patient_id)
    message = (
        "Hi! Following up on your recent visit - how are you feeling? "
        "Your doctor would love a quick update, and you're welcome to book a visit if anything's changed."
    )
    send_result = agent.tool.send_notification(
        patient_id=patient_id, message=message, message_kind="followup_reminder"
    )
    return f"{send_result}\n\n(context used - notes on file:\n{notes_summary})"
