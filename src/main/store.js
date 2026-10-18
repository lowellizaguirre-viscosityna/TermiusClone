'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const { parseConnectionString } = require('./sshcmd');

const CONFIG_DIR = process.env.TERMIUSCLONE_HOME ||
  path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'termiusclone');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  version: 1,
  hosts: [],
  snippets: [
    { id: 'seed-1', name: 'Disk usage', command: 'df -h' },
    { id: 'seed-2', name: 'Docker containers', command: 'docker ps -a' },
    { id: 'seed-3', name: 'Tail syslog', command: 'sudo tail -f /var/log/syslog' }
  ]
};

function id() {
  return crypto.randomBytes(8).toString('hex');
}

function read() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      version: 1,
      hosts: Array.isArray(data.hosts) ? data.hosts : [],
      snippets: Array.isArray(data.snippets) ? data.snippets : []
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      write(DEFAULTS);
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
    throw new Error(`Could not read ${CONFIG_FILE}: ${err.message}`);
  }
}

function write(data) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const tmp = `${CONFIG_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, CONFIG_FILE);
  return data;
}

// ---- hosts ----

function normalizeHost(input) {
  const label = String(input.label || '').trim();
  let hostname = String(input.hostname || '').trim();
  if (!hostname) throw new Error('Hostname is required.');

  // Safety net for a whole connection string landing in the hostname field
  // ("ubuntu@ec2-….amazonaws.com", or a pasted `ssh -i key.pem user@host`).
  // The UI unpacks these as you type; this catches whatever slips past it.
  // Explicit fields always win over what the string implies.
  const merged = { ...input };
  const looksLikeConnectionString =
    hostname.includes('@') || /^\S*ssh\s/.test(hostname) || /(^|\s)-\w/.test(hostname);
  if (looksLikeConnectionString) {
    const parsed = parseConnectionString(hostname);
    if (parsed.hostname) {
      hostname = parsed.hostname;
      for (const key of ['username', 'identityFile', 'jumpHost', 'extraArgs']) {
        if (parsed[key] && !String(merged[key] || '').trim()) merged[key] = parsed[key];
      }
      if (parsed.port && (!Number(merged.port) || Number(merged.port) === 22)) merged.port = parsed.port;
      if (parsed.forwardAgent && merged.forwardAgent === undefined) merged.forwardAgent = true;
    }
  }

  if (/\s/.test(hostname)) throw new Error(`"${hostname}" is not a valid hostname \u2014 it contains a space.`);

  const authMethod = ['key', 'password', 'default'].includes(input.authMethod)
    ? input.authMethod
    : (String(merged.identityFile || '').trim() ? 'key' : 'default');
  if (authMethod === 'key' && !String(merged.identityFile || '').trim()) {
    throw new Error('Pick a private key file (Browse…), or switch Authentication to Password or Agent / ssh defaults.');
  }

  const port = Number(merged.port) || 22;
  if (port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
  return {
    id: input.id || id(),
    label: label || hostname,
    hostname,
    username: String(merged.username || '').trim(),
    port,
    authMethod,
    identityFile: String(merged.identityFile || '').trim(),
    passwordCipher: String(input.passwordCipher || ''),
    group: String(input.group || '').trim(),
    jumpHost: String(merged.jumpHost || '').trim(),
    extraArgs: String(merged.extraArgs || '').trim(),
    forwardAgent: Boolean(merged.forwardAgent),
    onConnectSnippetId: input.onConnectSnippetId || '',
    themeId: String(input.themeId || '').trim()
  };
}

function saveHost(input) {
  const data = read();
  const i = input.id ? data.hosts.findIndex((h) => h.id === input.id) : -1;
  const previous = i === -1 ? null : data.hosts[i];

  // `passwordCipher: undefined` means "leave the stored password alone";
  // an empty string means "clear it".
  const merged = { ...input };
  if (merged.passwordCipher === undefined && previous) {
    merged.passwordCipher = previous.passwordCipher || '';
  }

  const host = normalizeHost(merged);
  if (i === -1) data.hosts.push(host);
  else data.hosts[i] = host;
  write(data);
  return host;
}

/** The full record, including the encrypted password. Main process only. */
function getHost(hostId) {
  return read().hosts.find((h) => h.id === hostId) || null;
}

/** Strip secrets before anything crosses into the renderer. */
function publicHost(host) {
  const { passwordCipher, ...rest } = host;
  return { ...rest, hasPassword: Boolean(passwordCipher) };
}

function readPublic() {
  const data = read();
  return { ...data, hosts: data.hosts.map(publicHost) };
}

function deleteHost(hostId) {
  const data = read();
  data.hosts = data.hosts.filter((h) => h.id !== hostId);
  write(data);
}

// ---- snippets ----

function normalizeSnippet(input) {
  const name = String(input.name || '').trim();
  const command = String(input.command || '');
  if (!name) throw new Error('Snippet name is required.');
  if (!command.trim()) throw new Error('Snippet command is required.');
  return { id: input.id || id(), name, command, tags: String(input.tags || '').trim() };
}

function saveSnippet(input) {
  const data = read();
  const snippet = normalizeSnippet(input);
  const i = data.snippets.findIndex((s) => s.id === snippet.id);
  if (i === -1) data.snippets.push(snippet);
  else data.snippets[i] = snippet;
  write(data);
  return snippet;
}

function deleteSnippet(snippetId) {
  const data = read();
  data.snippets = data.snippets.filter((s) => s.id !== snippetId);
  write(data);
}

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  read,
  readPublic,
  getHost,
  publicHost,
  saveHost,
  deleteHost,
  saveSnippet,
  deleteSnippet
};
