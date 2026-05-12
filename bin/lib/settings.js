"use strict";

const fs = require("node:fs");
const path = require("node:path");

function stripJsonc(text) {
  let out = "";
  let i = 0;
  const n = text.length;
  let inStr = false;
  let strCh = "";
  let esc = false;
  while (i < n) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (esc) { esc = false; }
      else if (c === "\\") { esc = true; }
      else if (c === strCh) { inStr = false; }
      i++; continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; out += c; i++; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < n && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function readSettings(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(stripJsonc(raw));
  } catch (_) {
    return {};
  }
}

function writeSettings(file, obj) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

function validateHookFields(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.type !== "command") return false;
  if (typeof entry.command !== "string" || entry.command.length === 0) return false;
  return true;
}

module.exports = { readSettings, writeSettings, validateHookFields, stripJsonc };
