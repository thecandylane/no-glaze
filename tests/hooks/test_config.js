const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const config = require('../../src/hooks/no-glaze-config');

test('getDefaultMode returns "brutal" when no env or config', (t) => {
  // Isolate from any real config.json the developer might have at
  // $XDG_CONFIG_HOME/no-glaze/, $HOME/.config/no-glaze/, or $APPDATA/no-glaze/
  // — otherwise CI on a machine with a non-brutal preference would false-fail.
  const saved = {
    NO_GLAZE_DEFAULT_MODE: process.env.NO_GLAZE_DEFAULT_MODE,
    HOME: process.env.HOME,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    APPDATA: process.env.APPDATA,
  };
  delete process.env.NO_GLAZE_DEFAULT_MODE;
  delete process.env.HOME;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.APPDATA;
  t.after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  assert.strictEqual(config.getDefaultMode(), 'brutal');
});

test('getDefaultMode respects NO_GLAZE_DEFAULT_MODE env var', () => {
  process.env.NO_GLAZE_DEFAULT_MODE = 'lite';
  assert.strictEqual(config.getDefaultMode(), 'lite');
  delete process.env.NO_GLAZE_DEFAULT_MODE;
});

test('getDefaultMode ignores invalid env values', (t) => {
  // Same config-file isolation as the brutal-default test — without it, a
  // developer with $HOME/.config/no-glaze/config.json set to "lite" would
  // see this test "pass" with the wrong return value (lite, not brutal).
  const saved = {
    NO_GLAZE_DEFAULT_MODE: process.env.NO_GLAZE_DEFAULT_MODE,
    HOME: process.env.HOME,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    APPDATA: process.env.APPDATA,
  };
  process.env.NO_GLAZE_DEFAULT_MODE = 'nonsense';
  delete process.env.HOME;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.APPDATA;
  t.after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  assert.strictEqual(config.getDefaultMode(), 'brutal');
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
