'use strict';

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');

const store = require('./store');
const sshcmd = require('./sshcmd');
const sessions = require('./sessions');
const { parseSshConfig } = require('./sshconfig');
const secrets = require('./secrets');
const hostkeys = require('./hostkeys');
const aliases = require('./aliases');

// Point safeStorage at the desktop keyring; without this Chromium may pick its
// "basic_text" fallback, which only obfuscates. Must run before app is ready.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('password-store', 'gnome-libsecret');
}

// Keep Chromium's caches out of the config directory so config.json has it to itself.
app.setPath('userData', path.join(store.CONFIG_DIR, 'electron-data'));

let mainWindow = null;

const ICON = path.join(__dirname, '..', '..', 'build', 'icons', 'icon-256.png');

// Electron's default menu claims Ctrl+A (selectAll), Ctrl+C and Ctrl+V as
// accelerators. Accelerators fire before the page sees the keydown, so the
// terminal's own handlers never ran -- and the default selectAll targets the
// DOM, which xterm marks user-select:none, so nothing highlighted. The menu is
// hidden anyway (autoHideMenuBar), so drop it entirely.
function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    icon: ICON,
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#11141b',
    title: 'TermiusClone',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

// Errors crossing IPC lose everything but `message`, so pack the extras in.
function wrap(handler) {
  return async (_event, ...args) => {
    try {
      return { ok: true, value: await handler(...args) };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
        code: err.code,
        identityPath: err.identityPath,
        modeOctal: err.modeOctal
      };
    }
  };
}

ipcMain.handle('config:load', wrap(() => store.readPublic()));
ipcMain.handle('config:path', wrap(() => store.CONFIG_FILE));
ipcMain.handle('secrets:status', wrap(() => secrets.status()));
ipcMain.handle('config:sshpass', wrap(() => Boolean(sshcmd.findSshpass())));
ipcMain.handle('aliases:read', wrap(() => aliases.readAliases()));
ipcMain.handle('config:reveal', wrap(() => shell.showItemInFolder(store.CONFIG_FILE)));

ipcMain.handle('hosts:save', wrap((host) => {
  // The renderer sends a plaintext password only when it changed; `undefined`
  // leaves the stored one alone and '' clears it. Plaintext stops here.
  const { password, ...rest } = host;
  if (password !== undefined) {
    rest.passwordCipher = password === '' ? '' : secrets.encrypt(password);
  }
  if (rest.authMethod && rest.authMethod !== 'password') rest.passwordCipher = '';
  return store.publicHost(store.saveHost(rest));
}));
ipcMain.handle('hosts:delete', wrap((id) => store.deleteHost(id)));
ipcMain.handle('hosts:preview', wrap((host) => sshcmd.renderCommand(host)));
ipcMain.handle('hosts:parse', wrap((text) => sshcmd.parseConnectionString(text)));

ipcMain.handle('hosts:importSshConfig', wrap(() => {
  const existing = store.read().hosts;
  const seen = new Set(existing.map((h) => `${h.username}@${h.hostname}:${h.port}`));
  const imported = [];
  for (const candidate of parseSshConfig()) {
    const key = `${candidate.username || ''}@${candidate.hostname}:${candidate.port || 22}`;
    if (seen.has(key)) continue;
    seen.add(key);
    imported.push(store.publicHost(store.saveHost({ ...candidate, group: 'Imported' })));
  }
  return imported;
}));

ipcMain.handle('snippets:save', wrap((snippet) => store.saveSnippet(snippet)));
ipcMain.handle('snippets:delete', wrap((id) => store.deleteSnippet(id)));

ipcMain.handle('keys:pick', wrap(async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a private key file',
    defaultPath: path.join(os.homedir(), '.ssh'),
    buttonLabel: 'Use this key',
    // showHiddenFiles matters: keys normally live in the hidden ~/.ssh
    properties: ['openFile', 'showHiddenFiles', 'dontAddToRecent']
    // No filters: on Linux (GTK/portal) a wildcard filter becomes a "*.*" pattern
    // that hides extensionless OpenSSH keys (e.g. id_ed25519). An unfiltered
    // chooser shows every file so dotless private keys are selectable.
  });
  if (result.canceled || !result.filePaths.length) return null;
  return sshcmd.inspectIdentity(result.filePaths[0]);
}));

ipcMain.handle('hostkeys:scan', wrap((hostname, port) => hostkeys.scan(hostname, port)));
ipcMain.handle('hostkeys:existing', wrap((hostname, port) => hostkeys.existing(hostname, port)));
ipcMain.handle('hostkeys:trust', wrap((hostname, port, lines) => hostkeys.trust(hostname, port, lines)));
ipcMain.handle('hostkeys:forget', wrap((hostname, port) => hostkeys.forget(hostname, port)));

ipcMain.handle('keys:inspect', wrap((p) => sshcmd.inspectIdentity(p)));
ipcMain.handle('keys:fixPermissions', wrap((p) => sshcmd.chmodIdentity(p)));

ipcMain.handle('session:start', wrap((host, size) => {
  // Decrypt here, at the last moment; the password never reaches the renderer.
  let password;
  if (host.authMethod === 'password' && host.id) {
    const stored = store.getHost(host.id);
    if (stored && stored.passwordCipher) password = secrets.decrypt(stored.passwordCipher);
  }
  return sessions.start(mainWindow.webContents, host, size, password);
}));

ipcMain.on('session:input', (_e, sessionId, data) => sessions.input(sessionId, data));
ipcMain.on('session:resize', (_e, sessionId, cols, rows) => sessions.resize(sessionId, cols, rows));
ipcMain.on('session:kill', (_e, sessionId) => sessions.kill(sessionId));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { sessions.killAll(); app.quit(); });
app.on('before-quit', () => sessions.killAll());
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
