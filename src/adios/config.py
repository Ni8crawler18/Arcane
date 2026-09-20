"""Central configuration for the Adios follow-up care platform.

All AWS endpoints default to LocalStack so the app runs with no AWS account
(Build It track). Point AWS_ENDPOINT_URL at a real AWS endpoint (and drop
AWS_ACCESS_KEY_ID=test) to move to the Ship It track later without code changes.
"""

import os

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
AWS_ENDPOINT_URL = os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566")

PATIENTS_TABLE = os.environ.get("PATIENTS_TABLE", "adios-patients")
NOTES_TABLE = os.environ.get("NOTES_TABLE", "adios-notes")
FOLLOWUPS_TABLE = os.environ.get("FOLLOWUPS_TABLE", "adios-followups")

OPENSEARCH_HOST = os.environ.get("OPENSEARCH_HOST", "localhost")
OPENSEARCH_PORT = int(os.environ.get("OPENSEARCH_PORT", "9200"))
NOTES_INDEX = os.environ.get("NOTES_INDEX", "adios-notes")

FOLLOWUP_STATE_MACHINE_ARN = os.environ.get("FOLLOWUP_STATE_MACHINE_ARN", "")

# Local fallback paths used when LocalStack/OpenSearch aren't running yet, so
# the CLI demo always works even before `finch compose up` / `samlocal deploy`.
LOCAL_DATA_DIR = os.environ.get("ADIOS_LOCAL_DATA_DIR", ".local_data")
