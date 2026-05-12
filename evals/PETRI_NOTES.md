# Petri runtime notes (Phase 0)

## Install

- **Version probed:** 0.1.0
- **Install command:** `pip install git+https://github.com/meridianlabs-ai/inspect_petri@petri-v2`
- **Location:** project-local `.venv/lib/python3.12/site-packages/petri/`
- **Upstream sources:**
  - Anthropic announcement: https://alignment.anthropic.com/2025/petri/
  - Active fork hosting `petri-v2`: https://github.com/meridianlabs-ai/inspect_petri
  - Docs: https://meridianlabs-ai.github.io/inspect_petri
- **Built on:** UK AISI's `inspect-ai` framework (`inspect_ai 0.3.220` installed as dependency)
- **Maintainer (PyPI metadata):** kaifronsdal <kaifronsdal@gmail.com>

## Package layout

```
petri/
├── _cli            # `petri view` transcript viewer entry point
├── approval        # human-approval gating for risky tool calls
├── download_default_resources
├── formatting
├── scorers         # judge prompts and pass/fail scoring (composite scoring lives here)
├── solvers         # auditor agent loop — drives the target through a seed
├── stores          # transcript persistence
├── tasks           # Inspect Task wrappers — `petri_audit` etc.
├── tools           # auditor's tool kit (rollback, hidden notes, send_message)
├── transcript      # transcript dataclasses (the schema judges consume)
├── types
└── utils
```

## CLI surface

Minimal — Petri itself ships only:

```
petri view    # transcript viewer server
```

**Eval orchestration goes through `inspect eval <petri-task>`** (Inspect's CLI), not a Petri-native command. This is the Inspect convention.

## Target registration (custom subprocess-based — what no-glaze needs)

Inspect's pattern for a CLI/subprocess target is:

1. Define a Python function that takes a prompt and returns a `ChatCompletion`-shaped response, OR
2. Subclass an Inspect "model" provider, OR
3. Register a custom solver that wraps the subprocess call inline.

**Decision for Unit 0.4 adapter:** wrap Pi as a custom solver. `evals/petri-pi-adapter.py` will:

- Use `inspect_ai.solver.solver` decorator (or equivalent)
- In the solver body: `subprocess.run(["pi", "-p", state.user_prompt, "--mode", "json", "--skill", SKILL_PATH, "--no-context-files", "--provider", "anthropic", "--model", MODEL], cwd=fixture_dir, capture_output=True)`
- Parse the per-line JSON event stream
- Append each tool_call/tool_result/message event into the Inspect `TranscriptEvent` schema expected by Petri's scorers/judges

Verify the exact API by reading `petri/solvers/*.py` and `petri/transcript/*.py` during Unit 0.4.

## Transcript schema

Petri's judge consumes Inspect's transcript event stream. Key types (verify in `petri/transcript/__init__.py` during Unit 0.4):

- `MessageEvent` — model/user/system messages with content
- `ToolEvent` — tool call + tool result pairs
- `ScoreEvent` — judge verdicts (per scorer)

The Pi adapter's normalization step maps Pi's `tool_call` / `tool_result` JSON events onto these.

## Required env

- `ANTHROPIC_API_KEY` — Petri's auditor and judge both call Claude
- (Optional) `OPENAI_API_KEY` — if running cross-provider eval matrices

## Quickstart smoke (to run in Unit 0.4)

```bash
source .venv/bin/activate
inspect eval petri/tasks/petri_audit.py --model anthropic/claude-sonnet-4-6 -T seed_prompt="say hello"
```

If this passes, Petri's pipeline works end-to-end on the local env. Use it as the smoke gate before plugging in the Pi adapter.
