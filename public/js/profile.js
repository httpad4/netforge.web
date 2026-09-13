'use strict';

(function () {
  const { icon } = window.NetForgeIcons;

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'Z');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function initials(name) {
    return String(name || '?').trim().slice(0, 2).toUpperCase();
  }

  async function load() {
    const loading = document.getElementById('profile-loading');
    const box = document.getElementById('profile-content');

    let me;
    try {
      me = await window.NetForgeApi.apiGet('/auth/me');
    } catch (err) {
      loading.textContent = 'You need to sign in to view your profile.';
      loading.innerHTML = `You need to sign in to view your profile. <a class="btn btn-primary btn-sm mt-1" href="index.html" data-open-auth>Sign in</a>`;
      document.querySelector('[data-open-auth]')?.addEventListener('click', () => window.NetForgeUI.openAuthModal());
      return;
    }

    let progress = null;
    try {
      progress = await window.NetForgeApi.apiGet('/progress');
    } catch (err) { /* stats are optional */ }

    const name = me.display_name || me.username;
    const pct = progress ? progress.overall.percent : 0;
    const streak = progress ? progress.streak.current : 0;
    const badgeCount = progress ? progress.badges.length : 0;

    loading.remove();
    box.innerHTML = `
      <section class="card card-pad" style="padding:1.25rem 1rem">
        <div class="flex" style="gap:.9rem">
          <span class="avatar" aria-hidden="true">${initials(name)}</span>
          <div>
            <h1 class="mb-0" style="font-size:1.4rem">${name}</h1>
            <p class="muted mb-0">@${esc(me.username)} ${me.is_admin ? '<span class="badge-pill done">' + icon('shield') + ' Admin</span>' : ''}</p>
          </div>
        </div>
        <dl class="profile-meta">
          <div><dt>Email</dt><dd>${esc(me.email)}</dd></div>
          <div><dt>Member since</dt><dd>${fmtDate(me.created_at)}</dd></div>
        </dl>
      </section>

      <section class="grid grid-cards-3 mt-2" aria-label="Profile summary">
        <div class="card stat-card"><span class="stat-num">${pct}%</span><span class="muted">Course progress</span></div>
        <div class="card stat-card"><span class="stat-num">${streak}</span><span class="muted">Day streak</span></div>
        <div class="card stat-card"><span class="stat-num">${badgeCount}</span><span class="muted">Badges earned</span></div>
      </section>

      <div class="flex mt-2" style="gap:.5rem;flex-wrap:wrap">
        <a class="btn btn-cta-green btn-sm" href="dashboard.html">${icon('activity')} Dashboard</a>
        <a class="btn btn-ghost btn-sm" href="certificate.html">${icon('award')} Certificate</a>
        <button type="button" class="btn btn-ghost btn-sm" data-signout>${icon('logout')} Sign out</button>
      </div>`;

    box.querySelector('[data-signout]').addEventListener('click', async () => {
      try { await window.NetForgeApi.apiPost('/auth/logout'); } catch (err) {}
      window.location.href = '/index.html';
    });
  }

  function esc(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();