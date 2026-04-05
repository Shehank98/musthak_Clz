// ============================================================
// CLASSES PAGE
// ============================================================

const ClassesPage = {
  async load(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2>Classes</h2><p>Manage class schedules, fees and capacity</p></div>
        <button class="btn btn-primary" id="add-class-btn">+ Add Class</button>
      </div>
      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="class-search" placeholder="Search classes..." />
        </div>
        <select class="form-control" id="class-status-filter" style="width:auto">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      <div id="classes-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
    `;

    let all = await ClassService.getAll();
    ClassesPage._render(all);

    document.getElementById('class-search').addEventListener('input', UI.debounce(() => {
      const q = document.getElementById('class-search').value.toLowerCase();
      const status = document.getElementById('class-status-filter').value;
      let f = all.filter(c => (c.class_name||'').toLowerCase().includes(q) ||
                              (c.teacher_name||'').toLowerCase().includes(q) ||
                              (c.subject_name||'').toLowerCase().includes(q));
      if (status) f = f.filter(c => c.status === status);
      ClassesPage._render(f);
    }));

    document.getElementById('class-status-filter').addEventListener('change', () => {
      document.getElementById('class-search').dispatchEvent(new Event('input'));
    });

    document.getElementById('add-class-btn').addEventListener('click', () => ClassesPage._showForm());
  },

  _render(classes) {
    const el = document.getElementById('classes-list');
    if (!el) return;
    if (classes.length === 0) { el.innerHTML = UI.emptyState('🏫','No classes found'); return; }

    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr>
            <th>Class</th><th>Subject</th><th>Teacher</th><th>Grade</th><th>Fee/Month</th><th>Enrollment</th><th>Schedule</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${classes.map(c => `
              <tr>
                <td class="font-semibold">${c.class_name}</td>
                <td>${c.subject_name||'—'}</td>
                <td>${c.teacher_name||'—'}</td>
                <td>${c.grade_name||'—'}</td>
                <td class="font-semibold text-success">Rs. ${c.fee_per_month||0}</td>
                <td>
                  <span class="badge ${c.current_enrollment >= c.max_capacity ? 'badge-danger' : 'badge-success'}">
                    ${c.current_enrollment||0}/${c.max_capacity||0}
                  </span>
                </td>
                <td style="font-size:var(--font-size-xs)">${(c.schedule_days||[]).join(', ')} ${c.schedule_time||''}</td>
                <td>${UI.statusBadge(c.status||'Active')}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm" onclick="ClassesPage._showForm('${c.id}')" title="Edit">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="ClassesPage._delete('${c.id}','${c.class_name}')" title="Delete">🗑</button>
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
    if (!await UI.confirm(`Delete class "${name}"?`)) return;
    try { await ClassService.delete(id); UI.toastSuccess('Class deleted.'); Router.navigate('classes'); }
    catch (e) { UI.toastError(e.message); }
  },

  async _showForm(id = null) {
    const cls = id ? await ClassService.getById(id) : null;
    const [teachers, subjects, grades] = await Promise.all([
      TeacherService.getAll('Active'),
      SubjectService.getAll(),
      GradeService.getAll()
    ]);
    const c = cls || {};
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const cDays = c.schedule_days || [];

    UI.showModal({
      title: id ? 'Edit Class' : 'Add Class',
      size: 'lg',
      body: `
        <form id="class-form" novalidate>
          <div class="form-grid form-grid-2">
            <div class="form-group form-full">
              <label class="form-label">Class Name <span class="required">*</span></label>
              <input class="form-control" name="class_name" value="${c.class_name||''}" required placeholder="e.g. Math Grade 10 Batch A" />
            </div>
            <div class="form-group">
              <label class="form-label">Subject <span class="required">*</span></label>
              <select class="form-control" name="subject_id" id="cls-subject" required>
                <option value="">Select subject...</option>
                ${subjects.map(s=>`<option value="${s.id}" data-name="${s.subject_name}" ${c.subject_id===s.id?'selected':''}>${s.subject_name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Teacher <span class="required">*</span></label>
              <select class="form-control" name="teacher_id" id="cls-teacher" required>
                <option value="">Select teacher...</option>
                ${teachers.map(t=>`<option value="${t.id}" data-name="${t.full_name}" data-commission="${t.default_commission_pct||60}" ${c.teacher_id===t.id?'selected':''}>${t.full_name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Grade</label>
              <select class="form-control" name="grade_id" id="cls-grade">
                <option value="">Select grade...</option>
                ${grades.map(g=>`<option value="${g.id}" data-name="${g.grade_name}" ${c.grade_id===g.id?'selected':''}>${g.grade_name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Class Type</label>
              <select class="form-control" name="class_type">
                ${['Individual','Group','Semi-Individual'].map(v=>`<option value="${v}" ${(c.class_type||'Group')===v?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fee Per Month (Rs.) <span class="required">*</span></label>
              <input class="form-control" type="number" name="fee_per_month" value="${c.fee_per_month||''}" min="0" required />
            </div>
            <div class="form-group">
              <label class="form-label">Teacher Commission % <span class="form-hint">(overrides teacher default)</span></label>
              <input class="form-control" type="number" name="teacher_commission_pct" id="cls-commission" value="${c.teacher_commission_pct !== undefined ? c.teacher_commission_pct : ''}" min="0" max="100" placeholder="Leave blank to use teacher default" />
            </div>
            <div class="form-group">
              <label class="form-label">Max Capacity</label>
              <input class="form-control" type="number" name="max_capacity" value="${c.max_capacity||20}" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">Start Time</label>
              <input class="form-control" type="time" name="schedule_time" value="${c.schedule_time||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">End Time</label>
              <input class="form-control" type="time" name="schedule_end_time" value="${c.schedule_end_time||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Duration (minutes)</label>
              <input class="form-control" type="number" name="duration_minutes" value="${c.duration_minutes||60}" />
            </div>
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input class="form-control" type="date" name="start_date" value="${c.start_date ? Fmt.toISODate(Fmt.toDate(c.start_date)) : ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-control" name="status">
                ${['Active','Inactive','Completed'].map(v=>`<option value="${v}" ${(c.status||'Active')===v?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Schedule Days</label>
            <div class="checkbox-grid">
              ${days.map(d=>`
                <label class="form-check">
                  <input type="checkbox" name="schedule_days" value="${d}" ${cDays.includes(d)?'checked':''}>
                  <span class="form-check-label">${d}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-group mt-4">
            <label class="form-label">Notes</label>
            <textarea class="form-control" name="notes">${c.notes||''}</textarea>
          </div>
        </form>
      `,
      footer: `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="save-class-btn">${id?'Save Changes':'Add Class'}</button>`
    });

    // Auto-fill commission from teacher selection
    document.getElementById('cls-teacher').addEventListener('change', function() {
      const opt = this.options[this.selectedIndex];
      const commInput = document.getElementById('cls-commission');
      if (commInput && !commInput.value) commInput.placeholder = `Teacher default: ${opt.dataset.commission || 60}%`;
    });

    document.getElementById('save-class-btn').addEventListener('click', async () => {
      const form = document.getElementById('class-form');
      const { valid, errors } = Validators.form(form, {
        class_name: ['required'], subject_id: ['required'], teacher_id: ['required'], fee_per_month: ['required','positive']
      });
      if (!valid) { Validators.showErrors(form, errors); return; }
      const btn = document.getElementById('save-class-btn');
      UI.btnLoading(btn, true);
      try {
        const fd = new FormData(form);
        const data = Object.fromEntries(fd);
        data.schedule_days = Array.from(form.querySelectorAll('input[name="schedule_days"]:checked')).map(el => el.value);
        data.fee_per_month = parseFloat(data.fee_per_month);
        data.max_capacity  = parseInt(data.max_capacity) || 20;
        data.duration_minutes = parseInt(data.duration_minutes) || 60;
        if (data.teacher_commission_pct === '') delete data.teacher_commission_pct;
        else data.teacher_commission_pct = parseFloat(data.teacher_commission_pct);

        // Denormalize names
        const teacherOpt = form.querySelector('#cls-teacher option:checked');
        const subjectOpt = form.querySelector('#cls-subject option:checked');
        const gradeOpt   = form.querySelector('#cls-grade option:checked');
        data.teacher_name = teacherOpt ? teacherOpt.text : '';
        data.subject_name = subjectOpt ? subjectOpt.text : '';
        data.grade_name   = gradeOpt   ? gradeOpt.text   : '';

        if (data.start_date) data.start_date = firebase.firestore.Timestamp.fromDate(new Date(data.start_date));

        if (id) await ClassService.update(id, data);
        else    await ClassService.create(data);

        UI.toastSuccess(id ? 'Class updated.' : 'Class added.');
        UI.closeModal();
        Router.navigate('classes');
      } catch (e) { UI.toastError(e.message); }
      finally { UI.btnLoading(btn, false); }
    });
  }
};

window.ClassesPage = ClassesPage;
