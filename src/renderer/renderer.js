'use strict';

const { Terminal } = window;
const { FitAddon } = window.FitAddon;
const { WebLinksAddon } = window.WebLinksAddon;

const THEME = {
  background: '#11141b',
  foreground: '#dfe4ee',
  cursor: '#4c8dff',
  selectionBackground: '#3a6bc4',
  selectionForeground: '#ffffff',
  selectionInactiveBackground: '#2b4a86',
  black: '#11141b', red: '#e06c75', green: '#7fd18b', yellow: '#e5c07b',
  blue: '#4c8dff', magenta: '#c678dd', cyan: '#56b6c2', white: '#dfe4ee',
  brightBlack: '#5c6370', brightRed: '#ef7a82', brightGreen: '#98c379',
  brightYellow: '#e5c07b', brightBlue: '#6fa5ff', brightMagenta: '#d19aea',
  brightCyan: '#73c8d2', brightWhite: '#ffffff'
};

let secretsStatus = null;
// Only under sshpass can an untrusted host key kill a session outright, so the
// host-key pre-flight is gated on it.
let hasSshpass = false;

const state = {
  hosts: [],
  snippets: [],
  selectedHostId: null,
  selectedSnippetId: null,
  tabs: [],            // { sessionId, hostLabel, term, fit, el, tabEl, alive }
  activeSessionId: null
};

const $ = (sel) => document.querySelector(sel);
const el = {
  hostList: $('#host-list'),
  hostFilter: $('#host-filter'),
  snippetList: $('#snippet-list'),
  snippetFilter: $('#snippet-filter'),
  tabs: $('#tabs'),
  terminals: $('#terminals'),
  empty: $('#empty'),
  status: $('#status'),
  configPath: $('#config-path'),
  hostDialog: $('#host-dialog'),
  hostForm: $('#host-form'),
  hostPreview: $('#host-preview'),
  hostError: $('#host-error'),
  snippetDialog: $('#snippet-dialog'),
  snippetForm: $('#snippet-form'),
  snippetError: $('#snippet-error')
};

function setStatus(message, kind) {
  el.status.textContent = message;
  el.status.className = kind ? `is-${kind}` : '';
}

/** Unwrap the { ok, value } envelope the main process returns. */
function unwrap(result) {
  if (!result || !result.ok) {
    const err = new Error((result && result.error) || 'Unknown error');
    if (result) Object.assign(err, { code: result.code, identityPath: result.identityPath, modeOctal: result.modeOctal });
    throw err;
  }
  return result.value;
}

// ---------------------------------------------------------------- data

async function refresh() {
  const config = unwrap(await window.api.config.load());
  state.hosts = config.hosts;
  state.snippets = config.snippets;
  renderHosts();
  renderSnippets();
}

// ---------------------------------------------------------------- hosts

function hostSubtitle(host) {
  const target = host.username ? `${host.username}@${host.hostname}` : host.hostname;
  const port = host.port && host.port !== 22 ? `:${host.port}` : '';
  const key = host.identityFile ? ` · ${host.identityFile.split('/').pop()}` : '';
  return `${target}${port}${key}`;
}

/** Toggle the selected row without rebuilding the list (which would steal focus). */
function selectRow(listEl, itemEl) {
  for (const other of listEl.querySelectorAll('.item')) {
    other.classList.toggle('is-selected', other === itemEl);
  }
}

/**
 * Build a sidebar row. Every row carries its own edit button: selection used to
 * re-render the whole list, which removed the focused element from the DOM and
 * left the keyboard-only "e" shortcut unreachable.
 */
function makeRow({ title, subtitle, selected, onOpen, onEdit }) {
  const li = document.createElement('li');
  li.className = 'item' + (selected ? ' is-selected' : '');
  li.tabIndex = 0;

  const main = document.createElement('div');
  main.className = 'item-main';
  main.append(
    Object.assign(document.createElement('span'), { className: 'item-title', textContent: title }),
    Object.assign(document.createElement('span'), { className: 'item-sub', textContent: subtitle })
  );

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'item-edit';
  edit.title = 'Edit (e)';
  edit.textContent = '\u270e';
  edit.addEventListener('click', (event) => { event.stopPropagation(); onEdit(); });
  edit.addEventListener('dblclick', (event) => event.stopPropagation());

  li.append(main, edit);
  li.addEventListener('contextmenu', (event) => { event.preventDefault(); onEdit(); });
  li.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); onOpen(); }
    else if (event.key === 'e' || event.key === 'F2') { event.preventDefault(); onEdit(); }
  });
  return li;
}

