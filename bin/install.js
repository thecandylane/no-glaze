#!/usr/bin/env node
// no-glaze — unified cross-platform installer.
//
// Single Node script handles all install targets. Replaces the need for
// per-OS shells and per-target installers. Works on macOS, Linux, and Windows.
//
// Distribution:
//   Local clone: node bin/install.js [flags]
//   curl|bash:   delegated from install.sh shim → npx -y github:thecandylane/no-glaze -- [flags]
//   Windows:     pwsh install.ps1 [flags] → same npx delegation
//
// Pure stdlib, zero npm runtime deps.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const child_process = require('node:child_process');

const SETTINGS = require('./lib/settings');

const REPO = 'thecandylane/no-glaze';

// Hook files copied into $CLAUDE_CONFIG_DIR/hooks/ for the claude-code target.
const HOOK_FILES = [
  'package.json',
  'no-glaze-config.js',
  'no-glaze-activate.js',
  'no-glaze-mode-tracker.js',
  'no-glaze-tool-watcher.js',
  'no-glaze-statusline.sh',
  'no-glaze-statusline.ps1',
];

// PostToolUse matcher — informational tools where confabulation is most likely.
const POST_TOOL_USE_MATCHER = 'Read|Grep|Glob|Bash|WebFetch|WebSearch';

const IS_WIN = process.platform === 'win32';

// ── Argv ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    dryRun: false,
    listOnly: false,
    uninstall: false,
    only: [],
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--dry-run': opts.dryRun = true; break;
      case '--list': opts.listOnly = true; break;
      case '--uninstall': case '-u': opts.uninstall = true; break;
      case '-h': case '--help': opts.help = true; break;
      case '--': break;
      case '--only': {
        const v = argv[++i];
        if (!v) die('error: --only requires an argument');
        opts.only.push(v);
        break;
      }
      default:
        die(`error: unknown flag: ${a}\nrun 'no-glaze --help' for usage`);
    }
  }
  return opts;
}

function die(msg) { process.stderr.write(msg + '\n'); process.exit(2); }

// ── Provider matrix ────────────────────────────────────────────────────────
// Two providers ship in Phase 1: claude-code (plugin + hooks) and pi
// (Petri-Pi agents.md + skill). Future providers (codex, gemini, opencode)
// drop in as additional entries with their own install/uninstall functions.
const PROVIDERS = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    mech: 'plugin + hooks',
    detect: () => hasCmd('claude'),
    install: installClaudeCode,
    uninstall: uninstallClaudeCode,
  },
  {
    id: 'pi',
    label: 'Petri-Pi',
    mech: 'agents.md + skill',
    detect: () => !!(process.env.PI_HOME || hasCmd('pi')),
    install: installPi,
    uninstall: uninstallPi,
  },
];

// ── Detection helpers ──────────────────────────────────────────────────────
function hasCmd(cmd) {
  try {
    if (IS_WIN) {
      const r = child_process.spawnSync('where', [cmd], { stdio: 'ignore' });
      return r.status === 0;
    }
    const r = child_process.spawnSync('sh', ['-c', `command -v ${shellEscape(cmd)}`], { stdio: 'ignore' });
    return r.status === 0;
  } catch (_) { return false; }
}

