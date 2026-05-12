const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const settings = require('../../bin/lib/settings');

test('readSettings tolerates // line comments', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-'));
  const file = path.join(tmp, 'settings.json');
  fs.writeFileSync(file, '// header comment\n{\n  "foo": 1 // inline\n}\n');
  const parsed = settings.readSettings(file);
  assert.deepStrictEqual(parsed, { foo: 1 });
  fs.rmSync(tmp, { recursive: true });
});

test('readSettings tolerates /* block comments */', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-'));
  const file = path.join(tmp, 'settings.json');
  fs.writeFileSync(file, '/* preamble */\n{ "foo": /* inline */ 2 }');
  const parsed = settings.readSettings(file);
  assert.deepStrictEqual(parsed, { foo: 2 });
  fs.rmSync(tmp, { recursive: true });
});

test('readSettings returns {} when file is missing', () => {
  assert.deepStrictEqual(settings.readSettings('/nonexistent/path.json'), {});
});

test('readSettings returns {} when file is malformed', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-'));
  const file = path.join(tmp, 'settings.json');
  fs.writeFileSync(file, 'not even close to json {{{');
  assert.deepStrictEqual(settings.readSettings(file), {});
  fs.rmSync(tmp, { recursive: true });
});

test('writeSettings atomically writes valid JSON', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-'));
  const file = path.join(tmp, 'settings.json');
  settings.writeSettings(file, { hooks: { SessionStart: [{ matcher: '*', hooks: [{ type: 'command', command: 'node x.js' }] }] } });
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(parsed.hooks.SessionStart);
  fs.rmSync(tmp, { recursive: true });
});

test('validateHookFields rejects entries without type or command', () => {
  assert.strictEqual(settings.validateHookFields({ type: 'command', command: 'x' }), true);
  assert.strictEqual(settings.validateHookFields({ type: 'command' }), false);
  assert.strictEqual(settings.validateHookFields({ command: 'x' }), false);
  assert.strictEqual(settings.validateHookFields(null), false);
});
