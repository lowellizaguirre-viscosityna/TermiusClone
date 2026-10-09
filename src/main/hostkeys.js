'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, execFileSync } = require('child_process');

const KNOWN_HOSTS = path.join(os.homedir(), '.ssh', 'known_hosts');

// What a known_hosts/ssh-keyscan key line may look like. Anything that does
// not match this exactly is never written to the file.
const KEY_LINE = /^(\S+) (ssh-ed25519|ssh-rsa|ssh-dss|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) ([A-Za-z0-9+/]+=*)$/;

/** How ssh-keyscan and known_hosts spell a host: bare, or [host]:port off 22. */
function hostToken(hostname, port) {
  const n = Number(port) || 22;
  return n === 22 ? String(hostname) : `[${hostname}]:${n}`;
}

function run(file, args, input) {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { timeout: 15000, maxBuffer: 1 << 20 }, (err, stdout, stderr) => {
      // ssh-keyscan writes its progress comments to stderr and still succeeds.
      if (err && !stdout) reject(new Error(stderr.trim() || err.message));
      else resolve({ stdout, stderr });
    });
    if (input !== undefined) { child.stdin.end(input); }
  });
}

/** Fingerprint a batch of key lines, keeping them paired with their text. */
function fingerprint(lines) {
  return lines.map((line) => {
    const out = { line, keytype: KEY_LINE.exec(line)[2] };
    try {
      // -lf - reads the line on stdin: "256 SHA256:… host (ED25519)"
      const text = execFileSync('ssh-keygen', ['-lf', '-'], { input: `${line}\n`, encoding: 'utf8', timeout: 10000 }).trim();
      const m = text.match(/^(\d+)\s+(\S+)/);
      if (m) { out.bits = Number(m[1]); out.hash = m[2]; }
    } catch { /* leave the fingerprint off rather than fail the whole scan */ }
    return out;
  });
}

/**
 * Fetch the host keys a server is currently offering.
 *
 * Deliberately returns the raw line alongside the fingerprint, so `trust` can
 * write back the exact bytes the user was shown -- not a second scan that could
 * come from somewhere else.
 */
async function scan(hostname, port) {
  if (!hostname) throw new Error('No hostname to scan.');
  const token = hostToken(hostname, port);
  const args = ['-T', '10'];
  if (Number(port) && Number(port) !== 22) args.push('-p', String(port));
  args.push(String(hostname));

  const { stdout } = await run('ssh-keyscan', args);
  const lines = stdout.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .filter((l) => {
      const m = KEY_LINE.exec(l);
      // Only keep keys the server offered *for the host we asked about*.
      return m && m[1] === token;
    });

  if (!lines.length) throw new Error(`No host keys returned by ${token}. The server may be unreachable.`);
  return { host: token, keys: fingerprint(lines) };
}

/** Is there already an entry for this host? Returns its fingerprints, or null. */
function existing(hostname, port) {
  const token = hostToken(hostname, port);
  let stdout;
  try {
    // -F prints matching entries; exit 1 with no output means "not found".
    stdout = execFileSync('ssh-keygen', ['-F', token], { encoding: 'utf8', timeout: 10000 });
  } catch {
    return null;
  }
  const lines = stdout.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && KEY_LINE.test(l));
  if (!lines.length) return null;
  return { host: token, keys: fingerprint(lines) };
}

/**
 * Append key lines to known_hosts. Every line is re-validated and must belong
 * to the host named, so a compromised renderer cannot smuggle in an entry for
 * some other server.
 */
function trust(hostname, port, lines) {
  const token = hostToken(hostname, port);
  const accepted = (lines || []).map((l) => String(l).trim()).filter((l) => {
    const m = KEY_LINE.exec(l);
    return m && m[1] === token;
  });
  if (!accepted.length) throw new Error('No valid host key lines to trust.');

  fs.mkdirSync(path.dirname(KNOWN_HOSTS), { recursive: true, mode: 0o700 });
  let prefix = '';
  try {
    const st = fs.statSync(KNOWN_HOSTS);
    // Guard against a file that does not end in a newline.
    if (st.size) {
      const fd = fs.openSync(KNOWN_HOSTS, 'r');
      const buf = Buffer.alloc(1);
      fs.readSync(fd, buf, 0, 1, st.size - 1);
      fs.closeSync(fd);
      if (buf[0] !== 0x0a) prefix = '\n';
    }
  } catch { /* file does not exist yet */ }

  fs.appendFileSync(KNOWN_HOSTS, `${prefix}${accepted.join('\n')}\n`, { mode: 0o600 });
  return { host: token, added: accepted.length, file: KNOWN_HOSTS };
}

/** Drop every entry for a host -- the deliberate step before re-trusting one. */
function forget(hostname, port) {
  const token = hostToken(hostname, port);
  execFileSync('ssh-keygen', ['-R', token], { encoding: 'utf8', timeout: 10000, stdio: 'pipe' });
  return { host: token, file: KNOWN_HOSTS };
}

module.exports = { scan, trust, forget, existing, hostToken, KNOWN_HOSTS };
