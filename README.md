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

```bash
curl -sSL https://github.com/thecandylane/no-glaze/raw/main/install.sh | bash
```

Or, in a cloned repo:

```bash
git clone https://github.com/thecandylane/no-glaze
cd no-glaze
./install.sh
```

The installer:

1. Copies hook scripts into `$CLAUDE_CONFIG_DIR/hooks/` (defaults to `~/.claude/hooks/`).
2. Merges hook entries into `settings.json` (JSONC-tolerant; comments do not crash the merge).
3. Adds the statusline badge command.
4. Activates at level **brutal** on the next Claude Code session start.

## Use

After install, no-glaze is active on every Claude Code session. Toggle via slash commands or natural language:

| Command | Effect |
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

## Auto-clarity

The skill drops its adversarial posture briefly during sensitive moments: security warnings, irreversible action confirmations, user-in-distress moments (lost work, broke prod), teaching/clarification mode. Glaze removal stays active — no fake comfort either.

## Compose with caveman

Both can be active simultaneously. Caveman compresses prose; no-glaze removes sycophancy. Content produced by no-glaze mechanisms (contradiction surfaces, capitulation explanations) is exempt from caveman compression; surrounding prose stays compressed.

## Uninstall

```bash
./install.sh --uninstall
# or
npx -y github:thecandylane/no-glaze --uninstall
```

## License

MIT.