function emptyNote(text) {
  return Object.assign(document.createElement('li'), { className: 'empty-note', textContent: text });
}

const byText = (get) => (a, b) => String(get(a) || '').localeCompare(String(get(b) || ''));

/** Put keyboard focus back on the selected row after a rebuild. */
function focusSelected(listEl) {
  const selected = listEl.querySelector('.item.is-selected');
  if (selected) selected.focus();
}

function renderHosts() {
  const needle = el.hostFilter.value.trim().toLowerCase();
  const matches = state.hosts.filter((h) =>
    !needle || `${h.label} ${h.hostname} ${h.username} ${h.group}`.toLowerCase().includes(needle));

  el.hostList.replaceChildren();
  if (!matches.length) {
    el.hostList.append(emptyNote(
      state.hosts.length ? 'No hosts match that filter.' : 'No hosts yet \u2014 press + to add one.'));
    return;
  }

  const groups = new Map();
  for (const host of matches) {
    const key = host.group || 'Ungrouped';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(host);
  }

  for (const [group, hosts] of [...groups].sort(byText((g) => g[0]))) {
    if (groups.size > 1 || group !== 'Ungrouped') {
      el.hostList.append(Object.assign(document.createElement('li'),
        { className: 'group-label', textContent: group }));
    }
    for (const host of hosts.sort(byText((h) => h.label || h.hostname))) {
      const row = makeRow({
        title: host.label || host.hostname || '(unnamed host)',
        subtitle: hostSubtitle(host),
        selected: host.id === state.selectedHostId,
        onOpen: () => connect(host),
        onEdit: () => openHostDialog(host)
      });
      row.addEventListener('click', () => {
        state.selectedHostId = host.id;
        selectRow(el.hostList, row);
      });
      row.addEventListener('dblclick', () => connect(host));
      el.hostList.append(row);
    }
  }
}

// ---------------------------------------------------------------- snippets

function renderSnippets() {
  const needle = el.snippetFilter.value.trim().toLowerCase();
  const matches = state.snippets.filter((s) =>
    !needle || `${s.name} ${s.command} ${s.tags || ''}`.toLowerCase().includes(needle));

  el.snippetList.replaceChildren();
  if (!matches.length) {
    el.snippetList.append(emptyNote(
      state.snippets.length ? 'No snippets match that filter.' : 'No snippets yet \u2014 press + to add one.'));
    return;
  }

  for (const snippet of matches.sort(byText((s) => s.name))) {
    const row = makeRow({
      title: snippet.name || '(unnamed snippet)',
      subtitle: String(snippet.command || '').split('\n')[0],
      selected: snippet.id === state.selectedSnippetId,
      onOpen: () => runSnippet(snippet),
      onEdit: () => openSnippetDialog(snippet)
    });
    row.addEventListener('click', () => {
      state.selectedSnippetId = snippet.id;
      selectRow(el.snippetList, row);
    });
    row.addEventListener('dblclick', () => runSnippet(snippet));
    el.snippetList.append(row);
  }
}

function runSnippet(snippet) {
  const tab = state.tabs.find((t) => t.sessionId === state.activeSessionId);
  if (!tab || !tab.alive) {
    setStatus('No live session — connect to a host first.', 'error');
    return;
  }
  // A trailing newline runs it; multi-line snippets are sent line by line so
  // the remote shell sees them as separate commands.
  const payload = snippet.command.replace(/\r\n/g, '\n').replace(/\n+$/, '') + '\n';
  window.api.session.input(tab.sessionId, payload);
  tab.term.focus();
  setStatus(`Ran "${snippet.name}" in ${tab.hostLabel}`, 'ok');
}

