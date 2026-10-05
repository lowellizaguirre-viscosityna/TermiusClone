'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Map();

function on(channel, cb) {
  const wrapped = (_event, payload) => cb(payload);
  listeners.set(cb, wrapped);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.off(channel, wrapped);
}

contextBridge.exposeInMainWorld('api', {
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    path: () => ipcRenderer.invoke('config:path'),
    reveal: () => ipcRenderer.invoke('config:reveal'),
    secretsStatus: () => ipcRenderer.invoke('secrets:status')
  },
  hosts: {
    save: (host) => ipcRenderer.invoke('hosts:save', host),
    remove: (id) => ipcRenderer.invoke('hosts:delete', id),
    preview: (host) => ipcRenderer.invoke('hosts:preview', host),
    parse: (text) => ipcRenderer.invoke('hosts:parse', text),
    importSshConfig: () => ipcRenderer.invoke('hosts:importSshConfig')
  },
  snippets: {
    save: (snippet) => ipcRenderer.invoke('snippets:save', snippet),
    remove: (id) => ipcRenderer.invoke('snippets:delete', id)
  },
  keys: {
    pick: () => ipcRenderer.invoke('keys:pick'),
    inspect: (p) => ipcRenderer.invoke('keys:inspect', p),
    fixPermissions: (p) => ipcRenderer.invoke('keys:fixPermissions', p)
  },
  session: {
    start: (host, size) => ipcRenderer.invoke('session:start', host, size),
    input: (sessionId, data) => ipcRenderer.send('session:input', sessionId, data),
    resize: (sessionId, cols, rows) => ipcRenderer.send('session:resize', sessionId, cols, rows),
    kill: (sessionId) => ipcRenderer.send('session:kill', sessionId),
    onData: (cb) => on('session:data', cb),
    onExit: (cb) => on('session:exit', cb)
  }
});
