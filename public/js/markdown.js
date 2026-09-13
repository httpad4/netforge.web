'use strict';

/*
 * Minimal, dependency-free Markdown renderer. Supports the subset used by the
 * curriculum: headings, paragraphs, bold/italic, inline + fenced code, links,
 * unordered/ordered lists, blockquotes, tables, hr and raw HTML passthrough
 * (used to mount interactive lab widgets).
 */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeUrl(url) {
  const u = String(url || '').trim();
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(u)) return u;
  return '#';
}

function inline(text) {
  let safe = escapeHtml(text);
  const code = [];

  safe = safe.replace(/`([^`]+)`/g, (m, c) => {
    code.push(`<code>${c}</code>`);
    return `\u0000${code.length - 1}\u0000`;
  });

  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) => {
    let label = txt;
    const inner = inline(txt).replace(/\u0000(\d+)\u0000/g, (m2, i) => code[Number(i)] || '');
    label = inner;
    return `<a href="${safeUrl(url)}">${label}</a>`;
  });

  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  safe = safe.replace(/\u0000(\d+)\u0000/g, (m, i) => code[Number(i)] || '');

  return safe;
}

function parseRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function blockStart(trimmed) {
  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('```') ||
    /^[-*_]{3,}\s*$/.test(trimmed) ||
    /^>/ .test(trimmed) ||
    /^[-*]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    trimmed.startsWith('<') ||
    trimmed.startsWith('|')
  );
}

function render(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) { i += 1; continue; }

    // Table
    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
      const header = parseRow(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(parseRow(lines[i])); i += 1; }
      html += '<div class="table-wrap"><table><thead><tr>' +
        header.map((c) => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>';
      continue;
    }

    // Heading
    if (trimmed.startsWith('#')) {
      const m = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (m) {
        const level = Math.min(m[1].length, 4);
        html += `<h${level}>${inline(m[2])}</h${level}>`;
      }
      i += 1;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      i += 1;
      const buf = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i += 1; }
      i += 1; // closing fence
      html += `<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(trimmed)) { html += '<hr />'; i += 1; continue; }

    // Blockquote (single block, multi-line)
    if (trimmed.startsWith('>')) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      html += `<blockquote>${inline(buf.map((l, idx) => (idx === 0 ? l : ' ' + l)).join(''))}</blockquote>`;
      continue;
    }

    // Lists
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items = [];
      const re = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      while (i < lines.length && re.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(re, ''));
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      html += `<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`;
      continue;
    }

    // Raw HTML passthrough (e.g. <div data-lab="..."></div>)
    if (trimmed.startsWith('<')) { html += lines[i]; i += 1; continue; }

    // Paragraph (gather until a block start)
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !blockStart(lines[i].trim())
    ) {
      buf.push(lines[i].trim());
      i += 1;
    }
    html += `<p>${inline(buf.join(' '))}</p>`;
  }

  return html;
}

if (typeof window !== 'undefined') window.NetForgeMarkdown = { render };