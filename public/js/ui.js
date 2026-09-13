'use strict';

/* Shared page shell: header/nav, theme toggle, auth modal, toasts, helpers. */

(function () {
  const { icon } = window.NetForgeIcons;

  const NAV_LINKS = [
    { href: 'index.html', label: 'Home' },
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'modules.html', label: 'Modules' },
    { href: 'glossary.html', label: 'Glossary' },
  ];

  function esc(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currentPage() {
    return document.body.getAttribute('data-page') || '';
  }

  function renderAuthNav(container, user) {
    if (!user) {
      container.innerHTML = `<button type="button" class="btn btn-cta-green btn-sm" data-open-auth aria-haspopup="dialog">${icon('user')} Sign in / Create account</button>`;
      container.querySelector('[data-open-auth]').addEventListener('click', openAuthModal);
      return;
    }
    container.innerHTML = `
      <span class="btn btn-cta-green btn-sm signed-in-pill" aria-hidden="true">${icon('check')} Signed in</span>
      <a class="user-chip" href="profile.html" aria-label="View your profile">${icon('user')} <span>${esc(user.display_name || user.username)}</span></a>
      <button type="button" class="btn btn-ghost btn-sm" data-signout>${icon('logout')} Sign out</button>`;
    container.querySelector('[data-signout]').addEventListener('click', async () => {
      try { await window.NetForgeApi.apiPost('/auth/logout'); } catch (err) {}
      window.location.href = '/index.html';
    });
  }

  function buildShell() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="container header-inner">
        <a class="brand" href="index.html" aria-label="NetForge home page">
          ${icon('logo', 'brand-logo')} <span class="brand-name">Net<span class="brand-accent">Forge</span></span>
        </a>
        <button type="button" class="icon-btn nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">
          ${icon('menu')}
        </button>
        <nav class="site-nav" id="site-nav" aria-label="Primary">
          ${NAV_LINKS.map((l) => `<a href="${l.href}"${l.href.slice(0, -5) === currentPage() ? ' class="active" aria-current="page"' : ''}>${l.label}</a>`).join('')}
          <a href="admin.html" class="admin-link"${window.NetForgeAuth && window.NetForgeAuth.user && window.NetForgeAuth.user.is_admin ? '' : ' hidden'}>Admin</a>
          <div class="nav-auth" id="nav-auth"></div>
        </nav>
        <button type="button" class="icon-btn" id="theme-toggle" aria-label="Toggle theme">${icon(isDark ? 'sun' : 'moon')}</button>
      </div>`;

    const skip = document.querySelector('.skip-link');
    if (skip) { skip.after(header); } else { document.body.prepend(header); }

    const nav = header.querySelector('#site-nav');
    const toggle = header.querySelector('#nav-toggle');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.innerHTML = icon(open ? 'close' : 'menu');
    });

    header.querySelector('#theme-toggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('nf-theme', next); } catch (err) {}
      header.querySelector('#theme-toggle').innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
    });
  }

  function toast(message, type = 'info') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.setAttribute('role', 'status');
    t.innerHTML = `${icon(type === 'success' ? 'checkCircle' : type === 'error' ? 'alert' : 'info')} <span>${esc(message)}</span>`;
    wrap.appendChild(t);
    setTimeout(() => {
      t.classList.add('toast-out');
      setTimeout(() => t.remove(), 300);
    }, 3600);
  }

  function badgeToast(badges) {
    (badges || []).forEach((b) => toast(`Badge earned: ${b.title}`, 'success'));
  }

  // ---------------------------------------------------------------------
  // Auth modal
  // ---------------------------------------------------------------------
  let modalEl = null;

  function buildModal() {
    modalEl = document.createElement('div');
    modalEl.className = 'modal-backdrop';
    modalEl.hidden = true;
    modalEl.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" class="icon-btn modal-close" data-close-auth aria-label="Close">${icon('close')}</button>
        <h2 id="auth-title" class="modal-title">Sign in to NetForge</h2>
        <div class="tabbar" role="tablist" aria-label="Authentication mode">
          <button type="button" role="tab" class="tab-btn active" data-tab="login" aria-selected="true">Sign in</button>
          <button type="button" role="tab" class="tab-btn" data-tab="register" aria-selected="false">Create account</button>
        </div>
        <div data-tabpanel="login">
          <form class="stack" id="login-form" novalidate>
            <label class="field">
              <span class="field-label">Username or email</span>
              <input name="identifier" type="text" autocomplete="username" required />
            </label>
            <label class="field">
              <span class="field-label">Password</span>
              <input name="password" type="password" autocomplete="current-password" required />
            </label>
            <p class="form-error" hidden></p>
            <button type="submit" class="btn btn-cta-green btn-block">Sign in</button>
          </form>
        </div>
        <div data-tabpanel="register" hidden>
          <form class="stack" id="register-form" novalidate>
            <label class="field">
              <span class="field-label">Username</span>
              <input name="username" type="text" autocomplete="username" required minlength="3" maxlength="20" />
            </label>
            <label class="field">
              <span class="field-label">Email</span>
              <input name="email" type="email" autocomplete="email" required />
            </label>
            <label class="field">
              <span class="field-label">Display name <span class="muted-inline">(optional)</span></span>
              <input name="display_name" type="text" maxlength="40" />
            </label>
            <label class="field">
              <span class="field-label">Password <span class="muted-inline">(8+ characters)</span></span>
              <input name="password" type="password" autocomplete="new-password" required minlength="8" />
            </label>
            <p class="form-error" hidden></p>
            <button type="submit" class="btn btn-cta-green btn-block">Create account &amp; sign in</button>
          </form>
        </div>
      </div>`;

    modalEl.querySelector('[data-close-auth]').addEventListener('click', closeAuthModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeAuthModal();
    });

    modalEl.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => setAuthTab(btn.getAttribute('data-tab')));
    });

    modalEl.querySelector('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = modalEl.querySelector('#login-form');
      const errorEl = f.querySelector('.form-error');
      errorEl.hidden = true;
      try {
        await window.NetForgeApi.apiPost('/auth/login', {
          identifier: f.identifier.value.trim(),
          password: f.password.value,
        });
        window.location.reload();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      }
    });

    modalEl.querySelector('#register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = modalEl.querySelector('#register-form');
      const errorEl = f.querySelector('.form-error');
      errorEl.hidden = true;
      try {
        await window.NetForgeApi.apiPost('/auth/register', {
          username: f.username.value.trim(),
          email: f.email.value.trim(),
          display_name: f.display_name.value.trim(),
          password: f.password.value,
        });
        window.location.reload();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      }
    });

    document.body.appendChild(modalEl);
  }

  function setAuthTab(tab) {
    modalEl.querySelectorAll('.tab-btn').forEach((b) => {
      const on = b.getAttribute('data-tab') === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    modalEl.querySelector('[data-tabpanel="login"]').hidden = tab !== 'login';
    modalEl.querySelector('[data-tabpanel="register"]').hidden = tab !== 'register';
  }

  function openAuthModal() {
    if (!modalEl) buildModal();
    modalEl.hidden = false;
    modalEl.querySelector('input').focus();
    document.addEventListener('keydown', escClose);
  }

  function closeAuthModal() {
    if (modalEl) modalEl.hidden = true;
    document.removeEventListener('keydown', escClose);
  }

  function escClose(e) {
    if (e.key === 'Escape') closeAuthModal();
  }

  /* Close toast region / auth flows */
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-auth]');
    if (opener) openAuthModal();
  });

  // ---------------------------------------------------------------------
  // Auth state
  // ---------------------------------------------------------------------
  async function loadMe() {
    try {
      const user = await window.NetForgeApi.apiGet('/auth/me');
      window.NetForgeAuth = { user, loaded: true };
    } catch (err) {
      window.NetForgeAuth = { user: null, loaded: true };
    }
    const container = document.querySelector('#nav-auth');
    if (container) renderAuthNav(container, window.NetForgeAuth.user);
    const adminLink = document.querySelector('.admin-link');
    if (adminLink && window.NetForgeAuth.user && window.NetForgeAuth.user.is_admin) adminLink.hidden = false;
    document.dispatchEvent(new CustomEvent('nf:authchange'));
  }

  function requireAuthPage() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.NetForgeAuth && window.NetForgeAuth.loaded) {
          resolve(Boolean(window.NetForgeAuth.user));
        }
      };
      if (window.NetForgeAuth && window.NetForgeAuth.loaded) return check();
      document.addEventListener('nf:authchange', check, { once: false });
      check();
    });
  }

  function fmtDate(s) {
    if (!s) return '';
    const d = new Date((s || '').replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtDateTime(s) {
    if (!s) return '';
    const d = new Date((s || '').replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function relativeTime(s) {
    if (!s) return '';
    const d = new Date((s || '').replace(' ', 'T') + 'Z');
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return fmtDate(s);
  }

  window.NetForgeUI = {
    esc,
    toast,
    badgeToast,
    openAuthModal,
    closeAuthModal,
    requireAuthPage,
    fmtDate,
    fmtDateTime,
    relativeTime,
  };

  function init() {
    const theme = (() => {
      try { return localStorage.getItem('nf-theme'); } catch (err) { return null; }
    })() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    buildShell();
    loadMe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();