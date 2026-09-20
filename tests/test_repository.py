import uuid

from adios import repository


def _unique_doctor() -> str:
    return f"doc_{uuid.uuid4().hex[:8]}"


def test_patient_notes_and_search_roundtrip():
    doctor_id = _unique_doctor()
    patient = repository.create_patient(doctor_id, "Test Patient", "test@example.com")

    repository.add_note(patient.patient_id, doctor_id, "First note about a headache.")
    repository.add_note(patient.patient_id, doctor_id, "Follow-up: headache resolved.")

    notes = repository.list_notes(patient.patient_id)
    assert [n.text for n in notes] == [
        "First note about a headache.",
        "Follow-up: headache resolved.",
    ]

    hits = repository.search_notes(patient.patient_id, "headache")
    assert len(hits) == 2


def test_followup_scheduling_and_status_update():
    doctor_id = _unique_doctor()
    patient = repository.create_patient(doctor_id, "Test Patient 2", "test2@example.com")

    followup = repository.schedule_followup(patient.patient_id, doctor_id, duration_days=0)
    assert followup.status == "pending"

    due = [f.followup_id for f in repository.list_due_followups()]
    assert followup.followup_id in due

    updated = repository.update_followup_status(followup.followup_id, "notified")
    assert updated.status == "notified"
