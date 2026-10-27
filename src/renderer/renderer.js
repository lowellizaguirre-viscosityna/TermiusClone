'use strict';

const { Terminal } = window;
const { FitAddon } = window.FitAddon;
const { WebLinksAddon } = window.WebLinksAddon;

// Ten dark color schemes. Each host is assigned one — explicitly (see
// host.themeId) or, when unassigned, by its position in the list so that
// hosts 1 and 11 share THEMES[0] while 2–10 each get their own.
const THEMES = [
  {
    id: 'midnight', name: 'Midnight (default)',
    background: '#11141b', foreground: '#dfe4ee', cursor: '#4c8dff',
    selectionBackground: '#3a6bc4', selectionForeground: '#ffffff', selectionInactiveBackground: '#2b4a86',
    black: '#11141b', red: '#e06c75', green: '#7fd18b', yellow: '#e5c07b',
    blue: '#4c8dff', magenta: '#c678dd', cyan: '#56b6c2', white: '#dfe4ee',
    brightBlack: '#5c6370', brightRed: '#ef7a82', brightGreen: '#98c379',
    brightYellow: '#e5c07b', brightBlue: '#6fa5ff', brightMagenta: '#d19aea',
    brightCyan: '#73c8d2', brightWhite: '#ffffff'
  },
  {
    id: 'solarized', name: 'Solarized Dark',
    background: '#002b36', foreground: '#93a1a1', cursor: '#93a1a1',
    selectionBackground: '#274642', selectionForeground: '#ffffff', selectionInactiveBackground: '#1c3b38',
    black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
    blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
    brightBlack: '#586e75', brightRed: '#cb4b16', brightGreen: '#586e75',
    brightYellow: '#657b83', brightBlue: '#839496', brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1', brightWhite: '#fdf6e3'
  },
  {
    id: 'dracula', name: 'Dracula',
    background: '#282a36', foreground: '#f8f8f2', cursor: '#ff79c6',
    selectionBackground: '#44475a', selectionForeground: '#ffffff', selectionInactiveBackground: '#343746',
    black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
    blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
    brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94',
    brightYellow: '#ffffa5', brightBlue: '#d6acff', brightMagenta: '#ff92df',
    brightCyan: '#a4ffff', brightWhite: '#ffffff'
  },
  {
    id: 'nord', name: 'Nord',
    background: '#2e3440', foreground: '#d8dee9', cursor: '#88c0d0',
    selectionBackground: '#434c5e', selectionForeground: '#eceff4', selectionInactiveBackground: '#3b4252',
    black: '#3b4252', red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b',
    blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0', white: '#e5e9f0',
    brightBlack: '#4c566a', brightRed: '#bf616a', brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b', brightBlue: '#81a1c1', brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb', brightWhite: '#eceff4'
  },
  {
    id: 'gruvbox', name: 'Gruvbox Dark',
    background: '#282828', foreground: '#ebdbb2', cursor: '#fe8019',
    selectionBackground: '#504945', selectionForeground: '#fbf1c7', selectionInactiveBackground: '#3c3836',
    black: '#282828', red: '#cc241d', green: '#98971a', yellow: '#d79921',
    blue: '#458588', magenta: '#b16286', cyan: '#689d6a', white: '#a89984',
    brightBlack: '#928374', brightRed: '#fb4934', brightGreen: '#b8bb26',
    brightYellow: '#fabd2f', brightBlue: '#83a598', brightMagenta: '#d3869b',
    brightCyan: '#8ec07c', brightWhite: '#ebdbb2'
  },
  {
    id: 'monokai', name: 'Monokai',
    background: '#272822', foreground: '#f8f8f2', cursor: '#f8f8f0',
    selectionBackground: '#49483e', selectionForeground: '#ffffff', selectionInactiveBackground: '#3a3a30',
    black: '#272822', red: '#f92672', green: '#a6e22e', yellow: '#f4bf75',
    blue: '#66d9ef', magenta: '#ae81ff', cyan: '#a1efe4', white: '#f8f8f2',
    brightBlack: '#75715e', brightRed: '#f92672', brightGreen: '#a6e22e',
    brightYellow: '#f4bf75', brightBlue: '#66d9ef', brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4', brightWhite: '#f9f8f5'
  },
  {
    id: 'tokyonight', name: 'Tokyo Night',
    background: '#1a1b26', foreground: '#c0caf5', cursor: '#7aa2f7',
    selectionBackground: '#33467c', selectionForeground: '#ffffff', selectionInactiveBackground: '#283457',
    black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
    blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
    brightBlack: '#414868', brightRed: '#f7768e', brightGreen: '#9ece6a',
    brightYellow: '#e0af68', brightBlue: '#7aa2f7', brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff', brightWhite: '#c0caf5'
  },
  {
    id: 'onedark', name: 'One Dark',
    background: '#1e2127', foreground: '#abb2bf', cursor: '#528bff',
    selectionBackground: '#3e4451', selectionForeground: '#ffffff', selectionInactiveBackground: '#2c313a',
    black: '#1e2127', red: '#e06c75', green: '#98c379', yellow: '#d19a66',
    blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf',
    brightBlack: '#5c6370', brightRed: '#e06c75', brightGreen: '#98c379',
    brightYellow: '#d19a66', brightBlue: '#61afef', brightMagenta: '#c678dd',
    brightCyan: '#56b6c2', brightWhite: '#ffffff'
  },
  {
    id: 'ayu', name: 'Ayu Mirage',
    background: '#1f2430', foreground: '#cbccc6', cursor: '#ffcc66',
    selectionBackground: '#34455a', selectionForeground: '#ffffff', selectionInactiveBackground: '#2a3444',
    black: '#191e2a', red: '#ed8274', green: '#a6cc70', yellow: '#fad07b',
    blue: '#6dcbfa', magenta: '#cfbafa', cyan: '#90e1c6', white: '#c7c7c7',
    brightBlack: '#686868', brightRed: '#f28779', brightGreen: '#bae67e',
    brightYellow: '#ffd580', brightBlue: '#73d0ff', brightMagenta: '#d4bfff',
    brightCyan: '#95e6cb', brightWhite: '#ffffff'
  },
  {
    id: 'palenight', name: 'Palenight',
    background: '#292d3e', foreground: '#a6accd', cursor: '#ffcb6b',
    selectionBackground: '#444267', selectionForeground: '#ffffff', selectionInactiveBackground: '#343856',
    black: '#292d3e', red: '#f07178', green: '#c3e88d', yellow: '#ffcb6b',
    blue: '#82aaff', magenta: '#c792ea', cyan: '#89ddff', white: '#a6accd',
    brightBlack: '#676e95', brightRed: '#f07178', brightGreen: '#c3e88d',
    brightYellow: '#ffcb6b', brightBlue: '#82aaff', brightMagenta: '#c792ea',
    brightCyan: '#89ddff', brightWhite: '#ffffff'
  },
  {
    id: 'catppuccin', name: 'Catppuccin Mocha',
    background: '#1e1e2e', foreground: '#cdd6f4', cursor: '#f5e0dc',
    selectionBackground: '#45475a', selectionForeground: '#ffffff', selectionInactiveBackground: '#313244',
    black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
    blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5', white: '#bac2de',
    brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af', brightBlue: '#89b4fa', brightMagenta: '#f5c2e7',
    brightCyan: '#94e2d5', brightWhite: '#a6adc8'
  },
  {
    id: 'everforest', name: 'Everforest Dark',
    background: '#2d353b', foreground: '#d3c6aa', cursor: '#d3c6aa',
    selectionBackground: '#475258', selectionForeground: '#ffffff', selectionInactiveBackground: '#3a454a',
    black: '#475258', red: '#e67e80', green: '#a7c080', yellow: '#dbbc7f',
    blue: '#7fbbb3', magenta: '#d699b6', cyan: '#83c092', white: '#d3c6aa',
    brightBlack: '#5c6a72', brightRed: '#e67e80', brightGreen: '#a7c080',
    brightYellow: '#dbbc7f', brightBlue: '#7fbbb3', brightMagenta: '#d699b6',
    brightCyan: '#83c092', brightWhite: '#e3ddcc'
  },
  {
    id: 'rosepine', name: 'Rosé Pine',
    background: '#191724', foreground: '#e0def4', cursor: '#524f67',
    selectionBackground: '#403d52', selectionForeground: '#ffffff', selectionInactiveBackground: '#2a283e',
    black: '#26233a', red: '#eb6f92', green: '#31748f', yellow: '#f6c177',
    blue: '#9ccfd8', magenta: '#c4a7e7', cyan: '#ebbcba', white: '#e0def4',
    brightBlack: '#6e6a86', brightRed: '#eb6f92', brightGreen: '#31748f',
    brightYellow: '#f6c177', brightBlue: '#9ccfd8', brightMagenta: '#c4a7e7',
    brightCyan: '#ebbcba', brightWhite: '#e0def4'
  },
  {
    id: 'kanagawa', name: 'Kanagawa',
    background: '#1f1f28', foreground: '#dcd7ba', cursor: '#c8c093',
    selectionBackground: '#2d4f67', selectionForeground: '#ffffff', selectionInactiveBackground: '#223249',
    black: '#090618', red: '#c34043', green: '#76946a', yellow: '#c0a36e',
    blue: '#7e9cd8', magenta: '#957fb8', cyan: '#6a9589', white: '#c8c093',
    brightBlack: '#727169', brightRed: '#e82424', brightGreen: '#98bb6c',
    brightYellow: '#e6c384', brightBlue: '#7fb4ca', brightMagenta: '#938aa9',
    brightCyan: '#7aa89f', brightWhite: '#dcd7ba'
  },
  {
    id: 'nightowl', name: 'Night Owl',
    background: '#011627', foreground: '#d6deeb', cursor: '#80a4c2',
    selectionBackground: '#1d3b53', selectionForeground: '#ffffff', selectionInactiveBackground: '#122c3f',
    black: '#011627', red: '#ef5350', green: '#22da6e', yellow: '#addb67',
    blue: '#82aaff', magenta: '#c792ea', cyan: '#21c7a8', white: '#ffffff',
    brightBlack: '#575656', brightRed: '#ef5350', brightGreen: '#22da6e',
    brightYellow: '#ffeb95', brightBlue: '#82aaff', brightMagenta: '#c792ea',
    brightCyan: '#7fdbca', brightWhite: '#ffffff'
  },
  {
    id: 'oceanic', name: 'Oceanic Next',
    background: '#1b2b34', foreground: '#c0c5ce', cursor: '#c0c5ce',
    selectionBackground: '#4f5b66', selectionForeground: '#ffffff', selectionInactiveBackground: '#343d46',
    black: '#1b2b34', red: '#ec5f67', green: '#99c794', yellow: '#fac863',
    blue: '#6699cc', magenta: '#c594c5', cyan: '#5fb3b3', white: '#c0c5ce',
    brightBlack: '#65737e', brightRed: '#ec5f67', brightGreen: '#99c794',
    brightYellow: '#fac863', brightBlue: '#6699cc', brightMagenta: '#c594c5',
    brightCyan: '#5fb3b3', brightWhite: '#d8dee9'
  },
  {
    id: 'cobalt2', name: 'Cobalt2',
    background: '#132738', foreground: '#ffffff', cursor: '#ffc600',
    selectionBackground: '#18364a', selectionForeground: '#ffffff', selectionInactiveBackground: '#122b3b',
    black: '#000000', red: '#ff0000', green: '#38de21', yellow: '#ffe50a',
    blue: '#1460d2', magenta: '#ff005d', cyan: '#00bbbb', white: '#bbbbbb',
    brightBlack: '#555555', brightRed: '#f40e17', brightGreen: '#3bd01d',
    brightYellow: '#edc809', brightBlue: '#5555ff', brightMagenta: '#ff55ff',
    brightCyan: '#6ae3f9', brightWhite: '#ffffff'
  },
  {
    id: 'synthwave', name: 'SynthWave 84',
    background: '#262335', foreground: '#ffffff', cursor: '#ff7edb',
    selectionBackground: '#463465', selectionForeground: '#ffffff', selectionInactiveBackground: '#342b4d',
    black: '#262335', red: '#fe4450', green: '#72f1b8', yellow: '#fede5d',
    blue: '#03edf9', magenta: '#ff7edb', cyan: '#03edf9', white: '#ffffff',
    brightBlack: '#495495', brightRed: '#fe4450', brightGreen: '#72f1b8',
    brightYellow: '#fede5d', brightBlue: '#03edf9', brightMagenta: '#ff7edb',
    brightCyan: '#03edf9', brightWhite: '#ffffff'
  },
  {
    id: 'horizon', name: 'Horizon',
    background: '#1c1e26', foreground: '#d5d8da', cursor: '#e95678',
    selectionBackground: '#2e303e', selectionForeground: '#ffffff', selectionInactiveBackground: '#232530',
    black: '#232530', red: '#e95678', green: '#29d398', yellow: '#fab795',
    blue: '#26bbd9', magenta: '#ee64ac', cyan: '#59e1e3', white: '#d5d8da',
    brightBlack: '#2e303e', brightRed: '#ec6a88', brightGreen: '#3fdaa4',
    brightYellow: '#fbc3a7', brightBlue: '#3fc6de', brightMagenta: '#f075b5',
    brightCyan: '#6be4e6', brightWhite: '#d5d8da'
  },
  {
    id: 'material', name: 'Material Dark',
    background: '#263238', foreground: '#eeffff', cursor: '#ffcc00',
    selectionBackground: '#3a484e', selectionForeground: '#ffffff', selectionInactiveBackground: '#2e3c42',
    black: '#000000', red: '#ff5370', green: '#c3e88d', yellow: '#ffcb6b',
    blue: '#82aaff', magenta: '#c792ea', cyan: '#89ddff', white: '#eeffff',
    brightBlack: '#546e7a', brightRed: '#ff5370', brightGreen: '#c3e88d',
    brightYellow: '#ffcb6b', brightBlue: '#82aaff', brightMagenta: '#c792ea',
    brightCyan: '#89ddff', brightWhite: '#ffffff'
  },
  {
    id: 'spacedust', name: 'Spacedust',
    background: '#0a1e24', foreground: '#ecf0c1', cursor: '#708284',
    selectionBackground: '#166162', selectionForeground: '#ffffff', selectionInactiveBackground: '#0e3c3c',
    black: '#6e5346', red: '#e35b00', green: '#5cab96', yellow: '#e3cd7b',
    blue: '#0f548b', magenta: '#e35b00', cyan: '#06afc7', white: '#f0f1ce',
    brightBlack: '#684c31', brightRed: '#ff8a3a', brightGreen: '#aecab8',
    brightYellow: '#ffc878', brightBlue: '#67a0ce', brightMagenta: '#ff8a3a',
    brightCyan: '#83a7b4', brightWhite: '#fefff1'
  },
  {
    id: 'ubuntu', name: 'Ubuntu',
    background: '#300a24', foreground: '#eeeeec', cursor: '#bbbbbb',
    selectionBackground: '#5a2b4d', selectionForeground: '#ffffff', selectionInactiveBackground: '#48213d',
    black: '#2e3436', red: '#cc0000', green: '#4e9a06', yellow: '#c4a000',
    blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf',
    brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234',
    brightYellow: '#fce94f', brightBlue: '#729fcf', brightMagenta: '#ad7fa8',
    brightCyan: '#34e2e2', brightWhite: '#eeeeec'
  },
  {
    id: 'hopscotch', name: 'Hopscotch',
    background: '#322931', foreground: '#b9b5b8', cursor: '#b9b5b8',
    selectionBackground: '#5c545b', selectionForeground: '#ffffff', selectionInactiveBackground: '#433b42',
    black: '#322931', red: '#dd464c', green: '#8fc13e', yellow: '#fdcc59',
    blue: '#1290bf', magenta: '#c85e7c', cyan: '#149b93', white: '#b9b5b8',
    brightBlack: '#797379', brightRed: '#fd8b19', brightGreen: '#433b42',
    brightYellow: '#5c545b', brightBlue: '#989498', brightMagenta: '#d5d3d5',
    brightCyan: '#b33508', brightWhite: '#ffffff'
  },
  {
    id: 'seti', name: 'Seti',
    background: '#111213', foreground: '#cacecd', cursor: '#e3bf21',
    selectionBackground: '#303233', selectionForeground: '#ffffff', selectionInactiveBackground: '#1f2021',
    black: '#323232', red: '#c22832', green: '#8ec43d', yellow: '#e0c64f',
    blue: '#43a5d5', magenta: '#8b57b5', cyan: '#8ec43d', white: '#eeeeee',
    brightBlack: '#323232', brightRed: '#c22832', brightGreen: '#8ec43d',
    brightYellow: '#e0c64f', brightBlue: '#43a5d5', brightMagenta: '#8b57b5',
    brightCyan: '#8ec43d', brightWhite: '#ffffff'
  },
  {
    id: 'afterglow', name: 'Afterglow',
    background: '#212121', foreground: '#d0d0d0', cursor: '#d0d0d0',
    selectionBackground: '#303030', selectionForeground: '#ffffff', selectionInactiveBackground: '#282828',
    black: '#151515', red: '#ac4142', green: '#7e8e50', yellow: '#e5b566',
    blue: '#6c99bb', magenta: '#9f4e85', cyan: '#7dd6cf', white: '#d0d0d0',
    brightBlack: '#505050', brightRed: '#ac4142', brightGreen: '#7e8e50',
    brightYellow: '#e5b566', brightBlue: '#6c99bb', brightMagenta: '#9f4e85',
    brightCyan: '#7dd6cf', brightWhite: '#f5f5f5'
  },
  {
    id: 'breeze', name: 'Breeze',
    background: '#232629', foreground: '#fcfcfc', cursor: '#fcfcfc',
    selectionBackground: '#1b668f', selectionForeground: '#ffffff', selectionInactiveBackground: '#14506f',
    black: '#31363b', red: '#ed1515', green: '#11d116', yellow: '#f67400',
    blue: '#1d99f3', magenta: '#9b59b6', cyan: '#1abc9c', white: '#eff0f1',
    brightBlack: '#7f8c8d', brightRed: '#c0392b', brightGreen: '#1cdc9a',
    brightYellow: '#fdbc4b', brightBlue: '#3daee9', brightMagenta: '#8e44ad',
    brightCyan: '#16a085', brightWhite: '#fcfcfc'
  },
  {
    id: 'iceberg', name: 'Iceberg Dark',
    background: '#161821', foreground: '#c6c8d1', cursor: '#c6c8d1',
    selectionBackground: '#272c42', selectionForeground: '#ffffff', selectionInactiveBackground: '#1e222f',
    black: '#1e2132', red: '#e27878', green: '#b4be82', yellow: '#e2a478',
    blue: '#84a0c6', magenta: '#a093c7', cyan: '#89b8c2', white: '#c6c8d1',
    brightBlack: '#6b7089', brightRed: '#e98989', brightGreen: '#c0ca8e',
    brightYellow: '#e9b189', brightBlue: '#91acd1', brightMagenta: '#ada0d3',
    brightCyan: '#95c4ce', brightWhite: '#d2d4de'
  },
  {
    id: 'moonlight', name: 'Moonlight',
    background: '#212337', foreground: '#c8d3f5', cursor: '#c8d3f5',
    selectionBackground: '#2f334d', selectionForeground: '#ffffff', selectionInactiveBackground: '#262840',
    black: '#191a2a', red: '#ff5370', green: '#c3e88d', yellow: '#ffc777',
    blue: '#82aaff', magenta: '#c099ff', cyan: '#86e1fc', white: '#c8d3f5',
    brightBlack: '#444a73', brightRed: '#ff98a4', brightGreen: '#c7fb6d',
    brightYellow: '#ffd8ab', brightBlue: '#9ab8ff', brightMagenta: '#d4bbff',
    brightCyan: '#b2ebff', brightWhite: '#e4f3fa'
  },
  {
    id: 'zenburn', name: 'Zenburn',
    background: '#3f3f3f', foreground: '#dcdccc', cursor: '#73635a',
    selectionBackground: '#545a4e', selectionForeground: '#ffffff', selectionInactiveBackground: '#484d43',
    black: '#4d4d4d', red: '#705050', green: '#60b48a', yellow: '#f0dfaf',
    blue: '#506070', magenta: '#dc8cc3', cyan: '#8cd0d3', white: '#dcdccc',
    brightBlack: '#709080', brightRed: '#dca3a3', brightGreen: '#c3bf9f',
    brightYellow: '#e0cf9f', brightBlue: '#94bff3', brightMagenta: '#ec93d3',
    brightCyan: '#93e0e3', brightWhite: '#ffffff'
  },
  {
    id: 'framer', name: 'Framer',
    background: '#111111', foreground: '#eeeeee', cursor: '#eeeeee',
    selectionBackground: '#2f363e', selectionForeground: '#ffffff', selectionInactiveBackground: '#22272d',
    black: '#141414', red: '#ff5555', green: '#98ec65', yellow: '#ffcc33',
    blue: '#00aaff', magenta: '#ff00aa', cyan: '#88ddff', white: '#cccccc',
    brightBlack: '#414141', brightRed: '#ff8888', brightGreen: '#b6f292',
    brightYellow: '#ffd966', brightBlue: '#33bbff', brightMagenta: '#ff33bb',
    brightCyan: '#aae9ff', brightWhite: '#ffffff'
  }
];

