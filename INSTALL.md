# Installation

## Claude Code

Recommended:

```bash
curl -sSL https://github.com/thecandylane/no-glaze/raw/main/install.sh | bash
```

Local clone:

```bash
git clone https://github.com/thecandylane/no-glaze
cd no-glaze
./install.sh
```

Custom config directory:

```bash
CLAUDE_CONFIG_DIR=~/my-claude ./install.sh
```

## Pi (Earendil)

```bash
./install.sh --only pi
```

Installs `SKILL.md` into `$PI_HOME/agent/skills/no-glaze/` (or `~/.pi/agent/skills/no-glaze/` by default).

## Verify

After Claude Code install, start a new Claude Code session and check the statusline. You should see `[NO-GLAZE:BRUTAL]` in red.

## Uninstall

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
