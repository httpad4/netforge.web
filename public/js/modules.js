'use strict';

(function () {
  const { icon } = window.NetForgeIcons;
  const { esc } = window.NetForgeUI;

  const MODULE_ICONS = ['layers', 'activity', 'cpu', 'link', 'globe', 'wifi', 'shield', 'terminal'];

  function cardHTML(m, i, authed) {
    const pct = m.total_lessons ? Math.round((m.completed_lessons / m.total_lessons) * 100) : 0;
    const done = m.completed_lessons === m.total_lessons && m.total_lessons > 0;
    return `
      <article class="card module-card">
        <div class="card-head">
          <span class="card-icon">${icon(MODULE_ICONS[i % MODULE_ICONS.length])}</span>
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;width:100%">
              <h3 style="margin:0">
                <a href="lesson.html?slug=${encodeURIComponent(m.first_lesson_slug)}">${esc(m.title)}</a>
              </h3>
              <span style="display:inline-flex;gap:.5rem;flex-wrap:wrap;align-items:center">
                <span class="badge-pill">${m.total_lessons} lessons</span>
                ${done ? `<span class="badge-pill done">${icon('check')} Complete</span>` : ''}
              </span>
            </div>
          </div>
          ${done ? `<span class="check-badge" title="Module complete">${icon('check')}</span>` : ''}
        </div>
        <p>${esc(m.description)}</p>
        ${
          authed
            ? `<div>
                <div class="meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(m.title)} progress">
                  <span style="width:${pct}%"></span>
                </div>
                <div class="meter-label"><span>${m.completed_lessons} of ${m.total_lessons} lessons</span><span>${pct}%</span></div>
              </div>`
            : `<div class="meter-label"><span>${m.total_lessons} self-paced lessons</span></div>`
        }
        <a class="card-link btn btn-outline-primary btn-sm mt-1" href="lesson.html?slug=${encodeURIComponent(m.first_lesson_slug)}">
          ${done ? 'Review module' : 'Start module'} ${icon('arrowRight')}
        </a>
      </article>`;
  }

  async function render() {
    const grid = document.getElementById('module-grid');
    let modules;
    try {
      const data = await window.NetForgeApi.apiGet('/modules');
      modules = data.modules;
    } catch (err) {
      grid.innerHTML = `<div class="empty-state">Could not load modules. Is the server running?</div>`;
      return;
    }

    const user = window.NetForgeAuth && window.NetForgeAuth.user;
    const callout = document.getElementById('guest-callout');
    if (callout) {
      callout.hidden = !!user;
      document.getElementById('guest-callout-icon') && (document.getElementById('guest-callout-icon').innerHTML = icon('info'));
    }

    grid.innerHTML = modules.map((m, i) => cardHTML(m, i, !!user)).join('');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();