const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/**
 * The color scheme for a host: its explicit assignment when valid, otherwise a
 * default derived from its position so hosts wrap every ten (1≡11, 2…10 unique).
 */
function themeFor(host) {
  if (host && host.themeId && THEME_BY_ID.has(host.themeId)) return THEME_BY_ID.get(host.themeId);
  const pos = host ? state.hosts.findIndex((h) => h.id === host.id) : -1;
  return THEMES[(pos < 0 ? 0 : pos) % THEMES.length];
}

/** The xterm theme object (sans our id/name metadata). */
function xtermTheme(theme) {
  const { id, name, ...colors } = theme;
  return colors;
}

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
  snippetError: $('#snippet-error'),
  hostTheme: $('#host-theme'),
  themeSwitch: $('#theme-switch')
};

/** Fill a <select> with the ten schemes; `withAuto` adds a leading Automatic. */
function fillThemeOptions(select, withAuto) {
  select.replaceChildren();
  if (withAuto) {
    select.append(Object.assign(document.createElement('option'),
      { value: '', textContent: 'Automatic (by list position)' }));
  }
  for (const theme of THEMES) {
    select.append(Object.assign(document.createElement('option'),
      { value: theme.id, textContent: theme.name }));
  }
}
fillThemeOptions(el.hostTheme, true);
fillThemeOptions(el.themeSwitch, false);

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
function makeRow({ title, subtitle, selected, onOpen, onEdit, theme }) {
  const li = document.createElement('li');
  li.className = 'item' + (selected ? ' is-selected' : '') + (theme ? ' has-theme' : '');
  li.tabIndex = 0;

  // A themed row previews its assigned scheme: the terminal background fills the
  // row, the accent/cursor color draws the border, and the scheme's own
  // foreground is used for the text so the contrast matches the real terminal.
  if (theme) {
    li.style.setProperty('--host-bg', theme.background);
    li.style.setProperty('--host-accent', theme.cursor || theme.blue);
    li.style.setProperty('--host-fg', theme.foreground);
  }

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
        onEdit: () => openHostDialog(host),
        theme: themeFor(host)
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
  syncThemeSwitch();
}

