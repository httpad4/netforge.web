'use strict';

(function () {
  const { icon } = window.NetForgeIcons;
  const { esc } = window.NetForgeUI;
  const $ = (sel) => document.querySelector(sel);

  function setIcon(el, name) { if (el && window.NetForgeIcons.ICONS[name]) el.innerHTML = icon(name, 'icon-lg'); }

  async function init() {
    const me = await new Promise((resolve) => {
      const check = () => resolve(window.NetForgeAuth && window.NetForgeAuth.user);
      if (window.NetForgeAuth && window.NetForgeAuth.loaded) check();
      else document.addEventListener('nf:authchange', check, { once: true });
    });

    $('#gs-icon') && $('#gs-icon').classList.remove('icon');
    if (!$('#gs-icon')) { /* noop */ }
    const guest = $('#guest-state');
    const loading = $('#dash-loading');
    if (!me) {
      guest.hidden = false;
      guest.querySelector('[data-open-auth]');
      const gs = $('#gs-icon');
      if (gs) gs.innerHTML = icon('info');
      loading.innerText = '';
      ['#overall', '#continue-card'].forEach((s) => $(s).hidden = true);
      $('#badges-grid').innerHTML = `<p class="muted">Badges show here once you create an account.</p>`;
      $('#module-progress-list').innerHTML = ``;
      return;
    }

    let data;
    try {
      data = await window.NetForgeApi.apiGet('/progress');
    } catch (err) {
      loading.innerHTML = `<div class="callout callout-danger mt-2"><span>${icon('alert')}</span><div>Could not load progress: ${esc(err.message)}</div></div>`;
      return;
    }
    loading.hidden = true;
    $('#overall').hidden = false;

    const o = data.overall;
    $('#percent').textContent = `${o.percent}%`;
    $('#percent-fill').style.width = `${o.percent}%`;
    $('#lessons-done').textContent = `${o.completedLessons} of ${o.totalLessons} lessons`;
    $('#percent-txt').textContent = `${o.percent}%`;

    const completedModules = data.modules.filter((m) => m.isComplete).length;
    $('#s1v').textContent = o.completedLessons;
    $('#s1i').innerHTML = icon('book');
    $('#s2v').textContent = `${completedModules}/${data.modules.length}`;
    $('#s2i').innerHTML = icon('layers');
    $('#s3v').textContent = String(data.streak.current || 0);
    $('#s3i').innerHTML = icon('flame');
    $('#s4v').textContent = String(data.badges.length);
    $('#s4i').innerHTML = icon('trophy');

    // Continue card
    const cont = $('#continue-card');
    cont.hidden = false;
    if (o.isComplete) {
      $('#continue-body').innerHTML = `
        <div class="callout callout-success mb-0"><span>${icon('trophy')}</span>
          <div><strong>Course complete.</strong> You finished every lesson.
          <a class="btn btn-primary btn-sm mt-1" href="certificate.html">View your certificate ${icon('arrowRight')}</a></div>
        </div>`;
    } else if (data.continueLesson) {
      const c = data.continueLesson;
      $('#continue-body').innerHTML = `
        <p class="muted mb-1">${esc(c.module_title)}</p>
        <h3 class="mb-1" style="margin:0">${esc(c.title)}</h3>
        <a class="btn btn-cta-green mt-1" href="lesson.html?slug=${encodeURIComponent(c.lesson_slug)}">Resume lesson ${icon('arrowRight')}</a>`;
    } else {
      $('#continue-body').innerHTML = `<p class="muted mb-0">No lessons started yet. <a href="modules.html">Pick your first module</a>.</p>`;
    }

    // Badges
    const bcat = await window.NetForgeApi.apiGet('/badges');
    $('#badges-grid').innerHTML = bcat.badges.map((b) => {
      const earned = data.badges.some((eb) => eb.code === b.code);
      const earnedAt = data.badges.find((eb) => eb.code === b.code);
      return `
        <div class="badge-card ${earned ? 'earned' : 'locked'}">
          <span class="badge-tile">${icon(b.icon)}</span>
          <div class="b-title">${esc(b.title)}</div>
          <p class="b-desc">${esc(b.description)}</p>
          <span class="hint">${earned ? `Earned ${window.NetForgeUI.fmtDate(earnedAt.earned_at)}` : 'Locked'}</span>
        </div>`;
    }).join('');

    // Module progress cards
    $('#module-progress-list').innerHTML = data.modules.map((m) => {
      const pct = m.totalLessons ? Math.round((m.completedLessons / m.totalLessons) * 100) : 0;
      return `
        <div class="card module-card">
          <h3 style="margin:0"><a href="lesson.html?slug=${encodeURIComponent(m.firstLessonSlug || m.slug)}">${esc(m.title)}</a></h3>
          ${m.isComplete ? `<span class="badge-pill done">${icon('check')} Complete</span>` : ''}
          <div class="meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(m.title)} progress"><span style="width:${pct}%"></span></div>
          <div class="meter-label"><span>${m.completedLessons} of ${m.totalLessons}</span><span>${pct}%</span></div>
        </div>`;
    }).join('');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();