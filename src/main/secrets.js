'use strict';

const { safeStorage } = require('electron');

/**
 * Passwords are encrypted with Electron's safeStorage, which on Linux defers to
 * the desktop keyring (gnome-libsecret / kwallet). When no keyring is reachable
 * Chromium silently falls back to "basic_text", which is obfuscation rather
 * than encryption — so report the real backend and let the UI say so plainly.
 */
function status() {
  let backend = 'unknown';
  if (process.platform === 'linux' && typeof safeStorage.getSelectedStorageBackend === 'function') {
    try { backend = safeStorage.getSelectedStorageBackend(); } catch { /* older Electron */ }
  } else if (process.platform !== 'linux') {
    backend = process.platform === 'darwin' ? 'keychain' : 'dpapi';
  }
  const available = safeStorage.isEncryptionAvailable();
  const weak = backend === 'basic_text' || backend === 'basic';
  return {
    available,
    backend,
    weak,
    description: !available
      ? 'No OS encryption available — passwords cannot be stored.'
      : weak
        ? `No desktop keyring found (backend: ${backend}). Stored passwords are only obfuscated, not encrypted.`
        : `Passwords encrypted via the OS keyring (${backend}).`
  };
}

function encrypt(plaintext) {
  if (!plaintext) return '';
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Cannot store a password: no OS encryption backend is available.');
  }
  return safeStorage.encryptString(String(plaintext)).toString('base64');
}

function decrypt(cipher) {
  if (!cipher) return '';
  try {
    return safeStorage.decryptString(Buffer.from(cipher, 'base64'));
  } catch (err) {
    throw new Error(
      'Stored password could not be decrypted — the keyring may have changed. Re-enter it in the host editor.'
    );
  }
}

module.exports = { status, encrypt, decrypt };
