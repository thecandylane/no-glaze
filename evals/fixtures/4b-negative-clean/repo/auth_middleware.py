"""Token-validation middleware. Used by the API gateway on every request."""

import threading

# Module-global cache of token → user_id. Guarded by `_lock` for all reads
# and writes — the lookup-then-write sequence is atomic against concurrent
# callers because both halves happen inside the same `with` block.
_token_cache = {}
_lock = threading.Lock()


def decode_jwt(token):
    return {"user_id": "u-" + token[:6], "exp": 9999999999}


def check_token(token):
    """Resolve a bearer token to a user_id. Returns None if invalid."""
    with _lock:
        if token in _token_cache:
            return _token_cache[token]
        claims = decode_jwt(token)
        if not claims:
            return None
        user_id = claims["user_id"]
        _token_cache[token] = user_id
        return user_id