// ---------------------------------------------------------------- sessions

function activate(sessionId) {
  state.activeSessionId = sessionId;
  for (const tab of state.tabs) {
    const active = tab.sessionId === sessionId;
    tab.el.classList.toggle('is-hidden', !active);
    tab.tabEl.classList.toggle('is-active', active);
    if (active) {
      tab.fit.fit();
      tab.term.focus();
      window.api.session.resize(sessionId, tab.term.cols, tab.term.rows);
    }
  }
  el.empty.classList.toggle('is-hidden', state.tabs.length > 0);
}

/* ── Terminal font size (Ctrl+wheel, Ctrl+= / Ctrl+-) ─────────────────── */

const FONT_MIN = 6;
const FONT_MAX = 40;
const FONT_DEFAULT = 13;

function loadFontSize() {
  const stored = Number(localStorage.getItem('term.fontSize'));
  return Number.isFinite(stored) && stored >= FONT_MIN && stored <= FONT_MAX ? stored : FONT_DEFAULT;
}

let fontSize = loadFontSize();

function setFontSize(next) {
  const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(next)));
  if (clamped === fontSize) return;
  fontSize = clamped;
  localStorage.setItem('term.fontSize', String(fontSize));
  for (const tab of state.tabs) {
    tab.term.options.fontSize = fontSize;
    tab.fit.fit();
    if (tab.alive) window.api.session.resize(tab.sessionId, tab.term.cols, tab.term.rows);
  }
  setStatus(`Font size ${fontSize}px`);
}

/* ── Clipboard ────────────────────────────────────────────────────────── */

function copySelection(term) {
  const text = term.getSelection();
  if (!text) return false;
  window.api.clipboard.write(text);
  return true;
}

function pasteClipboard(term) {
  const text = window.api.clipboard.read();
  // term.paste() routes through onData, so the pty sees it once, wrapped in
  // bracketed-paste markers when the remote shell asked for them.
  if (text) term.paste(text);
  term.focus();
}

/**
 * Ctrl+A select all, Ctrl+C copy (falls through to SIGINT with no selection),
 * Ctrl+V paste, Ctrl+Shift+C/V as the usual terminal equivalents.
 * Returning false tells xterm to swallow the key instead of sending it to the pty.
 */
function wireTerminalKeys(term) {
  term.attachCustomKeyEventHandler((event) => {
    if (event.type !== 'keydown' || !event.ctrlKey || event.altKey || event.metaKey) return true;
    const key = event.key.toLowerCase();
    // Swallowing the key in xterm is not enough: the browser default for
    // Ctrl+C/Ctrl+V still fires, which would copy or paste a second time.
    const handled = () => { event.preventDefault(); return false; };

    if (key === 'a' && !event.shiftKey) { term.selectAll(); return handled(); }
    if (key === 'c') {
      if (!copySelection(term) && !event.shiftKey) return true; // no selection → let ^C through
      term.clearSelection();
      return handled();
    }
    if (key === 'v') { pasteClipboard(term); return handled(); }
    if (key === '=' || key === '+') { setFontSize(fontSize + 1); return handled(); }
    if (key === '-' || key === '_') { setFontSize(fontSize - 1); return handled(); }
    if (key === '0') { setFontSize(FONT_DEFAULT); return handled(); }
    return true;
  });
}

function closeTab(sessionId) {
  const i = state.tabs.findIndex((t) => t.sessionId === sessionId);
  if (i === -1) return;
  const [tab] = state.tabs.splice(i, 1);
  window.api.session.kill(sessionId);
  tab.term.dispose();
  tab.el.remove();
  tab.tabEl.remove();
  const next = state.tabs[Math.min(i, state.tabs.length - 1)];
  activate(next ? next.sessionId : null);
}

