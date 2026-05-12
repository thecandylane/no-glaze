const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK = path.join(__dirname, '..', '..', 'src', 'hooks', 'no-glaze-tool-watcher.js');

function runWith(payload, configDir) {
  return spawnSync('node', [HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 5000,
  });
}

test('injects anchor after Read tool in brutal mode', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-tool-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = runWith({ tool_name: 'Read', tool_response: 'file contents' }, tmpDir);
  assert.strictEqual(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /contradiction/);
  assert.match(out.hookSpecificOutput.additionalContext, /prior claims/);
  assert.match(out.hookSpecificOutput.additionalContext, /not manufacture/);
  fs.rmSync(tmpDir, { recursive: true });
});

test('injects anchor after Grep in full mode', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-tool-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'full');
  const res = runWith({ tool_name: 'Grep' }, tmpDir);
  const out = JSON.parse(res.stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /contradiction/);
  fs.rmSync(tmpDir, { recursive: true });
});

test('does NOT inject in lite mode', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-tool-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'lite');
  const res = runWith({ tool_name: 'Read' }, tmpDir);
  assert.strictEqual(res.stdout.trim(), '');
  fs.rmSync(tmpDir, { recursive: true });
});

test('does NOT inject when flag is absent', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-tool-'));
  const res = runWith({ tool_name: 'Read' }, tmpDir);
  assert.strictEqual(res.stdout.trim(), '');
  fs.rmSync(tmpDir, { recursive: true });
});

test('does NOT inject after action tools (Edit)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-tool-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = runWith({ tool_name: 'Edit' }, tmpDir);
  assert.strictEqual(res.stdout.trim(), '');
  fs.rmSync(tmpDir, { recursive: true });
});

test('does NOT inject after action tools (Write)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-tool-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = runWith({ tool_name: 'Write' }, tmpDir);
  assert.strictEqual(res.stdout.trim(), '');
  fs.rmSync(tmpDir, { recursive: true });
});

test('injects after WebFetch and WebSearch', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-tool-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  for (const tool of ['WebFetch', 'WebSearch', 'Bash', 'Glob']) {
    const res = runWith({ tool_name: tool }, tmpDir);
    assert.notStrictEqual(res.stdout.trim(), '', `${tool} should trigger anchor`);
  }
  fs.rmSync(tmpDir, { recursive: true });
});

test('silent-fails on malformed JSON', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-tool-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = spawnSync('node', [HOOK], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: tmpDir },
    input: 'not valid json{{',
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.strictEqual(res.status, 0, 'Must exit 0 on bad input');
  fs.rmSync(tmpDir, { recursive: true });
});
