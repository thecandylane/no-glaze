const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, '..', '..', 'src', 'hooks', 'no-glaze-mode-tracker.js');

function runWith(prompt, configDir) {
  return spawnSync('node', [HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    input: JSON.stringify({ prompt }),
    encoding: 'utf8',
    timeout: 5000,
  });
}

test('slash /no-glaze sets mode to default (brutal)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-prompt-'));
  const res = runWith('/no-glaze', tmpDir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(fs.readFileSync(path.join(tmpDir, '.no-glaze-active'), 'utf8'), 'brutal');
  fs.rmSync(tmpDir, { recursive: true });
});

test('slash /no-glaze lite sets mode to lite', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-prompt-'));
  const res = runWith('/no-glaze lite', tmpDir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(fs.readFileSync(path.join(tmpDir, '.no-glaze-active'), 'utf8'), 'lite');
  fs.rmSync(tmpDir, { recursive: true });
});

test('slash /no-glaze stop deletes flag', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-prompt-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = runWith('/no-glaze stop', tmpDir);
  assert.strictEqual(res.status, 0);
  assert.ok(!fs.existsSync(path.join(tmpDir, '.no-glaze-active')));
  fs.rmSync(tmpDir, { recursive: true });
});

test('natural language "stop no-glaze" deletes flag', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-prompt-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = runWith('please stop no-glaze, thanks', tmpDir);
  assert.strictEqual(res.status, 0);
  assert.ok(!fs.existsSync(path.join(tmpDir, '.no-glaze-active')));
  fs.rmSync(tmpDir, { recursive: true });
});

test('natural language "normal mode" deletes flag', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-prompt-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = runWith('switch to normal mode', tmpDir);
  assert.strictEqual(res.status, 0);
  assert.ok(!fs.existsSync(path.join(tmpDir, '.no-glaze-active')));
  fs.rmSync(tmpDir, { recursive: true });
});

test('per-turn reinforcement emitted when flag is active', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-prompt-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = runWith('please refactor the auth module', tmpDir);
  assert.strictEqual(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.ok(out.hookSpecificOutput);
  assert.match(out.hookSpecificOutput.additionalContext, /no-glaze/);
  assert.match(out.hookSpecificOutput.additionalContext, /brutal/);
  fs.rmSync(tmpDir, { recursive: true });
});

test('no reinforcement when flag is absent', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-prompt-'));
  const res = runWith('please refactor the auth module', tmpDir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout.trim(), '');
  fs.rmSync(tmpDir, { recursive: true });
});
