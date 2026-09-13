'use strict';

(function () {
  const { icon } = window.NetForgeIcons;
  const { esc } = window.NetForgeUI;

  let terms = [];
  let highlightTerm = '';

  function render(filter, focusId) {
    const list = document.getElementById('glossary-list');
    const f = (filter || '').toLowerCase().trim();
    const count = document.getElementById('glossary-count');
    const filtered = terms.filter((t) =>
      !f || t.term.toLowerCase().includes(f) || t.definition.toLowerCase().includes(f)
    );
    count ? (count.textContent = `${filtered.length} of ${terms.length} terms`) : null;

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">No terms match "${esc(f)}".</div>`;
      return;
    }

    const byId = {};
    terms.forEach((t) => { byId[t.id] = t; });

    list.innerHTML = filtered.map((t) => {
      const related = (t.related_term_ids || [])
        .map((id) => byId[id])
        .filter(Boolean)
        .map((r) => `<a class="badge-pill" href="glossary.html?term=${encodeURIComponent(r.term)}" style="text-decoration:none">${esc(r.term)}</a>`)
        .join('');
      const highlight = highlightTerm && t.term.toLowerCase() === highlightTerm.toLowerCase();
      return `
        <article class="card module-card" id="term-${t.id}" data-term="${esc(t.term)}" ${highlight ? 'style="border-color:var(--primary)"' : ''} tabindex="0">
          <h3 style="margin:0">${esc(t.term)} ${highlight ? `<span class="badge-pill" style="margin-left:.3rem">${icon('globe')} You came from a lesson</span>` : ''}</h3>
          <p>${esc(t.definition)}</p>
          ${related ? `<div class="flex" style="flex-wrap:wrap;gap:.4rem">${related}</div>` : ''}
        </article>`;
    }).join('');

    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
      }
    }
  }

  async function init() {
    const search = document.getElementById('glossary-search');
    const params = new URLSearchParams(location.search);
    highlightTerm = params.get('term') || '';

    let data;
    try {
      data = await window.NetForgeApi.apiGet('/glossary');
    } catch (err) {
      document.getElementById('glossary-list').innerHTML = `<div class="empty-state">Could not load the glossary.</div>`;
      return;
    }
    terms = data.terms;

    const focusId = highlightTerm ? `term-${terms.find((t) => t.term.toLowerCase() === highlightTerm.toLowerCase())?.id}` : null;
    render('', focusId);

    search.addEventListener('input', () => render(search.value));
    document.getElementById('glossary-clear').addEventListener('click', () => {
      search.value = '';
      render('');
      search.focus();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();