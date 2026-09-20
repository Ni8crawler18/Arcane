#!/usr/bin/env python3
"""A menu-driven CLI a doctor can actually sit down and use - no curl, no
JSON, just numbered choices. Same data layer as the API (repository.py) and
the same Cedar access control, just without needing a second terminal or an
HTTP client to try it.

Usage: python3 scripts/doctor_cli.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import logging  # noqa: E402

logging.basicConfig(level=logging.ERROR)  # keep the screen clean

from adios import repository  # noqa: E402
from adios.agent import followup_agent  # noqa: E402
from adios.auth.authorize import authorize  # noqa: E402
from adios.handlers import notify  # noqa: E402
from seed_demo_data import DOCTORS, seed  # noqa: E402

DOCTOR_IDS = list(DOCTORS.keys())


def pause() -> None:
    input("\nPress Enter to continue...")


def choose_doctor() -> str:
    print("\nWho's using this?")
    for i, did in enumerate(DOCTOR_IDS, 1):
        print(f"  {i}. {DOCTORS[did]}")
    choice = input("> ").strip()
    try:
        return DOCTOR_IDS[int(choice) - 1]
    except (ValueError, IndexError):
        print("Didn't catch that - defaulting to the first doctor.")
        return DOCTOR_IDS[0]


def pick_patient(doctor_id: str):
    patients = repository.list_patients_for_doctor(doctor_id)
    if not patients:
        print("You have no patients yet.")
        return None
    print("\nYour patients:")
    for i, p in enumerate(patients, 1):
        print(f"  {i}. {p.name}  ({p.contact})")
    choice = input("Pick a number> ").strip()
    try:
        return patients[int(choice) - 1]
    except (ValueError, IndexError):
        print("Not a valid choice.")
        return None


def _check(doctor_id: str, action: str, patient) -> bool:
    """Run the real Cedar check and print the decision, instead of hiding it."""
    decision = authorize(doctor_id, action, patient.patient_id, owning_doctor_id=patient.doctor_id)
    if decision.allowed:
        print(f"[Cedar] {action} -> ALLOWED ({doctor_id} owns this patient)")
    else:
        print(f"[Cedar] {action} -> DENIED ({decision.reason})")
    return decision.allowed


def view_patients(doctor_id: str) -> None:
    patients = repository.list_patients_for_doctor(doctor_id)
    if not patients:
        print("You have no patients yet - add one from the menu.")
        return
    print(f"\n{DOCTORS[doctor_id]} - {len(patients)} patient(s):\n")
    for p in patients:
        notes = repository.list_notes(p.patient_id)
        print(f"  {p.name}  ({p.contact})")
        print(f"    {len(notes)} note(s) on file - most recent:")
        if notes:
            print(f'      "{notes[-1].text}"')
        print()


def add_patient(doctor_id: str) -> None:
    name = input("Patient name: ").strip()
    contact = input("Patient contact (phone or email): ").strip()
    if not name or not contact:
        print("Both name and contact are required.")
        return
    p = repository.create_patient(doctor_id, name, contact)
    print(f"\nAdded {p.name}. patient_id = {p.patient_id}")


def view_notes(doctor_id: str) -> None:
    patient = pick_patient(doctor_id)
    if not patient:
        return
    if not _check(doctor_id, "view_notes", patient):
        return
    notes = repository.list_notes(patient.patient_id)
    print(f"\n{patient.name}'s history ({len(notes)} note(s)):\n")
    for n in notes:
        print(f"  ({n.created_at[:10]}) {n.text}")


def add_note(doctor_id: str) -> None:
    patient = pick_patient(doctor_id)
    if not patient:
        return
    if not _check(doctor_id, "add_note", patient):
        return
    text = input(f"Note for {patient.name}: ").strip()
    if not text:
        print("Nothing entered - not saved.")
        return
    repository.add_note(patient.patient_id, doctor_id, text)
    print("Saved.")


def search_notes(doctor_id: str) -> None:
    patient = pick_patient(doctor_id)
    if not patient:
        return
    if not _check(doctor_id, "search_notes", patient):
        return
    query = input("Search for: ").strip()
    hits = repository.search_notes(patient.patient_id, query)
    if not hits:
        print("No matching notes.")
        return
    print(f"\n{len(hits)} match(es):\n")
    for n in hits:
        print(f"  ({n.created_at[:10]}) {n.text}")


def schedule_followup(doctor_id: str) -> None:
    patient = pick_patient(doctor_id)
    if not patient:
        return
    if not _check(doctor_id, "schedule_followup", patient):
        return
    days = input(f"Check back on {patient.name} in how many days? (0 = today) ").strip()
    try:
        days = int(days)
    except ValueError:
        print("Enter a whole number of days.")
        return
    followup = repository.schedule_followup(patient.patient_id, doctor_id, duration_days=days)
    print(f"Done - {patient.name} will be notified automatically on {followup.scheduled_for[:10]}.")
    if days <= 0:
        print("It's already due - use option 7 to see the guarded agent send it now.")


def process_due_followups(doctor_id: str) -> None:
    """The one place the Strands Agents SDK + Cedar actually run in this CLI.

    Everywhere else, Cedar checks a *doctor's* access. Here, Cedar checks
    what the *agent itself* is allowed to do - it can read notes and send a
    followup_reminder, and nothing else (see auth/policies.cedar). This
    always uses the real local model - if it fails or times out, nothing is
    marked as sent, so choosing this option again just retries cleanly.
    """
    due = [f for f in repository.list_due_followups() if f.doctor_id == doctor_id]
    if not due:
        print("No follow-ups due right now for your patients.")
        print("(schedule one with 0 days from option 6 to see this fire immediately)")
        return

    ready, why_not = followup_agent.check_ollama_ready()
    if not ready:
        print(f"Can't run the agent right now: {why_not}")
        print("Fix that and choose this option again - these follow-ups are still pending.")
        return

    for f in due:
        patient = repository.get_patient(f.patient_id)
        print(f"\nFollow-up due for {patient.name}.")
        print("Handing off to the Strands Agent - every tool call it makes below is Cedar-checked:\n")
        try:
            result = notify.handle({"followupId": f.followup_id, "patientId": f.patient_id, "use_llm": True})
        except Exception as exc:  # noqa: BLE001
            print(f"\nAgent run failed: {exc}")
            print(f"{patient.name}'s follow-up is still pending - choose this option again to retry.")
            continue
        print(result["result"])


def lookup_patient(doctor_id: str) -> None:
    """Look up any patient by ID - not just your own.

    A real reason this exists: someone hands you a patient_id (a referral, a
    covering colleague) and you look it up. Cedar decides whether you're
    actually allowed to see them - try a patient_id printed for a different
    doctor at startup and it will be denied.
    """
    patient_id = input("Patient ID: ").strip()
    patient = repository.get_patient(patient_id)
    if not patient:
        print("No such patient.")
        return
    decision = authorize(doctor_id, "view_patient", patient.patient_id, owning_doctor_id=patient.doctor_id)
    if not decision.allowed:
        print(f"[Cedar] view_patient -> DENIED ({decision.reason})")
        return
    print(f"[Cedar] view_patient -> ALLOWED ({doctor_id} owns this patient)")
    print(f"{patient.name}  ({patient.contact})")


MENU = """
--------------------------------------------------
 1. View my patients
 2. Add a new patient
 3. View a patient's note history
 4. Add a note after a consultation
 5. Search a patient's notes
 6. Schedule a follow-up
 7. Check for due follow-ups now (Strands Agent + Cedar)
 8. Look up a patient by ID (any doctor's)
 9. Switch doctor
 0. Quit
--------------------------------------------------"""


def main() -> None:
    print("Loading patients...\n")
    for r in seed():
        print(f"  {r['name']:<12} patient_id={r['patient_id']}  ({r['doctor']})")

    doctor_id = choose_doctor()

    actions = {
        "1": view_patients,
        "2": add_patient,
        "3": view_notes,
        "4": add_note,
        "5": search_notes,
        "6": schedule_followup,
        "7": process_due_followups,
        "8": lookup_patient,
    }

    while True:
        print(f"\nLogged in as: {DOCTORS[doctor_id]}")
        print(MENU)
        choice = input("> ").strip()
        if choice == "0":
            print("Bye.")
            return
        if choice == "9":
            doctor_id = choose_doctor()
            continue
        action = actions.get(choice)
        if not action:
            print("Not a valid option.")
            continue
        action(doctor_id)
        pause()


if __name__ == "__main__":
    main()
