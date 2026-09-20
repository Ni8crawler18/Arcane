"""Thin DynamoDB table wrapper.

Talks to LocalStack by default (Build It track — no AWS account needed). If
LocalStack isn't running yet (e.g. you haven't run `finch compose up` in
infra/ yet), it transparently falls back to an in-process in-memory table so
`scripts/run_demo.py` always works, including in this sandbox. Swap
AWS_ENDPOINT_URL to a real region and drop the dummy credentials to move to
the Ship It track later — no other code changes needed.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Optional

import boto3
from botocore.config import Config as BotoConfig

from . import config

_FAST_FAIL = BotoConfig(connect_timeout=1, read_timeout=2, retries={"max_attempts": 1})

logger = logging.getLogger(__name__)


class Table:
    def __init__(self, table_name: str, pk: str, sk: Optional[str] = None):
        self.table_name = table_name
        self.pk = pk
        self.sk = sk
        self._memory: dict[tuple, dict] = {}
        self._ddb_table = self._connect()

    def _connect(self):
        try:
            resource = boto3.resource(
                "dynamodb",
                region_name=config.AWS_REGION,
                endpoint_url=config.AWS_ENDPOINT_URL,
                aws_access_key_id="test",
                aws_secret_access_key="test",
                config=_FAST_FAIL,
            )
            table = resource.Table(self.table_name)
            table.load()
            logger.info("connected to DynamoDB table %s via %s", self.table_name, config.AWS_ENDPOINT_URL)
            return table
        except Exception as exc:  # noqa: BLE001 - deliberately broad, this is a local-dev fallback
            logger.warning(
                "DynamoDB table %s unreachable at %s (%s) - using in-memory fallback. "
                "Run `finch compose up` and deploy infra/template.yaml to use real LocalStack DynamoDB.",
                self.table_name,
                config.AWS_ENDPOINT_URL,
                exc,
            )
            return None

    def _key(self, item_or_key: dict) -> tuple:
        return (item_or_key[self.pk], item_or_key.get(self.sk)) if self.sk else (item_or_key[self.pk],)

    def put_item(self, item: dict) -> None:
        if self._ddb_table is not None:
            self._ddb_table.put_item(Item=item)
            return
        self._memory[self._key(item)] = dict(item)

    def get_item(self, key: dict) -> Optional[dict]:
        if self._ddb_table is not None:
            resp = self._ddb_table.get_item(Key=key)
            return resp.get("Item")
        return self._memory.get(self._key(key))

    def query_by_pk(self, pk_value: Any) -> list[dict]:
        """Return all items sharing the partition key, sorted by sort key if any."""
        if self._ddb_table is not None:
            from boto3.dynamodb.conditions import Key

            resp = self._ddb_table.query(KeyConditionExpression=Key(self.pk).eq(pk_value))
            return resp.get("Items", [])
        items = [v for k, v in self._memory.items() if k[0] == pk_value]
        if self.sk:
            items.sort(key=lambda i: i.get(self.sk, ""))
        return items

    def scan(self, filter_fn: Optional[Callable[[dict], bool]] = None) -> list[dict]:
        if self._ddb_table is not None:
            items = self._ddb_table.scan().get("Items", [])
        else:
            items = list(self._memory.values())
        return [i for i in items if filter_fn(i)] if filter_fn else items


_TABLE_CACHE: dict[str, Table] = {}


def _cached_table(table_name: str, pk: str, sk: Optional[str] = None) -> Table:
    """Memoized per table name.

    Without this, every call would reconnect to LocalStack (slow, retries on
    failure) and, in the in-memory fallback, would discard whatever was
    previously "written" since each Table() owns its own dict.
    """
    if table_name not in _TABLE_CACHE:
        _TABLE_CACHE[table_name] = Table(table_name, pk=pk, sk=sk)
    return _TABLE_CACHE[table_name]


def patients_table() -> Table:
    return _cached_table(config.PATIENTS_TABLE, pk="patientId")


def notes_table() -> Table:
    return _cached_table(config.NOTES_TABLE, pk="patientId", sk="noteId")


def followups_table() -> Table:
    return _cached_table(config.FOLLOWUPS_TABLE, pk="followupId")
