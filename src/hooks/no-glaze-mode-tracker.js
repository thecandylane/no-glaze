#!/usr/bin/env node
"use strict";

const {
  safeWriteFlag,
  getFlagPath,
  getDefaultMode,
  readFlag,
  deleteFlag,
  VALID_MODES,
} = require("./no-glaze-config");

const SLASH_LEVEL = /^\/no-glaze\s+(lite|full|brutal)\b/i;
const SLASH_STOP = /^\/no-glaze\s+(stop|off)\b/i;
const SLASH_ON = /^\/no-glaze\s+on\b/i;
const SLASH_BARE = /^\/no-glaze\s*$/i;

const NL_ACTIVATE = /\b(activate|turn on|enable)\s+no.?glaze\b/i;
const NL_DEACTIVATE = /\b(stop|disable|deactivate|turn off)\s+no.?glaze\b/i;
const NL_NORMAL = /\bnormal\s+mode\b/i;
const NL_LEVEL = /\b(lite|full|brutal)\s+mode\b/i;

function parsePrompt(prompt) {
  if (typeof prompt !== "string") return null;
  if (SLASH_LEVEL.test(prompt)) {
    return { action: "set", mode: prompt.match(SLASH_LEVEL)[1].toLowerCase() };
  }
  if (SLASH_STOP.test(prompt)) return { action: "stop" };
  if (SLASH_ON.test(prompt)) return { action: "set", mode: getDefaultMode() };
  if (SLASH_BARE.test(prompt)) return { action: "set", mode: getDefaultMode() };

  if (NL_DEACTIVATE.test(prompt)) return { action: "stop" };
  if (NL_NORMAL.test(prompt)) return { action: "stop" };
  if (NL_ACTIVATE.test(prompt)) return { action: "set", mode: getDefaultMode() };
  if (NL_LEVEL.test(prompt)) {
    return { action: "set", mode: prompt.match(NL_LEVEL)[1].toLowerCase() };
  }
  return null;
}

function reinforcementFor(mode) {
  switch (mode) {
    case "lite":
      return "no-glaze (lite): strip surface glaze (banned-phrase catalog + self-application). Neutral tone; disagree only on verifiable error or explicit request.";
    case "full":
      return "no-glaze (full): all of lite + PostToolUse contradiction surfacing + pre-assertion confabulation refusal + red-team-in-head + capitulation-under-pressure refusal. No unprompted critique.";
    case "brutal":
      return "no-glaze (brutal): all of full + symptom-vs-root flag + bi-directional scope policing + unprompted critique of code and anti-patterns. Refuse to assert under uncertainty. Hold position absent named new substance.";
    default:
      return null;
  }
}

function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let prompt = "";
    try {
      const data = JSON.parse(raw);
      prompt = data.prompt || data.user_prompt || "";
    } catch (_) {
      prompt = raw;
    }

    try {
      const action = parsePrompt(prompt);
      if (action) {
        if (action.action === "set" && VALID_MODES.has(action.mode)) {
          safeWriteFlag(getFlagPath(), action.mode);
        } else if (action.action === "stop") {
          deleteFlag();
        }
      }
    } catch (_) {
      // silent
    }

    try {
      const mode = readFlag();
      const reinforcement = reinforcementFor(mode);
      if (reinforcement) {
        process.stdout.write(
          JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "UserPromptSubmit",
              additionalContext: reinforcement,
            },
          })
        );
      }
    } catch (_) {
      // silent
    }
  });
}

main();