/** Reflect the active session's scheme in the tabbar picker (hidden if none). */
function syncThemeSwitch() {
  const tab = state.tabs.find((t) => t.sessionId === state.activeSessionId);
  el.themeSwitch.classList.toggle('is-hidden', !tab);
  if (tab) el.themeSwitch.value = tab.themeId;
}

// Live scheme change: repaint the active terminal and remember it on the host.
el.themeSwitch.addEventListener('change', async () => {
  const tab = state.tabs.find((t) => t.sessionId === state.activeSessionId);
  if (!tab) return;
  const themeId = el.themeSwitch.value;
  tab.themeId = themeId;
  tab.term.options.theme = xtermTheme(THEME_BY_ID.get(themeId) || THEMES[0]);
  tab.term.focus();
  // Persist as this host's assignment so future connections reuse it.
  if (tab.host && tab.host.id) {
    const result = await window.api.hosts.save({ ...tab.host, themeId });
    if (result && result.ok) {
      tab.host = { ...tab.host, themeId };
      const stored = state.hosts.find((h) => h.id === tab.host.id);
      if (stored) stored.themeId = themeId;
      renderHosts(); // refresh the sidebar preview border to match
    }
  }
  setStatus(`Scheme: ${(THEME_BY_ID.get(themeId) || THEMES[0]).name}`, 'ok');
});

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

