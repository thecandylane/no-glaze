// End-to-end smoke: install → SessionStart hook writes flag → mode-tracker
// /no-glaze stop deletes flag → uninstall removes hook files + settings entries.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..', '..');

test('E2E: install → SessionStart hook writes flag → mode-tracker parses /no-glaze stop → uninstall', () => {
  const tmpConfig = fs.mkdtempSync(path.join(os.tmpdir(), 'no-glaze-e2e-'));
  const env = { ...process.env, CLAUDE_CONFIG_DIR: tmpConfig };

  // 1) Install
  let res = spawnSync(
    'node',
    [path.join(REPO, 'bin', 'install.js'), '--only', 'claude-code'],
    { env, encoding: 'utf8', timeout: 15000 },
  );
  assert.strictEqual(res.status, 0, `Install failed: ${res.stderr}`);
  const hookFile = path.join(tmpConfig, 'hooks', 'no-glaze-activate.js');
  assert.ok(fs.existsSync(hookFile), 'activate hook must be installed');
  assert.ok(fs.existsSync(path.join(tmpConfig, 'hooks', 'no-glaze-tool-watcher.js')), 'tool-watcher must be installed');
  assert.ok(fs.existsSync(path.join(tmpConfig, 'hooks', 'no-glaze-mode-tracker.js')), 'mode-tracker must be installed');
  assert.ok(fs.existsSync(path.join(tmpConfig, 'settings.json')), 'settings.json must be created');

  // 2) Trigger SessionStart hook (writes default-mode flag if absent)
  res = spawnSync('node', [hookFile], { env, encoding: 'utf8', timeout: 5000 });
  assert.strictEqual(res.status, 0, `SessionStart failed: ${res.stderr}`);
  const flagFile = path.join(tmpConfig, '.no-glaze-active');
  assert.strictEqual(fs.readFileSync(flagFile, 'utf8'), 'brutal', 'flag must default to brutal');

  // 3) /no-glaze stop via UserPromptSubmit mode tracker
  res = spawnSync(
    'node',
    [path.join(tmpConfig, 'hooks', 'no-glaze-mode-tracker.js')],
    {
      env,
      input: JSON.stringify({ prompt: '/no-glaze stop' }),
      encoding: 'utf8',
      timeout: 5000,
    },
  );
  assert.strictEqual(res.status, 0, `mode-tracker failed: ${res.stderr}`);
  assert.ok(!fs.existsSync(flagFile), 'flag must be removed by /no-glaze stop');

  // 4) Uninstall
  res = spawnSync(
    'node',
    [path.join(REPO, 'bin', 'install.js'), '--uninstall', '--only', 'claude-code'],
    { env, encoding: 'utf8', timeout: 15000 },
  );
  assert.strictEqual(res.status, 0, `Uninstall failed: ${res.stderr}`);
  assert.ok(!fs.existsSync(hookFile), 'hook file must be removed by --uninstall');

  // settings.json should have no remaining no-glaze hook entries.
  const settings = JSON.parse(fs.readFileSync(path.join(tmpConfig, 'settings.json'), 'utf8'));
  const dump = JSON.stringify(settings.hooks || {});
  assert.ok(
    !dump.includes('no-glaze'),
    `Uninstall left no-glaze entries in settings.hooks: ${dump}`,
  );

  fs.rmSync(tmpConfig, { recursive: true });
});
