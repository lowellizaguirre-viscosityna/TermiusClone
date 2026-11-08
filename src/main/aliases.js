'use strict';

const { execFile } = require('child_process');
const os = require('os');
const path = require('path');

/**
 * Read the user's *live* shell aliases by asking an interactive login shell to
 * print them. Nothing is imported or persisted -- callers run this at startup
 * and show the result as throwaway, double-click-to-paste line items.
 *
 * The shell prints one alias per line as:  alias name='body'
 * where an embedded single quote is escaped by bash/zsh as '\'' . We undo that
 * so the body is the exact command text to paste into a remote session.
 */
function parseAliasOutput(text) {
  const out = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    // Match: optional "alias " prefix, name, =, then the value (quoted or not).
    const m = line.match(/^(?:alias\s+)?([A-Za-z0-9_.-]+)=(.*)$/);
    if (!m) continue;
    const name = m[1];
    let value = m[2];
    if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      // Single-quoted: strip the quotes and unescape '\'' -> '
      value = value.slice(1, -1).replace(/'\\''/g, "'");
    } else if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    if (name && value) out.push({ name, command: value });
  }
  // De-dupe by name (last definition wins), then sort for a stable list.
  const byName = new Map();
  for (const a of out) byName.set(a.name, a);
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolve the user's login shell, falling back to bash. */
function userShell() {
  const sh = process.env.SHELL && process.env.SHELL.trim();
  return sh || '/bin/bash';
}

/**
 * Returns a promise of [{ name, command }]. Never rejects -- a missing shell or
 * an empty alias set just yields []. `-i` makes the shell interactive so it
 * sources the rc files where aliases live; `-c alias` prints them.
 */
function readAliases() {
  return new Promise((resolve) => {
    const shell = userShell();
    const base = path.basename(shell);
    // zsh/bash both honour `-i -c 'alias'`. Keep it to a short timeout so a
    // misbehaving rc file can't hang startup.
    execFile(shell, ['-i', '-c', 'alias'], {
      timeout: 4000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, TERM: 'dumb' },
      cwd: os.homedir()
    }, (err, stdout) => {
      // Even on a non-zero exit (common for interactive shells without a tty)
      // stdout usually still holds the alias list, so parse whatever came back.
      resolve(parseAliasOutput(stdout || ''));
      void err; void base;
    });
  });
}

module.exports = { readAliases, parseAliasOutput };
