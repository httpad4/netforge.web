'use strict';

(function () {
  const { icon } = window.NetForgeIcons;
  const { esc } = window.NetForgeUI;
  const { render: renderMarkdown } = window.NetForgeMarkdown;

  const state = {
    slug: new URLSearchParams(location.search).get('slug'),
    data: null,
    authed: false,
    completed: false,
    glossary: null,
  };

  const LS = { lesson: null, module: null, lessons: [], prev: null, next: null };
  const els = {};

  function q(sel) { return document.querySelector(sel); }

  function typeIcon(t) { return t === 'quiz' ? 'quiz' : t === 'lab' ? 'terminal' : 'book'; }
  function typeLabel(t) { return t === 'quiz' ? 'Quiz' : t === 'lab' ? 'Lab' : 'Reading'; }

  // ---------------------------------------------------------------- sidebar
  function renderSidebar() {
    els.moduleTitle.textContent = state.data.module.title;
    els.moduleTitle.title = state.data.module.title;
    els.moduleTitle.classList.add('h3');

    els.lessonList.innerHTML = state.data.lessons.map((l) => {
      const active = l.slug === state.slug;
      const done = l.completed === 1 || l.completed === true;
      return `
        <a class="lesson-nav-item ${active ? 'active' : ''}" href="lesson.html?slug=${encodeURIComponent(l.slug)}" ${active ? 'aria-current="page"' : ''}>
          <span class="nav-type">${icon(typeIcon(l.lesson_type))}</span>
          <span style="flex:1">${esc(l.title)}</span>
          ${done ? `<span class="check-badge" aria-label="Completed">${icon('check')}</span>` : ''}
        </a>`;
    }).join('');
  }

  // ---------------------------------------------------------------- glossary
  async function loadGlossary() {
    if (state.glossary) return state.glossary;
    try {
      const data = await window.NetForgeApi.apiGet('/glossary');
      state.glossary = data.terms
        .map((t) => t.term)
        .sort((a, b) => b.length - a.length)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    } catch (err) {
      state.glossary = [];
    }
    return state.glossary;
  }

  const SKIP_TAGS = new Set(['A', 'CODE', 'PRE', 'H1', 'H2', 'H3', 'H4']);

  function linkGlossary(root) {
    const terms = state.glossary || [];
    if (!terms.length) return;
    const re = new RegExp(`(^|[^A-Za-z0-9_])(${terms.join('|')})(?=$|[^A-Za-z0-9_])`, 'gi');

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const p = walker.currentNode.parentNode;
      if (p && SKIP_TAGS.has(p.nodeName)) continue;
      if (!p || !root.contains(p)) continue;
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      const text = node.nodeValue;
      const frag = document.createDocumentFragment();
      let last = 0;
      re.lastIndex = 0;
      let m;
      let found = false;
      while ((m = re.exec(text))) {
        found = true;
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        frag.appendChild(document.createTextNode(m[1]));
        const a = document.createElement('a');
        a.href = `glossary.html?term=${encodeURIComponent(m[2])}`;
        a.setAttribute('data-glossary', '');
        a.textContent = m[2];
        frag.appendChild(a);
        last = re.lastIndex;
      }
      if (found) {
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
  }

  // ---------------------------------------------------------------- labs
  function mountLabs() {
    document.querySelectorAll('[data-lab]').forEach((el) => {
      window.NetForgeLabs.mount(el, { lessonId: state.data.lesson.id });
    });
  }

  // ---------------------------------------------------------------- complete
  async function completeLesson() {
    if (!state.authed || state.completed) return;
    try {
      const r = await window.NetForgeApi.apiPost(`/lessons/${state.data.lesson.id}/complete`, {});
      window.NetForgeUI.badgeToast(r.newBadges);
      window.NetForgeUI.toast('Lesson marked as complete', 'success');
      window.dispatchEvent(new CustomEvent('nf:complete', { detail: { lessonId: state.data.lesson.id } }));
    } catch (err) {
      window.NetForgeUI.toast(err.message, 'error');
    }
  }

  function renderCompleteControl() {
    const wrap = els.footer;
    if (state.completed) {
      wrap.innerHTML = `
        <div class="callout callout-success"><span>${icon('checkCircle')}</span><div><strong>Lesson complete.</strong> Nice work.</div></div>
        ${navButtons()}`;
      return;
    }
    if (state.data.lesson.lesson_type === 'quiz') {
      wrap.innerHTML = `
        <div class="callout callout-info"><span>${icon('info')}</span><div>Complete the quiz with at least 70% to mark this lesson done.</div></div>
        ${navButtons()}`;
      return;
    }
    if (state.data.lesson.lesson_type === 'lab') {
      wrap.innerHTML = `
        <div class="callout callout-info"><span>${icon('terminal')}</span><div>Finish the lab above, then use its "Mark lab complete" button.</div></div>
        ${navButtons()}`;
      return;
    }
    wrap.innerHTML = `
      <div class="flex">
        <button type="button" class="btn btn-primary" id="complete-btn">${icon('check')} Mark lesson as complete</button>
        ${navButtons()}
      </div>`;
    q('#complete-btn').addEventListener('click', completeLesson);
  }

  function navButtons() {
    const { prev, next } = state.data;
    return `
      <div class="flex" style="margin-left:auto">
        ${prev ? `<a class="btn btn-ghost btn-sm" href="lesson.html?slug=${encodeURIComponent(prev)}" aria-label="Previous lesson">${icon('chevronLeft')} Prev</a>` : ''}
        ${next ? `<a class="btn btn-ghost btn-sm" href="lesson.html?slug=${encodeURIComponent(next)}" aria-label="Next lesson">Next ${icon('chevronRight')}</a>` : `<a class="btn btn-primary btn-sm" href="modules.html">Module complete ${icon('arrowRight')}</a>`}
      </div>`;
  }

  // ---------------------------------------------------------------- quiz
  async function renderQuiz() {
    const region = els.quizRegion;
    region.hidden = false;
    const lessonId = state.data.lesson.id;
    let quiz;
    try {
      quiz = await window.NetForgeApi.apiGet(`/lessons/${lessonId}/quiz`);
    } catch (err) {
      region.innerHTML = `<div class="callout callout-danger"><span>${icon('alert')}</span><div>Could not load the quiz: ${esc(err.message)}</div></div>`;
      return;
    }

    const passPct = Math.round(quiz.passRatio * 100);

    region.innerHTML = `
      <div class="callout callout-info"><span>${icon('quiz')}</span>
        <div>Answer all questions. You need <strong>${passPct}%</strong> or higher to pass this lesson.</div>
      </div>
      <div id="quiz-attempts" aria-live="polite"></div>
      <form id="quiz-form" novalidate>
        ${quiz.questions.map((question, qi) => `
          <fieldset class="quiz-question" style="border:1px solid var(--border);border-radius:12px">
            <legend class="q-row" style="float:none;padding:0;font-weight:700">
              <span class="badge-pill">Q${qi + 1}</span>
              <span>${esc(question.question_text)}</span>
            </legend>
            <div class="options">
              ${question.options.map((opt) => `
                <label class="option">
                  <input type="radio" name="q${question.id}" value="${opt.id}" />
                  <span>${esc(opt.option_text)}</span>
                </label>`).join('')}
            </div>
            <div class="quiz-feedback" data-feedback="${question.id}" hidden></div>
          </fieldset>`).join('')}
        <div class="flex mt-1">
          <button type="submit" class="btn btn-primary"${state.authed ? '' : ' disabled'}>${icon('check')} Submit quiz</button>
          ${state.authed ? '' : '<span class="hint">Sign in to submit and track your score.</span>'}
        </div>
      </form>`;

    q('#quiz-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.authed) { window.NetForgeUI.openAuthModal(); return; }

      const form = q('#quiz-form');
      const answers = {};
      quiz.questions.forEach((question) => {
        const sel = form.querySelector(`input[name="q${question.id}"]:checked`);
        if (sel) answers[question.id] = Number(sel.value);
      });

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      let result;
      try {
        result = await window.NetForgeApi.apiPost(`/lessons/${lessonId}/quiz/attempts`, { answers });
      } catch (err) {
        window.NetForgeUI.toast(err.message, 'error');
        submitBtn.disabled = false;
        return;
      }

      // Immobilize answers, show per-question feedback.
      quiz.questions.forEach((question) => {
        const fb = result.feedback.find((f) => f.questionId === question.id);
        const form2 = q('#quiz-form');
        form2.querySelectorAll(`input[name="q${question.id}"]`).forEach((radio) => {
          radio.disabled = true;
          const optWrap = radio.closest('.option');
          const optId = Number(radio.value);
          optWrap.classList.remove('option-correct', 'option-wrong');
          if (fb && optId === fb.correctOptionId) optWrap.classList.add('option-correct');
          else if (fb && optId === fb.selectedOptionId && fb.selectedOptionId !== fb.correctOptionId) optWrap.classList.add('option-wrong');
        });
        const fbEl = form2.querySelector(`[data-feedback="${question.id}"]`);
        if (fbEl && fb) {
          fbEl.hidden = false;
          fbEl.innerHTML = `<span class="gk">${fb.correct ? 'Correct' : 'Not quite'}</span> — ${esc(fb.explanation)}`;
        }
      });

      const passMsg = result.passed
        ? `<div class="callout callout-success"><span>${icon('checkCircle')}</span><div><strong>Passed — ${result.score}/${result.total}.</strong> This lesson is marked complete.</div></div>`
        : `<div class="callout callout-danger"><span>${icon('alert')}</span><div><strong>${result.score}/${result.total} — below ${passPct}%.</strong> Review the explanations and try again.</div></div>`;
      const regionForm = q('#quiz-form');
      const attemptsHost = q('#quiz-attempts');
      attemptsHost.innerHTML = passMsg + await attemptHistoryHTML(lessonId);
      regionForm.querySelector('button[type="submit"]').remove();

      window.NetForgeUI.badgeToast(result.newBadges);
      if (result.passed) {
        window.dispatchEvent(new CustomEvent('nf:complete', { detail: { lessonId } }));
      }
    });

    if (state.authed) renderAttemptHistory(lessonId);
  }

  async function attemptHistoryHTML(lessonId) {
    try {
      const { attempts } = await window.NetForgeApi.apiGet(`/lessons/${lessonId}/quiz/attempts`);
      if (!attempts.length) return '';
      const rows = attempts.map((a) => `
        <tr>
          <td>${window.NetForgeUI.fmtDateTime(a.completed_at)}</td>
          <td>${a.score}/${a.total_questions}</td>
          <td>${a.passed ? `<span class="badge-pill done">${icon('check')} Pass</span>` : `<span class="badge-pill">Fail</span>`}</td>
        </tr>`).join('');
      return `
        <div class="table-wrap mt-2">
          <table>
            <thead><tr><th>Date</th><th>Score</th><th>Result</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    } catch (err) { return ''; }
  }

  async function renderAttemptHistory(lessonId) {
    const el = q('#quiz-attempts');
    if (el) el.innerHTML = await attemptHistoryHTML(lessonId);
  }

  // ---------------------------------------------------------------- notes
  async function renderNotes() {
    const panel = els.notesPanel;
    if (!state.authed) { panel.hidden = true; return; }
    panel.hidden = false;
    panel.innerHTML = `
      <details>
        <summary class="flex" style="cursor:pointer;font-weight:700;list-style:none">${icon('note')} My notes</summary>
        <div class="mt-2">
          <form id="note-form" class="stack">
            <label class="field">
              <span class="field-label">New note for this lesson</span>
              <textarea name="body" rows="3" placeholder="Write a reminder, a bookmark, or something to look up later…"></textarea>
            </label>
            <button type="submit" class="btn btn-primary btn-sm btn-block">Save note</button>
          </form>
          <div class="notes-list mt-2" id="notes-list" aria-live="polite"></div>
        </div>
      </details>`;

    q('#note-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = q('#note-form textarea').value.trim();
      if (!body) return;
      try {
        await window.NetForgeApi.apiPost(`/lessons/${state.data.lesson.id}/notes`, { body });
        q('#note-form textarea').value = '';
        await renderNotesList();
      } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
    });

    await renderNotesList();
  }

  async function renderNotesList() {
    let notes;
    try {
      const data = await window.NetForgeApi.apiGet(`/lessons/${state.data.lesson.id}/notes`);
      notes = data.notes;
    } catch (err) { q('#notes-list').innerHTML = `<p class="hint">Could not load notes.</p>`; return; }

    if (!notes.length) { q('#notes-list').innerHTML = `<p class="hint">No notes yet.</p>`; return; }
    q('#notes-list').innerHTML = notes.map((n) => `
      <div class="note-item">
        <div class="note-meta">
          <span>${window.NetForgeUI.fmtDateTime(n.updated_at)}</span>
          <span class="note-actions">
            <button type="button" class="icon-btn" data-edit-note="${n.id}" aria-label="Edit note">${icon('edit')}</button>
            <button type="button" class="icon-btn" data-delete-note="${n.id}" aria-label="Delete note">${icon('trash')}</button>
          </span>
        </div>
        <p class="note-body mb-0" data-body="${n.id}">${esc(n.body)}</p>
      </div>`).join('');

    q('#notes-list').querySelectorAll('[data-edit-note]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-note');
        q(`[data-body="${id}"]`).outerHTML = `<input type="text" data-edit-input="${id}" value="${esc(q(`[data-body="${id}"]`).textContent)}" aria-label="Edit note text" />`;
        const input = q(`[data-edit-input="${id}"]`);
        input.focus();
        input.addEventListener('keydown', async (ev) => {
          if (ev.key === 'Enter') await saveNote(id, input.value.trim());
          if (ev.key === 'Escape') renderNotesList();
        });
        input.addEventListener('blur', async () => { await saveNote(id, input.value.trim()); });
      });
    });
    q('#notes-list').querySelectorAll('[data-delete-note]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await window.NetForgeApi.apiDelete(`/notes/${btn.getAttribute('data-delete-note')}`);
          await renderNotesList();
        } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
      });
    });
  }

  async function saveNote(id, body) {
    if (!body) return;
    try {
      await window.NetForgeApi.apiPut(`/notes/${id}`, { body });
      await renderNotesList();
    } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
  }

  // ---------------------------------------------------------------- comments
  async function renderComments() {
    const panel = q('#comments-panel');
    panel.innerHTML = `
      <div class="notes-panel">
        <h2 style="display:flex;align-items:center;gap:.5rem">${icon('comment')} Discussion</h2>
        ${state.authed
          ? `<form id="comment-form" class="stack mt-1">
               <label class="field">
                 <span class="field-label">Add a comment</span>
                 <textarea name="body" rows="3" maxlength="2000" aria-label="Comment body"></textarea>
               </label>
               <button type="submit" class="btn btn-primary btn-sm">Post comment</button>
             </form>`
          : `<div class="callout callout-info mt-1"><span>${icon('info')}</span><div>Sign in to join the discussion.</div></div>`}
        <div class="mt-2" id="comment-list" aria-live="polite"></div>
      </div>`;

    const form = q('#comment-form');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = form.body.value.trim();
      if (!body) return;
      try {
        await window.NetForgeApi.apiPost(`/lessons/${state.data.lesson.id}/comments`, { body });
        form.body.value = '';
        await loadComments();
      } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
    });

    await loadComments();
  }

  async function loadComments() {
    const host = q('#comment-list');
    let data;
    try {
      data = await window.NetForgeApi.apiGet(`/lessons/${state.data.lesson.id}/comments`);
    } catch (err) { host.innerHTML = `<p class="hint">Could not load comments.</p>`; return; }
    const comments = data.comments;

    const tops = comments.filter((c) => c.parent_id == null);
    host.innerHTML = tops.map((c) => commentHTML(c, comments)).join('') || `<p class="hint">No comments yet — start the conversation.</p>`;

    host.querySelectorAll('[data-reply]').forEach((btn) => btn.addEventListener('click', () => toggleReply(btn.getAttribute('data-reply'))));
    host.querySelectorAll('[data-del-comment]').forEach((btn) => btn.addEventListener('click', () => deleteComment(btn.getAttribute('data-del-comment'))));
    host.querySelectorAll('.reply-form').forEach((formEl) => formEl.addEventListener('submit', submitReply));
  }

  function commentHTML(c, all) {
    const replies = all.filter((r) => r.parent_id === c.id);
    const bodyHTML = c.is_deleted
      ? `<p class="c-body deleted">[deleted]</p>`
      : `<p class="c-body">${esc(c.body)}</p>`;
    const canDelete = window.NetForgeAuth && window.NetForgeAuth.user && (window.NetForgeAuth.user.username === c.username || window.NetForgeAuth.user.is_admin);
    return `
      <div class="comment" id="comment-${c.id}">
        <div class="c-meta">
          <span class="c-author">${esc(c.author)}</span>
          <span class="muted">${window.NetForgeUI.relativeTime(c.created_at)}</span>
          ${canDelete && !c.is_deleted ? `<button type="button" class="icon-btn" style="width:auto;height:auto;padding:.15rem .3rem" data-del-comment="${c.id}" aria-label="Delete comment">${icon('trash')}</button>` : ''}
          ${state.authed && !c.is_deleted ? `<button type="button" class="icon-btn" style="width:auto;height:auto;padding:.15rem .3rem" data-reply="${c.id}" aria-label="Reply to comment">${icon('comment')} Reply</button>` : ''}
        </div>
        ${bodyHTML}
        ${state.authed && !c.is_deleted ? `
          <form class="reply-form stack hidden" data-parent="${c.id}" style="margin:.4rem 0 0">
            <div class="flex">
              <input name="body" maxlength="2000" placeholder="Reply…" aria-label="Reply body" />
              <button type="submit" class="btn btn-sm btn-primary">Reply</button>
            </div>
          </form>` : ''}
        ${replies.map((r) => `<div class="comment reply">
            <div class="c-meta"><span class="c-author">${esc(r.author)}</span><span class="muted">${window.NetForgeUI.relativeTime(r.created_at)}</span></div>
            ${r.is_deleted ? `<p class="c-body deleted">[deleted]</p>` : `<p class="c-body">${esc(r.body)}</p>`}
          </div>`).join('')}
      </div>`;
  }

  function toggleReply(parentId) {
    const formEl = document.querySelector(`.reply-form[data-parent="${parentId}"]`);
    if (formEl) { formEl.classList.toggle('hidden'); formEl.querySelector('input').focus(); }
  }

  async function submitReply(e) {
    e.preventDefault();
    const formEl = e.target;
    const body = formEl.body.value.trim();
    if (!body) return;
    try {
      await window.NetForgeApi.apiPost(`/lessons/${state.data.lesson.id}/comments`, { body, parent_id: Number(formEl.getAttribute('data-parent')) });
      formEl.classList.add('hidden');
      await loadComments();
    } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
  }

  async function deleteComment(id) {
    try {
      await window.NetForgeApi.apiDelete(`/comments/${id}`);
      await loadComments();
    } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
  }

  // ---------------------------------------------------------------- boot
  async function refreshCompleted() {
    try {
      const data = await window.NetForgeApi.apiGet(`/lessons/${state.slug}`);
      state.data = data;
      state.completed = data.lesson.completed === true || data.lesson.completed === 1;
      renderSidebar();
      renderCompleteControl();
    } catch (err) { /* lesson still exists */ }
  }

  async function init() {
    els.moduleTitle = q('#sidebar-module');
    els.lessonList = q('#lesson-nav-list');
    els.body = q('#lesson-body');
    els.footer = q('#lesson-footer');
    els.quizRegion = q('#quiz-region');
    els.notesPanel = q('#notes-panel');

    // auth posture
    const user = await new Promise((resolve) => {
      const check = () => resolve(window.NetForgeAuth && window.NetForgeAuth.user);
      if (window.NetForgeAuth && window.NetForgeAuth.loaded) check();
      else document.addEventListener('nf:authchange', check, { once: true });
    });
    state.authed = !!user;

    // sidebar mobile toggle
    const toggle = q('#sidebar-toggle');
    const sidebar = q('#lesson-sidebar');
    toggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      q('#sb-label').textContent = open ? 'Hide module lessons' : 'Show module lessons';
      q('#sb-icon').innerHTML = icon(open ? 'close' : 'menu');
    });

    if (!state.slug) {
      els.body.innerHTML = `<div class="empty-state">No lesson specified. <a href="modules.html">Choose a module</a>.</div>`;
      return;
    }

    let data;
    try {
      data = await window.NetForgeApi.apiGet(`/lessons/${state.slug}`);
    } catch (err) {
      els.body.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
      return;
    }
    state.data = data;
    state.completed = data.lesson.completed === true || data.lesson.completed === 1;
    state.module = data.module;
    document.title = `${data.lesson.title} — NetForge`;
    q('#footer-link').innerHTML = `<a href="modules.html">All modules</a>`;

    renderSidebar();

    // The page already renders the lesson title; drop a matching leading
    // markdown heading so it isn't duplicated.
    let content = data.lesson.content.replace(/^\s*#\s+([^\n]+)/, (m, heading) =>
      heading.trim().toLowerCase() === data.lesson.title.trim().toLowerCase() ? '' : m
    );

    const rendered = renderMarkdown(content);
    els.body.innerHTML = `<div class="lesson-title"><h1 style="margin:0">${esc(data.lesson.title)}</h1><span class="badge-pill lesson-type-pill ${data.lesson.lesson_type}">${icon(typeIcon(data.lesson.lesson_type))} ${typeLabel(data.lesson.lesson_type)}</span></div>` + rendered;
    els.body.querySelector('h1').style.marginBottom = '0.2em';

    await loadGlossary();
    linkGlossary(els.body);

    mountLabs();

    if (data.lesson.lesson_type === 'quiz') await renderQuiz();
    renderCompleteControl();
    renderNotes();
    renderComments();

    document.addEventListener('nf:complete', (e) => {
      if (!e.detail || !e.detail.lessonId || e.detail.lessonId === state.data.lesson.id) refreshCompleted();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();