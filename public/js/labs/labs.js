'use strict';

/* Interactive lab widgets. Each is a self-contained function that renders
 * into a container and exposes completion state. Keyboard-accessible and
 * touch-friendly; drag-and-drop always has a classic fallback. */

(function () {
  const { icon } = window.NetForgeIcons;
  const { esc } = window.NetForgeUI;

  const widgets = {};
  const registry = {
    register(name, fn) { widgets[name] = fn; },
    mount(container, ctx) {
      const name = container.getAttribute('data-lab');
      const fn = widgets[name];
      if (!fn) { container.innerHTML = '<p class="muted">Unknown lab widget.</p>'; return; }
      fn(container, ctx);
    },
  };

  /* Shared wiring for "mark this lab complete" */
  function labDoneButton(container, ctx, isReady) {
    const wrap = document.createElement('div');
    wrap.className = 'flex mt-2';
    wrap.innerHTML = `
      <button type="button" class="btn btn-primary" disabled aria-describedby="${container.id}-lab-hint">
        ${icon('check')} Mark lab complete
      </button>
      <span class="hint" id="${container.id}-lab-hint"></span>`;
    const btn = wrap.querySelector('button');
    const hint = wrap.querySelector('.hint');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const r = await window.NetForgeApi.apiPost(`/lessons/${ctx.lessonId}/complete`, {});
        window.NetForgeUI.badgeToast(r.newBadges);
        window.NetForgeUI.toast('Lab marked complete', 'success');
        window.dispatchEvent(new CustomEvent('nf:complete', { detail: { lessonId: ctx.lessonId } }));
        btn.textContent = 'Completed';
        btn.innerHTML = `${icon('checkCircle')} Completed`;
      } catch (err) {
        window.NetForgeUI.toast(err.message, 'error');
        btn.disabled = true;
      }
    });
    container.appendChild(wrap);
    return { btn, hint, setReady(ready, text) { btn.disabled = !ready; hint.textContent = text || ''; if (ready) btn.focus && btn.focus(); } };
  }

  /* ------------------------------------------------------------------ *
   * Subnet calculator
   * ------------------------------------------------------------------ */
  function ipToInt(ip) {
    const parts = String(ip).trim().split('.');
    if (parts.length !== 4) return null;
    let v = 0;
    for (const p of parts) {
      if (!/^\d{1,3}$/.test(p)) return null;
      const n = Number(p);
      if (n < 0 || n > 255) return null;
      v = (v << 8) + n;
    }
    return v >>> 0;
  }
  function intToIp(v) {
    v = v >>> 0;
    return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.');
  }
  function maskFromPrefix(p) {
    return p === 0 ? 0 : (((~0) << (32 - p)) >>> 0);
  }
  function cidrInfo(ip, prefix) {
    const ipInt = ipToInt(ip);
    if (ipInt === null) return null;
    const mask = maskFromPrefix(prefix);
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask)) >>> 0;
    const hostBits = 32 - prefix;
    const usable = hostBits >= 2 ? Math.pow(2, hostBits) - 2 : 0;
    return {
      network: intToIp(network),
      broadcast: intToIp(broadcast),
      mask: intToIp(mask),
      usable,
      range: usable > 0 ? `${intToIp((network + 1) >>> 0)} – ${intToIp((broadcast - 1) >>> 0)}` : 'n/a',
    };
  }

  function subnetWidget(el, ctx) {
    el.innerHTML = `
      <div class="lab-body">
        <div class="flex-between">
          <h3 class="mb-0">Calculator</h3>
          <label class="flex" style="gap:.4rem">
            <span class="hint">IP</span>
            <input id="${el.id}-ip" type="text" inputmode="numeric" aria-label="IP address" value="192.168.1.42" style="width:160px" />
            <span class="hint">/</span>
            <select id="${el.id}-prefix" aria-label="CIDR prefix">${Array.from({ length: 23 }, (_, i) => i + 8).map((p) => `<option value="${p}" ${p === 24 ? 'selected' : ''}>${p}</option>`).join('')}</select>
          </label>
        </div>
        <div class="result-grid mt-2" id="${el.id}-results" aria-live="polite"></div>

        <h3 class="mt-3">Challenge — answer 5 in a row</h3>
        <p class="hint">Solve ${el.id.startsWith('x') ? '' : ''}five generated subnetting problems correctly in a row to complete the lab.</p>
        <div class="card-pad-sm" style="background:var(--surface-2);border-radius:10px">
          <p id="${el.id}-problem" style="font-weight:700;margin:.2rem 0 .6rem"></p>
          <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:.5rem" id="${el.id}-challenge-inputs"></div>
          <div class="flex mt-1">
            <button type="button" class="btn btn-primary btn-sm" id="${el.id}-check">Check answer</button>
            <button type="button" class="btn btn-ghost btn-sm" id="${el.id}-new">New problem</button>
            <span class="hint" id="${el.id}-streak" aria-live="polite"></span>
          </div>
        </div>
      </div>`;

    const results = el.querySelector(`#${el.id}-results`);
    const ipInput = el.querySelector(`#${el.id}-ip`);
    const prefixSel = el.querySelector(`#${el.id}-prefix`);
    const problemEl = el.querySelector(`#${el.id}-problem`);
    const inputsEl = el.querySelector(`#${el.id}-challenge-inputs`);
    const streakEl = el.querySelector(`#${el.id}-streak`);
    let count = 0;

    function renderResults() {
      const info = cidrInfo(ipInput.value, Number(prefixSel.value));
      if (!info) {
        results.innerHTML = `<p class="hint">Enter a valid IPv4 address.</p>`;
        return;
      }
      results.innerHTML = `
        <div class="result-box"><div class="rb-label">Network</div><div class="rb-value">${info.network}/${prefixSel.value}</div></div>
        <div class="result-box"><div class="rb-label">Broadcast</div><div class="rb-value">${info.broadcast}</div></div>
        <div class="result-box"><div class="rb-label">Usable range</div><div class="rb-value">${info.range}</div></div>
        <div class="result-box"><div class="rb-label">Hosts</div><div class="rb-value">${info.usable}</div></div>`;
    }
    ipInput.addEventListener('input', renderResults);
    prefixSel.addEventListener('change', renderResults);
    renderResults();

    let problem = null;
    function newProblem() {
      const prefix = 16 + Math.floor(Math.random() * 13);
      const hostBits = 32 - prefix;
      let net = 0;
      for (let b = 0; b < prefix; b += 1) net = (net << 1) | (Math.random() < 0.5 ? 1 : 0);
      net = (net << hostBits) >>> 0;
      const hostCount = Math.pow(2, hostBits) - 2;
      const host = 1 + Math.floor(Math.random() * hostCount);
      const ip = intToIp((net + host) >>> 0);
      problem = { ip, prefix, network: intToIp(net), broadcast: intToIp((net | ~maskFromPrefix(prefix)) >>> 0), usable: hostCount };
      problemEl.textContent = `Host ${ip} is on a /${prefix} network. What are its network address, broadcast address, and number of usable hosts?`;
      inputsEl.innerHTML = `
        <label><span class="hint">Network address</span><input id="${el.id}-a-net" inputmode="numeric" aria-label="Network address" /></label>
        <label><span class="hint">Broadcast address</span><input id="${el.id}-a-bcast" inputmode="numeric" aria-label="Broadcast address" /></label>
        <label><span class="hint">Usable hosts</span><input id="${el.id}-a-hosts" inputmode="numeric" aria-label="Usable hosts" /></label>`;
      inputsEl.querySelector('input').focus();
    }

    el.querySelector(`#${el.id}-check`).addEventListener('click', () => {
      if (!problem) return;
      const given = {
        net: el.querySelector(`#${el.id}-a-net`).value.trim(),
        bcast: el.querySelector(`#${el.id}-a-bcast`).value.trim(),
        hosts: Number(el.querySelector(`#${el.id}-a-hosts`).value.trim()),
      };
      const okNet = given.net === problem.network;
      const okBcast = given.bcast === problem.broadcast;
      const okHosts = given.hosts === problem.usable;
      const ok = okNet && okBcast && okHosts;

      streakEl.textContent = ok ? `Correct ${count + 1}/${5}` : (count === 0 ? 'Wrong — try the next problem.' : `Wrong — streak reset (was ${count}).`);
      window.NetForgeUI.toast(ok ? 'Correct!' : 'Not quite — review the worked example.', ok ? 'success' : 'error');

      const labels = ['Network address', 'Broadcast address', 'Usable hosts'];
      [given.net, given.bcast] .forEach((v, i) => {});
      const checks = [[okNet, problem.network], [okBcast, problem.broadcast]];
      inputsEl.querySelector('input').style.borderColor = okNet ? 'var(--success)' : 'var(--danger)';
      inputsEl.querySelectorAll('input')[1].style.borderColor = okBcast ? 'var(--success)' : 'var(--danger)';
      inputsEl.querySelectorAll('input')[2].style.borderColor = okHosts ? 'var(--success)' : 'var(--danger)';

      if (ok) {
        count += 1;
        if (count >= 5) {
          done.setReady(true, 'Solve five in a row — done!');
          streakEl.textContent = '5 in a row — lab complete.';
          window.NetForgeUI.toast('Subnet challenge complete!', 'success');
        }
      } else {
        count = 0;
      }
      setTimeout(newProblem, ok ? 900 : 2200);
    });

    el.querySelector(`#${el.id}-new`).addEventListener('click', newProblem);

    const done = labDoneButton(el, ctx, false);
    newProblem();
  }

  /* ------------------------------------------------------------------ *
   * OSI layer matcher
   * ------------------------------------------------------------------ */
  const OSI_ITEMS = [
    { name: 'Ethernet cable', layer: 1 },
    { name: 'Switch', layer: 2 },
    { name: 'Router', layer: 3 },
    { name: 'TCP', layer: 4 },
    { name: 'Session cookie', layer: 5 },
    { name: 'TLS encryption', layer: 6 },
    { name: 'HTTP', layer: 7 },
  ];
  const LAYER_NAMES = {
    1: 'Physical', 2: 'Data Link', 3: 'Network', 4: 'Transport', 5: 'Session', 6: 'Presentation', 7: 'Application',
  };

  function osiWidget(el, ctx) {
    let index = 0;
    const id = () => `${el.id}-${index++}-${Math.random().toString(36).slice(2, 6)}`;

    const items = OSI_ITEMS.map((it) => ({ ...it, key: id() }));
    const placed = {}; // key -> layer

    el.innerHTML = `
      <div class="lab-body">
        <div class="osi-layout">
          <div>
            <h3 class="mb-1">Unplaced items</h3>
            <div class="osi-pool" id="${el.id}-pool" aria-label="OSI items to place"></div>
            <p class="hint mt-1">Drag an item into a layer, or use the dropdown next to it. Each slot also has up/down buttons to move items between layers.</p>
          </div>
          <div>
            <h3 class="mb-1">OSI layers</h3>
            <div class="layer-stack" id="${el.id}-stack"></div>
          </div>
        </div>
        <div id="${el.id}-status" aria-live="polite"></div>
      </div>`;

    const poolEl = el.querySelector(`#${el.id}-pool`);
    const stackEl = el.querySelector(`#${el.id}-stack`);
    const statusEl = el.querySelector(`#${el.id}-status`);

    function render() {
      poolEl.innerHTML = items
        .filter((it) => !placed[it.key])
        .map((it) => `
          <div class="osi-item" draggable="true" data-key="${it.key}">
            <span class="osi-name">${esc(it.name)}</span>
            <label class="sr-only" for="${it.key}-sel">Layer for ${esc(it.name)}</label>
            <select id="${it.key}-sel" aria-label="Layer for ${esc(it.name)}">
              ${[1, 2, 3, 4, 5, 6, 7].map((l) => `<option value="${l}">Layer ${l}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-sm btn-ghost" data-place="${it.key}" aria-label="Place ${esc(it.name)}">${icon('chevronDown')}</button>
          </div>`).join('');

      stackEl.innerHTML = [7, 6, 5, 4, 3, 2, 1].map((layer) => `
        <div class="layer-slot" data-layer="${layer}">
          <div class="ls-head"><span class="badge-pill">L${layer}</span> ${LAYER_NAMES[layer]}</div>
          <div class="chips">${
            items.filter((it) => placed[it.key] === layer).map((it) => `
              <span class="layer-chip" data-chip="${it.key}">
                ${esc(it.name)}
                <button type="button" data-down="${it.key}" aria-label="Move ${esc(it.name)} to layer ${Math.min(layer + 1, 7)}">${icon('chevronUp')}</button>
                <button type="button" data-up="${it.key}" aria-label="Move ${esc(it.name)} to layer ${Math.max(layer - 1, 1)}">${icon('chevronDown')}</button>
                <button type="button" data-remove="${it.key}" aria-label="Remove ${esc(it.name)}">${icon('close')}</button>
              </span>`).join('') || '&nbsp;'
          }</div>
        </div>`).join('');

      attachEvents();
    }

    function setPlaced(key, layer, announce) {
      placed[key] = layer;
      check();
      render();
      if (announce) window.NetForgeUI.toast(`Placed at layer ${layer}`, 'info');
    }

    function check() {
      const placedKeys = Object.keys(placed);
      const correct = placedKeys.filter((k) => {
        const it = items.find((i) => i.key === k);
        return it && it.layer === placed[k];
      });
      const wrong = placedKeys.length - correct.length;
      const allPlaced = placedKeys.length === items.length;
      let html;
      if (!allPlaced) html = `<p class="hint mt-2">Placed ${placedKeys.length}/${items.length} items.</p>`;
      else if (wrong === 0) html = `<div class="callout callout-success mt-2"><span>${icon('checkCircle')}</span><div>Stack complete — all seven items are in the correct layer.</div></div>`;
      else html = `<div class="callout callout-warn mt-2"><span>${icon('alert')}</span><div>${wrong} item${wrong === 1 ? ' is' : 's are'} in the wrong layer. Move them until everything is correct.</div></div>`;
      statusEl.innerHTML = html;
      done.setReady(allPlaced && wrong === 0, allPlaced && wrong === 0 ? 'All layers correct.' : '');
    }

    function attachEvents() {
      poolEl.querySelectorAll('.osi-item').forEach((item) => {
        const key = item.getAttribute('data-key');
        item.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', key); item.classList.add('dragging'); });
        item.addEventListener('dragend', () => item.classList.remove('dragging'));

        const sel = item.querySelector('select');
        item.querySelector('[data-place]').addEventListener('click', () => setPlaced(key, Number(sel.value), true));
      });

      stackEl.querySelectorAll('.layer-slot').forEach((slot) => {
        const layer = Number(slot.getAttribute('data-layer'));
        slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('over'); });
        slot.addEventListener('dragleave', () => slot.classList.remove('over'));
        slot.addEventListener('drop', (e) => {
          e.preventDefault();
          slot.classList.remove('over');
          const key = e.dataTransfer.getData('text/plain') || (slot.getAttribute('data-src') || '');
          if (key) setPlaced(key, layer, true);
        });
        slot.querySelectorAll('[data-remove]').forEach((b) => {
          b.addEventListener('click', () => { delete placed[b.getAttribute('data-remove')]; render(); check(); });
        });
        slot.querySelectorAll('[data-down]').forEach((b) => {
          b.addEventListener('click', () => { const k = b.getAttribute('data-down'); placed[k] = Math.min(placed[k] + 1, 7); render(); check(); });
        });
        slot.querySelectorAll('[data-up]').forEach((b) => {
          b.addEventListener('click', () => { const k = b.getAttribute('data-up'); placed[k] = Math.max(placed[k] - 1, 1); render(); check(); });
        });
      });

      poolEl.querySelectorAll('select').forEach((sel) => {
        sel.addEventListener('change', () => {
          const item = sel.closest('.osi-item');
          setPlaced(item.getAttribute('data-key'), Number(sel.value), true);
        });
      });
    }

    const done = labDoneButton(el, ctx, false);
    render();
    check();
  }

  /* ------------------------------------------------------------------ *
   * Simulated troubleshooting terminal
   * ------------------------------------------------------------------ */
  const DIAGNOSTIC_CMDS = ['ping', 'tracert', 'traceroute', 'ipconfig', 'nslookup', 'netstat', 'arp', 'route'];
  const TERMINAL = {};

  function terminalWidget(el, ctx) {
    const buffer = [
      'NetForge simulated terminal — no real network required.',
      'Type "help" to see available commands. Try running the checks in order:',
      'ping, tracert, ipconfig, nslookup, netstat.',
      '',
    ];
    const used = new Set();

    el.innerHTML = `
      <div class="lab-body">
        <div class="terminal">
          <div class="terminal-bar" aria-hidden="true">
            <span class="terminal-dot"></span><span class="terminal-dot"></span><span class="terminal-dot"></span>
            <span style="margin-left:.5rem;font-size:.8rem">netforge — student@learning</span>
          </div>
          <div class="terminal-body" id="${el.id}-out" tabindex="0" role="log" aria-label="Terminal output"></div>
          <form class="terminal-cmd-line" style="padding:0 .8rem .8rem" id="${el.id}-form" autocomplete="off">
            <span class="prompt">student@netforge:~$</span>
            <input id="${el.id}-input" type="text" aria-label="Command" spellcheck="false" />
            <button type="submit" class="btn btn-sm btn-ghost">Run</button>
          </form>
        </div>
        <div class="lab-status" id="${el.id}-status" aria-live="polite"></div>
      </div>`;

    const outEl = el.querySelector(`#${el.id}-out`);
    const inputEl = el.querySelector(`#${el.id}-input`);
    let promptReady = false;

    function appendLine(html) { buffer.push(html); }

    function renderOutput() {
      outEl.innerHTML = buffer.join('\n');
      outEl.scrollTop = outEl.scrollHeight;
    }

    function status() {
      const diagnosticDone = DIAGNOSTIC_CMDS.filter((c) => used.has(c)).length;
      el.querySelector(`#${el.id}-status`).textContent = `Diagnostic commands used: ${used.size}/5 (ping, tracert, ipconfig, nslookup, netstat, arp, route).`;
      if (used.size >= 5) done.setReady(true, 'At least five diagnostic commands — lab ready to complete.');
    }

    function respond(cmdLine) {
      const [cmd, ...rest] = cmdLine.trim().split(/\s+/);
      const arg = rest.join(' ') || null;
      const c = (cmd || '').toLowerCase();

      appendLine(`<span class="out">student@netforge:~$ ${esc(cmdLine.trim())}</span>`);

      if (!cmd) { return; }

      const record = DIAGNOSTIC_CMDS.find((d) => cmd === d) || (cmd === 'traceroute' ? 'tracert' : null);
      if (record && cmd !== 'traceroute') used.add(record);

      if (c === 'help') {
        appendLine('<span class="dim">Available commands: help, ping &lt;host&gt;, tracert &lt;host&gt;, ipconfig, ipconfig /all, nslookup &lt;domain&gt;, netstat, arp -a, route print, whoami, clear</span>');
      } else if (c === 'clear' || c === 'cls') {
        buffer.length = 0;
      } else if (c === 'ping') {
        const host = arg || (Math.random() < 0.5 ? '192.168.1.1' : '8.8.8.8');
        const pingable = host.toLowerCase() !== '10.0.0.99' && host.toLowerCase() !== 'example.invalid';
        if (pingable) {
          const rtt = 4 + Math.floor(Math.random() * 40);
          appendLine(`Pinging ${esc(host)} with 32 bytes of data:`);
          [1, 2, 3, 4].forEach(() => appendLine(`Reply from ${esc(host)}: bytes=32 time=${rtt}ms TTL=117`));
          appendLine(`Ping statistics for ${esc(host)}:`);
          appendLine(`\u00a0\u00a0\u00a0\u00a0Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),`);
          appendLine(`Approximate round trip times in milli-seconds:`);
          appendLine(`\u00a0\u00a0\u00a0\u00a0Minimum = ${rtt - 2}ms, Maximum = ${rtt + 3}ms, Average = ${rtt}ms`);
        } else {
          appendLine(`Pinging ${esc(host)} with 32 bytes of data:`);
          appendLine('Request timed out.'); appendLine('Request timed out.');
          appendLine(`Ping statistics for ${esc(host)}:`);
          appendLine('\u00a0\u00a0\u00a0\u00a0Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)');
        }
      } else if (c === 'tracert' || c === 'traceroute') {
        const host = arg || 'www.example.com';
        if (host.toLowerCase() === '10.0.0.99' || host.toLowerCase() === 'example.invalid') {
          appendLine(`Tracing route to ${esc(host)} [${esc(host)}]`);
          appendLine('  1     4 ms     2 ms     3 ms  192.168.1.1');
          appendLine('  2  *        *        *     Request timed out.');
          appendLine('  3  *        *        *     Request timed out.');
          appendLine('Trace complete.');
          return;
        }
        appendLine(`Tracing route to ${esc(host)} [${(Math.random() * 200 + 1).toFixed(0)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}]`);
        appendLine('over a maximum of 30 hops:');
        const hops = [['192.168.1.1', 'home.gateway'], ['10.2.0.1', 'isp-edge-1'], ['172.16.4.2', 'core-nyc-1'], ['203.0.113.1', 'edge-sjc-1'], [host, host]];
        hops.slice(0, 3 + Math.floor(Math.random() * 2)).forEach(([ip, name], i) => {
          appendLine(`\u00a0${i + 1}\u00a0\u00a0\u00a0\u00a0${5 + Math.floor(Math.random() * 18)} ms\u00a0\u00a0\u00a0\u00a0${4 + Math.floor(Math.random() * 12)} ms\u00a0\u00a0\u00a0\u00a0${6 + Math.floor(Math.random() * 20)} ms\u00a0\u00a0${esc(name)} [${esc(ip)}]`);
        });
        appendLine('Trace complete.');
      } else if (c === 'ipconfig') {
        if (arg && arg.toLowerCase() === '/all') {
          appendLine('Windows IP Configuration');
          appendLine('');
          appendLine('\u00a0\u00a0\u00a0\u00a0Host Name . . . . . . . . . . . . : workstation-42');
          appendLine('\u00a0\u00a0\u00a0\u00a0Primary Dns Suffix . . . . . . . : corp.example.local');
          appendLine('\u00a0\u00a0\u00a0\u00a0Ethernet adapter Ethernet0:');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Physical Address . . . . . . . . . : 00-1A-2B-3C-4D-5E');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0DHCP Enabled. . . . . . . . . . . : Yes');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0IPv4 Address. . . . . . . . . . . : 192.168.1.42(Preferred)');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Subnet Mask . . . . . . . . . . . : 255.255.255.0');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Default Gateway . . . . . . . . . : 192.168.1.1');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0DNS Servers . . . . . . . . . . . : 8.8.8.8');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 : 1.1.1.1');
        } else {
          appendLine('Windows IP Configuration');
          appendLine('');
          appendLine('\u00a0\u00a0\u00a0\u00a0Wireless LAN adapter Wi-Fi:');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0IPv4 Address. . . . . . . . . . . : 192.168.1.42');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Subnet Mask . . . . . . . . . . . : 255.255.255.0');
          appendLine('\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Default Gateway . . . . . . . . . : 192.168.1.1');
        }
      } else if (c === 'nslookup') {
        const domain = arg || 'www.example.com';
        appendLine(`Server:  172.16.0.53`);
        appendLine(`Address: 172.16.0.53#53`);
        appendLine('');
        appendLine(`Non-authoritative answer:`);
        appendLine(`Name:\u00a0\u00a0\u00a0\u00a0${esc(domain)}`);
        appendLine(`Address:\u00a0\u00a0\u00a0\u00a0${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`);
      } else if (c === 'netstat') {
        appendLine('Active Connections');
        appendLine('');
        appendLine('\u00a0\u00a0Proto\u00a0\u00a0Local Address\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Foreign Address\u00a0\u00a0\u00a0\u00a0\u00a0State');
        appendLine('\u00a0\u00a0\u00a0TCP\u00a0\u00a0\u00a0\u00a0192.168.1.42:49152\u00a0\u00a0113.94.10.80:443\u00a0\u00a0\u00a0\u00a0\u00a0ESTABLISHED');
        appendLine('\u00a0\u00a0\u00a0TCP\u00a0\u00a0\u00a0\u00a0192.168.1.42:49153\u00a0\u00a0172.16.4.9:53\u00a0\u00a0\u00a0\u00a0\u00a0ESTABLISHED');
        appendLine('\u00a0\u00a0\u00a0UDP\u00a0\u00a0\u00a0\u00a0192.168.1.42:49155\u00a0\u00a0*:*\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0');
      } else if (c === 'arp') {
        appendLine('Interface: 192.168.1.42 --- 0x7');
        appendLine('  Internet Address\u00a0\u00a0\u00a0\u00a0Physical Address\u00a0\u00a0\u00a0\u00a0Type');
        appendLine('  192.168.1.1\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 00-11-22-33-44-55\u00a0\u00a0\u00a0\u00a0dynamic');
        appendLine('  192.168.1.15\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 44-55-66-77-88-99\u00a0\u00a0\u00a0\u00a0dynamic');
        appendLine('  192.168.1.16\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 aa-bb-cc-dd-ee-ff\u00a0\u00a0\u00a0\u00a0dynamic');
      } else if (c === 'route') {
        appendLine('IPv4 Route Table');
        appendLine('Network Destination\u00a0\u00a0\u00a0Netmask\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Gateway\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Interface');
        appendLine(' 0.0.0.0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 0.0.0.0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 192.168.1.1\u00a0\u00a0\u00a0\u00a0 192.168.1.42');
        appendLine(' 127.0.0.0/8\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 255.0.0.0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 127.0.0.1\u00a0\u00a0\u00a0\u00a0\u00a0 127.0.0.1');
        appendLine(' 192.168.1.0/24\u00a0\u00a0 255.255.255.0\u00a0\u00a0 On-link\u00a0\u00a0\u00a0\u00a0\u00a0 192.168.1.42');
      } else if (c === 'whoami') {
        appendLine('netforge\\student');
      } else if (c === 'exit') {
        appendLine('<span class="dim">Session stays open — this is a sandbox. Type "clear" when you are done.</span>');
      } else {
        appendLine(`<span class="err">bash: ${esc(cmd)}: command not found</span>`);
        appendLine('<span class="dim">Type "help" for a list of commands.</span>');
      }
      appendLine('');
      renderOutput();
      status();
    }

    el.querySelector(`#${el.id}-form`).addEventListener('submit', (e) => {
      e.preventDefault();
      respond(inputEl.value);
      inputEl.value = '';
      inputEl.focus();
    });

    el.querySelector('.terminal-body').addEventListener('click', () => inputEl.focus());

    const done = labDoneButton(el, ctx, false);
    renderOutput();
    inputEl.focus();
  }

  registry.register('subnet-calculator', subnetWidget);
  registry.register('osi-matcher', osiWidget);
  registry.register('terminal', terminalWidget);

  window.NetForgeLabs = registry;

  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open-labs]');
    if (open) {
      const target = document.getElementById(open.getAttribute('data-open-labs') || open.getAttribute('href').slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.focus && target.focus({ preventScroll: true });
      }
    }
  });
})();