'use strict';

/* Small fetch wrapper. Same-origin, always sends cookies. */

async function api(path, options = {}) {
  const opts = { credentials: 'same-origin', ...options };
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  if (opts.body) opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };

  let res;
  try {
    res = await fetch('/api' + path, opts);
  } catch (err) {
    throw new Error('Network error — is the server running?');
  }

  let data = null;
  try { data = await res.json(); } catch (err) { data = null; }

  if (!res.ok) {
    const e = new Error((data && data.error) || `Request failed (${res.status})`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

const apiGet = (p) => api(p);
const apiPost = (p, body) => api(p, { method: 'POST', body });
const apiPut = (p, body) => api(p, { method: 'PUT', body });
const apiDelete = (p) => api(p, { method: 'DELETE' });

if (typeof window !== 'undefined') {
  window.NetForgeApi = { api, apiGet, apiPost, apiPut, apiDelete };
}