#!/usr/bin/env python3
"""End-to-end scripted demo of the Adios MVP.

Runs entirely through the same Lambda handler functions the API Gateway
routes call (infra/template.yaml), so this demo exercises the real request
path - not just the repository layer. Works with zero infra running
(everything falls back to local storage); point AWS_ENDPOINT_URL /
OPENSEARCH_HOST at a running `finch compose up` stack to demo against real
LocalStack DynamoDB + OpenSearch instead.

Usage: PYTHONPATH=src python3 scripts/run_demo.py
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

logging.basicConfig(level=logging.WARNING)

from adios import config, repository  # noqa: E402
from adios.handlers import followups, notes, notify, patients  # noqa: E402


def _event(doctor_id: str, path_params: dict | None = None, body: dict | None = None, query: dict | None = None) -> dict:
    return {
        "headers": {"X-Doctor-Id": doctor_id},
        "pathParameters": path_params or {},
        "queryStringParameters": query,
        "body": json.dumps(body) if body is not None else None,
    }


def section(title: str) -> None:
    print(f"\n=== {title} ===")


def main() -> None:
    section("1. Dr. Mehta registers a patient")
    resp = patients.create(_event("dr_mehta", body={"name": "Asha Rao", "contact": "asha@example.com"}))
    patient = json.loads(resp["body"])
    patient_id = patient["patientId"]
    print(json.dumps(patient, indent=2))

    section("2. Dr. Mehta leaves short notes after two consultations")
    for text in [
        "Post-op knee, mild swelling, prescribed rest + ice.",
        "Swelling reduced significantly, walking without support.",
    ]:
        r = notes.add(_event("dr_mehta", {"patientId": patient_id}, body={"text": text}))
        print(json.loads(r["body"])["text"])

    section("3. Before the next call, Dr. Mehta searches this patient's history for 'swelling'")
    r = notes.list_(_event("dr_mehta", {"patientId": patient_id}, query={"q": "swelling"}))
    for n in json.loads(r["body"]):
        print("-", n["text"])

    section("4. A different doctor tries to read the same notes - denied by Cedar")
    r = notes.list_(_event("dr_khan", {"patientId": patient_id}))
    print(f"status={r['statusCode']}", json.loads(r["body"]))

    section("5. Dr. Mehta schedules a follow-up (duration_days=0 so it's immediately due, for this demo)")
    r = followups.schedule(_event("dr_mehta", {"patientId": patient_id}, body={"durationDays": 0}))
    followup = json.loads(r["body"])
    print(json.dumps(followup, indent=2))

    section("6. Time elapses -> Step Functions Wait fires -> notify Lambda runs the guarded follow-up agent")
    result = notify.handle({"followupId": followup["followupId"], "patientId": patient_id})
    print(result["result"])

    section("7. Follow-up status after notification")
    updated = repository.get_followup(followup["followupId"])
    print(updated.to_item())

    section("8. Audit trail: everything the agent has sent, on record")
    sent_log = Path(config.LOCAL_DATA_DIR) / "sent_notifications.jsonl"
    if sent_log.exists():
        for line in sent_log.read_text().splitlines():
            print(line)
    else:
        print("(no local sent-notification log - check OpenSearch/SNS if using real infra)")


if __name__ == "__main__":
    main()
