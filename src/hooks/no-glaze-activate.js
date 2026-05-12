#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  safeWriteFlag,
  getFlagPath,
  getDefaultMode,
  readFlag,
} = require("./no-glaze-config");

function loadSkillBody() {
  const candidates = [
    path.join(__dirname, "..", "..", "skills", "no-glaze", "SKILL.md"),
    path.join(__dirname, "..", "..", "plugins", "no-glaze", "skills", "no-glaze", "SKILL.md"),
  ];
  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      return raw.replace(/^---\n[\s\S]*?\n---\n/, "");
    } catch (_) {
      // try next candidate
    }
  }
  return "";
}

function main() {
  try {
    if (!readFlag()) {
      safeWriteFlag(getFlagPath(), getDefaultMode());
    }
  } catch (_) {
    // never block session start
  }

  try {
    const body = loadSkillBody();
    if (body) process.stdout.write(body);
  } catch (_) {
    // silent
  }
}

main();
