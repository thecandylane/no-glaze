# Pi runtime notes (Phase 0)

## Install

- **Version probed:** Pi 0.74.0
- **Install method used:** `curl -fsSL https://pi.dev/install.sh | sh` (which internally runs `npm install -g @earendil-works/pi-coding-agent`)
- **Binary path:** `~/.nvm/versions/node/v24.13.0/bin/pi`
- **Package:** `@earendil-works/pi-coding-agent`
- **Upstream:** https://github.com/earendil-works/pi
- **Docs (local):** `~/.nvm/versions/node/v24.13.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/` (providers.md, models.md, settings.md, …)

## Programmatic-invocation flags (relevant to evals)

| Flag | Use in adapter |
|---|---|
| `--print, -p` | Non-interactive: process prompt and exit |
| `--mode json` | One JSON event per line on stdout (the event stream Petri-Pi adapter parses) |
| `--mode rpc` | Process-integration RPC mode (alternative to json) |
| `--skill <path>` | Load a skill file/dir; repeatable. **Used by adapter to load `no-glaze`.** |
| `--no-skills, -ns` | Disable skill auto-discovery (control runs) |
| `--no-context-files, -nc` | Disable AGENTS.md/CLAUDE.md discovery (clean isolation for evals) |
| `--no-extensions, -ne` | Disable extension auto-discovery |
| `--provider <name>` | Default: google. Set to `anthropic` for Claude target. |
| `--model <pattern>` | e.g. `claude-sonnet-4-6` |
| `--api-key <key>` | Defaults to env vars (`ANTHROPIC_API_KEY` etc.) |
| `--system-prompt <text>` | Set the model system prompt |
| `--no-session` | Ephemeral, no on-disk session persistence |
| `--offline` | Disable startup network ops (PI_OFFLINE=1) |

**No `--workdir` flag exists.** Adapter sets process `cwd` via `subprocess.Popen(cwd=fixture_dir)` instead. AGENTS.md / `.agents/`-tree discovery searches up from cwd.

## Skill load paths (from upstream README)

Searched at startup, in order:

1. `~/.pi/agent/skills/`
2. `~/.agents/skills/`
3. `.pi/skills/` (in cwd; walks up to parent dirs)
4. `.agents/skills/` (in cwd; walks up to parent dirs)
5. Pi packages (extension-bundled skills)

Adapter strategy: pass `--skill /path/to/no-glaze` explicitly rather than rely on discovery, to keep eval runs reproducible.

## AGENTS.md auto-discovery

**Confirmed:** Pi reads AGENTS.md (and CLAUDE.md) from cwd upward by default. Disabled with `--no-context-files`. The no-glaze AGENTS.md at the skill root therefore activates the skill on Pi without any per-runtime porting (the standards-compliance claim in spec §8).

## Tool-event hook lifecycle (spec §10 gate criterion 5)

**Status: partial.** Pi exposes a `pi.on("tool_call", async (event, ctx) => { ... })` event in its extension API (per the upstream README's "tool-event hooks" section). This fires **before** tool execution.

**Open question for Unit 0.4:** Is there a `tool_result` / `tool_complete` event (post-tool-use equivalent)? Probe via:

1. Read `~/.nvm/versions/node/v24.13.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/` for extension docs.
2. `grep -r "tool_result\|tool_complete\|post.tool" ~/.nvm/.../pi-coding-agent/`
3. Run a real session in `--mode json` with a tool call and inspect the event types emitted.

**If no PostToolUse equivalent exists:** §3.1 degrades on Pi to skill-instruction-only (model must remember to compare against prior claims rather than be interrupted). Document as a Phase-1 Pi limitation in README, ship anyway, file an issue upstream.

## `--mode json` event schema (empirically confirmed against Pi 0.74.0 + claude-sonnet-4-6)

Stream order per session:

```
session
agent_start
turn_start
  message_start
    message_update*   (token deltas — many per message)
  message_end          (canonical per-message terminal event — use THIS)
turn_end               (carries toolResults[] for the turn)
agent_end              (carries full messages[] for the agent's whole run)
```

**`message_end` is the event the adapter consumes.** Shape:

```json
{"type": "message_end",
 "message": {
   "role": "user" | "assistant" | "toolResult",
   "content": [<block>, ...],
   // toolResult-only fields:
   "toolCallId": "toolu_...",
   "toolName": "read",
   "isError": false
 }}
```

Content blocks observed:

- `{"type": "text", "text": "..."}` — plain model text or tool-result text
- `{"type": "thinking", "thinking": "...", "thinkingSignature": "..."}` — reasoning trace
- `{"type": "toolCall", "id": "toolu_...", "name": "read", "arguments": {...}}` —
  **embedded inside assistant message content**, not a separate `tool_call` event

The adapter (`evals/petri-pi-adapter.py`) iterates `message_end` events and
flattens each to `{role, content}` where content is a string (text blocks
joined with newlines; thinking and toolCall blocks JSON-encoded). The
`toolResult` role is renamed to `tool` in the output and gains
`tool_call_id` / `tool_name` / `is_error` fields for judge-side linkage.

**§10 gate criterion 5 update:** tool execution is observable. Every tool call
produces a paired `toolCall` block (inside an assistant `message_end`) and a
`toolResult` `message_end` with `toolCallId` linking them. This is
sufficient surface for Phase 1's contradiction-surfacing logic.

## API key requirement

Running any Pi prompt without a configured provider fails fast with: `No API key found for the selected model. Use /login ...`. Phase 0 evals require either `ANTHROPIC_API_KEY` exported, or `pi /login` configured for the chosen provider, **before** running the adapter end-to-end.
