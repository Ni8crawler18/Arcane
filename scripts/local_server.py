#!/usr/bin/env python3
"""A single-command local server for trying Adios on your own machine.

No AWS account, no Docker/Finch, no SAM CLI required - this wraps the same
Lambda handler functions that infra/template.yaml wires up to API Gateway,
seeds a few realistic patients on startup, and runs a background loop that
checks for due follow-ups every few seconds and sends the reminder - the
same thing the Step Functions Wait state does once you deploy for real.

Usage:
    PYTHONPATH=src python3 scripts/local_server.py
    (or just: make run)
"""

from __future__ import annotations

import json
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from adios import repository  # noqa: E402
from adios.handlers import followups, notes, notify, patients  # noqa: E402

import logging  # noqa: E402

logging.basicConfig(level=logging.WARNING)

PORT = 8000
FOLLOWUP_CHECK_INTERVAL_SECONDS = 5

ROUTES = [
    (re.compile(r"^/patients$"), "POST", lambda m, e: patients.create(e)),
    (re.compile(r"^/patients/(?P<patientId>[^/]+)$"), "GET", lambda m, e: patients.get(_with_path(e, m))),
    (re.compile(r"^/patients/(?P<patientId>[^/]+)/notes$"), "POST", lambda m, e: notes.add(_with_path(e, m))),
    (re.compile(r"^/patients/(?P<patientId>[^/]+)/notes$"), "GET", lambda m, e: notes.list_(_with_path(e, m))),
    (re.compile(r"^/patients/(?P<patientId>[^/]+)/followups$"), "POST", lambda m, e: followups.schedule(_with_path(e, m))),
]


def _with_path(event: dict, match: re.Match) -> dict:
    event["pathParameters"] = match.groupdict()
    return event


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # quieter default logging
        print(f"  {self.command} {self.path}")

    def _dispatch(self, method: str) -> None:
        parsed = urlparse(self.path)
        query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(length).decode() if length else None

        event = {
            "headers": dict(self.headers.items()),
            "queryStringParameters": query or None,
            "body": raw_body,
        }

        for pattern, route_method, fn in ROUTES:
            match = pattern.match(parsed.path)
            if match and route_method == method:
                result = fn(match, event)
                self._write(result)
                return

        self._write({"statusCode": 404, "body": json.dumps({"error": "no such route"})})

    def _write(self, result: dict) -> None:
        self.send_response(result["statusCode"])
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write((result.get("body") or "{}").encode())

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")


def _followup_watcher() -> None:
    """Stands in for the Step Functions Wait -> notify flow for local runs."""
    while True:
        time.sleep(FOLLOWUP_CHECK_INTERVAL_SECONDS)
        for followup in repository.list_due_followups():
            print(f"\n[followup-watcher] duration elapsed for followup {followup.followup_id} - sending reminder")
            result = notify.handle({"followupId": followup.followup_id, "patientId": followup.patient_id})
            print(f"[followup-watcher] {result['result'].splitlines()[0]}")


def main() -> None:
    sys.stdout.reconfigure(line_buffering=True)  # keep progress visible even when output is piped/logged

    from seed_demo_data import seed  # local import: only needed for the standalone server

    print("Seeding realistic demo data...\n")
    rows = seed()
    for r in rows:
        print(f"  {r['name']:<12} patient_id={r['patient_id']}  ({r['doctor']}, follow-up {r['followup_status']})")

    print(f"\nTry it (swap in a patient_id printed above):")
    print(f'  curl -H "X-Doctor-Id: dr_mehta" http://localhost:{PORT}/patients/<patient_id>')
    print(f'  curl -H "X-Doctor-Id: dr_mehta" "http://localhost:{PORT}/patients/<patient_id>/notes?q=swelling"')
    print(
        f'  curl -X POST -H "X-Doctor-Id: dr_mehta" -H "Content-Type: application/json" '
        f'-d \'{{"text":"Patient reports feeling much better."}}\' '
        f"http://localhost:{PORT}/patients/<patient_id>/notes"
    )

    threading.Thread(target=_followup_watcher, daemon=True).start()

    print(f"\nServer running at http://localhost:{PORT} - Ctrl+C to stop.")
    print(f"(follow-ups already due, like {rows[0]['name']}'s, will be notified within {FOLLOWUP_CHECK_INTERVAL_SECONDS}s)\n")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
