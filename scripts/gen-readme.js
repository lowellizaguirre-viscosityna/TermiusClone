const fs = require('fs');
// README paths are relative to the repo root; the dialog is served from
// src/renderer/, so rewrite root-relative asset paths up two levels.
function resolveSrc(src) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('/')) return src;
  return '../../' + src.replace(/^\.\//, '');
}

function renderMarkdown(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, alt, src) => `<img alt="${alt}" src="${resolveSrc(src)}" />`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_m, t, href) => `<a href="${href}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = []; let i = 0; let listType = null;
  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(.*)$/);
    if (fence) { closeList(); const body = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { body.push(lines[i]); i++; } i++;
      out.push(`<pre class="md-code"><code>${esc(body.join('\n'))}</code></pre>`); continue; }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) { closeList(); out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); i++; continue; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { closeList(); out.push('<hr />'); i++; continue; }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/); const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ol || ul) { const want = ol ? 'ol' : 'ul';
      if (listType !== want) { closeList(); listType = want; out.push(`<${want}>`); }
      out.push(`<li>${inline((ol || ul)[1])}</li>`); i++; continue; }
    if (/^\s*>\s?/.test(line)) { closeList(); out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`); i++; continue; }
    if (line.trim() === '') { closeList(); i++; continue; }
    const para = [line]; i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|```|\s*[-*+]\s|\s*\d+\.\s|\s*>\s)/.test(lines[i]) && !/^\s*([-*_])\1{2,}\s*$/.test(lines[i])) { para.push(lines[i]); i++; }
    closeList(); out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  closeList(); return out.join('\n');
}
const root = '/media/lowell/storage/github/TermiusClone';
const md = fs.readFileSync(root + '/README.md', 'utf8');
const html = '<!-- Auto-generated from README.md. Do not edit by hand; regenerate with scripts/gen-readme.js -->\n' + renderMarkdown(md) + '\n';
fs.writeFileSync(root + '/src/renderer/readme.html', html);
console.log('wrote src/renderer/readme.html,', html.length, 'bytes');
