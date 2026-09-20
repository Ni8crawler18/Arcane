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

logging.basicConfig(level=logging.ERROR)  # keep the screen clean for a demo

from adios import repository  # noqa: E402
from adios.auth.authorize import authorize  # noqa: E402
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
    decision = authorize(doctor_id, "view_notes", patient.patient_id, owning_doctor_id=patient.doctor_id)
    if not decision.allowed:
        print(f"Denied: {decision.reason}")
        return
    notes = repository.list_notes(patient.patient_id)
    print(f"\n{patient.name}'s history ({len(notes)} note(s)):\n")
    for n in notes:
        print(f"  ({n.created_at[:10]}) {n.text}")


def add_note(doctor_id: str) -> None:
    patient = pick_patient(doctor_id)
    if not patient:
        return
    decision = authorize(doctor_id, "add_note", patient.patient_id, owning_doctor_id=patient.doctor_id)
    if not decision.allowed:
        print(f"Denied: {decision.reason}")
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
    decision = authorize(doctor_id, "search_notes", patient.patient_id, owning_doctor_id=patient.doctor_id)
    if not decision.allowed:
        print(f"Denied: {decision.reason}")
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
    decision = authorize(doctor_id, "schedule_followup", patient.patient_id, owning_doctor_id=patient.doctor_id)
    if not decision.allowed:
        print(f"Denied: {decision.reason}")
        return
    days = input(f"Check back on {patient.name} in how many days? ").strip()
    try:
        days = int(days)
    except ValueError:
        print("Enter a whole number of days.")
        return
    followup = repository.schedule_followup(patient.patient_id, doctor_id, duration_days=days)
    print(f"Done - {patient.name} will be notified automatically on {followup.scheduled_for[:10]}.")


MENU = """
--------------------------------------------------
 1. View my patients
 2. Add a new patient
 3. View a patient's note history
 4. Add a note after a consultation
 5. Search a patient's notes
 6. Schedule a follow-up
 7. Switch doctor
 0. Quit
--------------------------------------------------"""


def main() -> None:
    print("Seeding sample patients so there's something to work with...")
    seed()

    doctor_id = choose_doctor()

    actions = {
        "1": view_patients,
        "2": add_patient,
        "3": view_notes,
        "4": add_note,
        "5": search_notes,
        "6": schedule_followup,
    }

    while True:
        print(f"\nLogged in as: {DOCTORS[doctor_id]}")
        print(MENU)
        choice = input("> ").strip()
        if choice == "0":
            print("Bye.")
            return
        if choice == "7":
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
