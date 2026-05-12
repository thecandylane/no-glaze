const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, '..', '..', 'src', 'hooks', 'no-glaze-activate.js');

test('SessionStart hook writes flag when missing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-session-'));
  const result = spawnSync('node', [HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmpDir },
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.strictEqual(result.status, 0, `Hook exited ${result.status}: ${result.stderr}`);
  const flagPath = path.join(tmpDir, '.no-glaze-active');
  assert.ok(fs.existsSync(flagPath), 'Flag file should exist');
  assert.strictEqual(fs.readFileSync(flagPath, 'utf8'), 'brutal');
  fs.rmSync(tmpDir, { recursive: true });
});

test('SessionStart hook does not overwrite existing flag', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-session-'));
  const flagPath = path.join(tmpDir, '.no-glaze-active');
  fs.writeFileSync(flagPath, 'lite');
  const result = spawnSync('node', [HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmpDir },
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.strictEqual(result.status, 0);
  assert.strictEqual(fs.readFileSync(flagPath, 'utf8'), 'lite');
  fs.rmSync(tmpDir, { recursive: true });
});

test('SessionStart hook emits skill body to stdout', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-session-'));
  const result = spawnSync('node', [HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmpDir },
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.match(result.stdout, /no-glaze/);
  assert.match(result.stdout, /mechanism/i);
  fs.rmSync(tmpDir, { recursive: true });
});

test('SessionStart hook does not crash on read-only config dir', () => {
  const result = spawnSync('node', [HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: '/proc/self' },
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.strictEqual(result.status, 0, 'Hook must silent-fail, not crash');
});
