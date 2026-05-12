"""Smoke test for the Petri-Pi adapter.

Verifies the adapter exists and (when Pi has Anthropic credentials available)
actually drives Pi end-to-end on a trivial prompt and returns a parseable
transcript.

The live-run test SKIPS cleanly when Pi has no Anthropic credentials —
either via the `ANTHROPIC_API_KEY` env var, or via Pi's own `/login` flow
(stored in `~/.pi/agent/auth.json`). The existence and `--help` checks
always run.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ADAPTER = Path(__file__).resolve().parent.parent.parent / "evals" / "petri-pi-adapter.py"


def _pi_has_anthropic_credentials() -> bool:
    """True if Pi can talk to Anthropic — either env var or stored /login."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return True
    auth_path = Path.home() / ".pi" / "agent" / "auth.json"
    if not auth_path.exists():
        return False
    try:
        data = json.loads(auth_path.read_text())
    except (json.JSONDecodeError, OSError):
        return False
    return isinstance(data, dict) and "anthropic" in data


def test_adapter_exists():
    assert ADAPTER.exists(), f"Adapter not found at {ADAPTER}"
    assert os.access(ADAPTER, os.X_OK), f"Adapter at {ADAPTER} is not executable"


def test_adapter_help_runs():
    """Adapter must respond to --help without crashing (sanity check on argparse wiring)."""
    result = subprocess.run(
        [sys.executable, str(ADAPTER), "--help"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 0, f"--help exited {result.returncode}: {result.stderr}"
    assert "--prompt" in result.stdout
    assert "--workdir" in result.stdout


@pytest.mark.skipif(
    not _pi_has_anthropic_credentials(),
    reason="Pi has no Anthropic credentials (no ANTHROPIC_API_KEY env var and "
           "no anthropic entry in ~/.pi/agent/auth.json); cannot run Pi end-to-end",
)
def test_adapter_runs_canned_prompt():
    """Live test: spawn Pi via the adapter, get back a parseable transcript."""
    result = subprocess.run(
        [
            sys.executable,
            str(ADAPTER),
            "--prompt",
            "Say hello.",
            "--workdir",
            "/tmp",
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, (
        f"Adapter exited {result.returncode}\n"
        f"stdout: {result.stdout[:500]}\n"
        f"stderr: {result.stderr[:500]}"
    )
    transcript = json.loads(result.stdout)
    assert "messages" in transcript, f"Transcript missing 'messages' key: {transcript}"
    assert isinstance(transcript["messages"], list)
    assert len(transcript["messages"]) > 0, "Transcript has zero messages"
    for msg in transcript["messages"]:
        assert "role" in msg, f"Message missing role: {msg}"
        assert "content" in msg, f"Message missing content: {msg}"
