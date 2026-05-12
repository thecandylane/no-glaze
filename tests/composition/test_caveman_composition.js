// Composition tests 2-5 from spec §13. Test 1 ships separately in
// tests/composition/test_postoolse_anchor_preserved.js (alongside the load-
// bearing PostToolUse hook from Unit 0.3). The composition suite verifies
// that both no-glaze and caveman can be flag-file active simultaneously
// without losing the load-bearing wording of either skill.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL_HOOK = path.join(__dirname, '..', '..', 'src', 'hooks', 'no-glaze-tool-watcher.js');
const PROMPT_HOOK = path.join(__dirname, '..', '..', 'src', 'hooks', 'no-glaze-mode-tracker.js');

function withBothFlags(mode = 'brutal') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-'));
  fs.writeFileSync(path.join(tmp, '.no-glaze-active'), mode);
  fs.writeFileSync(path.join(tmp, '.caveman-active'), 'full');
  return tmp;
}

test('Test 2 — Capitulation articulation surface preserved when caveman also active', () => {
  const tmp = withBothFlags('brutal');
  const res = spawnSync('node', [PROMPT_HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmp },
    input: JSON.stringify({ prompt: 'are you sure about that?' }),
    encoding: 'utf8',
    timeout: 5000,
  });
  const out = JSON.parse(res.stdout);
  const reinforcement = out.hookSpecificOutput.additionalContext;
  // (a) mechanism content verbose enough to be useful
  assert.match(reinforcement, /capitulation/i, 'must name the capitulation mechanism');
  assert.match(reinforcement, /hold position|named new substance/i, 'must include the hold-position discipline');
  // (b) reinforcement is the no-glaze mechanism block, not arbitrary prose
  assert.match(reinforcement, /no-glaze/);
  fs.rmSync(tmp, { recursive: true });
});

test('Test 3 — Scope-policing mention preserved in brutal-mode reinforcement under caveman', () => {
  const tmp = withBothFlags('brutal');
  const res = spawnSync('node', [PROMPT_HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmp },
    input: JSON.stringify({ prompt: 'tweak this 2-line bug' }),
    encoding: 'utf8',
    timeout: 5000,
  });
  const out = JSON.parse(res.stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /scope/i, 'brutal reinforcement must name scope policing');
  fs.rmSync(tmp, { recursive: true });
});

test('Test 4 — No-override: PostToolUse silent on action tools even with both flags active', () => {
  // Caveman flag being present must NOT cause the no-glaze tool-watcher to
  // start emitting on action tools. The exempt-from-compression precedence
  // only applies to mechanism OUTPUT, not to widening which tools fire.
  const tmp = withBothFlags('brutal');
  const res = spawnSync('node', [TOOL_HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmp },
    input: JSON.stringify({ tool_name: 'Edit' }),
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.strictEqual(res.stdout.trim(), '', 'Edit tool must not trigger no-glaze anchor');
  fs.rmSync(tmp, { recursive: true });
});

test('Test 5 — Flag-file isolation: deleting no-glaze flag does not affect caveman flag', () => {
  const tmp = withBothFlags('brutal');
  // Simulate `/no-glaze stop` by removing only no-glaze's flag.
  fs.unlinkSync(path.join(tmp, '.no-glaze-active'));
  // Caveman flag must survive — different filename, no race, no shared state.
  assert.ok(
    fs.existsSync(path.join(tmp, '.caveman-active')),
    'caveman flag must be independent of no-glaze flag',
  );
  // And no-glaze tool-watcher must now silent-exit (flag absent).
  const res = spawnSync('node', [TOOL_HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmp },
    input: JSON.stringify({ tool_name: 'Read' }),
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.strictEqual(
    res.stdout.trim(),
    '',
    'PostToolUse must silent-exit when no-glaze flag missing, even if caveman is present',
  );
  fs.rmSync(tmp, { recursive: true });
});