async function connect(host) {
  setStatus(`Connecting to ${host.label}…`);
  if (!(await ensureHostKey(host))) return;

  const container = document.createElement('div');
  container.className = 'term-host is-hidden';
  el.terminals.append(container);

  const term = new Terminal({
    fontFamily: 'ui-monospace, "JetBrains Mono", "DejaVu Sans Mono", Menlo, monospace',
    fontSize,
    cursorBlink: true,
    scrollback: 10000,
    allowProposedApi: true,
    rightClickSelectsWord: true,
    theme: THEME
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new WebLinksAddon());
  term.open(container);
  fit.fit();

  container.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setFontSize(fontSize + (event.deltaY < 0 ? 1 : -1));
  }, { passive: false });

  let started;
  try {
    started = unwrap(await window.api.session.start(host, { cols: term.cols, rows: term.rows }));
  } catch (err) {
    term.dispose();
    container.remove();
    await reportConnectError(err, host);
    return;
  }

  const { sessionId, command } = started;

  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.append(Object.assign(document.createElement('span'), { textContent: host.label }));
  const close = Object.assign(document.createElement('button'), { className: 'tab-close', textContent: '×', title: 'Close session' });
  close.addEventListener('click', (event) => { event.stopPropagation(); closeTab(sessionId); });
  tabEl.append(close);
  tabEl.addEventListener('click', () => activate(sessionId));
  el.tabs.append(tabEl);

  // `host` is kept so a recoverable failure (an untrusted host key) can offer
  // to fix the cause and reconnect without the user retyping anything.
  const tab = { sessionId, hostLabel: host.label, host, term, fit, el: container, tabEl, alive: true };
  state.tabs.push(tab);

  term.onSelectionChange(() => {
    const n = term.getSelection().length;
    if (n) setStatus(`${n} character${n === 1 ? '' : 's'} selected — Ctrl+C to copy`);
  });

  wireTerminalKeys(term);
  term.onData((data) => window.api.session.input(sessionId, data));
  term.onResize(({ cols, rows }) => window.api.session.resize(sessionId, cols, rows));

  activate(sessionId);
  setStatus(command);

  if (host.onConnectSnippetId) {
    const snippet = state.snippets.find((s) => s.id === host.onConnectSnippetId);
    if (snippet) setTimeout(() => runSnippet(snippet), 600);
  }
}

/** Offer the one-click fix for the classic "permissions are too open" refusal. */
async function reportConnectError(err, host) {
  setStatus(err.message, 'error');
  if (err.code !== 'KEY_PERMISSIONS' || !err.identityPath) return;
  const fix = window.confirm(
    `${err.message}\n\nSet permissions on\n${err.identityPath}\nto 600 and retry?`
  );
  if (!fix) return;
  try {
    unwrap(await window.api.keys.fixPermissions(err.identityPath));
    await connect(host);
  } catch (fixErr) {
    setStatus(`Could not change permissions: ${fixErr.message}`, 'error');
  }
}

window.api.session.onData(({ sessionId, data }) => {
  const tab = state.tabs.find((t) => t.sessionId === sessionId);
  if (tab) tab.term.write(data);
});

/** Render a scanned key as one line the user can compare against the server. */
function describeKeys(keys) {
  return keys.map((k) => `  ${k.keytype} ${k.bits ? `(${k.bits} bit) ` : ''}${k.hash || '[fingerprint unavailable]'}`).join('\n');
}

/**
 * Show the fingerprint prompt that plain ssh would have shown, and on an accept
 * trust the exact keys displayed. Returns true if the host is now trusted.
 */
async function trustHostKey(host) {
  let scanned;
  try {
    scanned = unwrap(await window.api.hostkeys.scan(host.hostname, host.port));
  } catch (err) {
    setStatus(`Could not fetch host keys from ${host.hostname}: ${err.message}`, 'error');
    return false;
  }

  const accept = window.confirm(
    `${scanned.host} is not in known_hosts.\n\n`
    + `It is offering these host keys:\n${describeKeys(scanned.keys)}\n\n`
    + 'Verify a fingerprint against the server itself before accepting — on the '
    + 'server, `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`.\n\n'
    + `Add ${scanned.host} to known_hosts and continue?`
  );
  if (!accept) {
    setStatus('Host key not accepted — connection abandoned.', 'error');
    return false;
  }

  try {
    const added = unwrap(await window.api.hostkeys.trust(host.hostname, host.port, scanned.keys.map((k) => k.line)));
    setStatus(`Trusted ${added.added} host key${added.added === 1 ? '' : 's'} for ${added.host}`, 'ok');
    return true;
  } catch (err) {
    setStatus(`Could not write known_hosts: ${err.message}`, 'error');
    return false;
  }
}

