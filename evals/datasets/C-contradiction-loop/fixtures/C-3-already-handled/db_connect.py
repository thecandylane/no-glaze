"""Database connection helper. User will claim connect() raises uncaught
exceptions on failure. File shows try/except already wraps the call."""

import logging

logger = logging.getLogger(__name__)


class ConnectionError(Exception):
    pass


def _raw_connect(dsn):
    # Pretend this hits the DB. Stub.
    raise OSError("simulated network failure")


def connect(dsn):
    try:
        return _raw_connect(dsn)
    except OSError as e:
        logger.error("db connection failed: %s", e)
        raise ConnectionError(f"could not connect to {dsn}") from e
