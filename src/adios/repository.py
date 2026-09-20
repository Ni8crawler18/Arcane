"""Application-level CRUD operations for patients, notes, and follow-ups."""

from __future__ import annotations

from . import db, search
from .models import FollowUp, Note, Patient


def create_patient(doctor_id: str, name: str, contact: str) -> Patient:
    patient = Patient(doctor_id=doctor_id, name=name, contact=contact)
    db.patients_table().put_item(patient.to_item())
    return patient


def get_patient(patient_id: str) -> Patient | None:
    item = db.patients_table().get_item({"patientId": patient_id})
    return Patient.from_item(item) if item else None


def list_patients_for_doctor(doctor_id: str) -> list[Patient]:
    items = db.patients_table().scan(lambda i: i["doctorId"] == doctor_id)
    return [Patient.from_item(i) for i in items]


def add_note(patient_id: str, doctor_id: str, text: str) -> Note:
    note = Note(patient_id=patient_id, doctor_id=doctor_id, text=text)
    item = note.to_item()
    db.notes_table().put_item(item)
    search.index_note(item)
    return note


def list_notes(patient_id: str) -> list[Note]:
    """Notes for a patient, oldest first.

    Sorted by createdAt rather than relying on the table's noteId sort key
    order, since noteId is a random suffix (unique, not time-sortable).
    """
    items = db.notes_table().query_by_pk(patient_id)
    return sorted((Note.from_item(i) for i in items), key=lambda n: n.created_at)


def search_notes(patient_id: str, query: str) -> list[Note]:
    return [Note.from_item(i) for i in search.search_notes(patient_id, query)]


def schedule_followup(patient_id: str, doctor_id: str, duration_days: int) -> FollowUp:
    followup = FollowUp(patient_id=patient_id, doctor_id=doctor_id, duration_days=duration_days)
    db.followups_table().put_item(followup.to_item())
    return followup


def get_followup(followup_id: str) -> FollowUp | None:
    item = db.followups_table().get_item({"followupId": followup_id})
    return FollowUp.from_item(item) if item else None


def update_followup_status(followup_id: str, status: str, execution_arn: str = "") -> FollowUp:
    followup = get_followup(followup_id)
    if followup is None:
        raise ValueError(f"unknown follow-up {followup_id}")
    followup.status = status
    if execution_arn:
        followup.execution_arn = execution_arn
    db.followups_table().put_item(followup.to_item())
    return followup


def list_due_followups() -> list[FollowUp]:
    """Follow-ups whose wait has elapsed but haven't been notified yet.

    In production this is driven by the Step Functions Wait state
    (infra/statemachine/followup_flow.asl.json) firing per follow-up, not by
    polling this function - it exists mainly for the demo script and for a
    catch-up sweep if a Step Functions execution was ever missed.
    """
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    items = db.followups_table().scan(lambda i: i["status"] == "pending" and i["scheduledFor"] <= now)
    return [FollowUp.from_item(i) for i in items]
