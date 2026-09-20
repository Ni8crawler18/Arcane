"""The follow-up reminder agent.

Triggered by the Step Functions Wait step once a follow-up's duration has
elapsed (infra/statemachine/followup_flow.asl.json -> notify Lambda ->
adios.handlers.notify). It reads the doctor's notes for context, drafts a
short personalized reminder, and sends it - but every tool call is gated by
the same Cedar policy set the rest of the app uses, so it can never do
anything except read notes and send a "followup_reminder"-kind message.
"""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

from strands import Agent
from strands.models.ollama import OllamaModel
from strands.vended_interventions.cedar import CedarAuthorization

from . import tools

_POLICIES = (Path(__file__).parent.parent / "auth" / "policies.cedar").read_text()

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
# gemma4:e2b was picked because it's already pulled and has tool-calling
# support - swap via OLLAMA_MODEL_ID for any other tool-capable local model.
OLLAMA_MODEL_ID = os.environ.get("OLLAMA_MODEL_ID", "gemma4:e2b")

# Bounds a stuck/slow local model call so a failure is retryable within
# seconds instead of hanging the caller indefinitely.
OLLAMA_TIMEOUT_SECONDS = int(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "120"))


def check_ollama_ready() -> tuple[bool, str]:
    """Fail fast with a clear reason instead of a long hang or a stack trace."""
    try:
        with urllib.request.urlopen(f"{OLLAMA_HOST}/api/tags", timeout=3) as resp:
            data = json.loads(resp.read())
    except Exception as exc:  # noqa: BLE001
        return False, f"Can't reach Ollama at {OLLAMA_HOST} ({exc}). Run `ollama serve`."

    names = [m.get("name", "") for m in data.get("models", [])]
    wanted = OLLAMA_MODEL_ID.split(":")[0]
    if any(n == OLLAMA_MODEL_ID or n.split(":")[0] == wanted for n in names):
        return True, ""
    pulled = ", ".join(names) or "(none)"
    return False, f'Model "{OLLAMA_MODEL_ID}" not pulled. Pulled models: {pulled}. Run `ollama pull {OLLAMA_MODEL_ID}`.'


def build_agent() -> Agent:
    cedar = CedarAuthorization(policies=_POLICIES, principal={"type": "Agent", "id": "followup_bot"})
    model = OllamaModel(
        host=OLLAMA_HOST,
        model_id=OLLAMA_MODEL_ID,
        ollama_client_args={"timeout": OLLAMA_TIMEOUT_SECONDS},
    )
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


def _tool_text(tool_result: dict) -> str:
    """Pull the human-readable text out of a Strands tool-call result."""
    try:
        return tool_result["content"][0]["text"]
    except (KeyError, IndexError, TypeError):
        return str(tool_result)


def draft_and_send(patient_id: str, *, use_llm: bool = False) -> str:
    """Run the follow-up reminder flow for one patient.

    use_llm=False (default) drives the same guarded tools directly with a
    templated message, so the demo works with no Ollama server running.
    use_llm=True lets the agent's model draft the message itself - set this
    once you have `ollama serve` + a pulled model available locally.

    Every tool call below goes through the same CedarAuthorization
    intervention wired up in build_agent() - get_patient_notes and
    send_notification(message_kind="followup_reminder") are the only two
    things this agent is permitted to do (see auth/policies.cedar).
    """
    agent = build_agent()

    if use_llm:
        # Strands' default callback handler already streams the model's
        # reasoning and each tool call to stdout live as it happens - that's
        # the useful part to watch. `result` just repeats the final message,
        # so we return a short marker instead of printing that text twice.
        agent(f"The patient with id {patient_id} is due for a follow-up. Draft and send their reminder.")
        return "(agent finished - see the live reasoning and tool calls above)"

    notes_result = agent.tool.get_patient_notes(patient_id=patient_id)
    notes_text = _tool_text(notes_result)

    message = (
        "Hi! Following up on your recent visit - how are you feeling? "
        "Your doctor would love a quick update, and you're welcome to book a visit if anything's changed."
    )
    send_result = agent.tool.send_notification(
        patient_id=patient_id, message=message, message_kind="followup_reminder"
    )

    verdict = "Cedar ALLOWED" if send_result["status"] == "success" else "Cedar BLOCKED"
    return (
        f"[Cedar] get_patient_notes -> allowed. Notes used:\n  {notes_text}\n\n"
        f"[Cedar] send_notification(message_kind=followup_reminder) -> {verdict}\n"
        f"  {_tool_text(send_result)}"
    )
