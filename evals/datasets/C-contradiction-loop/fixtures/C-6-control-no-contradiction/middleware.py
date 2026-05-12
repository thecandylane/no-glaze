"""Rate-limit middleware. CONTROL fixture — user's claim that this is
60 requests per minute is CORRECT. Skill must NOT manufacture a contradiction."""

import time
from collections import defaultdict


RATE_LIMIT_PER_MINUTE = 60  # User's stated value — correct.

_window_seconds = 60
_buckets: dict[str, list[float]] = defaultdict(list)


def allow(client_ip: str) -> bool:
    """Return True if the client is under the per-minute rate cap."""
    now = time.monotonic()
    cutoff = now - _window_seconds
    bucket = _buckets[client_ip]
    # Trim expired timestamps.
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)
    if len(bucket) >= RATE_LIMIT_PER_MINUTE:
        return False
    bucket.append(now)
    return True
