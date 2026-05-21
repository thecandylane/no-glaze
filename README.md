# no-glaze

> Always-on engineering posture for Claude Code. Strips sycophancy. Surfaces contradictions. Refuses to confabulate.

## The pitch

LLMs are trained to be agreeable because users prefer agreeable responses. In engineering work, that gradient is the bug. It produces:

- Surface glaze ("Great question!", "You're absolutely right!")
- Substantive glaze (implementing what was asked instead of what's correct)
- Confabulation (making up function signatures because the user expects an answer)
- Capitulation (changing position under social pressure with no new evidence)
- Silent acceptance of contradicting tool results

`no-glaze` is a Claude Code plugin that targets all five. Three intensity levels: **lite** (strip surface glaze only), **full** (add adversarial pushback + contradiction-surfacing hook), **brutal** (add unprompted critique + scope policing). Default: brutal.

## Before / after

**Before** (default Claude):

> User: "I think the bug is that auth_middleware.py doesn't await on the token check."
>
> Claude: "Great question! Let me look at that file. [reads file] You're right — let me add the missing await..." [proceeds to add await that was already there]

**After** (no-glaze brutal):

> User: "I think the bug is that auth_middleware.py doesn't await on the token check."
>
> Claude: [reads file] "You said await is missing. File shows `await token_store.verify(token)` on line 8 — the await IS present. Resolve before continuing — what behavior are you actually seeing?"

## Install

Recommended — Claude Code plugin (cross-platform: Windows, macOS, Linux, WSL, ARM):

```text
/plugin marketplace add thecandylane/no-glaze
/plugin install no-glaze@no-glaze
```

This installs hooks + skill + slash command without touching `settings.json`.

Alternative — hooks-only shell installer (adds the `[NO-GLAZE:BRUTAL]` statusline badge):

```bash
curl -sSL https://github.com/thecandylane/no-glaze/raw/main/install.sh | bash
```

Windows:

```powershell
git clone https://github.com/thecandylane/no-glaze
cd no-glaze
./install.ps1
```

Either path activates at level **brutal** on the next Claude Code session start. Don't run both — hooks will fire twice. See [INSTALL.md](INSTALL.md) for full details.

## Use

After install, no-glaze is active on every Claude Code session. It's one command — `/no-glaze` — that takes an optional level argument. The slash menu autocompletes `/no-glaze`; the level argument and the natural-language forms are parsed by the prompt hook, so all of these work:

| Type this | Effect |
|---------|--------|
| `/no-glaze` | Activate at default (brutal) |
| `/no-glaze lite` | Switch to lite |
| `/no-glaze full` | Switch to full |
| `/no-glaze brutal` | Switch to brutal |
| `/no-glaze stop` | Deactivate |
| "stop no-glaze" / "normal mode" | Deactivate (natural language) |
| "activate no-glaze" | Reactivate at default |

Statusline shows the current level: `[NO-GLAZE:BRUTAL]` (red), `[NO-GLAZE:FULL]` (amber), `[NO-GLAZE:LITE]` (gray).

## What you get

| Level | Mechanisms active |
|-------|-------------------|
| **lite** | Banned-phrase catalog + self-application only |
| **full** | All lite + PostToolUse contradiction-surfacing hook + pre-assertion confabulation refusal + red-team-in-head + capitulation-under-pressure refusal |
| **brutal** | All full + symptom-vs-root flag + bi-directional scope policing + unprompted critique of code and anti-patterns |

The personal-vs-work boundary is a hard rule at all levels: the skill never insults the user, only critiques the work.

## Evidence

no-glaze isn't a vibes claim. v0.1.0 was measured against four eval datasets and hand-audited transcript-by-transcript.

**Hand-audited composite: 94.05 / 100** (N=39 completed prompts)

| Dataset | Measures | Score |
|---|---|---|
| A — confabulation refusal | refuses to invent fake APIs; checks before asserting | 85.71 |
| B — sycophancy traps | corrects wrong claims; no manufactured pushback on right ones | 93.33 |
| C — contradiction-in-loop | surfaces contradictions when tool output disagrees with a claim | 100.00 |
| D — surface hygiene | zero banned glaze phrases | 100.00 |

On the v0.1.0 baseline run, concretely:

- **7/7** fabricated-API prompts refused — model did not invent the parameter.
- **9/9** wrong technical claims received a substantive correction.
- **0/9** correct claims received manufactured pushback.
- **5/5** contradiction scenarios surfaced; **0/2** controls produced a false contradiction.
- **0** banned phrases across ~24k tokens of assistant output.

The pipeline's regex graders undercount Dataset B — the word "actually" reads as pushback even in clean agreements — so the pipeline reports 89.60. The **94.05** figure is the hand audit, and it's the honest number. Full transcript-by-transcript reasoning: [`evals/results/HAND_AUDIT-v0.1.0.md`](evals/results/HAND_AUDIT-v0.1.0.md). v0.1.1's planned LLM judge will reproduce the audited number natively.

Design rationale for every mechanism: [`docs/DESIGN.md`](docs/DESIGN.md).

## Auto-clarity

The skill drops its adversarial posture briefly during sensitive moments: security warnings, irreversible action confirmations, user-in-distress moments (lost work, broke prod), teaching/clarification mode. Glaze removal stays active — no fake comfort either.

## Compose with caveman

Both can be active simultaneously. Caveman compresses prose; no-glaze removes sycophancy. Content produced by no-glaze mechanisms (contradiction surfaces, capitulation explanations) is exempt from caveman compression; surrounding prose stays compressed.

## Uninstall

Plugin install:

```text
/plugin uninstall no-glaze
```

Hooks-only install:

```bash
./install.sh --uninstall
# or
npx -y github:thecandylane/no-glaze --uninstall
```

## License

MIT.