/** Two host records point at the same server when they share an id, or (for
 *  unsaved/ad-hoc hosts) the same address, port and user. */
function sameServer(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  return a.hostname === b.hostname && (a.port || 22) === (b.port || 22) && a.username === b.username;
}

/** The open tab for this server, if any — live or dead. */
function findTabForHost(host) {
  return state.tabs.find((t) => sameServer(t.host, host));
}

/** Fire the host's on-connect snippet once the shell has had a moment to settle. */
function maybeRunOnConnect(host) {
  if (!host.onConnectSnippetId) return;
  const snippet = state.snippets.find((s) => s.id === host.onConnectSnippetId);
  if (snippet) setTimeout(() => runSnippet(snippet), 600);
}

/** Verify the host key, then start the backend session for this terminal.
 *  Returns the started session, or null when the attempt was aborted/failed
 *  (the reason is already shown to the user). */
async function startSession(host, term) {
  if (!(await ensureHostKey(host))) return null;
  try {
    return unwrap(await window.api.session.start(host, { cols: term.cols, rows: term.rows }));
  } catch (err) {
    await reportConnectError(err, host);
    return null;
  }
}

async function connect(host) {
  // One tab per server: if there is already a tab for this host, don't open a
  // second one. A live session is simply brought to the front; a dead one is
  // reconnected in place, reusing its terminal and scrollback.
  const existing = findTabForHost(host);
  if (existing) {
    if (existing.alive) {
      activate(existing.sessionId);
      setStatus(`Already connected to ${host.label}`);
      return;
    }
    await reconnectTab(existing, host);
    return;
  }

  setStatus(`Connecting to ${host.label}…`);

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
    theme: xtermTheme(themeFor(host))
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

  const started = await startSession(host, term);
  if (!started) {
    term.dispose();
    container.remove();
    return;
  }

  // `host` is kept so a recoverable failure (an untrusted host key) can offer
  // to fix the cause and reconnect without the user retyping anything.
  const tab = { sessionId: started.sessionId, hostLabel: host.label, host, term, fit, el: container, tabEl: null, alive: true, themeId: themeFor(host).id };

  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.append(Object.assign(document.createElement('span'), { textContent: host.label }));
  const close = Object.assign(document.createElement('button'), { className: 'tab-close', textContent: '×', title: 'Close session' });
  close.addEventListener('click', (event) => { event.stopPropagation(); closeTab(tab.sessionId); });
  tabEl.append(close);
  tabEl.addEventListener('click', () => activate(tab.sessionId));
  el.tabs.append(tabEl);
  tab.tabEl = tabEl;
  state.tabs.push(tab);

  term.onSelectionChange(() => {
    const n = term.getSelection().length;
    if (n) setStatus(`${n} character${n === 1 ? '' : 's'} selected — Ctrl+C to copy`);
  });

  wireTerminalKeys(term);
  // Handlers read tab.sessionId (not a captured id) so a reconnect that swaps
  // in a new backend session keeps routing input through the same terminal.
  term.onData((data) => window.api.session.input(tab.sessionId, data));
  term.onResize(({ cols, rows }) => window.api.session.resize(tab.sessionId, cols, rows));

  activate(tab.sessionId);
  setStatus(started.command);
  maybeRunOnConnect(host);
}

/** Revive a tab whose session has ended, reusing its terminal in place. */
async function reconnectTab(tab, host) {
  setStatus(`Reconnecting to ${host.label}…`);
  const started = await startSession(host, tab.term);
  if (!started) return;

  tab.sessionId = started.sessionId;
  tab.host = host;
  tab.hostLabel = host.label;
  tab.alive = true;
  tab.tabEl.classList.remove('is-dead');
  tab.term.write('\r\n\x1b[90m[reconnected]\x1b[0m\r\n');

  activate(tab.sessionId);
  setStatus(started.command);
  maybeRunOnConnect(host);
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
    form.elements.themeId.value = THEME_BY_ID.has(host.themeId) ? host.themeId : '';
  } else {
    form.elements.themeId.value = '';
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
