'use strict';

/*
 * Admin console. Requires an is_admin account (server-enforced).
 * Editor forms create/update curriculum without code changes.
 */

(function () {
  const { icon } = window.NetForgeIcons;
  const { esc } = window.NetForgeUI;
  const A = window.NetForgeApi;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let isAdmin = false;

  // ---------------------------------------------------------------- tabs
  function switchTab(name) {
    $$('.tab-btn').forEach((b) => {
      const on = b.getAttribute('data-tab') === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    ['modules', 'lessons', 'quizzes', 'analytics'].forEach((t) => {
      $(`#tab-${t}`).hidden = t !== name;
    });
  }

  // ---------------------------------------------------------------- modules
  async function renderModules() {
    const host = $('#tab-modules');
    let modules;
    try { modules = (await A.apiGet('/admin/modules')).modules; }
    catch (err) { host.innerHTML = errorBox(err); return; }

    host.innerHTML = `
      <details class="card card-pad-sm">
        <summary style="cursor:pointer;font-weight:700;list-style:none">${icon('plus')} New module</summary>
        <form id="module-form" class="stack mt-2">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:.6rem">
            <label class="field"><span class="field-label">Slug</span><input name="slug" pattern="[a-z0-9-]+" required placeholder="my-module" /></label>
            <label class="field"><span class="field-label">Title</span><input name="title" required /></label>
          </div>
          <label class="field"><span class="field-label">Description</span><textarea name="description" rows="3"></textarea></label>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:.6rem">
            <label class="field"><span class="field-label">Sort order</span><input name="sort_order" type="number" value="0" /></label>
            <label class="flex" style="gap:.5rem;padding-top:1.6rem"><input name="is_published" type="checkbox" checked /> Published</label>
          </div>
          <button type="submit" class="btn btn-primary btn-sm btn-block">Create module</button>
        </form>
      </details>
      <div class="table-wrap mt-2">
        <table>
          <thead><tr><th>Title</th><th>Slug</th><th>Lessons</th><th>Sort</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${modules.map((m) => `
              <tr>
                <td><strong>${esc(m.title)}</strong></td>
                <td><code>${esc(m.slug)}</code></td>
                <td>${m.lesson_count}</td>
                <td>${m.sort_order}</td>
                <td>${m.is_published ? `<span class="badge-pill done">${icon('check')} Published</span>` : `<span class="badge-pill">Draft</span>`}</td>
                <td>
                  <button type="button" class="btn btn-sm btn-ghost" data-module-edit="${m.id}">${icon('edit')} Edit</button>
                  <button type="button" class="btn btn-sm btn-ghost" data-module-del="${m.id}">${icon('trash')}</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="6" class="table-empty">No modules yet.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    $('#module-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await A.apiPost('/admin/modules', {
          slug: f.slug.value.trim(), title: f.title.value.trim(),
          description: f.description.value.trim(),
          sort_order: Number(f.sort_order.value) || 0,
          is_published: f.is_published.checked,
        });
        window.NetForgeUI.toast('Module created', 'success');
        await renderModules();
      } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
    });

    $$('[data-module-edit]').forEach((btn) => btn.addEventListener('click', () => editModule(Number(btn.getAttribute('data-module-edit')))));
    $$('[data-module-del]').forEach((btn) => btn.addEventListener('click', () => deleteModule(Number(btn.getAttribute('data-module-del')))));
  }

  async function editModule(id) {
    const modules = (await A.apiGet('/admin/modules')).modules;
    const m = modules.find((x) => x.id === id);
    if (!m) return;
    const host = $('#tab-modules');
    host.querySelectorAll('details')[0] && (host.querySelectorAll('details')[0].removeAttribute('open'));

    // Inline editor at the top of the list.
    const editor = document.createElement('details');
    editor.className = 'card card-pad-sm';
    editor.open = true;
    editor.innerHTML = `
      <summary style="cursor:pointer;font-weight:700;list-style:none">${icon('edit')} Edit module: ${esc(m.title)}</summary>
      <form class="stack mt-2" id="module-edit-form">
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:.6rem">
          <label class="field"><span class="field-label">Slug</span><input name="slug" value="${esc(m.slug)}" pattern="[a-z0-9-]+" required /></label>
          <label class="field"><span class="field-label">Title</span><input name="title" value="${esc(m.title)}" required /></label>
        </div>
        <label class="field"><span class="field-label">Description</span><textarea name="description" rows="3">${esc(m.description)}</textarea></label>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:.6rem">
          <label class="field"><span class="field-label">Sort order</span><input name="sort_order" type="number" value="${m.sort_order}" /></label>
          <label class="flex" style="gap:.5rem;padding-top:1.6rem"><input name="is_published" type="checkbox" ${m.is_published ? 'checked' : ''} /> Published</label>
        </div>
        <div class="flex">
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel-edit>Cancel</button>
        </div>
      </form>`;
    host.prepend(editor);

    editor.querySelector('[data-cancel-edit]').addEventListener('click', () => editor.remove());
    editor.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await A.apiPut(`/admin/modules/${id}`, {
          slug: f.slug.value.trim(), title: f.title.value.trim(),
          description: f.description.value.trim(),
          sort_order: Number(f.sort_order.value) || 0,
          is_published: f.is_published.checked,
        });
        window.NetForgeUI.toast('Module updated', 'success');
        await renderModules();
      } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
    });
  }

  async function deleteModule(id) {
    if (!window.confirm('Delete this module and all of its lessons, progress, and comments?')) return;
    try {
      await A.apiDelete(`/admin/modules/${id}`);
      window.NetForgeUI.toast('Module deleted', 'info');
      await renderModules();
    } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
  }

  // ---------------------------------------------------------------- lessons
  async function renderLessons() {
    const host = $('#tab-lessons');
    let modules;
    try { modules = (await A.apiGet('/admin/modules')).modules; }
    catch (err) { host.innerHTML = errorBox(err); return; }

    host.innerHTML = `
      <label class="field" style="max-width:360px">
        <span class="field-label">Module</span>
        <select id="lesson-module-select">
          ${modules.map((m) => `<option value="${m.id}">${esc(m.title)} (${m.lesson_count})</option>`).join('')}
        </select>
      </label>
      <details class="card card-pad-sm mt-2">
        <summary style="cursor:pointer;font-weight:700;list-style:none">${icon('plus')} New lesson</summary>
        <div id="lesson-new-form-host" class="mt-2"></div>
      </details>
      <div class="table-wrap mt-2" id="lesson-table-host"><div class="table-empty">Select a module.</div></div>`;

    $('#lesson-module-select').addEventListener('change', () => loadModuleLessons());
    state.lessonModuleId = Number($('#lesson-module-select').value);
    await loadModuleLessons();

    $('#lesson-new-form-host').innerHTML = lessonFormHTML(state.lessonModuleId);
    attachLessonForm($('#lesson-new-form-host'), 'create');
  }

  const state = { lessonModuleId: null };

  function lessonFormHTML(moduleId, lesson) {
    return `
      <form id="lesson-form" class="stack">
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:.6rem">
          <label class="field"><span class="field-label">Slug</span><input name="slug" value="${lesson ? esc(lesson.slug) : ''}" pattern="[a-z0-9-]+" required /></label>
          <label class="field"><span class="field-label">Title</span><input name="title" value="${lesson ? esc(lesson.title) : ''}" required /></label>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:.6rem">
          <label class="field"><span class="field-label">Lesson type</span>
            <select name="lesson_type">
              ${['reading', 'lab', 'quiz'].map((t) => `<option value="${t}" ${lesson && lesson.lesson_type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label class="field"><span class="field-label">Sort order</span><input name="sort_order" type="number" value="${lesson ? lesson.sort_order : 0}" /></label>
          <label class="flex" style="gap:.5rem;padding-top:1.6rem"><input name="is_published" type="checkbox" ${!lesson || lesson.is_published ? 'checked' : ''} /> Published</label>
        </div>
        <label class="field"><span class="field-label">Content (Markdown; labs use <code>&lt;div data-lab="…"&gt;</code>)</span>
          <textarea name="content" rows="8">${lesson ? esc(lesson.content) : ''}</textarea></label>
        <div class="flex">
          <button type="submit" class="btn btn-primary btn-sm">${lesson ? 'Save lesson' : 'Create lesson'}</button>
          ${lesson ? `<button type="button" class="btn btn-ghost btn-sm" data-cancel-lesson>Cancel</button>` : ''}
        </div>
      </form>`;
  }

  function attachLessonForm(host, mode, lesson) {
    const form = $('#lesson-form', host);
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        module_id: state.lessonModuleId,
        slug: e.target.slug.value.trim(),
        title: e.target.title.value.trim(),
        lesson_type: e.target.lesson_type.value,
        sort_order: Number(e.target.sort_order.value) || 0,
        content: e.target.content.value,
        is_published: e.target.is_published.checked,
      };
      try {
        if (mode === 'create') await A.apiPost('/admin/lessons', payload);
        else await A.apiPut(`/admin/lessons/${lesson.id}`, payload);
        window.NetForgeUI.toast(mode === 'create' ? 'Lesson created' : 'Lesson updated', 'success');
        await loadModuleLessons();
        form.reset();
      } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
    });
    const cancel = form.querySelector('[data-cancel-lesson]');
    if (cancel) cancel.addEventListener('click', () => loadModuleLessons());
  }

  async function loadModuleLessons() {
    const moduleId = Number($('#lesson-module-select').value);
    state.lessonModuleId = moduleId;
    if (Number.isNaN(moduleId)) return;
    let lessons;
    try { lessons = (await A.apiGet(`/admin/modules/${moduleId}/lessons`)).lessons; }
    catch (err) { $('#lesson-table-host').innerHTML = errorBox(err); return; }

    $('#lesson-table-host').innerHTML = `
      <table>
        <thead><tr><th>Title</th><th>Slug</th><th>Type</th><th>Sort</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${lessons.map((l) => `
            <tr>
              <td><strong>${esc(l.title)}</strong></td>
              <td><code>${esc(l.slug)}</code></td>
              <td>${esc(l.lesson_type)}</td>
              <td>${l.sort_order}</td>
              <td>${l.is_published ? '<span class="badge-pill done">Published</span>' : '<span class="badge-pill">Draft</span>'}</td>
              <td>
                <button type="button" class="btn btn-sm btn-ghost" data-lesson-edit="${l.id}">${icon('edit')} Edit</button>
                <button type="button" class="btn btn-sm btn-ghost" data-lesson-del="${l.id}">${icon('trash')}</button>
              </td>
            </tr>`).join('') || '<tr><td colspan="6" class="table-empty">No lessons in this module.</td></tr>'}
        </tbody>
      </table>`;

    $$('[data-lesson-edit]', $('#lesson-table-host')).forEach((b) => b.addEventListener('click', () => editLesson(Number(b.getAttribute('data-lesson-edit')), lessons)));
    $$('[data-lesson-del]', $('#lesson-table-host')).forEach((b) => b.addEventListener('click', () => deleteLesson(Number(b.getAttribute('data-lesson-del')))));

    // keep the "new lesson" form's module select in sync
    const newHost = $('#lesson-new-form-host');
    newHost.innerHTML = lessonFormHTML(moduleId, null);
    attachLessonForm(newHost, 'create');
  }

  function editLesson(id, lessons) {
    const lesson = lessons.find((l) => l.id === id);
    if (!lesson) return;
    const newHost = $('#lesson-new-form-host');
    const details = newHost.closest('details');
    if (details) details.open = true;
    newHost.innerHTML = lessonFormHTML(state.lessonModuleId, lesson);
    attachLessonForm(newHost, 'edit', lesson);
  }

  async function deleteLesson(id) {
    if (!window.confirm('Delete this lesson? Progress and attempts for it are removed too.')) return;
    try {
      await A.apiDelete(`/admin/lessons/${id}`);
      window.NetForgeUI.toast('Lesson deleted', 'info');
      await loadModuleLessons();
    } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
  }

  // ---------------------------------------------------------------- quizzes
  async function renderQuizzes() {
    const host = $('#tab-quizzes');
    let allLessons = [];
    try {
      const modules = (await A.apiGet('/admin/modules')).modules;
      for (const m of modules) {
        const ls = (await A.apiGet(`/admin/modules/${m.id}/lessons`)).lessons;
        ls.forEach((l) => { l.module_title = m.title; allLessons.push(l); });
      }
    } catch (err) { host.innerHTML = errorBox(err); return; }
    const quizzes = allLessons.filter((l) => l.lesson_type === 'quiz');

    host.innerHTML = `
      <label class="field" style="max-width:420px">
        <span class="field-label">Quiz lesson</span>
        <select id="quiz-lesson-select">
          <option value="">Choose a quiz…</option>
          ${quizzes.map((l) => `<option value="${l.id}">${esc(l.module_title)} — ${esc(l.title)}</option>`).join('')}
        </select>
      </label>
      <div id="quiz-editor" class="mt-2"><p class="muted">Select a quiz lesson to edit its questions and options. Saving replaces the full question set; at least 2 options and 1 correct option are required per question.</p></div>`;

    $('#quiz-lesson-select').addEventListener('change', async () => {
      const id = $('#quiz-lesson-select').value;
      if (!id) { $('#quiz-editor').innerHTML = ''; return; }
      await loadQuiz(Number(id));
    });
  }

  async function loadQuiz(lessonId) {
    const host = $('#quiz-editor');
    let quiz;
    try { quiz = (await A.apiGet(`/admin/lessons/${lessonId}/quiz`)).quiz; }
    catch (err) { host.innerHTML = errorBox(err); return; }

    host.innerHTML = `
      <div class="card card-pad-sm">
        <form id="quiz-form">
          <div id="quiz-questions"></div>
          <div class="flex mt-2">
            <button type="button" class="btn btn-ghost btn-sm" id="quiz-add-q">${icon('plus')} Add question</button>
            <button type="submit" class="btn btn-primary btn-sm">${icon('check')} Save quiz</button>
          </div>
        </form>
      </div>`;

    const wrap = $('#quiz-questions');
    function qHTML(q, qi) {
      return `
        <div class="quiz-question" data-q="q${qi}">
          <div class="q-row"><span class="badge-pill">Q${qi + 1}</span>
            <input name="question_text" value="${esc(q.q_text)}" aria-label="Question text" placeholder="Question…" style="flex:1" />
            <button type="button" class="icon-btn" data-del-q="${qi}" aria-label="Delete question">${icon('trash')}</button>
          </div>
          <div class="mt-1">
            <span class="field-label">Explanation (shown after answering)</span>
            <input name="explanation" value="${esc(q.q_explanation)}" aria-label="Explanation" placeholder="Explanation…" />
          </div>
          <div class="options">
            ${q.options.map((o, oi) => `
              <div class="option" style="cursor:default">
                <input type="radio" name="correct_${qi}" value="${oi}" aria-label="Mark correct" ${o.is_correct ? 'checked' : ''} />
                <input name="option_text" value="${esc(o.o_text)}" aria-label="Option text" placeholder="Option…" style="flex:1" />
                <button type="button" class="icon-btn" data-del-o="${qi}-${oi}" aria-label="Delete option">${icon('close')}</button>
              </div>`).join('')}
          </div>
          <button type="button" class="btn btn-sm btn-ghost mt-1" data-add-o="${qi}">${icon('plus')} Add option</button>
        </div>`;
    }

    quiz.forEach((q, i) => {
      wrap.insertAdjacentHTML('beforeend', qHTML({ q_text: q.question_text, q_explanation: q.explanation, options: q.options.map((o) => ({ o_text: o.option_text, is_correct: o.is_correct })) }, i));
    });

    function readQuestions() {
      return $$('.quiz-question', wrap).map((card) => ({
        question_text: $('input[name="question_text"]', card).value.trim(),
        explanation: $('input[name="explanation"]', card).value.trim(),
        sort_order: Number(card.getAttribute('data-q').replace('q', '')) + 1,
        options: $$('.option', card).map((optRow) => ({
          option_text: $('input[name="option_text"]', optRow).value.trim(),
          is_correct: $('input[type="radio"]', optRow).checked,
        })),
      }));
    }

    $('#quiz-add-q').addEventListener('click', () => {
      wrap.insertAdjacentHTML('beforeend', qHTML({ q_text: '', q_explanation: '', options: [{ o_text: '', is_correct: false }, { o_text: '', is_correct: true }] }, $$('.quiz-question', wrap).length));
      bindEvents();
    });

    function bindEvents() {
      $$('[data-del-q]', wrap).forEach((b) => b.addEventListener('click', () => { b.closest('.quiz-question').remove(); }));
      $$('[data-add-o]', wrap).forEach((b) => b.addEventListener('click', () => {
        const card = b.closest('.quiz-question');
        const qi = card.getAttribute('data-q').replace('q', '');
        card.querySelector('.options').insertAdjacentHTML('beforeend', `
          <div class="option" style="cursor:default">
            <input type="radio" name="correct_${qi}" value="${$$('.option', card).length}" aria-label="Mark correct" />
            <input name="option_text" value="" aria-label="Option text" placeholder="Option…" style="flex:1" />
            <button type="button" class="icon-btn" data-del-o="${qi}-${$$('.option', card).length}" aria-label="Delete option">${icon('close')}</button>
          </div>`);
        bindEvents();
      }));
      $$('[data-del-o]', wrap).forEach((b) => b.addEventListener('click', () => b.closest('.option').remove()));
    }
    bindEvents();

    $('#quiz-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await A.apiPut(`/admin/lessons/${lessonId}/quiz`, { questions: readQuestions() });
        window.NetForgeUI.toast('Quiz saved', 'success');
        await loadQuiz(lessonId);
      } catch (err) { window.NetForgeUI.toast(err.message, 'error'); }
    });
  }

  // ---------------------------------------------------------------- analytics
  async function renderAnalytics() {
    const host = $('#tab-analytics');
    let data;
    try { data = await A.apiGet('/admin/analytics'); }
    catch (err) { host.innerHTML = errorBox(err); return; }

    host.innerHTML = `
      <div class="hint mb-1">Based on ${data.users} user account${data.users === 1 ? '' : 's'}.</div>

      <h2>Completion rate per module</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Module</th><th>Avg % complete</th><th>Users complete</th><th>Users</th></tr></thead>
          <tbody>
            ${data.modules.map((m) => `
              <tr>
                <td><strong>${esc(m.title)}</strong></td>
                <td>
                  <div class="meter" style="max-width:260px" role="progressbar" aria-valuenow="${m.avg_pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(m.title)} completion"><span style="width:${m.avg_pct}%"></span></div>
                  <span class="hint">${m.avg_pct}%</span>
                </td>
                <td>${m.users_complete} / ${m.total_users}</td>
                <td>${m.total_users}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <h2 class="mt-3">Quiz attempts &amp; pass rates</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Quiz</th><th>Module</th><th>Attempts</th><th>Passes</th><th>Pass rate</th><th>Avg score</th></tr></thead>
          <tbody>
            ${data.quizzes.map((q) => `
              <tr>
                <td><a href="lesson.html?slug=${esc(q.slug)}">${esc(q.title)}</a></td>
                <td class="muted">${esc(q.module_title)}</td>
                <td>${q.attempts}</td>
                <td>${q.passes}</td>
                <td>${q.pass_rate}%</td>
                <td>${q.avg_score}%</td>
              </tr>`).join('') || '<tr><td colspan="6" class="table-empty">No quiz attempts yet.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="hint">"Attempts" column also answers "most-attempted quiz questions" — quiz attempts are stored as a summary (score/total), so per-question analytics are not available by design. Low pass rates + many attempts flag confusing lessons.</p>`;
  }

  function errorBox(err) { return `<div class="callout callout-danger mt-2"><span>${icon('alert')}</span><div>${esc(err.message)}</div></div>`; }

  // ---------------------------------------------------------------- boot
  async function init() {
    const me = await new Promise((resolve) => {
      const check = () => resolve(window.NetForgeAuth && window.NetForgeAuth.user);
      if (window.NetForgeAuth && window.NetForgeAuth.loaded) check();
      else document.addEventListener('nf:authchange', check, { once: true });
    });
    isAdmin = !!(me && me.is_admin);

    if (!isAdmin) {
      $('#admin-denied').hidden = false;
      const i = $('#ad-icon');
      if (i) i.innerHTML = icon('shield');
      return;
    }
    $('#admin-shell').hidden = false;

    $$('.tab-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.getAttribute('data-tab'))));

    await Promise.all([renderModules(), renderLessons(), renderQuizzes(), renderAnalytics()]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();