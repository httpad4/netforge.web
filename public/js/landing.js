'use strict';

(function () {
  const { icon } = window.NetForgeIcons;
  const { esc } = window.NetForgeUI;

  const MODULE_ICONS = ['layers', 'activity', 'cpu', 'link', 'globe', 'wifi', 'shield', 'terminal'];

  function paintStaticIcons() {
    document.querySelectorAll('[data-icon]').forEach((el) => {
      el.innerHTML = icon(el.getAttribute('data-icon'), 'icon-lg');
    });
    const arrow = document.getElementById('modules-arrow');
    if (arrow) arrow.innerHTML = icon('arrowRight');
    document.querySelectorAll('.feature-arrow').forEach((el) => {
      el.innerHTML = icon('arrowRight');
    });
  }

  async function loadCurriculum() {
    const list = document.getElementById('curriculum-list');
    let modules;
    try {
      const data = await window.NetForgeApi.apiGet('/modules');
      modules = data.modules;
    } catch (err) {
      list.innerHTML = `<p class="empty-state">Could not load the curriculum. Is the server running?</p>`;
      return;
    }

list.innerHTML = modules.slice(0, 8).map((m, i) => `
      <article class="card module-card">
        <div class="card-head">
          <span class="card-icon"><span>${icon(MODULE_ICONS[i % MODULE_ICONS.length])}</span></span>
          <h3><a href="lesson.html?slug=${encodeURIComponent(m.first_lesson_slug)}">${esc(m.title)}</a></h3>
          <span class="muted card-lessons">${m.total_lessons} lessons</span>
        </div>
        <p>${esc(m.description)}</p>
        <div class="mc-actions">
          <span class="badge-pill">${icon('chevronRight')} Start</span>
        </div>
      </article>`).join('');
  }

  function initFooter() {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    document.querySelectorAll('.footer-col-title').forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = btn.closest('.footer-col');
        const open = !col.classList.contains('open');
        col.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
      backToTop.addEventListener('click', () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      });
    }
  }

  function updateHeroAuth() {
    const btn = document.getElementById('hero-signup');
    const auth = window.NetForgeAuth;
    if (!btn || !auth || !auth.loaded) return;

    if (auth.user) {
      btn.innerHTML = `${icon('check')} Signed up`;
      btn.classList.add('signed-in-pill');
      btn.setAttribute('aria-disabled', 'true');
      btn.removeAttribute('data-open-auth');
      btn.removeAttribute('data-tab-reg');
    } else {
      btn.innerHTML = `Sign up — it&rsquo;s free`;
      btn.classList.remove('signed-in-pill');
      btn.removeAttribute('aria-disabled');
      btn.setAttribute('data-open-auth', '');
      btn.setAttribute('data-tab-reg', 'register');
    }
  }

  function init() {
    paintStaticIcons();
    loadCurriculum();
    initFooter();

    // "Sign up — it's free" shows a checkmark once the user has an account;
    // while signed out the shared [data-open-auth] handler opens the
    // registration tab of the auth modal.
    document.addEventListener('nf:authchange', updateHeroAuth);
    updateHeroAuth();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();