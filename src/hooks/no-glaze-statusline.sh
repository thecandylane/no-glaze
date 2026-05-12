#!/usr/bin/env bash
# no-glaze statusline — renders [NO-GLAZE:<MODE>] badge in Claude Code statusline.
# Silent-fails on any error. Reads flag from $CLAUDE_CONFIG_DIR/.no-glaze-active.

set -u

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
FLAG_FILE="$CONFIG_DIR/.no-glaze-active"

# Refuse to follow symlinks.
if [ -L "$FLAG_FILE" ]; then exit 0; fi
if [ ! -f "$FLAG_FILE" ]; then exit 0; fi

# Read up to 16 bytes, strip whitespace.
mode=$(head -c 16 "$FLAG_FILE" 2>/dev/null | tr -d '[:space:]')

# Whitelist validate — never echo arbitrary bytes from a user-writable file.
case "$mode" in
  lite)
    printf '\033[90m[NO-GLAZE:LITE]\033[0m'
    ;;
  full)
    printf '\033[33m[NO-GLAZE:FULL]\033[0m'
    ;;
  brutal)
    printf '\033[31m[NO-GLAZE:BRUTAL]\033[0m'
    ;;
  *)
    exit 0
    ;;
esac