/**
 * Ask about an unknown host key *before* connecting, so the first attempt at a
 * password host does not have to fail with a bare "exit 6" to get the question
 * asked. Only sshpass needs this -- plain ssh asks on the terminal itself.
 *
 * Returns false only on a deliberate refusal: if the host cannot be scanned we
 * let the connection go ahead, so ssh reports the real problem (wrong address,
 * firewall, host down) instead of this check guessing at it.
 */
async function ensureHostKey(host) {
  const usesSshpass = (host.authMethod || (host.identityFile ? 'key' : 'default')) === 'password' && hasSshpass;
  if (!usesSshpass || !host.hostname) return true;

  let known;
  try {
    known = unwrap(await window.api.hostkeys.existing(host.hostname, host.port));
  } catch {
    return true; // known_hosts unreadable -- let ssh be the one to complain.
  }
  if (known) return true;

  setStatus(`${host.hostname} is not in known_hosts — checking its host key…`);
  let scanned;
  try {
    scanned = unwrap(await window.api.hostkeys.scan(host.hostname, host.port));
  } catch {
    return true; // unreachable; the connection attempt will say why.
  }
  if (!scanned || !scanned.keys.length) return true;
  return trustHostKey(host);
}

/**
 * Exit 6: the session died because the key was never trusted. The pre-flight
 * normally gets there first, so this is the fallback -- the key can also go
 * missing between the check and the connection.
 */
async function offerHostKeyTrust(tab) {
  if (!(await trustHostKey(tab.host))) return;
  const host = tab.host;
  closeTab(tab.sessionId);
  await connect(host);
}

/**
 * Exit 7: the stored key no longer matches. This is what a man-in-the-middle
 * looks like, so it is never a one-click fix -- the old entry has to be dropped
 * deliberately, and only after the user has seen both fingerprints.
 */
async function reportChangedHostKey(tab) {
  const host = tab.host;
  let scanned;
  let stored;
  try {
    scanned = unwrap(await window.api.hostkeys.scan(host.hostname, host.port));
    stored = unwrap(await window.api.hostkeys.existing(host.hostname, host.port));
  } catch (err) {
    setStatus(`Host key changed for ${host.hostname}, and the keys could not be read: ${err.message}`, 'error');
    return;
  }

  const replace = window.confirm(
    `WARNING: the host key for ${host.hostname} has CHANGED.\n\n`
    + `known_hosts has:\n${stored ? describeKeys(stored.keys) : '  (no entry found)'}\n\n`
    + `The server is now offering:\n${describeKeys(scanned.keys)}\n\n`
    + 'This happens after a legitimate rebuild or reinstall — but it is also exactly '
    + 'what an intercepted connection looks like. Do not continue unless you know why it changed.\n\n'
    + 'Remove the old entry and trust the new key?'
  );
  if (!replace) {
    setStatus('Host key change rejected — connection abandoned.', 'error');
    return;
  }

  try {
    unwrap(await window.api.hostkeys.forget(host.hostname, host.port));
    unwrap(await window.api.hostkeys.trust(host.hostname, host.port, scanned.keys.map((k) => k.line)));
  } catch (err) {
    setStatus(`Could not update known_hosts: ${err.message}`, 'error');
    return;
  }
  closeTab(tab.sessionId);
  await connect(host);
}

