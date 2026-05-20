# Installation

## Claude Code (recommended — plugin)

Works on Windows, macOS, Linux, WSL, ARM — anywhere Claude Code runs.

```text
/plugin marketplace add thecandylane/no-glaze
/plugin install no-glaze@no-glaze
```

Or via CLI from any shell:

```bash
claude plugin marketplace add thecandylane/no-glaze
claude plugin install no-glaze@no-glaze
```

This installs the plugin (hooks + skill + slash command) without touching `settings.json`.

## Claude Code (alternative — hooks-only via shell installer)

Use only if you want the `[NO-GLAZE:BRUTAL]` statusline badge in addition to behavior, or if `/plugin install` isn't available in your environment.

```bash
curl -sSL https://github.com/thecandylane/no-glaze/raw/main/install.sh | bash
```

Local clone:

```bash
git clone https://github.com/thecandylane/no-glaze
cd no-glaze
./install.sh
```

Windows (PowerShell):

```powershell
git clone https://github.com/thecandylane/no-glaze
cd no-glaze
./install.ps1
```

Custom config directory:

```bash
CLAUDE_CONFIG_DIR=~/my-claude ./install.sh
```

Note: do not run both the plugin install AND the hooks installer simultaneously — hooks will fire twice.

## Pi (Earendil)

```bash
./install.sh --only pi
```

Installs `SKILL.md` into `$PI_HOME/agent/skills/no-glaze/` (or `~/.pi/agent/skills/no-glaze/` by default).

## Verify

**Plugin install:** restart your Claude Code session, then run `/plugin list`. You should see `no-glaze@no-glaze` enabled. Type `/no-glaze` to confirm the slash command is registered.

**Hooks-only install:** start a new Claude Code session and check the statusline. You should see `[NO-GLAZE:BRUTAL]` in red.

## Uninstall

Plugin install:

```text
/plugin uninstall no-glaze
```

Hooks-only install:

```bash
./install.sh --uninstall
```

Or per-provider:

```bash
./install.sh --uninstall --only claude-code
./install.sh --uninstall --only pi
```

## List providers

```bash
./install.sh --list
```

## Dry-run

```bash
./install.sh --dry-run --only claude-code
```
