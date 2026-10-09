'use strict';

/**
 * sshpass reports *its own* failures through the exit status, which is the only
 * channel it has -- it writes nothing to the terminal. A bare "exit 5" is
 * therefore the entire error message the user gets, so translate it.
 *
 * From sshpass(1). Codes 1 and 2 would be our own bug in buildCommand.
 */
const SSHPASS = {
  1: 'sshpass was given an invalid argument (this is a bug in TermiusClone).',
  2: 'sshpass was given conflicting arguments (this is a bug in TermiusClone).',
  3: 'sshpass hit a general runtime error.',
  4: 'sshpass did not recognise ssh\'s response — ssh may have asked something unexpected.',
  5: 'Incorrect password. The server rejected the saved password for this host.',
  6: 'The server\'s host key is not in known_hosts, and sshpass cannot answer the "continue connecting?" prompt.',
  7: 'The server\'s host key has CHANGED since it was recorded in known_hosts.'
};

/**
 * Describe why a session ended.
 *
 * `method` matters: under `sshpass` the small codes are sshpass's own, but
 * under plain ssh the exit status belongs to the *remote shell*, where 5 just
 * means the user's last command exited 5. Never label those as errors.
 *
 * Returns { text, code, fatal } where `code` is a stable id the UI can key a
 * recovery action off, and `text` is null when there is nothing to add.
 */
function describeExit(exitCode, signal, method) {
  if (signal) return { text: `Session killed by signal ${signal}.`, code: 'SIGNAL', fatal: true };
  if (exitCode === 0) return { text: null, code: 'OK', fatal: false };

  if (method === 'sshpass' && SSHPASS[exitCode]) {
    const code = exitCode === 5 ? 'BAD_PASSWORD'
      : exitCode === 6 ? 'UNKNOWN_HOST_KEY'
      : exitCode === 7 ? 'CHANGED_HOST_KEY'
      : 'SSHPASS';
    return { text: SSHPASS[exitCode], code, fatal: true };
  }

  if (exitCode === 255) {
    return {
      text: 'ssh could not connect, or the connection was dropped. Check the hostname, port and network.',
      code: 'SSH_ERROR',
      fatal: true
    };
  }

  // Anything else under plain ssh is the remote command's own status.
  return { text: `The remote shell exited with status ${exitCode}.`, code: 'REMOTE', fatal: false };
}

module.exports = { describeExit, SSHPASS };
