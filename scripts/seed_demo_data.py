#!/usr/bin/env python3
"""Seeds realistic-looking demo data: 2 doctors, 4 patients, multi-visit note
histories, and follow-ups in a few different states (already due, overdue,
and upcoming) so a demo doesn't start from an empty, unconvincing database.

Safe to run standalone (`python3 scripts/seed_demo_data.py`) against real
LocalStack once it's deployed, or imported and called by
`scripts/local_server.py`, which seeds the same data into its in-memory
fallback automatically on startup.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from adios import repository  # noqa: E402

DOCTORS = {
    "dr_mehta": "Dr. Priya Mehta (Orthopedics)",
    "dr_khan": "Dr. Imran Khan (General Medicine)",
}

PATIENTS = [
    {
        "doctor_id": "dr_mehta",
        "name": "Asha Rao",
        "contact": "asha.rao@example.com",
        "notes": [
            "Initial visit: right knee ACL reconstruction, 2 weeks post-op. Mild swelling, prescribed rest, ice, and elevation.",
            "Week 4: swelling down significantly, started supervised physiotherapy, walking short distances without support.",
            "Week 6: full range of motion improving, no pain reported at rest. Cleared for light daily activity.",
        ],
        "followup_duration_days": 0,  # due right now - good for a live demo
    },
    {
        "doctor_id": "dr_mehta",
        "name": "Vikram Nair",
        "contact": "+91-98765-43210",
        "notes": [
            "New patient: chronic lower back pain, likely postural, works a desk job. Advised stretches + ergonomic changes.",
            "2-week check-in: reports 30% improvement, still some stiffness in the morning.",
        ],
        "followup_duration_days": 5,  # not due yet - shows the "pending" state
    },
    {
        "doctor_id": "dr_khan",
        "name": "Meera Iyer",
        "contact": "meera.iyer@example.com",
        "notes": [
            "Routine prenatal check, 24 weeks. Blood pressure normal, weight gain on track.",
            "28-week visit: mild anemia noted, started iron supplementation.",
            "32-week visit: hemoglobin improved, patient feeling well, no swelling or headaches reported.",
        ],
        "followup_duration_days": 0,  # due right now
    },
    {
        "doctor_id": "dr_khan",
        "name": "Rohan Das",
        "contact": "+91-91234-56789",
        "notes": [
            "Type 2 diabetes, newly diagnosed. Started on metformin, discussed diet changes.",
            "1-month check-in: fasting glucose improved but still above target, reinforced diet adherence.",
        ],
        "followup_duration_days": -2,  # overdue - the reminder should have gone out 2 days ago
    },
]


def seed() -> list[dict]:
    created = []
    for entry in PATIENTS:
        patient = repository.create_patient(entry["doctor_id"], entry["name"], entry["contact"])
        for note_text in entry["notes"]:
            repository.add_note(patient.patient_id, entry["doctor_id"], note_text)
        followup = repository.schedule_followup(
            patient.patient_id, entry["doctor_id"], duration_days=entry["followup_duration_days"]
        )
        created.append(
            {
                "doctor": DOCTORS[entry["doctor_id"]],
                "doctor_id": entry["doctor_id"],
                "patient_id": patient.patient_id,
                "name": patient.name,
                "followup_id": followup.followup_id,
                "followup_status": followup.status,
                "followup_due": followup.scheduled_for,
            }
        )
    return created


if __name__ == "__main__":
    rows = seed()
    print(f"Seeded {len(rows)} patients across {len(DOCTORS)} doctors:\n")
    for r in rows:
        print(f"- {r['name']} (patient_id={r['patient_id']}) under {r['doctor']}")
        print(f"    follow-up {r['followup_id']}: {r['followup_status']}, due {r['followup_due']}")
