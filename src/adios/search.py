"""Full-text search over doctor notes, backed by OpenSearch.

Lets a doctor pull up a patient's condition history fast on a follow-up call
("search this patient's notes for 'swelling'") instead of scrolling a long
note list. Falls back to a local JSONL file + substring search when OpenSearch
isn't running, so indexing/search never breaks the demo.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from . import config

logger = logging.getLogger(__name__)

_client = None
_client_checked = False


def _get_client():
    global _client, _client_checked
    if _client_checked:
        return _client
    _client_checked = True
    try:
        from opensearchpy import OpenSearch

        client = OpenSearch(
            hosts=[{"host": config.OPENSEARCH_HOST, "port": config.OPENSEARCH_PORT}],
            use_ssl=False,
            timeout=2,
        )
        client.info()  # raises if unreachable
        if not client.indices.exists(config.NOTES_INDEX):
            client.indices.create(config.NOTES_INDEX)
        _client = client
        logger.info("connected to OpenSearch at %s:%s", config.OPENSEARCH_HOST, config.OPENSEARCH_PORT)
    except Exception as exc:  # noqa: BLE001 - local-dev fallback
        logger.warning(
            "OpenSearch unreachable (%s) - falling back to local note search. "
            "Run `finch compose up` in infra/ to enable it.",
            exc,
        )
        _client = None
    return _client


def _fallback_path() -> Path:
    d = Path(config.LOCAL_DATA_DIR)
    d.mkdir(parents=True, exist_ok=True)
    return d / "notes_index.jsonl"


def index_note(note: dict[str, Any]) -> None:
    client = _get_client()
    if client is not None:
        client.index(index=config.NOTES_INDEX, id=note["noteId"], body=note, refresh=True)
        return
    with _fallback_path().open("a") as f:
        f.write(json.dumps(note) + "\n")


def search_notes(patient_id: str, query: str) -> list[dict[str, Any]]:
    client = _get_client()
    if client is not None:
        body = {
            "query": {
                "bool": {
                    "must": [{"match": {"text": query}}],
                    "filter": [{"term": {"patientId": patient_id}}],
                }
            }
        }
        resp = client.search(index=config.NOTES_INDEX, body=body)
        return [hit["_source"] for hit in resp["hits"]["hits"]]

    path = _fallback_path()
    if not path.exists():
        return []
    results = []
    query_lower = query.lower()
    with path.open() as f:
        for line in f:
            if not line.strip():
                continue
            note = json.loads(line)
            if note.get("patientId") == patient_id and query_lower in note.get("text", "").lower():
                results.append(note)
    return results
