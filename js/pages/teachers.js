// ============================================================
// TEACHERS PAGE
// ============================================================

const TeachersPage = {
  async load(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2>Teachers</h2><p>Manage teacher profiles, subjects and grades</p></div>
        <button class="btn btn-primary" id="add-teacher-btn">+ Add Teacher</button>
      </div>
      <div id="teachers-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
    `;

    await TeachersPage._render();
    document.getElementById('add-teacher-btn').addEventListener('click', () => TeachersPage._showForm());
  },

  async _render() {
    const teachers = await TeacherService.getAll();
    const el = document.getElementById('teachers-list');
    if (!el) return;

    if (teachers.length === 0) {
      el.innerHTML = UI.emptyState('👨‍🏫', 'No teachers yet', 'Add your first teacher.');
      return;
    }

    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr>
            <th>Teacher</th><th>Phone</th><th>Commission</th><th>Subjects</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${teachers.map(t => `
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    ${t.photo_url ? `<img src="${t.photo_url}" class="avatar" alt="${t.full_name}">` : UI.avatar(t.full_name)}
                    <div>
                      <div class="font-semibold">${t.full_name}</div>
                      <div class="text-muted" style="font-size:var(--font-size-xs)">${t.email||''}</div>
                    </div>
                  </div>
                </td>
                <td>${t.phone||'—'}</td>
                <td><span class="badge badge-info">${t.default_commission_pct||60}%</span></td>
                <td>${(t.subjects||[]).length} subject(s)</td>
                <td>${UI.statusBadge(t.status||'Active')}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm" onclick="TeachersPage._showForm('${t.id}')" title="Edit">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="TeachersPage._delete('${t.id}','${t.full_name}')" title="Delete">🗑</button>
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
    if (!await UI.confirm(`Delete teacher "${name}"?`, 'Delete Teacher')) return;
    try {
      await TeacherService.delete(id);
      UI.toastSuccess('Teacher deleted.');
      await TeachersPage._render();
    } catch (e) { UI.toastError(e.message); }
  },

  async _showForm(id = null) {
    const teacher   = id ? await TeacherService.getById(id) : null;
    const [subjects, grades] = await Promise.all([SubjectService.getAll(), GradeService.getAll()]);
    const t = teacher || {};
    const tSubjects = t.subjects || [];
    const tGrades   = t.grades   || [];

    UI.showModal({
      title: id ? 'Edit Teacher' : 'Add Teacher',
      size:  'lg',
      body: `
        <form id="teacher-form" novalidate>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input class="form-control" name="full_name" value="${t.full_name||''}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="form-control" name="phone" value="${t.phone||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-control" type="email" name="email" value="${t.email||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp (+94...)</label>
              <input class="form-control" name="whatsapp_number" value="${t.whatsapp_number||''}" placeholder="+94771234567" />
            </div>
            <div class="form-group">
              <label class="form-label">Specialization</label>
              <input class="form-control" name="specialization" value="${t.specialization||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Qualification</label>
              <input class="form-control" name="qualification" value="${t.qualification||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Bank Account</label>
              <input class="form-control" name="bank_account" value="${t.bank_account||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Bank Name</label>
              <input class="form-control" name="bank_name" value="${t.bank_name||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Default Commission %</label>
              <input class="form-control" type="number" name="default_commission_pct" value="${t.default_commission_pct||60}" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-control" name="status">
                ${['Active','Inactive'].map(v=>`<option value="${v}" ${(t.status||'Active')===v?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Subjects Taught</label>
            <div class="checkbox-grid" id="subject-checks">
              ${subjects.map(s => `
                <label class="form-check">
                  <input type="checkbox" name="subjects" value="${s.id}" ${tSubjects.includes(s.id)?'checked':''}>
                  <span class="form-check-label">${s.subject_name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Grades Taught</label>
            <div class="checkbox-grid" id="grade-checks">
              ${grades.map(g => `
                <label class="form-check">
                  <input type="checkbox" name="grades" value="${g.id}" ${tGrades.includes(g.id)?'checked':''}>
                  <span class="form-check-label">${g.grade_name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Notes</label>
            <textarea class="form-control" name="notes">${t.notes||''}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-teacher-btn">${id?'Save Changes':'Add Teacher'}</button>
      `
    });

    document.getElementById('save-teacher-btn').addEventListener('click', async () => {
      const form = document.getElementById('teacher-form');
      const { valid, errors } = Validators.form(form, { full_name: ['required'] });
      if (!valid) { Validators.showErrors(form, errors); return; }

      const btn = document.getElementById('save-teacher-btn');
      UI.btnLoading(btn, true);
      try {
        const fd = new FormData(form);
        const data = Object.fromEntries(fd);
        // Multi-checkboxes
        data.subjects = Array.from(form.querySelectorAll('input[name="subjects"]:checked')).map(el => el.value);
        data.grades   = Array.from(form.querySelectorAll('input[name="grades"]:checked')).map(el => el.value);
        data.default_commission_pct = parseFloat(data.default_commission_pct) || 60;

        if (id) await TeacherService.update(id, data);
        else    await TeacherService.create(data);

        UI.toastSuccess(id ? 'Teacher updated.' : 'Teacher added.');
        UI.closeModal();
        await TeachersPage._render();
      } catch (e) { UI.toastError(e.message); }
      finally { UI.btnLoading(btn, false); }
    });
  }
};

window.TeachersPage = TeachersPage;
