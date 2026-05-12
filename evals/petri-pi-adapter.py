#!/usr/bin/env python3
"""Petri target adapter for Pi (Earendil's coding-agent CLI).

Spawns Pi as a subprocess, reads its JSON event stream from stdout (`--mode
json` emits one JSON event per line), normalizes events into a transcript dict
of the shape `{"messages": [{"role": ..., "content": ...}, ...]}`, and prints
that transcript as JSON to stdout for downstream consumers (Petri's judge,
Phase 0 smoke tests).

Usage:
    petri-pi-adapter.py --prompt "<text>" --workdir <path> [--skill <path>]
                        [--model <pattern>] [--provider <name>]

Notes:

- Pi 0.74.0 has **no `--workdir` flag**. This adapter accepts `--workdir`
  as its own argument and passes it to Pi via `cwd=` on `subprocess.run`.
  Pi reads AGENTS.md / CLAUDE.md from `cwd` upward (unless `--no-context-files`
  is passed; for Phase 0 fixture runs we leave that on so AGENTS.md
  auto-discovery activates the skill).

- Pi's actual event schema (empirically probed against Pi 0.74.0 +
  claude-sonnet-4-6, both tool-using and no-tool runs):

  Stream order: session, agent_start, turn_start, [message_start,
  message_update*, message_end]+, turn_end, agent_end.

  We treat `message_end` as the canonical per-message event. Each
  `message_end` has shape:

      {"type": "message_end",
       "message": {
         "role": "user" | "assistant" | "toolResult",
         "content": [<block>, ...],
         # toolResult-only:
         "toolCallId": "...", "toolName": "...", "isError": bool,
         ...
       }}

  Content blocks: `{"type":"text","text":"..."}`,
  `{"type":"thinking","thinking":"..."}`,
  `{"type":"toolCall","id":...,"name":...,"arguments":{...}}`.

  We flatten each `message_end` into a `{role, content}` dict where
  `content` is a string (text blocks joined with newlines; toolCall and
  thinking blocks JSON-encoded so the auditor can still see them).
  Tool calls live INSIDE assistant messages — Pi does not emit separate
  `tool_call` events. `toolResult` role becomes `"tool"` in the
  normalized transcript for compatibility with Petri's expected shape.

  Unknown event types and unknown block types are skipped silently rather
  than crashing, so the adapter degrades gracefully if Pi's schema shifts.

- For eval reproducibility we pass `--no-session` (no on-disk state) and
  `--no-extensions` (no extension auto-load). We do NOT pass
  `--no-context-files` because Phase 0 fixtures rely on AGENTS.md
  auto-discovery to activate the no-glaze skill.

- Pi's default provider is `google`. We force `--provider anthropic` and
  `--model claude-sonnet-4-6` so the adapter targets Claude by default;
  override via flags.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Iterable


def _render_content_blocks(blocks) -> str:
    """Flatten Pi's content-block list into a single string.

    Text blocks contribute their `.text`. Thinking blocks are JSON-encoded
    with a marker so the auditor can still inspect chain-of-thought without
    treating it as model output. ToolCall blocks are JSON-encoded with
    their name + arguments. Unknown block types are JSON-encoded verbatim
    (lossy but never crashes).
    """
    if blocks is None:
        return ""
    if isinstance(blocks, str):
        return blocks
    if not isinstance(blocks, list):
        return json.dumps(blocks)
    parts = []
    for block in blocks:
        if not isinstance(block, dict):
            parts.append(json.dumps(block))
            continue
        btype = block.get("type")
        if btype == "text":
            parts.append(block.get("text", ""))
        elif btype == "thinking":
            parts.append(json.dumps({"thinking": block.get("thinking", "")}))
        elif btype == "toolCall":
            parts.append(json.dumps({
                "toolCall": {
                    "id": block.get("id"),
                    "name": block.get("name"),
                    "arguments": block.get("arguments"),
                },
            }))
        else:
            parts.append(json.dumps(block))
    return "\n".join(p for p in parts if p)


def _normalize_role(role: str) -> str:
    """Map Pi roles to Petri-friendly roles."""
    if role == "toolResult":
        return "tool"
    return role or "assistant"


def normalize_events(raw_lines: Iterable[str]) -> dict:
    """Convert Pi's per-line JSON event stream into `{"messages": [...]}`.

    Strategy: iterate `message_end` events (Pi's canonical per-message
    terminal event) and flatten each into a `{role, content}` dict.
    `toolResult` messages keep their `toolCallId` / `toolName` /
    `isError` fields alongside `role` and `content`. Unknown event types
    and unknown content blocks are skipped/JSON-encoded rather than
    crashing the eval.
    """
    messages = []
    for line in raw_lines:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            # Pi may emit non-JSON warnings on stdout in some failure modes;
            # tolerate them rather than crash the eval.
            continue
        if not isinstance(event, dict):
            continue
        if event.get("type") != "message_end":
            # All other event types (session, agent_start, turn_start,
            # message_start, message_update, turn_end, agent_end, ...) are
            # either redundant with message_end or schema noise. Skip.
            continue
        message = event.get("message") or {}
        if not isinstance(message, dict):
            continue
        normalized = {
            "role": _normalize_role(message.get("role", "assistant")),
            "content": _render_content_blocks(message.get("content")),
        }
        # Preserve tool-result linkage so judges can pair calls with results.
        if message.get("role") == "toolResult":
            normalized["tool_call_id"] = message.get("toolCallId")
            normalized["tool_name"] = message.get("toolName")
            normalized["is_error"] = bool(message.get("isError", False))
        messages.append(normalized)
    return {"messages": messages}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Petri target adapter for Pi: drives Pi as a subprocess "
                    "and emits a normalized transcript JSON on stdout.",
    )
    parser.add_argument("--prompt", required=True, help="User prompt to send to Pi.")
    parser.add_argument(
        "--workdir",
        required=True,
        help="Working directory for the Pi subprocess (Pi reads AGENTS.md from here upward).",
    )
    parser.add_argument(
        "--skill",
        default=None,
        help="Optional path to a skill file/dir to load with --skill. "
             "If omitted, Pi falls back to AGENTS.md auto-discovery from --workdir.",
    )
    parser.add_argument("--provider", default="anthropic", help="Pi --provider value (default: anthropic).")
    parser.add_argument("--model", default="claude-sonnet-4-6", help="Pi --model value.")
    parser.add_argument("--timeout", type=int, default=120, help="Subprocess timeout (seconds).")
    args = parser.parse_args()

    if not Path(args.workdir).is_dir():
        print(
            json.dumps({"error": "workdir does not exist", "workdir": args.workdir}),
            file=sys.stderr,
        )
        return 1

    cmd = [
        "pi",
        "-p", args.prompt,
        "--mode", "json",
        "--no-session",
        "--no-extensions",
        "--provider", args.provider,
        "--model", args.model,
    ]
    if args.skill:
        cmd.extend(["--skill", args.skill])

    try:
        proc = subprocess.run(
            cmd,
            cwd=args.workdir,
            capture_output=True,
            text=True,
            timeout=args.timeout,
        )
    except subprocess.TimeoutExpired as e:
        print(
            json.dumps({"error": f"pi timed out after {args.timeout}s", "stderr": (e.stderr or "")[-500:]}),
            file=sys.stderr,
        )
        return 1

    if proc.returncode != 0:
        print(
            json.dumps({
                "error": f"pi exited {proc.returncode}",
                "stderr": proc.stderr[-2000:],
                "stdout_tail": proc.stdout[-500:],
            }),
            file=sys.stderr,
        )
        return 1

    transcript = normalize_events(proc.stdout.splitlines())
    print(json.dumps(transcript, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