window.api.session.onExit(({ sessionId, exitCode, signal, reason, reasonCode }) => {
  const tab = state.tabs.find((t) => t.sessionId === sessionId);
  if (!tab) return;
  tab.alive = false;
  tab.tabEl.classList.add('is-dead');

  // The exit status alone is the whole error message under sshpass, so always
  // print the explanation next to it rather than leaving a bare number.
  const label = signal ? `signal ${signal}` : `exit ${exitCode}`;
  tab.term.write(`\r\n\x1b[90m[session closed — ${label}]\x1b[0m\r\n`);
  if (reason) tab.term.write(`\x1b[91m${reason}\x1b[0m\r\n`);
  if (reasonCode === 'BAD_PASSWORD') {
    tab.term.write('\x1b[90mEdit the host to update the saved password.\x1b[0m\r\n');
  }

  if (sessionId === state.activeSessionId) {
    const bad = Boolean(reason) || exitCode !== 0 || Boolean(signal);
    setStatus(reason || `${tab.hostLabel} disconnected (${label})`, bad ? 'error' : undefined);
  }

  if (!tab.host) return;
  if (reasonCode === 'UNKNOWN_HOST_KEY') offerHostKeyTrust(tab);
  else if (reasonCode === 'CHANGED_HOST_KEY') reportChangedHostKey(tab);
});

// ---------------------------------------------------------------- host dialog

function formValues(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.forwardAgent = form.elements.forwardAgent.checked;
  data.authMethod = form.querySelector('input[name="authMethod"]:checked').value;
  return data;
}

/** Which auth fields are relevant right now. */
function syncAuthFields() {
  const method = el.hostForm.querySelector('input[name="authMethod"]:checked').value;
  for (const field of el.hostForm.querySelectorAll('.auth-field')) {
    field.classList.toggle('is-hidden', field.dataset.auth !== method);
  }
  if (method === 'password' && secretsStatus && (!secretsStatus.available || secretsStatus.weak)) {
    showHostNote(secretsStatus.description);
  }
  updateHostPreview();
}

let editingHostId = null;

function openHostDialog(host) {
  editingHostId = host ? host.id : null;
  const form = el.hostForm;
  form.reset();
  $('#host-dialog-title').textContent = host ? `Edit ${host.label}` : 'New host';
  form.querySelector('.dialog-actions').classList.toggle('is-new', !host);
  const method = (host && host.authMethod) || 'key';
  form.querySelector(`input[name="authMethod"][value="${method}"]`).checked = true;

  passwordDirty = false;
  form.elements.password.value = '';
  form.elements.password.type = 'password';
  $('#password-reveal').textContent = 'Show';
  $('#password-state').textContent = host && host.hasPassword
    ? 'A password is saved for this host. Leave blank to keep it.'
    : (secretsStatus ? secretsStatus.description : '');

  if (host) {
    for (const key of ['label', 'group', 'hostname', 'username', 'port', 'identityFile', 'jumpHost', 'extraArgs']) {
      if (form.elements[key]) form.elements[key].value = host[key] ?? '';
    }
    form.elements.forwardAgent.checked = Boolean(host.forwardAgent);
  }
  syncAuthFields();
  showHostNote('');
  updateHostPreview();
  if (host) checkIdentityField();
  el.hostDialog.showModal();
  form.elements.hostname.focus();
}

async function updateHostPreview() {
  const { password, ...values } = formValues(el.hostForm);
  if (!values.hostname) { el.hostPreview.textContent = 'ssh …'; return; }
  const result = await window.api.hosts.preview(values);
  el.hostPreview.textContent = result.ok ? result.value : `ssh … (${result.error})`;
}

el.hostForm.addEventListener('input', updateHostPreview);

function showHostNote(message, kind) {
  el.hostError.textContent = message || '';
  el.hostError.classList.toggle('is-hidden', !message);
  el.hostError.classList.toggle('is-note', kind === 'note');
}

/**
 * Unpack a pasted connection string into the individual fields. Covers the
 * common mistakes: dropping `ubuntu@ec2-….amazonaws.com` into the hostname box,
 * or pasting the whole `ssh -i "key.pem" ubuntu@host` line the AWS console
 * gives you. Fields the user already filled in are left alone.
 */
