const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'src', 'hooks', 'no-glaze-statusline.sh');

function run(configDir) {
  return spawnSync('bash', [SCRIPT], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    encoding: 'utf8',
    timeout: 3000,
  });
}

test('outputs nothing when flag is absent', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-sl-'));
  const res = run(tmpDir);
  assert.strictEqual(res.stdout.trim(), '');
  fs.rmSync(tmpDir, { recursive: true });
});

test('outputs BRUTAL badge for brutal mode', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-sl-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'brutal');
  const res = run(tmpDir);
  assert.match(res.stdout, /NO-GLAZE:BRUTAL/);
  fs.rmSync(tmpDir, { recursive: true });
});

test('outputs FULL badge for full mode', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-sl-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'full');
  const res = run(tmpDir);
  assert.match(res.stdout, /NO-GLAZE:FULL/);
  fs.rmSync(tmpDir, { recursive: true });
});

test('outputs LITE badge for lite mode', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-sl-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'lite');
  const res = run(tmpDir);
  assert.match(res.stdout, /NO-GLAZE:LITE/);
  fs.rmSync(tmpDir, { recursive: true });
});

test('refuses to read symlinked flag', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-sl-'));
  const target = path.join(tmpDir, 'real');
  fs.writeFileSync(target, 'brutal');
  fs.symlinkSync(target, path.join(tmpDir, '.no-glaze-active'));
  const res = run(tmpDir);
  assert.strictEqual(res.stdout.trim(), '');
  fs.rmSync(tmpDir, { recursive: true });
});

test('rejects unknown mode values (whitelist validation)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-sl-'));
  fs.writeFileSync(path.join(tmpDir, '.no-glaze-active'), 'haxx0r-mode\x1b[31mEVIL');
  const res = run(tmpDir);
  assert.strictEqual(res.stdout.trim(), '', 'must not echo unknown content');
  fs.rmSync(tmpDir, { recursive: true });
});
