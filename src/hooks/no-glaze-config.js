"use strict";

// Minimal stub for Unit 0.3 (PostToolUse hook). Unit 1.2 replaces this
// with the full implementation: safeWriteFlag (symlink-refusal, atomic
// temp+rename, 0600, O_NOFOLLOW), getDefaultMode, deleteFlag. Until then,
// only readFlag is needed — the tool-watcher hook only reads.

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const FLAG_NAME = ".no-glaze-active";

function configDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

function flagPath() {
  return path.join(configDir(), FLAG_NAME);
}

function readFlag() {
  try {
    const raw = fs.readFileSync(flagPath(), "utf8").trim();
    return raw || null;
  } catch (_) {
    return null;
  }
}

module.exports = { readFlag, flagPath, configDir, FLAG_NAME };
