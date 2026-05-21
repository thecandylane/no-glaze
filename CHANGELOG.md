# Changelog

All notable changes to no-glaze are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-05-21

No behavior change. The skill, mechanisms, and eval baseline are unchanged from
v0.1.0. This release fixes packaging so the plugin can actually be installed.

### Fixed

- Plugin manifests now pass Claude Code schema validation. v0.1.0 shipped a
  `marketplace.json` structured as a plugin descriptor and a `plugin.json` with
  unsupported `hooks`/`commands`/`skills`/`statusLine` fields — both were
  rejected by `/plugin install`, making marketplace installation impossible.
- `marketplace.json` rewritten as a proper marketplace catalog (`owner` object
  and `plugins` array).
- `plugin.json` slimmed to spec-compliant metadata; hooks, skill, and command
  are resolved via convention-based directory discovery.
- `npm test` and `CONTRIBUTING.md` use the CI-matching glob invocation; the
  previous directory-mode form silently skipped underscore-named test files.

### Added

- `hooks/hooks.json` — declarative hook wiring (`SessionStart`,
  `UserPromptSubmit`, `PostToolUse`) using `${CLAUDE_PLUGIN_ROOT}` for
  cross-platform path resolution. Hooks run via Node, so the plugin works on
  Windows, macOS, Linux, WSL, and ARM.
- `docs/DESIGN.md` — the v3 design spec, committed so contributors can read the
  rationale behind each mechanism.
- `argument-hint` on the `no-glaze` skill so the slash menu shows the level
  options.
- `engines` field pinning Node >= 20.
- This changelog.

### Changed

- `skills/no-glaze/SKILL.md` moved to the conventional plugin skill path.
- README and INSTALL document the plugin install path as recommended; the
  hooks-only shell installer is now the documented alternative.

### Removed

- CI `sync-plugin-mirror` job and the duplicate `plugins/no-glaze/` skill copy
  it maintained. The single source for the skill is `skills/no-glaze/SKILL.md`.

## [0.1.0] — 2026-05-19

Initial release.

### Added

- Always-on engineering posture for Claude Code: strips sycophancy, surfaces
  contradictions, refuses confabulation.
- Seven mechanisms across three intensity levels (lite / full / brutal,
  default brutal): PostToolUse contradiction surfacing, pre-assertion
  confabulation refusal, red-team-in-head, capitulation-under-pressure refusal,
  symptom-vs-root + bi-directional scope policing, banned-phrase catalog,
  self-application.
- Hook-driven activation: `SessionStart`, `UserPromptSubmit`, `PostToolUse`,
  plus a statusline badge.
- Cross-platform installer (`bin/install.js`) supporting Claude Code and Pi.
- Eval harness: Datasets A–D, regex graders, composite scorer, Petri-Pi adapter.
- Hand-audited v0.1.0 baseline composite 94.05 / 100 (N=39). See
  `evals/results/HAND_AUDIT-v0.1.0.md`.
- 75 tests (47 Node + 28 Python).

[0.1.1]: https://github.com/thecandylane/no-glaze/releases/tag/v0.1.1
[0.1.0]: https://github.com/thecandylane/no-glaze/releases/tag/v0.1.0
