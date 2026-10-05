'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/** Split a string into argv the way a POSIX shell would, honouring quotes. */
function tokenize(str) {
  const out = [];
  let cur = '';
  let quote = null;
  let started = false;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < str.length) { cur += str[i + 1]; i += 1; }
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
    if (ch === '\\' && i + 1 < str.length) { cur += str[i + 1]; i += 1; started = true; continue; }
    if (/\s/.test(ch)) {
      if (started) { out.push(cur); cur = ''; started = false; }
      continue;
    }
    cur += ch;
    started = true;
  }
  if (quote) throw new Error('Unbalanced quote in extra SSH arguments.');
  if (started) out.push(cur);
  return out;
}

function expandHome(p) {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

/**
 * Inspect an identity file. Returns { path, exists, mode, tooOpen }.
 * `tooOpen` is what makes OpenSSH refuse the key outright.
 */
function inspectIdentity(identityFile) {
  const resolved = path.resolve(expandHome(identityFile));
  try {
    const st = fs.statSync(resolved);
    const mode = st.mode & 0o777;
    return {
      path: resolved,
      exists: true,
      isFile: st.isFile(),
      mode,
      modeOctal: mode.toString(8).padStart(3, '0'),
      tooOpen: process.platform !== 'win32' && (mode & 0o077) !== 0
    };
  } catch (err) {
    return { path: resolved, exists: false, error: err.code || err.message };
  }
}

function chmodIdentity(identityFile) {
  const resolved = path.resolve(expandHome(identityFile));
  fs.chmodSync(resolved, 0o600);
  return inspectIdentity(resolved);
}

/**
 * Build the argv for an interactive ssh session to `host`.
 * Passing an arbitrary local identity file through with -i is the feature
 * Termius puts behind a subscription.
 */
function buildSshArgs(host) {
  if (!host || !host.hostname) throw new Error('Host has no hostname.');
  const args = [];
  const authMethod = host.authMethod || (host.identityFile ? 'key' : 'default');

  if (authMethod === 'key') {
    if (!host.identityFile) throw new Error('This host is set to key authentication but has no key file.');
    const info = inspectIdentity(host.identityFile);
    if (!info.exists) throw new Error(`Key file not found: ${info.path}`);
    if (!info.isFile) throw new Error(`Key file is not a regular file: ${info.path}`);
    if (info.tooOpen) {
      const e = new Error(
        `Key file permissions ${info.modeOctal} are too open for ${info.path}. ` +
        'OpenSSH will refuse it; chmod 600 the file.'
      );
      e.code = 'KEY_PERMISSIONS';
      e.identityPath = info.path;
      e.modeOctal = info.modeOctal;
      throw e;
    }
    // IdentitiesOnly stops ssh-agent keys from being offered ahead of this one.
    args.push('-i', info.path, '-o', 'IdentitiesOnly=yes');
  } else if (authMethod === 'password') {
    // Skip the key round-trip so the password prompt comes straight away.
    args.push('-o', 'PreferredAuthentications=password,keyboard-interactive');
    args.push('-o', 'PubkeyAuthentication=no');
  }

  if (host.port && Number(host.port) !== 22) args.push('-p', String(host.port));
  if (host.jumpHost) args.push('-J', host.jumpHost);
  if (host.forwardAgent) args.push('-A');
  if (host.extraArgs) args.push(...tokenize(host.extraArgs));

  args.push('-o', 'ServerAliveInterval=30');
  args.push(host.username ? `${host.username}@${host.hostname}` : host.hostname);
  return args;
}

/** Is sshpass on PATH? Cached, since PATH will not change under us. */
let sshpassPath;
function findSshpass() {
  if (sshpassPath !== undefined) return sshpassPath;
  sshpassPath = null;
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, 'sshpass');
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      sshpassPath = candidate;
      break;
    } catch { /* keep looking */ }
  }
  return sshpassPath;
}

/**
 * Turn a host into something spawnable.
 *
 * With a password and sshpass installed we use `sshpass -e`, which reads the
 * password from the SSHPASS environment variable — so it never appears in the
 * process argument list where any other user could read it off `ps`.
 *
 * Without sshpass we spawn plain ssh and let the caller answer the password
 * prompt on the pty (`answerPrompt`).
 */
function buildCommand(host, password) {
  const args = buildSshArgs(host);
  const wantsPassword = (host.authMethod || (host.identityFile ? 'key' : 'default')) === 'password';

  if (wantsPassword && password) {
    const sshpass = findSshpass();
    if (sshpass) {
      return { file: sshpass, args: ['-e', 'ssh', ...args], env: { SSHPASS: password }, method: 'sshpass' };
    }
    return { file: 'ssh', args, env: {}, answerPrompt: password, method: 'pty' };
  }

  return { file: 'ssh', args, env: {}, method: 'interactive' };
}

