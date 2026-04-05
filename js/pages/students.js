// ============================================================
// STUDENTS PAGE — List, Add/Edit, Detail, QR Card
// ============================================================

const StudentsPage = {
  async load(el, param) {
    if (param) {
      await StudentsPage._loadDetail(el, param);
    } else {
      await StudentsPage._loadList(el);
    }
  },

  async _loadList(el) {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h2>Students</h2>
          <p>Manage student profiles and QR cards</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline" id="bulk-qr-btn">🖨 Bulk QR Print</button>
          <button class="btn btn-primary"  id="add-student-btn">+ Add Student</button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="student-search" placeholder="Search by name, phone..." />
        </div>
        <select class="form-control" id="status-filter" style="width:auto">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Graduated">Graduated</option>
        </select>
      </div>
      <div id="students-table"><div class="loading-spinner"><div class="spinner"></div></div></div>
    `;

    let allStudents = await StudentService.getAll();
    StudentsPage._render(allStudents);

    // Search
    const searchEl = document.getElementById('student-search');
    searchEl.addEventListener('input', UI.debounce(async () => {
      const q = searchEl.value.trim();
      const status = document.getElementById('status-filter').value;
      let filtered = q ? await StudentService.search(q) : await StudentService.getAll();
      if (status) filtered = filtered.filter(s => s.status === status);
      StudentsPage._render(filtered);
    }));

    document.getElementById('status-filter').addEventListener('change', async () => {
      const status = document.getElementById('status-filter').value;
      const q = document.getElementById('student-search').value.trim();
      let filtered = q ? await StudentService.search(q) : await StudentService.getAll();
      if (status) filtered = filtered.filter(s => s.status === status);
      StudentsPage._render(filtered);
    });

    document.getElementById('add-student-btn').addEventListener('click', () => StudentsPage._showForm());
    document.getElementById('bulk-qr-btn').addEventListener('click', async () => {
      const students = await StudentService.getAll('Active');
      const settings = await SettingsService.get();
      if (students.length === 0) { UI.toast('No active students found.', 'warning'); return; }
      await QRGenerator.printBulk(students, settings);
    });
  },

  _render(students) {
    const el = document.getElementById('students-table');
    if (!el) return;
    if (students.length === 0) {
      el.innerHTML = UI.emptyState('👨‍🎓', 'No students found', 'Add your first student to get started.');
      return;
    }
    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr>
            <th>Student</th><th>Phone</th><th>Parent</th><th>Enrollments</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    ${s.photo_url
                      ? `<img src="${s.photo_url}" class="avatar" alt="${s.full_name}">`
                      : UI.avatar(s.full_name)}
                    <div>
                      <div class="font-semibold">${s.full_name}</div>
                      <div class="text-muted" style="font-size:var(--font-size-xs)">${s.email || ''}</div>
                    </div>
                  </div>
                </td>
                <td>${s.phone || '—'}</td>
                <td>
                  <div class="font-semibold" style="font-size:var(--font-size-sm)">${s.parent_name || '—'}</div>
                  <div class="text-muted" style="font-size:var(--font-size-xs)">${s.parent_phone || ''}</div>
                </td>
                <td><span class="badge badge-info">${s.active_enrollment_count || 0} active</span></td>
                <td>${UI.statusBadge(s.status || 'Active')}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm" onclick="StudentsPage._viewDetail('${s.id}')" title="View">👁</button>
                    <button class="btn btn-ghost btn-sm" onclick="StudentsPage._showForm('${s.id}')" title="Edit">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="StudentsPage._printQR('${s.id}')" title="QR Card">📱</button>
                    <button class="btn btn-ghost btn-sm" onclick="StudentsPage._delete('${s.id}','${s.full_name}')" title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _viewDetail(id) { Router.navigate('students/' + id); },

  async _printQR(id) {
    const student  = await StudentService.getById(id);
    const settings = await SettingsService.get();
    await QRGenerator.printCard(student, settings);
  },

  async _delete(id, name) {
    if (!await UI.confirm(`Delete student "${name}"? This cannot be undone.`, 'Delete Student')) return;
    try {
      await StudentService.delete(id);
      UI.toastSuccess('Student deleted.');
      Router.navigate('students');
    } catch (e) {
      UI.toastError(e.message);
    }
  },

  async _showForm(id = null) {
    const student  = id ? await StudentService.getById(id) : null;
    const title    = id ? 'Edit Student' : 'Add Student';
    const s        = student || {};

    UI.showModal({
      title,
      size: 'lg',
      body: `
        <form id="student-form" novalidate>
          <div class="section-title">Personal Info</div>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input class="form-control" name="full_name" value="${s.full_name||''}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Date of Birth</label>
              <input class="form-control" type="date" name="date_of_birth" value="${s.date_of_birth ? Fmt.toISODate(Fmt.toDate(s.date_of_birth)) : ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="form-control" name="phone" value="${s.phone||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-control" type="email" name="email" value="${s.email||''}" />
            </div>
            <div class="form-group form-full">
              <label class="form-label">Address</label>
              <input class="form-control" name="address" value="${s.address||''}" />
            </div>
          </div>
          <div class="section-title" style="margin-top:var(--space-5)">Parent / Guardian</div>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label">Parent Name</label>
              <input class="form-control" name="parent_name" value="${s.parent_name||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Parent Phone</label>
              <input class="form-control" name="parent_phone" value="${s.parent_phone||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Parent Email</label>
              <input class="form-control" type="email" name="parent_email" value="${s.parent_email||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp <span class="form-hint">(+94XXXXXXXXX)</span></label>
              <input class="form-control" name="parent_whatsapp" placeholder="+94771234567" value="${s.parent_whatsapp||''}" />
            </div>
          </div>
          <div class="section-title" style="margin-top:var(--space-5)">Other</div>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-control" name="status">
                ${['Active','Inactive','Graduated'].map(v => `<option value="${v}" ${(s.status||'Active')===v?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Card UID (RFID, optional)</label>
              <input class="form-control" name="card_uid" value="${s.card_uid||''}" />
            </div>
            <div class="form-group form-full">
              <label class="form-label">Notes</label>
              <textarea class="form-control" name="notes">${s.notes||''}</textarea>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-student-btn">${id ? 'Save Changes' : 'Add Student'}</button>
      `
    });

    document.getElementById('save-student-btn').addEventListener('click', async () => {
      const form = document.getElementById('student-form');
      const { valid, errors } = Validators.form(form, { full_name: ['required'] });
      if (!valid) { Validators.showErrors(form, errors); return; }

      const btn = document.getElementById('save-student-btn');
      UI.btnLoading(btn, true);
      try {
        const data = Object.fromEntries(new FormData(form));
        if (id) {
          await StudentService.update(id, data);
          UI.toastSuccess('Student updated.');
        } else {
          await StudentService.create(data);
          UI.toastSuccess('Student added.');
        }
        UI.closeModal();
        StudentsPage._loadList(document.getElementById('content-area'));
      } catch (e) {
        UI.toastError(e.message);
      } finally {
        UI.btnLoading(btn, false);
      }
    });
  },

  async _loadDetail(el, id) {
    const student = await StudentService.getById(id);
    if (!student) { el.innerHTML = UI.emptyState('❌', 'Student not found'); return; }

    const [enrollments, payments, attendance] = await Promise.all([
      EnrollmentService.getByStudent(id),
      PaymentService.getByStudent(id, 10),
      AttendanceService.getStudentAttendance(id)
    ]);
    const settings = await SettingsService.get();
    const cur = settings.currency_symbol || 'Rs.';

    el.innerHTML = `
      <div class="page-header">
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('students')">← Back</button>
        <div class="page-header-actions">
          <button class="btn btn-outline" onclick="StudentsPage._printQR('${id}')">📱 Print QR Card</button>
          <button class="btn btn-primary"  onclick="StudentsPage._showForm('${id}')">✏️ Edit</button>
        </div>
      </div>

      <!-- Profile header -->
      <div class="card mb-4" style="margin-bottom:var(--space-4)">
        <div class="card-body">
          <div class="flex gap-4 items-center" style="flex-wrap:wrap">
            ${student.photo_url
              ? `<img src="${student.photo_url}" class="avatar avatar-xl" alt="${student.full_name}">`
              : UI.avatar(student.full_name, 'xl')}
            <div style="flex:1">
              <h2 style="font-size:var(--font-size-2xl)">${student.full_name}</h2>
              <p class="text-muted">${student.email || ''}</p>
              <div class="flex gap-2 mt-2">
                ${UI.statusBadge(student.status || 'Active')}
                <span class="badge badge-info">${enrollments.filter(e=>e.status==='Active').length} active enrollments</span>
              </div>
            </div>
            <!-- QR Code -->
            <div style="text-align:center">
              <div id="student-qr-code"></div>
              <div style="font-size:var(--font-size-xs);color:var(--text-muted);margin-top:4px">Scan to view dues</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="card">
        <div class="card-body">
          <div class="tabs">
            <button class="tab-btn" data-tab="tab-info">Info</button>
            <button class="tab-btn" data-tab="tab-enrollments">Enrollments (${enrollments.length})</button>
            <button class="tab-btn" data-tab="tab-payments">Payments (${payments.length})</button>
            <button class="tab-btn" data-tab="tab-attendance">Attendance</button>
          </div>

          <!-- Info Tab -->
          <div id="tab-info" class="tab-panel">
            <div class="form-grid form-grid-2" style="gap:var(--space-6)">
              <div>
                <div class="section-title">Contact</div>
                <div class="info-list">
                  <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${student.phone||'—'}</span></div>
                  <div class="info-row"><span class="info-label">Email</span><span class="info-value">${student.email||'—'}</span></div>
                  <div class="info-row"><span class="info-label">Address</span><span class="info-value">${student.address||'—'}</span></div>
                  <div class="info-row"><span class="info-label">Registered</span><span class="info-value">${Fmt.date(student.registration_date)}</span></div>
                </div>
              </div>
              <div>
                <div class="section-title">Parent / Guardian</div>
                <div class="info-list">
                  <div class="info-row"><span class="info-label">Parent</span><span class="info-value">${student.parent_name||'—'}</span></div>
                  <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${student.parent_phone||'—'}</span></div>
                  <div class="info-row"><span class="info-label">Email</span><span class="info-value">${student.parent_email||'—'}</span></div>
                  <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-value">${student.parent_whatsapp||'—'}</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Enrollments Tab -->
          <div id="tab-enrollments" class="tab-panel">
            <button class="btn btn-primary btn-sm mb-4" onclick="Router.navigate('enrollments')">+ New Enrollment</button>
            ${enrollments.length === 0 ? UI.emptyState('📋','No enrollments') :
              enrollments.map(e => `
                <div style="border:1px solid var(--border);border-radius:var(--radius);padding:var(--space-4);margin-bottom:var(--space-3)">
                  <div class="flex justify-between items-center" style="flex-wrap:wrap;gap:var(--space-2)">
                    <div>
                      <div class="font-semibold">${e.class_name}</div>
                      <div class="text-muted" style="font-size:var(--font-size-xs)">${e.subject_name} · ${e.grade_name||''} · ${e.teacher_name}</div>
                    </div>
                    <div class="flex gap-2 items-center">
                      <span class="font-semibold text-primary-color">${Fmt.currency(e.fee_agreed, cur)}/mo</span>
                      ${UI.statusBadge(e.status)}
                    </div>
                  </div>
                  <div class="flex gap-4 mt-2" style="font-size:var(--font-size-xs);color:var(--text-muted);flex-wrap:wrap">
                    <span>Next due: <strong>${Fmt.date(e.next_due_date)}</strong></span>
                    <span>Total paid: <strong>${Fmt.currency(e.total_paid, cur)}</strong></span>
                    <span>Months: <strong>${e.months_paid_count||0}</strong></span>
                  </div>
                </div>
              `).join('')}
          </div>

          <!-- Payments Tab -->
          <div id="tab-payments" class="tab-panel">
            ${payments.length === 0 ? UI.emptyState('💰','No payments') : `
              <div class="table-container">
                <table class="table">
                  <thead><tr><th>Receipt</th><th>Class</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
                  <tbody>
                    ${payments.map(p => `
                      <tr>
                        <td><code class="font-mono" style="font-size:11px">${p.receipt_number}</code></td>
                        <td>${p.class_name}</td>
                        <td class="font-semibold text-success">${Fmt.currency(p.amount_paid, cur)}</td>
                        <td>${p.payment_method}</td>
                        <td>${Fmt.date(p.payment_date)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- Attendance Tab -->
          <div id="tab-attendance" class="tab-panel">
            ${attendance.length === 0 ? UI.emptyState('✅','No attendance records') : `
              <div class="table-container">
                <table class="table">
                  <thead><tr><th>Date</th><th>Class</th><th>Status</th></tr></thead>
                  <tbody>
                    ${attendance.slice(0,20).map(a => `
                      <tr>
                        <td>${Fmt.date(a.marked_at)}</td>
                        <td>${a.class_id}</td>
                        <td>${UI.statusBadge(a.status)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    UI.initTabs(el);

    // Generate QR code
    const qrContainer = document.getElementById('student-qr-code');
    if (qrContainer) QRGenerator.generate(id, qrContainer, 120);
  }
};

window.StudentsPage = StudentsPage;
