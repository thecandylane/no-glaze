"""Unit tests for the pure parsing functions in `evals/petri-pi-adapter.py`.

The adapter's live smoke test skips whenever Pi has no Anthropic credentials,
which is the default in CI. These tests pin down deterministic behavior of
`normalize_events` and `_render_content_blocks` so malformed-block regressions
get caught without needing a live Pi run.

Assertions match the adapter's *actual* behavior — they pin reality, not
wishful thinking.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path


# Adapter file has a hyphen, so it's not importable via `import` — load via
# importlib.
_ADAPTER_PATH = Path(__file__).parent.parent.parent / "evals" / "petri-pi-adapter.py"
_spec = importlib.util.spec_from_file_location("petri_pi_adapter", _ADAPTER_PATH)
adapter = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(adapter)

normalize_events = adapter.normalize_events
_render_content_blocks = adapter._render_content_blocks


# ---------------------------------------------------------------------------
# normalize_events
# ---------------------------------------------------------------------------


def _line(obj: dict) -> str:
    """Encode an event as a single JSON line (mirrors Pi's --mode json)."""
    return json.dumps(obj)


def test_normalize_events_empty_input():
    assert normalize_events([]) == {"messages": []}


def test_normalize_events_skips_non_message_end_events():
    """All non-`message_end` event types are noise and must be skipped."""
    lines = [
        _line({"type": "session", "id": "abc"}),
        _line({"type": "agent_start"}),
        _line({"type": "turn_start"}),
        _line({"type": "message_start", "message": {"role": "assistant"}}),
        _line({"type": "message_update", "delta": {"text": "hi"}}),
        _line({"type": "turn_end", "toolResults": []}),
        _line({"type": "agent_end", "messages": []}),
    ]
    assert normalize_events(lines) == {"messages": []}


def test_normalize_events_assistant_text_message():
    """A message_end with a single text block surfaces as one assistant entry."""
    lines = [
        _line({
            "type": "message_end",
            "message": {
                "role": "assistant",
                "content": [{"type": "text", "text": "Hello, world."}],
            },
        }),
    ]
    out = normalize_events(lines)
    assert out == {"messages": [{"role": "assistant", "content": "Hello, world."}]}


def test_normalize_events_tool_result_keeps_linkage_fields():
    """toolResult role is renamed to `tool` and keeps id/name/is_error."""
    lines = [
        _line({
            "type": "message_end",
            "message": {
                "role": "toolResult",
                "content": [{"type": "text", "text": "file contents here"}],
                "toolCallId": "toolu_abc123",
                "toolName": "read",
                "isError": False,
            },
        }),
    ]
    out = normalize_events(lines)
    assert out == {
        "messages": [{
            "role": "tool",
            "content": "file contents here",
            "tool_call_id": "toolu_abc123",
            "tool_name": "read",
            "is_error": False,
        }],
    }


def test_normalize_events_tool_result_is_error_coerced_to_bool():
    """is_error is bool-coerced; truthy non-bool values become True."""
    lines = [
        _line({
            "type": "message_end",
            "message": {
                "role": "toolResult",
                "content": [{"type": "text", "text": "boom"}],
                "toolCallId": "toolu_x",
                "toolName": "write",
                "isError": "yes",  # truthy non-bool
            },
        }),
    ]
    out = normalize_events(lines)
    assert out["messages"][0]["is_error"] is True


def test_normalize_events_assistant_with_embedded_tool_call():
    """toolCall blocks live INSIDE assistant content — JSON-encoded into the string."""
    lines = [
        _line({
            "type": "message_end",
            "message": {
                "role": "assistant",
                "content": [
                    {"type": "text", "text": "Reading the file."},
                    {
                        "type": "toolCall",
                        "id": "toolu_42",
                        "name": "read",
                        "arguments": {"path": "/tmp/foo"},
                    },
                ],
            },
        }),
    ]
    out = normalize_events(lines)
    assert len(out["messages"]) == 1
    msg = out["messages"][0]
    assert msg["role"] == "assistant"
    # Content is a single string: text + newline + JSON-encoded toolCall.
    assert "Reading the file." in msg["content"]
    encoded_tool_call = json.dumps({
        "toolCall": {
            "id": "toolu_42",
            "name": "read",
            "arguments": {"path": "/tmp/foo"},
        },
    })
    assert encoded_tool_call in msg["content"]
    assert msg["content"] == "Reading the file.\n" + encoded_tool_call


def test_normalize_events_skips_malformed_json_line():
    """Non-JSON lines on stdout (Pi warnings, partial writes) must not crash."""
    lines = [
        "this is not json at all",
        _line({
            "type": "message_end",
            "message": {
                "role": "assistant",
                "content": [{"type": "text", "text": "ok"}],
            },
        }),
        "}{ also broken",
    ]
    out = normalize_events(lines)
    assert out == {"messages": [{"role": "assistant", "content": "ok"}]}


def test_normalize_events_handles_bad_message_field_without_crashing():
    """Adapter must not crash on missing or wrong-typed `message` fields.

    Actual behavior (pinned):
    - Missing `message` key → falls through `event.get("message") or {}` to `{}`,
      which IS a dict, so it produces a default-shaped entry
      (role defaults to "assistant", content to "").
    - `message` is a string → fails the isinstance(dict) check → skipped.
    - `message` is a list → fails the isinstance(dict) check → skipped.

    The fall-through-on-missing-key produces a slightly-junky empty entry
    rather than a skip — that's the current contract; pin it so any future
    refactor surfaces in CI.
    """
    lines = [
        # No `message` key → empty default entry (current behavior).
        _line({"type": "message_end"}),
        # `message` is a string → skipped by isinstance check.
        _line({"type": "message_end", "message": "oops"}),
        # `message` is a list → skipped by isinstance check.
        _line({"type": "message_end", "message": ["a", "b"]}),
        # Sanity: a valid one still gets through.
        _line({
            "type": "message_end",
            "message": {"role": "assistant", "content": [{"type": "text", "text": "yes"}]},
        }),
    ]
    out = normalize_events(lines)
    assert out == {
        "messages": [
            {"role": "assistant", "content": ""},
            {"role": "assistant", "content": "yes"},
        ],
    }


def test_normalize_events_skips_unknown_event_type():
    """Unknown event types degrade gracefully (forward-compat with Pi schema shifts)."""
    lines = [
        _line({"type": "future_event_we_dont_know_about", "payload": {}}),
        _line({"type": "another_new_type"}),
        _line({
            "type": "message_end",
            "message": {"role": "assistant", "content": [{"type": "text", "text": "still here"}]},
        }),
    ]
    out = normalize_events(lines)
    assert out == {"messages": [{"role": "assistant", "content": "still here"}]}


def test_normalize_events_skips_blank_lines():
    """Empty lines in the stream must not crash."""
    lines = [
        "",
        "   ",
        _line({
            "type": "message_end",
            "message": {"role": "assistant", "content": [{"type": "text", "text": "hi"}]},
        }),
        "",
    ]
    out = normalize_events(lines)
    assert out == {"messages": [{"role": "assistant", "content": "hi"}]}


# ---------------------------------------------------------------------------
# _render_content_blocks
# ---------------------------------------------------------------------------


def test_render_content_blocks_none_returns_empty_string():
    assert _render_content_blocks(None) == ""


def test_render_content_blocks_bare_string_returned_unchanged():
    """Pi sometimes hands back a string instead of a block list; pass through."""
    assert _render_content_blocks("just a string") == "just a string"


def test_render_content_blocks_text_block_missing_text_field():
    """A text block with no .text key contributes empty; final join drops empties."""
    assert _render_content_blocks([{"type": "text"}]) == ""


def test_render_content_blocks_mixed_text_thinking_toolcall():
    """All three known block types render in order, joined with newlines."""
    blocks = [
        {"type": "text", "text": "thinking aloud:"},
        {"type": "thinking", "thinking": "let me check that file"},
        {
            "type": "toolCall",
            "id": "toolu_9",
            "name": "read",
            "arguments": {"path": "/x"},
        },
        {"type": "text", "text": "done."},
    ]
    rendered = _render_content_blocks(blocks)
    expected = "\n".join([
        "thinking aloud:",
        json.dumps({"thinking": "let me check that file"}),
        json.dumps({
            "toolCall": {"id": "toolu_9", "name": "read", "arguments": {"path": "/x"}},
        }),
        "done.",
    ])
    assert rendered == expected


def test_render_content_blocks_unknown_block_type_json_encoded_fallback():
    """Unknown block types get JSON-encoded verbatim — lossy, but never crashes."""
    blocks = [{"type": "foo", "bar": 1}]
    rendered = _render_content_blocks(blocks)
    assert rendered == json.dumps({"type": "foo", "bar": 1})
