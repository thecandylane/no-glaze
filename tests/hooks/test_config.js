const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const config = require('../../src/hooks/no-glaze-config');

test('getDefaultMode returns "brutal" when no env or config', () => {
  delete process.env.NO_GLAZE_DEFAULT_MODE;
  assert.strictEqual(config.getDefaultMode(), 'brutal');
});

test('getDefaultMode respects NO_GLAZE_DEFAULT_MODE env var', () => {
  process.env.NO_GLAZE_DEFAULT_MODE = 'lite';
  assert.strictEqual(config.getDefaultMode(), 'lite');
  delete process.env.NO_GLAZE_DEFAULT_MODE;
});

test('getDefaultMode ignores invalid env values', () => {
  process.env.NO_GLAZE_DEFAULT_MODE = 'nonsense';
  assert.strictEqual(config.getDefaultMode(), 'brutal');
  delete process.env.NO_GLAZE_DEFAULT_MODE;
});

test('safeWriteFlag writes the content', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-test-'));
  const flagPath = path.join(tmpDir, '.no-glaze-active');
  const ok = config.safeWriteFlag(flagPath, 'brutal');
  assert.strictEqual(ok, true);
  assert.strictEqual(fs.readFileSync(flagPath, 'utf8'), 'brutal');
  fs.rmSync(tmpDir, { recursive: true });
});

test('safeWriteFlag refuses to follow symlinks', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-test-'));
  const target = path.join(tmpDir, 'real-target');
  const flagPath = path.join(tmpDir, '.no-glaze-active');
  fs.writeFileSync(target, 'original');
  fs.symlinkSync(target, flagPath);
  const ok = config.safeWriteFlag(flagPath, 'attacker-controlled');
  assert.strictEqual(ok, false);
  assert.strictEqual(fs.readFileSync(target, 'utf8'), 'original');
  fs.rmSync(tmpDir, { recursive: true });
});

test('getFlagPath honors CLAUDE_CONFIG_DIR env var', () => {
  process.env.CLAUDE_CONFIG_DIR = '/custom/path';
  assert.strictEqual(config.getFlagPath(), '/custom/path/.no-glaze-active');
  delete process.env.CLAUDE_CONFIG_DIR;
});
