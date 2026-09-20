"""POST /patients, GET /patients/{patientId}"""

from __future__ import annotations

from .. import repository
from ..auth.authorize import authorize
from . import common


def create(event: dict, context=None) -> dict:
    try:
        did = common.doctor_id(event)
        b = common.body(event)
        patient = repository.create_patient(doctor_id=did, name=b["name"], contact=b["contact"])
        return common.ok(patient.to_item())
    except Exception as exc:  # noqa: BLE001
        return common.error(exc)


def get(event: dict, context=None) -> dict:
    try:
        did = common.doctor_id(event)
        patient_id = event["pathParameters"]["patientId"]
        patient = repository.get_patient(patient_id)
        if patient is None:
            return common.response(404, {"error": "patient not found"})

        decision = authorize(did, "view_patient", patient_id, owning_doctor_id=patient.doctor_id)
        if not decision.allowed:
            return common.denied(decision)

        return common.ok(patient.to_item())
    except Exception as exc:  # noqa: BLE001
        return common.error(exc)
