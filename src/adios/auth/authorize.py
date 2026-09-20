"""Cedar-backed authorization for patient/note/follow-up access.

Every handler that touches a patient's record calls `authorize()` first. The
entity graph is built on the fly from the patient's `doctorId` field, so a
doctor is only ever authorized for patients they actually own - no separate
permissions table to keep in sync.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cedarpy

_POLICY_PATH = Path(__file__).parent / "policies.cedar"
_POLICIES = _POLICY_PATH.read_text()


@dataclass
class AuthzDecision:
    allowed: bool
    reason: str = ""


def _patient_entities(patient_id: str, owning_doctor_id: str) -> list[dict]:
    return [
        {"uid": {"type": "Doctor", "id": owning_doctor_id}, "attrs": {}, "parents": []},
        {
            "uid": {"type": "Patient", "id": patient_id},
            "attrs": {"doctor": {"__entity": {"type": "Doctor", "id": owning_doctor_id}}},
            "parents": [],
        },
    ]


def authorize(doctor_id: str, action: str, patient_id: str, owning_doctor_id: str) -> AuthzDecision:
    """Can `doctor_id` perform `action` on the patient owned by `owning_doctor_id`?"""
    request = {
        "principal": f'Doctor::"{doctor_id}"',
        "action": f'Action::"{action}"',
        "resource": f'Patient::"{patient_id}"',
        "context": {},
    }
    entities = _patient_entities(patient_id, owning_doctor_id)
    result = cedarpy.is_authorized(request, _POLICIES, entities)
    if result.allowed:
        return AuthzDecision(allowed=True)
    reasons = list(result.diagnostics.reasons) if result.diagnostics.reasons else []
    return AuthzDecision(allowed=False, reason=f"doctor {doctor_id} does not own patient {patient_id}" + (f" ({', '.join(reasons)})" if reasons else ""))