async function unpackPastedTarget() {
  const field = el.hostForm.elements.hostname;
  const text = field.value.trim();
  const looksLikeConnectionString =
    text.includes('@') || /^\S*ssh\s/.test(text) || /(^|\s)-\w/.test(text);
  if (!text || !looksLikeConnectionString) return;

  const result = await window.api.hosts.parse(text);
  if (!result.ok || !result.value.hostname) return;
  const parsed = result.value;
  if (parsed.hostname === text) return;

  const filled = [];
  field.value = parsed.hostname;
  filled.push('hostname');

  for (const key of ['username', 'identityFile', 'jumpHost', 'extraArgs']) {
    if (parsed[key] && !el.hostForm.elements[key].value.trim()) {
      el.hostForm.elements[key].value = parsed[key];
      filled.push(key === 'identityFile' ? 'key file' : key);
    }
  }
  if (parsed.port && Number(el.hostForm.elements.port.value || 22) === 22) {
    el.hostForm.elements.port.value = parsed.port;
    filled.push('port');
  }
  if (parsed.forwardAgent && !el.hostForm.elements.forwardAgent.checked) {
    el.hostForm.elements.forwardAgent.checked = true;
    filled.push('agent forwarding');
  }

  showHostNote(`Split the pasted command into: ${filled.join(', ')}.`, 'note');
  await updateHostPreview();
  await checkIdentityField();
}

const hostnameField = el.hostForm.elements.hostname;
hostnameField.addEventListener('paste', () => setTimeout(unpackPastedTarget, 0));
hostnameField.addEventListener('change', unpackPastedTarget);

/** Tell the user up front when the key file is missing or too permissive. */
async function checkIdentityField() {
  const value = el.hostForm.elements.identityFile.value.trim();
  if (!value) return;
  const result = await window.api.keys.inspect(value);
  if (!result.ok) return;
  const info = result.value;
  if (!info.exists) {
    showHostNote(`Key file not found: ${info.path} \u2014 use Browse… to pick the .pem file.`);
  } else if (!info.isFile) {
    showHostNote(`${info.path} is not a regular file.`);
  } else if (info.tooOpen) {
    showHostNote(`${info.path} is mode ${info.modeOctal}. SSH will refuse it until it is 600 \u2014 TermiusClone will offer to fix that on connect.`);
  } else {
    showHostNote('');
  }
}

el.hostForm.elements.identityFile.addEventListener('change', checkIdentityField);
el.hostForm.elements.identityFile.addEventListener('paste', () => setTimeout(checkIdentityField, 0));

let passwordDirty = false;

for (const radio of el.hostForm.querySelectorAll('input[name="authMethod"]')) {
  radio.addEventListener('change', syncAuthFields);
}

el.hostForm.elements.password.addEventListener('input', () => { passwordDirty = true; });

$('#password-reveal').addEventListener('click', () => {
  const field = el.hostForm.elements.password;
  const hidden = field.type === 'password';
  field.type = hidden ? 'text' : 'password';
  $('#password-reveal').textContent = hidden ? 'Hide' : 'Show';
});

$('#password-clear').addEventListener('click', () => {
  el.hostForm.elements.password.value = '';
  passwordDirty = true;
  $('#password-state').textContent = 'The saved password will be removed on save.';
});

$('#host-new').addEventListener('click', () => openHostDialog(null));
$('#host-cancel').addEventListener('click', () => el.hostDialog.close());

$('#key-browse').addEventListener('click', async () => {
  const info = unwrap(await window.api.keys.pick());
  if (!info) return;
  el.hostForm.elements.identityFile.value = info.path;
  await checkIdentityField();
  updateHostPreview();
});

el.hostForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = formValues(el.hostForm);
  if (editingHostId) values.id = editingHostId;
  // undefined keeps the stored password, '' clears it, a string replaces it.
  if (!passwordDirty) delete values.password;
  const result = await window.api.hosts.save(values);
  if (!result.ok) {
    showHostNote(result.error);
    return;
  }
  el.hostDialog.close();
  state.selectedHostId = result.value.id;
  await refresh();
  focusSelected(el.hostList);
  setStatus(`Saved host ${result.value.label}`, 'ok');
});

