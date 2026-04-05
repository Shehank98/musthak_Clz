// ============================================================
// GRADES PAGE
// ============================================================

const GradesPage = {
  async load(el) {
    await GradeService.seed();
    el.innerHTML = `
      <div class="page-header">
        <div><h2>Grades</h2></div>
        <button class="btn btn-primary" id="add-grade-btn">+ Add Grade</button>
      </div>
      <div id="grades-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
    `;
    await GradesPage._render();
    document.getElementById('add-grade-btn').addEventListener('click', () => GradesPage._showForm());
  },

  async _render() {
    const grades = await GradeService.getAll();
    const el = document.getElementById('grades-list');
    if (!el) return;
    if (grades.length === 0) { el.innerHTML = UI.emptyState('🎓','No grades'); return; }
    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Grade</th><th>Order</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${grades.map(g => `
              <tr>
                <td class="font-semibold">${g.grade_name}</td>
                <td>${g.grade_order}</td>
                <td>${g.description||'—'}</td>
                <td>${UI.statusBadge(g.status||'Active')}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm" onclick="GradesPage._showForm('${g.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="GradesPage._delete('${g.id}','${g.grade_name}')">🗑</button>
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
    if (!await UI.confirm(`Delete grade "${name}"?`)) return;
    try { await GradeService.delete(id); UI.toastSuccess('Deleted.'); await GradesPage._render(); }
    catch (e) { UI.toastError(e.message); }
  },

  async _showForm(id = null) {
    const all = await GradeService.getAll();
    const grade = id ? all.find(g => g.id === id) : null;
    const g = grade || {};
    UI.showModal({
      title: id ? 'Edit Grade' : 'Add Grade',
      size: 'sm',
      body: `
        <form id="grade-form" novalidate>
          <div class="form-group"><label class="form-label">Grade Name <span class="required">*</span></label>
            <input class="form-control" name="grade_name" value="${g.grade_name||''}" required /></div>
          <div class="form-group"><label class="form-label">Sort Order</label>
            <input class="form-control" type="number" name="grade_order" value="${g.grade_order||0}" /></div>
          <div class="form-group"><label class="form-label">Description</label>
            <textarea class="form-control" name="description">${g.description||''}</textarea></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-control" name="status">
              ${['Active','Inactive'].map(v=>`<option value="${v}" ${(g.status||'Active')===v?'selected':''}>${v}</option>`).join('')}
            </select></div>
        </form>
      `,
      footer: `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="save-grade-btn">${id?'Save':'Add'}</button>`
    });
    document.getElementById('save-grade-btn').addEventListener('click', async () => {
      const form = document.getElementById('grade-form');
      const { valid, errors } = Validators.form(form, { grade_name: ['required'] });
      if (!valid) { Validators.showErrors(form, errors); return; }
      const btn = document.getElementById('save-grade-btn');
      UI.btnLoading(btn, true);
      try {
        const data = Object.fromEntries(new FormData(form));
        data.grade_order = parseInt(data.grade_order) || 0;
        if (id) await GradeService.update(id, data);
        else    await GradeService.create(data);
        UI.toastSuccess(id?'Updated.':'Added.');
        UI.closeModal();
        await GradesPage._render();
      } catch (e) { UI.toastError(e.message); }
      finally { UI.btnLoading(btn, false); }
    });
  }
};

window.GradesPage = GradesPage;
