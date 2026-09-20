"""POST /patients/{patientId}/followups

Schedules a follow-up and starts the Step Functions execution that waits
`duration_days` and then invokes the notify Lambda (see
infra/statemachine/followup_flow.asl.json). Starting the execution is
best-effort: if Step Functions isn't deployed yet (e.g. you haven't run
`samlocal deploy`), the follow-up is still recorded and can be picked up by
`repository.list_due_followups()` / `scripts/run_demo.py` as a fallback.
"""

from __future__ import annotations

import json
import logging

import boto3
from botocore.config import Config as BotoConfig

from .. import config, repository
from ..auth.authorize import authorize
from . import common

logger = logging.getLogger(__name__)

_FAST_FAIL = BotoConfig(connect_timeout=1, read_timeout=2, retries={"max_attempts": 1})


def _start_execution(followup) -> str:
    if not config.FOLLOWUP_STATE_MACHINE_ARN:
        logger.info("FOLLOWUP_STATE_MACHINE_ARN not set - skipping Step Functions execution start")
        return ""
    try:
        client = boto3.client(
            "stepfunctions",
            region_name=config.AWS_REGION,
            endpoint_url=config.AWS_ENDPOINT_URL,
            aws_access_key_id="test",
            aws_secret_access_key="test",
            config=_FAST_FAIL,
        )
        resp = client.start_execution(
            stateMachineArn=config.FOLLOWUP_STATE_MACHINE_ARN,
            name=followup.followup_id,
            input=json.dumps(
                {
                    "followupId": followup.followup_id,
                    "patientId": followup.patient_id,
                    "waitSeconds": followup.duration_days * 86400,
                }
            ),
        )
        return resp["executionArn"]
    except Exception as exc:  # noqa: BLE001
        logger.warning("could not start Step Functions execution: %s", exc)
        return ""


def schedule(event: dict, context=None) -> dict:
    try:
        did = common.doctor_id(event)
        patient_id = event["pathParameters"]["patientId"]
        patient = repository.get_patient(patient_id)
        if patient is None:
            return common.response(404, {"error": "patient not found"})

        decision = authorize(did, "schedule_followup", patient_id, owning_doctor_id=patient.doctor_id)
        if not decision.allowed:
            return common.denied(decision)

        b = common.body(event)
        followup = repository.schedule_followup(patient_id, did, duration_days=int(b["durationDays"]))

        execution_arn = _start_execution(followup)
        if execution_arn:
            followup = repository.update_followup_status(followup.followup_id, "pending", execution_arn=execution_arn)

        return common.ok(followup.to_item())
    except Exception as exc:  # noqa: BLE001
        return common.error(exc)
