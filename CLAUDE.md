# CLAUDE.md — no-glaze

Maintainer instructions for the no-glaze repository.

## Single sources of truth

- `skills/no-glaze/SKILL.md` — the LLM-facing behavior spec. Edit ONLY here for behavior changes. Claude Code plugin discovery reads this path directly via convention.
- `src/rules/no-glaze-activate.md` — rule body for runtimes without hook lifecycle. Keep in sync with SKILL.md.
- `src/hooks/*.js` and `src/hooks/*.sh|ps1` — hook implementations.
- `bin/install.js` `PROVIDERS` array — single source for which agents are supported. Phase 2 adds entries here.
- `evals/datasets/A/B/C/D` — eval dataset truth.
- `docs/DESIGN.md` — the design spec (v3). All `spec §N` references in this file point to its numbered sections.

## Hook safety contract

- All hooks silent-fail on filesystem errors. Hook crash must NEVER block Claude Code session start.
- Flag-file writes go through `safeWriteFlag()` in `src/hooks/no-glaze-config.js`. Symlink-refusal, atomic temp+rename, 0600 mode, `O_NOFOLLOW` where supported.
- Hooks honor `CLAUDE_CONFIG_DIR` env var. Never hardcode `~/.claude`.
- Settings.json reads use `bin/lib/settings.js` `readSettings()` for JSONC tolerance. Settings writes run `validateHookFields()` first.

## When changing the PostToolUse anchor (§3.1)

The anchor text in `src/hooks/no-glaze-tool-watcher.js` is load-bearing. Per spec §15, every word costs ~30–50 tokens × tool-calls-per-prompt. But clarity beats compression on a load-bearing per-call instruction.

Before changing: re-read spec §3.1 design notes (wolf-cry / Claude-vs-Claude ordering / anti-manufacture). Verify the change preserves all three properties. Run Dataset C to confirm `contradiction_surface_rate` did not regress.

## Token cost discipline

Per spec §15, the PostToolUse anchor costs ~1.2k–2k input tokens per prompt. Phase 2 has a "smart-anchor-suppression" optimization candidate: track whether any claims have been made yet in the conversation, suppress anchor when none. Cuts early-session cost ~50%. Implement only if real-world cost data justifies it.

## Eval discipline

- Composite weighting (A=30 / B=25 / C=35 / D=10) is in spec §9. Do not change without spec revision.
- Dataset C is the load-bearing eval for the PostToolUse mechanism. If C regresses, do not ship.
- Hand-crafted datasets stay hand-crafted (A and B grow to N=200+ via Bloom in Phase 1.5; C does not scale).

## Out of scope

- **Hermes.** Self-improving skill loop is structurally incompatible with no-glaze's required invariance. Do not add a Hermes entry to PROVIDERS unless Hermes ships a per-skill self-improvement-disable mechanism we trust.
- **`/no-glaze why` command.** Implies an audit log not specified anywhere. Phase 2 only.

## Composition with caveman

Per spec §5: mechanism output is exempt from caveman compression. Surrounding prose stays compressed. Composition tests in `tests/composition/` enforce this.
