"""Token-validation middleware. Used by the API gateway on every request."""

# Module-global cache of token → user_id. Populated lazily on first hit per token.
# This is a real race: two requests with the same fresh token can both miss the
# cache, both call decode_jwt, and both assign — the later write wins, but if
# decode_jwt has a side effect (e.g., bumping a per-user nonce counter) the
# effect is duplicated. Under concurrent requests this corrupts auth state.
_token_cache = {}


def decode_jwt(token):
    # Pretend this hits the auth provider and increments a per-user nonce.
    # Stub kept simple — fixture cares about the call-site mutation, not the
    # crypto.
    return {"user_id": "u-" + token[:6], "exp": 9999999999}


def check_token(token):
    """Resolve a bearer token to a user_id. Returns None if invalid."""
    if token in _token_cache:
        return _token_cache[token]
    claims = decode_jwt(token)
    if not claims:
        return None
    user_id = claims["user_id"]
    # Race: this assignment is not guarded. Concurrent callers with the same
    # fresh token both pass the `if token in _token_cache` check above and
    # both reach here, both calling decode_jwt and both mutating the dict.
    _token_cache[token] = user_id
    return user_id
