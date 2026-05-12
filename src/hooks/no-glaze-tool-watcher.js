#!/usr/bin/env node
"use strict";

const { readFlag } = require("./no-glaze-config");

const EVIDENCE_TOOLS = new Set([
  "Read",
  "Grep",
  "Glob",
  "Bash",
  "WebFetch",
  "WebSearch",
]);

const ACTIVE_MODES = new Set(["full", "brutal"]);

// §3.1 contradiction-surfacing anchor — load-bearing wording, brainstorm-negotiated.
// Do NOT paraphrase. Do NOT compress. Conditional framing prevents wolf-cry;
// "your own assertions first" targets Claude-vs-Claude failure mode;
// "do not manufacture" guards against the contrarian-bot false-pushback failure mode.
const ANCHOR =
  "no-glaze: scan this result against specific prior claims — your own assertions earlier this turn first, then user claims. If material contradiction, lead the next message with it. If none, continue normally. Do not manufacture contradictions to satisfy this check.";

function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    try {
      const mode = readFlag();
      if (!ACTIVE_MODES.has(mode)) return;

      let toolName = "";
      try {
        const data = JSON.parse(raw);
        toolName = data.tool_name || data.toolName || "";
      } catch (_) {
        return;
      }

      if (!EVIDENCE_TOOLS.has(toolName)) return;

      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: ANCHOR,
          },
        })
      );
    } catch (_) {
      // silent — never crash, never block
    }
  });
}

main();