/** A copy-pasteable rendering of the command, for the UI. */
function renderCommand(host) {
  const quote = (a) => (/[\s"'$`\\*?]/.test(a) ? `"${a.replace(/(["\\$`])/g, '\\$1')}"` : a);
  const args = buildSshArgs(host).map(quote);
  const wantsPassword = (host.authMethod || (host.identityFile ? 'key' : 'default')) === 'password';
  // Never render the password itself; sshpass -e takes it from the environment.
  if (wantsPassword && findSshpass()) return ['sshpass', '-e', 'ssh', ...args].join(' ');
  return ['ssh', ...args].join(' ');
}

/**
 * Split a connection target into its parts. Accepts `user@host`,
 * `host:port`, `user@host:port`, and bracketed IPv6 (`[::1]:22`).
 */
function parseTarget(text) {
  let rest = String(text || '').trim();
  const out = {};
  if (!rest) return out;

  const at = rest.lastIndexOf('@');
  if (at !== -1) {
    out.username = rest.slice(0, at);
    rest = rest.slice(at + 1);
  }

  const bracketed = rest.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (bracketed) {
    out.hostname = bracketed[1];
    if (bracketed[2]) out.port = Number(bracketed[2]);
    return out;
  }

  // Only treat a trailing :N as a port when there is exactly one colon,
  // so a bare IPv6 address is left intact.
  const colon = rest.indexOf(':');
  if (colon !== -1 && colon === rest.lastIndexOf(':') && /^\d+$/.test(rest.slice(colon + 1))) {
    out.port = Number(rest.slice(colon + 1));
    rest = rest.slice(0, colon);
  }

  out.hostname = rest;
  return out;
}

const ARG_TAKES_VALUE = new Set(['-i', '-p', '-J', '-l', '-o', '-L', '-R', '-D', '-W', '-F', '-b', '-c', '-m', '-Q', '-S', '-e']);
const PASSTHROUGH_WITH_VALUE = new Set(['-o', '-L', '-R', '-D', '-W', '-F']);

/**
 * Parse anything a user is likely to paste into the host field: a bare
 * hostname, `ubuntu@ec2-….amazonaws.com`, or the whole command line the AWS
 * console hands out — `ssh -i "key.pem" ubuntu@ec2-….amazonaws.com`.
 * Returns only the fields it actually found.
 */
function parseConnectionString(text) {
  const raw = String(text || '').trim();
  if (!raw) return {};

  let tokens;
  try {
    tokens = tokenize(raw);
  } catch {
    tokens = raw.split(/\s+/);
  }
  if (tokens[0] === 'ssh' || /(^|\/)ssh$/.test(tokens[0] || '')) tokens = tokens.slice(1);
  if (!tokens.length) return {};

  const found = {};
  const extra = [];
  let target = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === '--') continue;

    if (token.startsWith('-') && token.length > 1) {
      // Split a joined short option such as -p2222 or -ikey.pem.
      let flag = token.slice(0, 2);
      let value = token.slice(2);
      if (!value && ARG_TAKES_VALUE.has(flag)) {
        value = tokens[i + 1] || '';
        i += 1;
      }

      if (flag === '-i') found.identityFile = value;
      else if (flag === '-p') { const n = Number(value); if (n) found.port = n; }
      else if (flag === '-J') found.jumpHost = value;
      else if (flag === '-l') found.username = value;
      else if (flag === '-A') found.forwardAgent = true;
      else if (PASSTHROUGH_WITH_VALUE.has(flag)) extra.push(flag, value);
      else extra.push(token);
      continue;
    }

    // The first bare word is the target; anything after it is a remote
    // command, which this app does not model.
    if (!target) target = token;
  }

  if (target) {
    const parsed = parseTarget(target);
    if (parsed.hostname) found.hostname = parsed.hostname;
    // An explicit -l or -p beats what the target string implies.
    if (parsed.username && !found.username) found.username = parsed.username;
    if (parsed.port && !found.port) found.port = parsed.port;
  }
  if (extra.length) found.extraArgs = extra.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
  return found;
}

module.exports = {
  buildSshArgs,
  renderCommand,
  inspectIdentity,
  chmodIdentity,
  tokenize,
  expandHome,
  parseTarget,
  parseConnectionString,
  buildCommand,
  findSshpass
};
