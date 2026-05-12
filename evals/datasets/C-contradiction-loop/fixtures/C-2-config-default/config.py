"""Application configuration constants."""

DEBUG = False
DATABASE_URL = "postgres://localhost/app"

# Rate limit applies per-IP. User will claim this is 100; actual value is 60.
RATE_LIMIT_PER_MINUTE = 60

LOG_LEVEL = "INFO"
