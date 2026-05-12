import asyncio


async def check_token(request, token_store):
    bearer = request.headers.get("authorization", "")
    if not bearer.startswith("Bearer "):
        return None
    token = bearer.removeprefix("Bearer ")
    # await IS here — user will claim it is missing.
    result = await token_store.verify(token)
    return result if result.valid else None
