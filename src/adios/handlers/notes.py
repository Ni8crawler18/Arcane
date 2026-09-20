"""POST /patients/{patientId}/notes, GET /patients/{patientId}/notes"""

from __future__ import annotations

from .. import repository
from ..auth.authorize import authorize
from . import common


def _load_owned_patient(event: dict, action: str):
    did = common.doctor_id(event)
    patient_id = event["pathParameters"]["patientId"]
    patient = repository.get_patient(patient_id)
    if patient is None:
        return did, patient_id, None, common.response(404, {"error": "patient not found"})

    decision = authorize(did, action, patient_id, owning_doctor_id=patient.doctor_id)
    if not decision.allowed:
        return did, patient_id, patient, common.denied(decision)
    return did, patient_id, patient, None


def add(event: dict, context=None) -> dict:
    try:
        did, patient_id, patient, early_response = _load_owned_patient(event, "add_note")
        if early_response:
            return early_response

        b = common.body(event)
        note = repository.add_note(patient_id, did, b["text"])
        return common.ok(note.to_item())
    except Exception as exc:  # noqa: BLE001
        return common.error(exc)


def list_(event: dict, context=None) -> dict:
    try:
        did, patient_id, patient, early_response = _load_owned_patient(event, "view_notes")
        if early_response:
            return early_response

        query = (event.get("queryStringParameters") or {}).get("q")
        notes = repository.search_notes(patient_id, query) if query else repository.list_notes(patient_id)
        return common.ok([n.to_item() for n in notes])
    except Exception as exc:  # noqa: BLE001
        return common.error(exc)
