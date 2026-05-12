const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const INSTALL = path.join(__dirname, '..', '..', 'bin', 'install.js');

function run(args, env) {
  return spawnSync('node', [INSTALL, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 10000,
  });
}

test('install --list prints PROVIDERS', () => {
  const res = run(['--list'], {});
  assert.strictEqual(res.status, 0);
  assert.match(res.stdout, /claude-code/);
  assert.match(res.stdout, /pi/);
});

test('install --dry-run --only claude-code prints planned actions without changing fs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'install-dryrun-'));
  const res = run(['--dry-run', '--only', 'claude-code'], { CLAUDE_CONFIG_DIR: tmp });
  assert.strictEqual(res.status, 0);
  assert.match(res.stdout, /would copy/i);
  assert.ok(!fs.existsSync(path.join(tmp, 'hooks')), 'Dry-run must not write');
  fs.rmSync(tmp, { recursive: true });
});

test('install --only claude-code installs hooks + merges settings.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'install-real-'));
  const res = run(['--only', 'claude-code'], { CLAUDE_CONFIG_DIR: tmp });
  assert.strictEqual(res.status, 0, `install failed: ${res.stderr}`);
  assert.ok(fs.existsSync(path.join(tmp, 'hooks', 'no-glaze-activate.js')));
  assert.ok(fs.existsSync(path.join(tmp, 'hooks', 'no-glaze-mode-tracker.js')));
  assert.ok(fs.existsSync(path.join(tmp, 'hooks', 'no-glaze-tool-watcher.js')));
  assert.ok(fs.existsSync(path.join(tmp, 'hooks', 'no-glaze-statusline.sh')));
  const settings = JSON.parse(fs.readFileSync(path.join(tmp, 'settings.json'), 'utf8'));
  assert.ok(settings.hooks.SessionStart);
  assert.ok(settings.hooks.UserPromptSubmit);
  assert.ok(settings.hooks.PostToolUse);
  fs.rmSync(tmp, { recursive: true });
});

test('install --uninstall removes hook files and entries', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'install-uninst-'));
  run(['--only', 'claude-code'], { CLAUDE_CONFIG_DIR: tmp });
  const res = run(['--uninstall', '--only', 'claude-code'], { CLAUDE_CONFIG_DIR: tmp });
  assert.strictEqual(res.status, 0);
  assert.ok(!fs.existsSync(path.join(tmp, 'hooks', 'no-glaze-activate.js')));
  const settings = JSON.parse(fs.readFileSync(path.join(tmp, 'settings.json'), 'utf8'));
  const all = JSON.stringify(settings.hooks || {});
  assert.ok(!all.includes('no-glaze'), `Uninstall left no-glaze entries: ${all}`);
  fs.rmSync(tmp, { recursive: true });
});
