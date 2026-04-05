// ============================================================
// ENROLLMENTS PAGE — Multi-step wizard
// ============================================================

const EnrollmentsPage = {
  _state: { step: 1, student: null, classObj: null },

  async load(el) {
    el.innerHTML = `
      <div class="page-header">
        <div><h2>Enrollments</h2><p>Enroll students in classes</p></div>
        <button class="btn btn-primary" id="new-enrollment-btn">+ New Enrollment</button>
      </div>
      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="enr-search" placeholder="Search enrollments..." />
        </div>
        <select class="form-control" id="enr-status" style="width:auto">
          <option value="Active">Active</option>
          <option value="">All</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      <div id="enrollments-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
    `;

    let all = await EnrollmentService.getAll('Active');
    EnrollmentsPage._render(all);

    document.getElementById('enr-search').addEventListener('input', UI.debounce(async () => {
      const q = document.getElementById('enr-search').value.toLowerCase();
      const status = document.getElementById('enr-status').value;
      let items = await EnrollmentService.getAll(status || null);
      if (q) items = items.filter(e =>
        (e.student_name||'').toLowerCase().includes(q) ||
        (e.class_name||'').toLowerCase().includes(q));
      EnrollmentsPage._render(items);
    }));

    document.getElementById('enr-status').addEventListener('change', async () => {
      const status = document.getElementById('enr-status').value;
      const items  = await EnrollmentService.getAll(status || null);
      EnrollmentsPage._render(items);
    });

    document.getElementById('new-enrollment-btn').addEventListener('click', () => EnrollmentsPage._startWizard());
  },

  _render(enrollments) {
    const el = document.getElementById('enrollments-list');
    if (!el) return;
    if (enrollments.length === 0) { el.innerHTML = UI.emptyState('📋','No enrollments'); return; }

    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr>
            <th>Student</th><th>Class</th><th>Teacher</th><th>Fee/Mo</th><th>Next Due</th><th>Paid</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${enrollments.map(e => `
              <tr>
                <td class="font-semibold">${e.student_name}</td>
                <td>${e.class_name}<br><span style="font-size:11px;color:var(--text-muted)">${e.subject_name||''} · ${e.grade_name||''}</span></td>
                <td>${e.teacher_name||'—'}</td>
                <td class="font-semibold">Rs. ${e.fee_agreed||0}</td>
                <td>${Fmt.date(e.next_due_date)}</td>
                <td>Rs. ${e.total_paid||0}</td>
                <td>${UI.statusBadge(e.status)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm" onclick="EnrollmentsPage._cancel('${e.id}','${e.student_name}')" title="Cancel" ${e.status!=='Active'?'disabled':''}>❌</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _cancel(id, name) {
    if (!await UI.confirm(`Cancel enrollment for "${name}"? Pending dues will also be cancelled.`, 'Cancel Enrollment')) return;
    try {
      await EnrollmentService.cancel(id, 'Cancelled by admin');
      UI.toastSuccess('Enrollment cancelled.');
      Router.navigate('enrollments');
    } catch (e) { UI.toastError(e.message); }
  },

  _startWizard() {
    EnrollmentsPage._state = { step: 1, student: null, classObj: null };
    EnrollmentsPage._renderWizardStep();
  },

  _renderWizardStep() {
    const state = EnrollmentsPage._state;
    const stepLabels = ['Select Student','Select Class','Set Details','Confirm'];

    UI.showModal({
      title: 'New Enrollment',
      size: 'lg',
      body: `
        <div class="step-wizard">
          <div class="step-indicators">
            ${stepLabels.map((label, i) => `
              <div class="step-indicator">
                <div class="step-num ${i+1 < state.step ? 'done' : i+1 === state.step ? 'active' : ''}">${i+1 < state.step ? '✓' : i+1}</div>
                ${i < stepLabels.length-1 ? `<div class="step-line ${i+1 < state.step ? 'done' : ''}"></div>` : ''}
              </div>
            `).join('')}
          </div>
          <div id="wizard-content">
            <div class="loading-spinner"><div class="spinner"></div></div>
          </div>
        </div>
      `,
      footer: `<div id="wizard-footer"></div>`
    });

    EnrollmentsPage._loadWizardStep();
  },

  async _loadWizardStep() {
    const { step, student, classObj } = EnrollmentsPage._state;
    const content = document.getElementById('wizard-content');
    const footer  = document.getElementById('wizard-footer');
    if (!content) return;

    // Step 1: Search student
    if (step === 1) {
      content.innerHTML = `
        <h3 style="margin-bottom:var(--space-4)">Search Student</h3>
        <div style="position:relative">
          <input class="form-control" id="wiz-student-search" placeholder="Type student name or phone..." style="margin-bottom:var(--space-2)" />
          <div id="wiz-student-results"></div>
        </div>
        ${student ? `<div class="alert alert-success">Selected: <strong>${student.full_name}</strong></div>` : ''}
      `;
      footer.innerHTML = `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
                          <button class="btn btn-primary" id="wiz-next-1" ${!student?'disabled':''}>Next →</button>`;

      document.getElementById('wiz-student-search').addEventListener('input', UI.debounce(async function() {
        const q = this.value.trim();
        if (!q) { document.getElementById('wiz-student-results').innerHTML = ''; return; }
        const results = await StudentService.search(q);
        const resDiv = document.getElementById('wiz-student-results');
        if (!resDiv) return;
        resDiv.innerHTML = `<div class="student-search-result">
          ${results.slice(0,10).map(s => `
            <div class="student-search-item" onclick="EnrollmentsPage._selectStudent(${JSON.stringify({id:s.id,full_name:s.full_name,phone:s.phone||''}).replace(/"/g,'&quot;')})">
              <div class="ssi-name">${s.full_name}</div>
              <div class="ssi-meta">${s.phone||''} · ${s.status}</div>
            </div>
          `).join('') || '<div class="student-search-item text-muted">No results</div>'}
        </div>`;
      }));

      document.getElementById('wiz-next-1')?.addEventListener('click', () => {
        EnrollmentsPage._state.step = 2;
        EnrollmentsPage._loadWizardStep();
      });
    }

    // Step 2: Select class
    else if (step === 2) {
      const classes = await ClassService.getAll('Active');
      content.innerHTML = `
        <h3 style="margin-bottom:var(--space-4)">Select Class for <em>${student.full_name}</em></h3>
        <div class="filter-bar" style="margin-bottom:var(--space-3)">
          <input class="search-input" id="wiz-class-search" placeholder="Filter classes..." style="border:2px solid var(--border);border-radius:var(--radius);padding:var(--space-2) var(--space-4)" />
        </div>
        <div id="wiz-class-list">
          ${classes.map(c => `
            <div class="enrollment-select-card ${classObj && classObj.id === c.id ? 'selected' : ''}" onclick="EnrollmentsPage._selectClass(${JSON.stringify({id:c.id,class_name:c.class_name,fee_per_month:c.fee_per_month,teacher_name:c.teacher_name||'',subject_name:c.subject_name||'',grade_name:c.grade_name||'',current_enrollment:c.current_enrollment||0,max_capacity:c.max_capacity||0,teacher_commission_pct:c.teacher_commission_pct,teacher_id:c.teacher_id||''}).replace(/"/g,'&quot;')})">
              <div class="esc-class">${c.class_name}</div>
              <div class="esc-details">${c.subject_name||''} · ${c.grade_name||''} · ${c.teacher_name||''}</div>
              <div class="esc-meta">
                <div class="esc-meta-item">Fee: <span>Rs. ${c.fee_per_month}</span></div>
                <div class="esc-meta-item">Capacity: <span>${c.current_enrollment||0}/${c.max_capacity||0}</span></div>
                <div class="esc-meta-item">Schedule: <span>${(c.schedule_days||[]).join(', ')} ${c.schedule_time||''}</span></div>
              </div>
            </div>
          `).join('') || UI.emptyState('🏫','No active classes')}
        </div>
      `;
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="EnrollmentsPage._wizBack()">← Back</button>
        <button class="btn btn-primary" id="wiz-next-2" ${!classObj?'disabled':''}>Next →</button>
      `;
      document.getElementById('wiz-next-2')?.addEventListener('click', () => {
        EnrollmentsPage._state.step = 3;
        EnrollmentsPage._loadWizardStep();
      });
    }

    // Step 3: Details
    else if (step === 3) {
      const today = Fmt.toISODate(new Date());
      content.innerHTML = `
        <h3 style="margin-bottom:var(--space-4)">Enrollment Details</h3>
        <p style="color:var(--text-muted);margin-bottom:var(--space-4)">Student: <strong>${student.full_name}</strong> → Class: <strong>${classObj.class_name}</strong></p>
        <form id="enr-detail-form">
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label">Fee Per Month (Rs.) <span class="required">*</span></label>
              <input class="form-control" type="number" name="fee_agreed" value="${classObj.fee_per_month}" min="0" required />
              <span class="form-hint">Class base fee: Rs. ${classObj.fee_per_month}. Change for student-specific rate.</span>
            </div>
            <div class="form-group">
              <label class="form-label">Payment Due Day (1-28) <span class="required">*</span></label>
              <input class="form-control" type="number" name="payment_due_day" value="5" min="1" max="28" required />
              <span class="form-hint">Day of month when fee is due</span>
            </div>
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input class="form-control" type="date" name="start_date" value="${today}" />
            </div>
            <div class="form-group">
              <label class="form-label">Discount Notes</label>
              <input class="form-control" name="discount_notes" placeholder="Reason for fee adjustment..." />
            </div>
            <div class="form-group form-full">
              <label class="form-label">Notes</label>
              <textarea class="form-control" name="notes"></textarea>
            </div>
          </div>
        </form>
      `;
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="EnrollmentsPage._wizBack()">← Back</button>
        <button class="btn btn-primary" id="wiz-next-3">Review →</button>
      `;
      document.getElementById('wiz-next-3').addEventListener('click', () => {
        const form = document.getElementById('enr-detail-form');
        const data = Object.fromEntries(new FormData(form));
        EnrollmentsPage._state.details = data;
        EnrollmentsPage._state.step = 4;
        EnrollmentsPage._loadWizardStep();
      });
    }

    // Step 4: Confirm
    else if (step === 4) {
      const d = EnrollmentsPage._state.details;
      content.innerHTML = `
        <h3 style="margin-bottom:var(--space-4)">Confirm Enrollment</h3>
        <div class="receipt-box">
          <div class="receipt-row"><span>Student</span><strong>${student.full_name}</strong></div>
          <div class="receipt-row"><span>Class</span><strong>${classObj.class_name}</strong></div>
          <div class="receipt-row"><span>Subject</span><span>${classObj.subject_name}</span></div>
          <div class="receipt-row"><span>Teacher</span><span>${classObj.teacher_name}</span></div>
          <div class="receipt-row"><span>Grade</span><span>${classObj.grade_name}</span></div>
          <div class="receipt-divider"></div>
          <div class="receipt-row"><span>Fee Per Month</span><strong>Rs. ${d.fee_agreed}</strong></div>
          <div class="receipt-row"><span>Payment Due Day</span><span>${d.payment_due_day}th of month</span></div>
          <div class="receipt-row"><span>Start Date</span><span>${d.start_date}</span></div>
          ${d.discount_notes ? `<div class="receipt-row"><span>Discount Note</span><span>${d.discount_notes}</span></div>` : ''}
        </div>
        <div class="alert alert-info" style="margin-top:var(--space-4)">
          ℹ️ This will generate a 12-month due schedule starting from the start date.
        </div>
      `;
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="EnrollmentsPage._wizBack()">← Back</button>
        <button class="btn btn-primary" id="wiz-confirm">✅ Confirm Enrollment</button>
      `;
      document.getElementById('wiz-confirm').addEventListener('click', async () => {
        const btn = document.getElementById('wiz-confirm');
        UI.btnLoading(btn, true, 'Enrolling...');
        try {
          const d = EnrollmentsPage._state.details;
          await EnrollmentService.create({
            student_id: student.id,
            class_id:   classObj.id,
            fee_agreed: parseFloat(d.fee_agreed),
            payment_due_day: parseInt(d.payment_due_day),
            start_date: new Date(d.start_date),
            discount_notes: d.discount_notes || '',
            notes: d.notes || ''
          });
          UI.closeModal();
          UI.toastSuccess(`${student.full_name} enrolled in ${classObj.class_name}!`);
          Router.navigate('enrollments');
        } catch (e) {
          UI.toastError(e.message);
        } finally {
          UI.btnLoading(btn, false);
        }
      });
    }
  },

  _selectStudent(student) {
    EnrollmentsPage._state.student = student;
    document.getElementById('wiz-student-results').innerHTML = '';
    document.getElementById('wiz-student-search').value = student.full_name;
    const content = document.getElementById('wizard-content');
    const existing = content.querySelector('.alert-success');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'alert alert-success';
    div.innerHTML = `Selected: <strong>${student.full_name}</strong>`;
    content.appendChild(div);
    const btn = document.getElementById('wiz-next-1');
    if (btn) btn.disabled = false;
  },

  _selectClass(cls) {
    EnrollmentsPage._state.classObj = cls;
    document.querySelectorAll('.enrollment-select-card').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    const btn = document.getElementById('wiz-next-2');
    if (btn) btn.disabled = false;
  },

  _wizBack() {
    EnrollmentsPage._state.step--;
    EnrollmentsPage._loadWizardStep();
  }
};

window.EnrollmentsPage = EnrollmentsPage;