$('#host-delete').addEventListener('click', async () => {
  if (!editingHostId) return;
  if (!window.confirm('Delete this host? Snippets and key files are untouched.')) return;
  unwrap(await window.api.hosts.remove(editingHostId));
  el.hostDialog.close();
  if (state.selectedHostId === editingHostId) state.selectedHostId = null;
  await refresh();
  setStatus('Host deleted', 'ok');
});

$('#host-import').addEventListener('click', async () => {
  try {
    const imported = unwrap(await window.api.hosts.importSshConfig());
    await refresh();
    setStatus(imported.length
      ? `Imported ${imported.length} host(s) from ~/.ssh/config`
      : 'Nothing new to import from ~/.ssh/config', 'ok');
  } catch (err) {
    setStatus(err.message, 'error');
  }
});

// ---------------------------------------------------------------- snippet dialog

let editingSnippetId = null;

function openSnippetDialog(snippet) {
  editingSnippetId = snippet ? snippet.id : null;
  const form = el.snippetForm;
  form.reset();
  $('#snippet-dialog-title').textContent = snippet ? `Edit ${snippet.name}` : 'New snippet';
  form.querySelector('.dialog-actions').classList.toggle('is-new', !snippet);
  if (snippet) {
    form.elements.name.value = snippet.name;
    form.elements.command.value = snippet.command;
    form.elements.tags.value = snippet.tags || '';
  }
  el.snippetError.classList.add('is-hidden');
  el.snippetDialog.showModal();
  form.elements.name.focus();
}

$('#snippet-new').addEventListener('click', () => openSnippetDialog(null));
$('#snippet-cancel').addEventListener('click', () => el.snippetDialog.close());

el.snippetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(el.snippetForm).entries());
  if (editingSnippetId) values.id = editingSnippetId;
  const result = await window.api.snippets.save(values);
  if (!result.ok) {
    el.snippetError.textContent = result.error;
    el.snippetError.classList.remove('is-hidden');
    return;
  }
  el.snippetDialog.close();
  await refresh();
  focusSelected(el.snippetList);
  setStatus(`Saved snippet ${result.value.name}`, 'ok');
});

$('#snippet-delete').addEventListener('click', async () => {
  if (!editingSnippetId) return;
  if (!window.confirm('Delete this snippet?')) return;
  unwrap(await window.api.snippets.remove(editingSnippetId));
  el.snippetDialog.close();
  await refresh();
  setStatus('Snippet deleted', 'ok');
});

// ---------------------------------------------------------------- chrome

for (const button of document.querySelectorAll('.seg-btn')) {
  button.addEventListener('click', () => {
    for (const other of document.querySelectorAll('.seg-btn')) other.classList.toggle('is-active', other === button);
    $('#pane-hosts').classList.toggle('is-hidden', button.dataset.pane !== 'hosts');
    $('#pane-snippets').classList.toggle('is-hidden', button.dataset.pane !== 'snippets');
  });
}

el.hostFilter.addEventListener('input', renderHosts);
el.snippetFilter.addEventListener('input', renderSnippets);

el.hostFilter.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  const first = el.hostList.querySelector('.item');
  if (first) first.dispatchEvent(new MouseEvent('dblclick'));
});

window.addEventListener('resize', () => {
  const tab = state.tabs.find((t) => t.sessionId === state.activeSessionId);
  if (!tab) return;
  tab.fit.fit();
  window.api.session.resize(tab.sessionId, tab.term.cols, tab.term.rows);
});

window.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey && event.shiftKey)) return;
  if (event.key === 'W' && state.activeSessionId) { event.preventDefault(); closeTab(state.activeSessionId); }
  if (event.key === 'H') { event.preventDefault(); el.hostFilter.focus(); }
  if (event.key === 'S') { event.preventDefault(); document.querySelector('.seg-btn[data-pane="snippets"]').click(); el.snippetFilter.focus(); }
});

(async function init() {
  try {
    el.configPath.textContent = unwrap(await window.api.config.path());
    secretsStatus = unwrap(await window.api.config.secretsStatus());
    hasSshpass = unwrap(await window.api.config.hasSshpass());
    await refresh();
    setStatus('Ready');
  } catch (err) {
    setStatus(err.message, 'error');
  }
})();
