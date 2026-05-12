"""Tiny logger shim — the fixture only needs an importable surface."""

import logging

_logger = logging.getLogger("app")


def info(msg, *args, **kwargs):
    _logger.info(msg, *args, **kwargs)


def warn(msg, *args, **kwargs):
    _logger.warning(msg, *args, **kwargs)
