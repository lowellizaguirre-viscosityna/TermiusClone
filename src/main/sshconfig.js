'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Parse ~/.ssh/config into host records. Only the handful of keywords we model
 * are read; wildcard patterns are skipped because they are not connectable.
 */
function parseSshConfig(file = path.join(os.homedir(), '.ssh', 'config')) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw new Error(`Could not read ${file}: ${err.message}`);
  }

  const hosts = [];
  let current = null;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(\S+)[\s=]+(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim().replace(/^"(.*)"$/, '$1');

    if (key === 'host') {
      const patterns = value.split(/\s+/).filter((p) => !/[*?!]/.test(p));
      current = patterns.length ? { label: patterns[0], hostname: patterns[0], port: 22 } : null;
      if (current) hosts.push(current);
      continue;
    }
    if (!current) continue;

    if (key === 'hostname') current.hostname = value;
    else if (key === 'user') current.username = value;
    else if (key === 'port') current.port = Number(value) || 22;
    else if (key === 'identityfile') current.identityFile = value;
    else if (key === 'proxyjump') current.jumpHost = value;
    else if (key === 'forwardagent') current.forwardAgent = /^yes$/i.test(value);
  }

  return hosts.filter((h) => h.hostname);
}

module.exports = { parseSshConfig };
