'use strict';

(function () {
  const { icon } = window.NetForgeIcons;
  const { esc } = window.NetForgeUI;

  async function init() {
    const host = document.getElementById('cert-state');
    const me = await new Promise((resolve) => {
      const check = () => resolve(window.NetForgeAuth && window.NetForgeAuth.user);
      if (window.NetForgeAuth && window.NetForgeAuth.loaded) check();
      else document.addEventListener('nf:authchange', check, { once: true });
    });

    if (!me) {
      host.innerHTML = `
        <div class="callout callout-info">
          <span>${icon('info')}</span>
          <div>Sign in, complete every module, and this page becomes your printable certificate.
          <button type="button" class="btn btn-ghost btn-sm" data-open-auth>Sign in</button></div>
        </div>`;
      return;
    }

    let progress;
    try {
      progress = await window.NetForgeApi.apiGet('/progress');
    } catch (err) {
      host.innerHTML = `<div class="callout callout-danger"><span>${icon('alert')}</span><div>${esc(err.message)}</div></div>`;
      return;
    }

    const o = progress.overall;
    if (!o.isComplete) {
      host.innerHTML = `
        <div class="callout callout-warn">
          <span>${icon('alert')}</span>
          <div>Your certificate unlocks after you complete all ${o.totalLessons} lessons.
          You are at <strong>${o.completedLessons}/${o.totalLessons} (${o.percent}%)</strong>.
          <div class="meter mt-1" style="max-width:420px"><span style="width:${o.percent}%"></span></div>
          <a class="btn btn-primary btn-sm mt-2" href="modules.html">Keep learning ${icon('arrowRight')}</a></div>
        </div>`;
      return;
    }

    const now = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    host.innerHTML = `
      <div class="no-print flex mt-3" style="justify-content:center;gap:.6rem">
        <button type="button" class="btn btn-primary" onclick="window.print()">${icon('printer')} Print / save as PDF</button>
        <a class="btn btn-ghost" href="dashboard.html">Back to dashboard</a>
      </div>
      <div class="certificate">
        ${icon('logo', 'cert-logo')}
        <h1>Certificate of Completion</h1>
        <p class="muted">This certifies that</p>
        <div class="cert-name">${esc(me.display_name || me.username)}</div>
        <p class="muted">has successfully completed the full NetForge course —</p>
        <p><strong>Computer Networking for Students &amp; Hobbyists</strong></p>
        <p class="muted">covering eight modules: networking basics, the OSI &amp; TCP/IP models, IP addressing, subnetting, routing &amp; switching, DNS &amp; DHCP, network devices, wireless, security, and troubleshooting.</p>
        <div class="cert-date">${now}</div>
        <div style="margin-top:1.4rem" class="muted">— NetForge Curriculum Team</div>
      </div>`;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();