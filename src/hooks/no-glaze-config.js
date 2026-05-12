"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const VALID_MODES = new Set(["lite", "full", "brutal"]);
const DEFAULT_MODE = "brutal";

function getDefaultMode() {
  const envMode = process.env.NO_GLAZE_DEFAULT_MODE;
  if (envMode && VALID_MODES.has(envMode)) return envMode;

  const configDirs = [
    process.env.XDG_CONFIG_HOME && path.join(process.env.XDG_CONFIG_HOME, "no-glaze"),
    process.env.HOME && path.join(process.env.HOME, ".config", "no-glaze"),
    process.env.APPDATA && path.join(process.env.APPDATA, "no-glaze"),
  ].filter(Boolean);

  for (const dir of configDirs) {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
      if (config && VALID_MODES.has(config.mode)) return config.mode;
    } catch (_) {
      // silent — file missing, malformed, or unreadable
    }
  }

  return DEFAULT_MODE;
}

function getFlagPath() {
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  return path.join(configDir, ".no-glaze-active");
}

function safeWriteFlag(flagPath, content) {
  try {
    const dir = path.dirname(flagPath);

    try {
      const parent = fs.lstatSync(dir);
      if (parent.isSymbolicLink()) return false;
    } catch (_) {
      try {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      } catch (_) {
        return false;
      }
    }

    try {
      const stat = fs.lstatSync(flagPath);
      if (stat.isSymbolicLink()) return false;
    } catch (_) {
      // flag doesn't exist yet — fine
    }

    const tempPath = `${flagPath}.tmp.${process.pid}`;
    const flags =
      fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      (fs.constants.O_NOFOLLOW || 0);
    const fd = fs.openSync(tempPath, flags, 0o600);
    try {
      fs.writeSync(fd, String(content));
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tempPath, flagPath);
    return true;
  } catch (_) {
    return false;
  }
}

function readFlag() {
  try {
    return fs.readFileSync(getFlagPath(), "utf8").trim();
  } catch (_) {
    return null;
  }
}

function deleteFlag() {
  try {
    fs.unlinkSync(getFlagPath());
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  getDefaultMode,
  getFlagPath,
  safeWriteFlag,
  readFlag,
  deleteFlag,
  VALID_MODES,
  DEFAULT_MODE,
};
