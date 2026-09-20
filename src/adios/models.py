"""Data model for patients, doctor notes, and scheduled follow-ups."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


@dataclass
class Patient:
    doctor_id: str
    name: str
    contact: str  # phone or email used for the follow-up notification
    patient_id: str = field(default_factory=lambda: _new_id("pat"))
    created_at: str = field(default_factory=_now_iso)

    def to_item(self) -> dict:
        return {
            "patientId": self.patient_id,
            "doctorId": self.doctor_id,
            "name": self.name,
            "contact": self.contact,
            "createdAt": self.created_at,
        }

    @staticmethod
    def from_item(item: dict) -> "Patient":
        return Patient(
            patient_id=item["patientId"],
            doctor_id=item["doctorId"],
            name=item["name"],
            contact=item["contact"],
            created_at=item.get("createdAt", _now_iso()),
        )


@dataclass
class Note:
    """A short, long-term note a doctor leaves after a consultation.

    Kept short by design: the goal is a quick "state of the patient" a doctor
    can scan in seconds before a follow-up call, not a full clinical record.
    """

    patient_id: str
    doctor_id: str
    text: str
    note_id: str = field(default_factory=lambda: _new_id("note"))
    created_at: str = field(default_factory=_now_iso)

    def to_item(self) -> dict:
        return {
            "patientId": self.patient_id,
            "noteId": self.note_id,
            "doctorId": self.doctor_id,
            "text": self.text,
            "createdAt": self.created_at,
        }

    @staticmethod
    def from_item(item: dict) -> "Note":
        return Note(
            patient_id=item["patientId"],
            note_id=item["noteId"],
            doctor_id=item["doctorId"],
            text=item["text"],
            created_at=item.get("createdAt", _now_iso()),
        )


@dataclass
class FollowUp:
    patient_id: str
    doctor_id: str
    duration_days: int
    followup_id: str = field(default_factory=lambda: _new_id("fu"))
    created_at: str = field(default_factory=_now_iso)
    scheduled_for: str = ""
    status: str = "pending"  # pending -> notified -> completed
    execution_arn: str = ""

    def __post_init__(self) -> None:
        if not self.scheduled_for:
            created = datetime.fromisoformat(self.created_at)
            self.scheduled_for = (created + timedelta(days=self.duration_days)).isoformat()

    def to_item(self) -> dict:
        return {
            "followupId": self.followup_id,
            "patientId": self.patient_id,
            "doctorId": self.doctor_id,
            "durationDays": self.duration_days,
            "createdAt": self.created_at,
            "scheduledFor": self.scheduled_for,
            "status": self.status,
            "executionArn": self.execution_arn,
        }

    @staticmethod
    def from_item(item: dict) -> "FollowUp":
        return FollowUp(
            followup_id=item["followupId"],
            patient_id=item["patientId"],
            doctor_id=item["doctorId"],
            duration_days=item["durationDays"],
            created_at=item.get("createdAt", _now_iso()),
            scheduled_for=item.get("scheduledFor", ""),
            status=item.get("status", "pending"),
            execution_arn=item.get("executionArn", ""),
        )