function shellEscape(s) { return `'${String(s).replace(/'/g, `'\\''`)}'`; }

// ── Repo root resolution ───────────────────────────────────────────────────
// bin/install.js sits at <repo>/bin/install.js. Walk up one.
function detectRepoRoot() {
  const here = path.dirname(__filename);
  const root = path.resolve(here, '..');
  if (fs.existsSync(path.join(root, 'src', 'hooks')) &&
      fs.existsSync(path.join(root, 'skills'))) {
    return root;
  }
  return null;
}

// ── claude-code provider ───────────────────────────────────────────────────
function installClaudeCode(ctx) {
  const { opts, configDir, repoRoot, log } = ctx;
  const hooksDir = path.join(configDir, 'hooks');
  const settingsPath = path.join(configDir, 'settings.json');
  const sourceDir = repoRoot ? path.join(repoRoot, 'src', 'hooks') : null;

  log(`→ Claude Code: installing hooks into ${hooksDir}`);

  if (opts.dryRun) {
    log(`  would mkdir ${hooksDir}`);
    for (const f of HOOK_FILES) {
      const src = sourceDir ? path.join(sourceDir, f) : `(remote)/${f}`;
      log(`  would copy ${src} → ${path.join(hooksDir, f)}`);
    }
    log(`  would merge SessionStart + UserPromptSubmit + PostToolUse + statusLine into ${settingsPath}`);
    return { ok: true };
  }

  fs.mkdirSync(hooksDir, { recursive: true });

  // Copy each hook file from the local clone. We don't ship a remote-download
  // fallback yet — Phase 1 requires a local clone for the claude-code target.
  for (const f of HOOK_FILES) {
    const dest = path.join(hooksDir, f);
    const src = sourceDir ? path.join(sourceDir, f) : null;
    if (src && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      log(`  installed: ${dest}`);
    } else {
      log(`  skipped (no source): ${f}`);
    }
  }

  // chmod statusline on POSIX. No-op on Windows.
  try { fs.chmodSync(path.join(hooksDir, 'no-glaze-statusline.sh'), 0o755); } catch (_) {}

  // Merge into settings.json. Use JSONC-tolerant reader so comments survive.
  const settings = SETTINGS.readSettings(settingsPath);
  // One-time backup before our first mutation. Guard against overwriting a
  // good backup with an already-merged file on re-runs.
  const bak = settingsPath + '.bak';
  if (fs.existsSync(settingsPath) && !fs.existsSync(bak)) {
    try { fs.copyFileSync(settingsPath, bak); } catch (_) {}
  }

  const node = process.execPath;
  const activate = path.join(hooksDir, 'no-glaze-activate.js');
  const tracker  = path.join(hooksDir, 'no-glaze-mode-tracker.js');
  const watcher  = path.join(hooksDir, 'no-glaze-tool-watcher.js');
  const statusline = path.join(hooksDir, 'no-glaze-statusline.sh');

  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {};

  addHookGroup(settings, 'SessionStart', '*', {
    type: 'command',
    command: `"${node}" "${activate}"`,
  });
  addHookGroup(settings, 'UserPromptSubmit', '*', {
    type: 'command',
    command: `"${node}" "${tracker}"`,
  });
  addHookGroup(settings, 'PostToolUse', POST_TOOL_USE_MATCHER, {
    type: 'command',
    command: `"${node}" "${watcher}"`,
  });

  // statusLine — only set if absent or pointing at our script.
  const slCmd = IS_WIN
    ? `pwsh -NoProfile -ExecutionPolicy Bypass -File "${path.join(hooksDir, 'no-glaze-statusline.ps1')}"`
    : `bash "${statusline}"`;
  if (!settings.statusLine) {
    settings.statusLine = { type: 'command', command: slCmd };
    log('  statusline badge configured');
  } else {
    const existing = typeof settings.statusLine === 'string'
      ? settings.statusLine
      : (settings.statusLine.command || '');
    if (existing.includes('no-glaze-statusline')) {
      log('  statusline already configured');
    } else {
      log('  NOTE: existing statusline detected — no-glaze badge NOT added');
    }
  }

  SETTINGS.writeSettings(settingsPath, settings);
  log(`  hooks wired in ${settingsPath}`);
  return { ok: true };
}

function uninstallClaudeCode(ctx) {
  const { opts, configDir, log } = ctx;
  const hooksDir = path.join(configDir, 'hooks');
  const settingsPath = path.join(configDir, 'settings.json');

  log(`→ Claude Code: removing hooks from ${hooksDir}`);

  // 1. Strip no-glaze hook entries from settings.json.
  if (fs.existsSync(settingsPath)) {
    const settings = SETTINGS.readSettings(settingsPath);
    if (settings && settings.hooks && typeof settings.hooks === 'object') {
      for (const event of Object.keys(settings.hooks)) {
        const groups = settings.hooks[event];
        if (!Array.isArray(groups)) continue;
        const next = [];
        for (const g of groups) {
          if (!g || !Array.isArray(g.hooks)) { next.push(g); continue; }
          const keptHooks = g.hooks.filter(h => {
            const cmd = (h && h.command) || '';
            return !cmd.includes('no-glaze');
          });
          if (keptHooks.length > 0) {
            next.push(Object.assign({}, g, { hooks: keptHooks }));
          }
        }
        if (next.length === 0) delete settings.hooks[event];
        else settings.hooks[event] = next;
      }
    }
    // Drop statusLine if it points at our script.
    if (settings.statusLine) {
      const cmd = typeof settings.statusLine === 'string'
        ? settings.statusLine
        : (settings.statusLine.command || '');
      if (cmd.includes('no-glaze')) delete settings.statusLine;
    }
    if (!opts.dryRun) SETTINGS.writeSettings(settingsPath, settings);
    log(`  cleaned settings.json`);
  }

  // 2. Delete hook files we own.
  if (fs.existsSync(hooksDir)) {
    for (const f of HOOK_FILES) {
      const p = path.join(hooksDir, f);
      if (!fs.existsSync(p)) continue;
      if (!opts.dryRun) { try { fs.unlinkSync(p); } catch (_) {} }
      log(`  removed ${p}`);
    }
    // Don't rmdir hooksDir — other plugins may share it.
  }

  // 3. Flag file — best-effort, no-glaze writes it during sessions.
  const flag = path.join(configDir, '.no-glaze-active');
  if (fs.existsSync(flag) && !opts.dryRun) {
    try { fs.unlinkSync(flag); } catch (_) {}
  }

  return { ok: true };
}

// ── pi (Petri-Pi) provider ─────────────────────────────────────────────────
function installPi(ctx) {
  const { opts, repoRoot, log } = ctx;
  const piHome = process.env.PI_HOME || path.join(os.homedir(), '.pi');
  const destSkillDir = path.join(piHome, 'agent', 'skills', 'no-glaze');
  const srcSkill = repoRoot
    ? path.join(repoRoot, 'skills', 'no-glaze', 'SKILL.md')
    : null;

  log(`→ Petri-Pi: installing skill into ${destSkillDir}`);

  if (opts.dryRun) {
    log(`  would mkdir ${destSkillDir}`);
    log(`  would copy ${srcSkill || '(remote)/skills/no-glaze/SKILL.md'} → ${path.join(destSkillDir, 'SKILL.md')}`);
    return { ok: true };
  }

  if (!srcSkill || !fs.existsSync(srcSkill)) {
    log(`  skipped — source skill not found (need local clone)`);
    return { ok: false, reason: 'no source skill' };
  }
  fs.mkdirSync(destSkillDir, { recursive: true });
  fs.copyFileSync(srcSkill, path.join(destSkillDir, 'SKILL.md'));
  log(`  installed: ${path.join(destSkillDir, 'SKILL.md')}`);
  return { ok: true };
}

function uninstallPi(ctx) {
  const { opts, log } = ctx;
  const piHome = process.env.PI_HOME || path.join(os.homedir(), '.pi');
  const destSkillDir = path.join(piHome, 'agent', 'skills', 'no-glaze');

  log(`→ Petri-Pi: removing skill from ${destSkillDir}`);

  if (!fs.existsSync(destSkillDir)) {
    log(`  nothing to remove`);
    return { ok: true };
  }
  if (!opts.dryRun) {
    try { fs.rmSync(destSkillDir, { recursive: true, force: true }); } catch (_) {}
  }
  log(`  removed ${destSkillDir}`);
  return { ok: true };
}

// ── settings.json helpers ──────────────────────────────────────────────────
// Add a single hook entry under settings.hooks[event] for the given matcher.
// Idempotent — won't duplicate if our exact command is already present.
function addHookGroup(settings, event, matcher, entry) {
  if (!SETTINGS.validateHookFields(entry)) return;
  if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];
  const groups = settings.hooks[event];

  // Try to find an existing group with the same matcher.
  let group = groups.find(g => g && g.matcher === matcher);
  if (!group) {
    group = { matcher, hooks: [] };
    groups.push(group);
  }
  if (!Array.isArray(group.hooks)) group.hooks = [];
  // Skip if our command is already wired (idempotent re-install).
  if (group.hooks.some(h => h && h.command === entry.command)) return;
  group.hooks.push(entry);
}

// ── --list ─────────────────────────────────────────────────────────────────
function printList() {
  process.stdout.write('no-glaze provider matrix\n\n');
  process.stdout.write(`  ${pad('ID', 14)} ${pad('TARGET', 14)} MECHANISM\n`);
  process.stdout.write(`  ${pad('--', 14)} ${pad('------', 14)} ---------\n`);
  for (const p of PROVIDERS) {
    process.stdout.write(`  ${pad(p.id, 14)} ${pad(p.label, 14)} ${p.mech}\n`);
  }
  process.stdout.write('\n');
}

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }

// ── Help ───────────────────────────────────────────────────────────────────
function printHelp() {
  process.stdout.write(`no-glaze installer — installs the no-glaze engineering posture.

USAGE
  node bin/install.js [flags]
  bash install.sh [flags]              # shim → node/npx
  pwsh install.ps1 [flags]             # shim → node/npx

FLAGS
  --list                Print provider matrix and exit.
  --dry-run             Print what would run, do nothing.
  --only <id>           Install only the named target. Repeatable.
                        See --list for valid ids.
  --uninstall, -u       Remove no-glaze from this machine.
  -h, --help            Show this help.

PROVIDERS
  claude-code           Plugin + SessionStart/UserPromptSubmit/PostToolUse hooks
                        + statusLine badge. Writes to \$CLAUDE_CONFIG_DIR
                        (default ~/.claude).
  pi                    Petri-Pi skill at \$PI_HOME/agent/skills/no-glaze/SKILL.md.

EXAMPLES
  node bin/install.js --list
  node bin/install.js --only claude-code
  node bin/install.js --dry-run --only claude-code
  node bin/install.js --uninstall --only claude-code

  Issues: https://github.com/${REPO}/issues
`);
}

// ── Main ───────────────────────────────────────────────────────────────────
function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { printHelp(); return 0; }
  if (opts.listOnly) { printList(); return 0; }

  // Validate --only ids against the provider matrix.
  if (opts.only.length) {
    const knownIds = new Set(PROVIDERS.map(p => p.id));
    for (const id of opts.only) {
      if (!knownIds.has(id)) {
        die(`error: unknown target: ${id}\n  see 'no-glaze --list' for valid ids`);
      }
    }
  }

  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const repoRoot = detectRepoRoot();

  const log = (s) => process.stdout.write(s + '\n');

  const ctx = {
    opts,
    configDir,
    repoRoot,
    log,
  };

  const want = (id) => opts.only.length === 0 || opts.only.includes(id);
  const explicit = (id) => opts.only.includes(id);

  log(opts.uninstall ? 'no-glaze uninstall' : 'no-glaze installer');
  if (opts.dryRun) log('  (dry run — nothing will be written)');
  log('');

  let anyRan = false;
  for (const prov of PROVIDERS) {
    if (!want(prov.id)) continue;
    // Auto-detect: skip providers we can't see unless explicitly requested.
    if (!explicit(prov.id) && !prov.detect()) continue;
    anyRan = true;
    const fn = opts.uninstall ? prov.uninstall : prov.install;
    try {
      fn(ctx);
    } catch (e) {
      process.stderr.write(`  ${prov.id} failed: ${(e && e.message) || e}\n`);
    }
    log('');
  }

  if (!anyRan && opts.only.length === 0) {
    log('  nothing detected. run with --list to see targets, or pass --only <id>.');
  }

  log(opts.uninstall ? 'uninstall done.' : 'install done.');
  return 0;
}

const code = main();
process.exit(code || 0);
