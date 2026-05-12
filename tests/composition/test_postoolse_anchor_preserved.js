// Test 1 from spec §13 — Contradiction surface composition.
// Verifies that the §3.1 anchor output is verbose enough to be useful
// when both no-glaze and caveman flags are active. The full 5-test
// composition suite lives in tests/composition/ from Unit 1.9; this
// file ships in Phase 0 alongside the load-bearing PostToolUse hook
// so the verification rides with the implementation.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL_HOOK = path.join(__dirname, '..', '..', 'src', 'hooks', 'no-glaze-tool-watcher.js');

function withBothFlags() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-'));
  fs.writeFileSync(path.join(tmp, '.no-glaze-active'), 'brutal');
  fs.writeFileSync(path.join(tmp, '.caveman-active'), 'full');
  return tmp;
}

test('Test 1 — Contradiction surface output is preserved when caveman also active', () => {
  const tmp = withBothFlags();
  const res = spawnSync('node', [TOOL_HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmp },
    input: JSON.stringify({ tool_name: 'Read' }),
    encoding: 'utf8',
  });
  const out = JSON.parse(res.stdout);
  const anchor = out.hookSpecificOutput.additionalContext;
  assert.ok(anchor.includes("specific prior claims"), 'Anchor must name prior-claims comparison');
  assert.ok(anchor.includes("not manufacture"), 'Anchor must include anti-manufacture guard');
  assert.ok(anchor.length > 200, `Anchor must be verbose enough to be useful, got ${anchor.length} chars`);
  fs.rmSync(tmp, { recursive: true });
});
