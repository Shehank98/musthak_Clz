// ============================================================
// SUBJECTS PAGE
// ============================================================

const SubjectsPage = {
  async load(el) {
    await SubjectService.seed();
    el.innerHTML = `
      <div class="page-header">
        <div><h2>Subjects</h2></div>
        <button class="btn btn-primary" id="add-subject-btn">+ Add Subject</button>
      </div>
      <div id="subjects-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
    `;
    await SubjectsPage._render();
    document.getElementById('add-subject-btn').addEventListener('click', () => SubjectsPage._showForm());
  },

  async _render() {
    const subjects = await SubjectService.getAll();
    const el = document.getElementById('subjects-list');
    if (!el) return;
    if (subjects.length === 0) { el.innerHTML = UI.emptyState('📖','No subjects'); return; }
    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Subject</th><th>Code</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${subjects.map(s => `
              <tr>
                <td class="font-semibold">${s.subject_name}</td>
                <td><code>${s.subject_code||'—'}</code></td>
                <td>${s.description||'—'}</td>
                <td>${UI.statusBadge(s.status||'Active')}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm" onclick="SubjectsPage._showForm('${s.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="SubjectsPage._delete('${s.id}','${s.subject_name}')">🗑</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _delete(id, name) {
    if (!await UI.confirm(`Delete subject "${name}"?`)) return;
    try { await SubjectService.delete(id); UI.toastSuccess('Deleted.'); await SubjectsPage._render(); }
    catch (e) { UI.toastError(e.message); }
  },

  async _showForm(id = null) {
    const subj = id ? (await SubjectService.getAll()).find(s => s.id === id) : null;
    const s = subj || {};
    UI.showModal({
      title: id ? 'Edit Subject' : 'Add Subject',
      size: 'sm',
      body: `
        <form id="subject-form" novalidate>
          <div class="form-group"><label class="form-label">Subject Name <span class="required">*</span></label>
            <input class="form-control" name="subject_name" value="${s.subject_name||''}" required /></div>
          <div class="form-group"><label class="form-label">Subject Code</label>
            <input class="form-control" name="subject_code" value="${s.subject_code||''}" /></div>
          <div class="form-group"><label class="form-label">Description</label>
            <textarea class="form-control" name="description">${s.description||''}</textarea></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-control" name="status">
              ${['Active','Inactive'].map(v=>`<option value="${v}" ${(s.status||'Active')===v?'selected':''}>${v}</option>`).join('')}
            </select></div>
        </form>
      `,
      footer: `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="save-subject-btn">${id?'Save':'Add'}</button>`
    });
    document.getElementById('save-subject-btn').addEventListener('click', async () => {
      const form = document.getElementById('subject-form');
      const { valid, errors } = Validators.form(form, { subject_name: ['required'] });
      if (!valid) { Validators.showErrors(form, errors); return; }
      const btn = document.getElementById('save-subject-btn');
      UI.btnLoading(btn, true);
      try {
        const data = Object.fromEntries(new FormData(form));
        if (id) await SubjectService.update(id, data);
        else    await SubjectService.create(data);
        UI.toastSuccess(id?'Updated.':'Added.');
        UI.closeModal();
        await SubjectsPage._render();
      } catch (e) { UI.toastError(e.message); }
      finally { UI.btnLoading(btn, false); }
    });
  }
};

window.SubjectsPage = SubjectsPage;
