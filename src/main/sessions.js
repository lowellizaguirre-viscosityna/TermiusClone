'use strict';

const pty = require('node-pty');
const crypto = require('crypto');
const { buildCommand } = require('./sshcmd');
const { describeExit } = require('./exitcodes');

const sessions = new Map(); // sessionId -> { proc, host, webContents }

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\r/g;
// Match only SSH's own prompt shapes -- "user@host's password:", a bare
// "Password:", or keyboard-interactive's "(user@host) Password:". Anything
// mentioning sudo is explicitly excluded.
const PASSWORD_PROMPT = /(^|\n)(?:\([^)\n]*\)\s*)?(?:[^\n]*@[^\n]*'s\s+)?password:\s*$/i;
const NEVER_ANSWER = /sudo|passphrase/i;

function emit(webContents, channel, payload) {
  if (!webContents.isDestroyed()) webContents.send(channel, payload);
}

function start(webContents, host, size, password) {
  // Throws with a useful message on a missing or ill-permissioned key file.
  const cmd = buildCommand(host, password);
  const sessionId = crypto.randomBytes(8).toString('hex');

  const proc = pty.spawn(cmd.file, cmd.args, {
    name: 'xterm-256color',
    cols: (size && size.cols) || 80,
    rows: (size && size.rows) || 24,
    cwd: process.env.HOME,
    env: { ...process.env, TERM: 'xterm-256color', ...cmd.env }
  });

  // Without sshpass we answer the password prompt ourselves. Strictly once, and
  // only in the opening moments, so a later `sudo` prompt is never fed the
  // SSH password and a rejected password falls through to the user.
  let pendingPassword = cmd.answerPrompt || null;
  const promptDeadline = Date.now() + 20000;
  let tail = '';

  proc.onData((data) => {
    if (pendingPassword) {
      if (Date.now() > promptDeadline) {
        pendingPassword = null;
      } else {
        tail = (tail + data.replace(ANSI, '')).slice(-200);
        const lastLine = tail.slice(tail.lastIndexOf('\n') + 1);
        if (PASSWORD_PROMPT.test(tail) && !NEVER_ANSWER.test(lastLine)) {
          const answer = pendingPassword;
          pendingPassword = null;
          tail = '';
          proc.write(`${answer}\n`);
        }
      }
    }
    emit(webContents, 'session:data', { sessionId, data });
  });

  proc.onExit(({ exitCode, signal }) => {
    pendingPassword = null;
    sessions.delete(sessionId);
    // sshpass says why it failed only through the exit status, so translate it
    // here where cmd.method is known -- the renderer must not guess.
    const reason = describeExit(exitCode, signal, cmd.method);
    emit(webContents, 'session:exit', {
      sessionId,
      exitCode,
      signal,
      method: cmd.method,
      reason: reason.text,
      reasonCode: reason.code,
      fatal: reason.fatal
    });
  });

  sessions.set(sessionId, { proc, host, webContents });
  // `command` is for the status bar, so it must never carry the password.
  return {
    sessionId,
    command: [cmd.file === 'ssh' ? 'ssh' : 'sshpass -e ssh', ...cmd.args].join(' '),
    method: cmd.method
  };
}

function input(sessionId, data) {
  const s = sessions.get(sessionId);
  if (s) s.proc.write(data);
}

function resize(sessionId, cols, rows) {
  const s = sessions.get(sessionId);
  if (!s) return;
  try {
    s.proc.resize(Math.max(cols, 2), Math.max(rows, 2));
  } catch {
    /* the pty can disappear between a resize event and this call */
  }
}

function kill(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return;
  try { s.proc.kill(); } catch { /* already gone */ }
  sessions.delete(sessionId);
}

function killAll() {
  for (const sessionId of [...sessions.keys()]) kill(sessionId);
}

module.exports = { start, input, resize, kill, killAll };
