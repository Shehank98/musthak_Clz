// ============================================================
// PAYMENTS PAGE — Record payment wizard + history + pending dues
// ============================================================

const PaymentsPage = {
  _state: { step: 1, student: null, enrollment: null, settings: null },

  async load(el, param) {
    const settings = await SettingsService.get();
    const cur = settings.currency_symbol || 'Rs.';
    PaymentsPage._state.settings = settings;

    el.innerHTML = `
      <div class="page-header">
        <div><h2>Payments</h2></div>
        <button class="btn btn-primary" id="record-payment-btn">+ Record Payment</button>
      </div>

      <div class="tabs" id="payment-tabs">
        <button class="tab-btn" data-tab="tab-history">Payment History</button>
        <button class="tab-btn" data-tab="tab-dues">Pending Dues</button>
      </div>

      <!-- History Tab -->
      <div id="tab-history" class="tab-panel">
        <div class="filter-bar">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input class="search-input" id="pay-search" placeholder="Search by student, class..." />
          </div>
        </div>
        <div id="payments-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
      </div>

      <!-- Dues Tab -->
      <div id="tab-dues" class="tab-panel">
        <div class="filter-bar">
          <button class="btn btn-outline btn-sm" id="send-bulk-reminder-btn">📤 Send Bulk Reminders</button>
          <button class="btn btn-outline btn-sm" id="export-defaulters-btn">📥 Export Defaulters</button>
        </div>
        <div id="dues-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
      </div>
    `;

    UI.initTabs(el);

    // Load data
    await Promise.all([
      PaymentsPage._loadHistory(cur),
      PaymentsPage._loadDues(cur, settings)
    ]);

    document.getElementById('record-payment-btn').addEventListener('click', () => PaymentsPage._startWizard());

    document.getElementById('pay-search').addEventListener('input', UI.debounce(async () => {
      const q = document.getElementById('pay-search').value.toLowerCase();
      const payments = await PaymentService.getAll(100);
      const filtered = q ? payments.filter(p =>
        (p.student_name||'').toLowerCase().includes(q) ||
        (p.class_name||'').toLowerCase().includes(q) ||
        (p.receipt_number||'').toLowerCase().includes(q)) : payments;
      PaymentsPage._renderHistory(filtered, cur);
    }));

    document.getElementById('export-defaulters-btn').addEventListener('click', async () => {
      const dues = await DueScheduleService.getAllPending();
      CSVExport.exportDues(dues, 'defaulters.csv');
    });
  },

  async _loadHistory(cur) {
    const payments = await PaymentService.getAll(50);
    PaymentsPage._renderHistory(payments, cur);
  },

  _renderHistory(payments, cur) {
    const el = document.getElementById('payments-list');
    if (!el) return;
    if (payments.length === 0) { el.innerHTML = UI.emptyState('💰','No payments yet'); return; }
    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr>
            <th>Receipt</th><th>Student</th><th>Class</th><th>Months</th><th>Amount</th><th>Teacher</th><th>Center</th><th>Method</th><th>Date</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td><code class="font-mono" style="font-size:11px">${p.receipt_number}</code></td>
                <td class="font-semibold">${p.student_name}</td>
                <td>${p.class_name}</td>
                <td>${p.months_paid} mo</td>
                <td class="font-semibold text-success">${Fmt.currency(p.amount_paid, cur)}</td>
                <td>${Fmt.currency(p.teacher_amount, cur)}</td>
                <td>${Fmt.currency(p.center_amount, cur)}</td>
                <td>${UI.badge(p.payment_method,'info')}</td>
                <td>${Fmt.date(p.payment_date)}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" onclick="PaymentsPage._showReceipt(${JSON.stringify(p).replace(/"/g,'&quot;')})" title="Receipt">🧾</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _loadDues(cur, settings) {
    const dues = await DueScheduleService.getAllPending();
    const el   = document.getElementById('dues-list');
    if (!el) return;
    if (dues.length === 0) { el.innerHTML = `<div class="alert alert-success">✅ All dues are paid!</div>`; return; }

    // Load student names for display
    const studentIds = [...new Set(dues.map(d => d.student_id))].slice(0, 30);
    const studentsMap = {};
    await Promise.all(studentIds.map(async id => {
      const s = await StudentService.getById(id);
      if (s) studentsMap[id] = s;
    }));

    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr>
            <th>Student</th><th>Class</th><th>Due Month</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${dues.map(d => {
              const st  = studentsMap[d.student_id];
              const ds  = DateHelpers.dueStatus(d.due_date, d.status);
              const daysOver = ds === 'overdue' ? DateHelpers.daysOverdue(d.due_date) : 0;
              const rowClass = ds === 'overdue' ? 'due-row-overdue' : ds === 'today' ? 'due-row-today' : '';
              return `
                <tr class="${rowClass}">
                  <td class="font-semibold">${st ? st.full_name : d.student_id.substring(0,8)}</td>
                  <td>${d.class_id ? '' : '—'}</td>
                  <td>${Fmt.monthYear(d.due_month)}</td>
                  <td>${Fmt.date(d.due_date)}</td>
                  <td class="font-semibold ${ds==='overdue'?'text-danger':''}">${Fmt.currency(d.balance, cur)}</td>
                  <td>
                    <span class="badge ${ds==='overdue'?'badge-danger':ds==='today'?'badge-warning':'badge-info'}">
                      ${ds==='overdue' ? `Overdue ${daysOver}d` : ds==='today' ? 'Due Today' : 'Upcoming'}
                    </span>
                  </td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-ghost btn-sm" onclick="PaymentsPage._sendReminder('${d.id}','${d.student_id}')" title="Send Reminder">📤</button>
                      <button class="btn btn-ghost btn-sm" onclick="PaymentsPage._waiveDue('${d.id}')" title="Waive">✓</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _sendReminder(dueId, studentId) {
    const settings = await SettingsService.get();
    const student  = await StudentService.getById(studentId);
    if (!student) { UI.toastError('Student not found.'); return; }

    const due = (await DueScheduleService.getByEnrollment(
      (await DueScheduleService.col().doc(dueId).get()).data()?.enrollment_id
    )).find(d => d.id === dueId);

    if (!due) return;

    const params = {
      student_name: student.full_name,
      parent_name:  student.parent_name || student.full_name,
      class_name:   due.class_id,
      due_month:    Fmt.monthYear(due.due_month),
      due_date:     Fmt.date(due.due_date),
      amount_due:   Fmt.currency(due.balance, settings.currency_symbol),
      currency:     settings.currency_symbol || 'Rs.',
      center_name:  settings.center_name || 'Musthak Classes',
      center_phone: settings.center_phone || ''
    };

    try {
      if (student.parent_email || student.email) {
        await NotificationEmailJS.sendDueReminder(student.parent_email || student.email, params, settings);
      }
      const waNum = student.parent_whatsapp || student.parent_phone;
      if (waNum && settings.callmebot_api_key) {
        const msg = NotificationWhatsApp.reminderMessage(student.full_name, due.class_id, due.balance, Fmt.toDate(due.due_date), settings.currency_symbol || 'Rs.', settings.center_phone || '');
        await NotificationWhatsApp.send(waNum, msg, settings.callmebot_api_key);
      }
      await DueScheduleService.markReminderSent(dueId);
      UI.toastSuccess('Reminder sent!');
    } catch (e) {
      UI.toastError('Reminder failed: ' + e.message);
    }
  },

  async _waiveDue(dueId) {
    if (!await UI.confirm('Waive this due amount?', 'Waive Due')) return;
    try {
      await DueScheduleService.waive(dueId, 'Admin waiver');
      UI.toastSuccess('Due waived.');
      Router.navigate('payments');
    } catch (e) { UI.toastError(e.message); }
  },

  // ---- Payment recording wizard ----
  _startWizard() {
    PaymentsPage._state = { step: 1, student: null, enrollment: null, settings: PaymentsPage._state.settings };
    PaymentsPage._renderWizardStep();
  },

  _renderWizardStep() {
    const state = PaymentsPage._state;
    const labels = ['Select Student','Select Enrollment','Payment Details','Receipt'];
    UI.showModal({
      title: 'Record Payment',
      size: 'lg',
      body: `
        <div class="step-wizard">
          <div class="step-indicators">
            ${labels.map((l, i) => `
              <div class="step-indicator">
                <div class="step-num ${i+1 < state.step ? 'done' : i+1 === state.step ? 'active' : ''}">${i+1 < state.step ? '✓' : i+1}</div>
                ${i < labels.length-1 ? `<div class="step-line ${i+1 < state.step ? 'done' : ''}"></div>` : ''}
              </div>
            `).join('')}
          </div>
          <div id="pay-wiz-content"><div class="loading-spinner"><div class="spinner"></div></div></div>
        </div>
      `,
      footer: `<div id="pay-wiz-footer"></div>`
    });
    PaymentsPage._loadWizardStep();
  },

  async _loadWizardStep() {
    const { step, student, enrollment, settings } = PaymentsPage._state;
    const content = document.getElementById('pay-wiz-content');
    const footer  = document.getElementById('pay-wiz-footer');
    if (!content) return;
    const cur = (settings && settings.currency_symbol) || 'Rs.';

    // Step 1: Search student
    if (step === 1) {
      content.innerHTML = `
        <h3 style="margin-bottom:var(--space-4)">Find Student</h3>
        <p class="text-muted" style="margin-bottom:var(--space-3)">Search by name or phone, or scan QR code.</p>
        <div style="position:relative;margin-bottom:var(--space-3)">
          <input class="form-control" id="pay-student-search" placeholder="Type student name or phone..." />
          <div id="pay-student-results"></div>
        </div>
        ${student ? `<div class="alert alert-success" id="pay-selected-student">Selected: <strong>${student.full_name}</strong></div>` : ''}
      `;
      footer.innerHTML = `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
                          <button class="btn btn-primary" id="pay-next-1" ${!student?'disabled':''}>Next →</button>`;

      document.getElementById('pay-student-search').addEventListener('input', UI.debounce(async function() {
        const q = this.value.trim();
        if (!q) { document.getElementById('pay-student-results').innerHTML = ''; return; }
        const results = await StudentService.search(q);
        const resDiv = document.getElementById('pay-student-results');
        if (!resDiv) return;
        resDiv.innerHTML = `<div class="student-search-result">
          ${results.slice(0,8).map(s => `
            <div class="student-search-item" onclick="PaymentsPage._selectStudent(${JSON.stringify({id:s.id,full_name:s.full_name,phone:s.phone||'',parent_email:s.parent_email||s.email||'',parent_whatsapp:s.parent_whatsapp||s.parent_phone||''}).replace(/"/g,'&quot;')})">
              <div class="ssi-name">${s.full_name}</div>
              <div class="ssi-meta">${s.phone||''}</div>
            </div>
          `).join('') || '<div class="student-search-item text-muted">No results</div>'}
        </div>`;
      }));

      document.getElementById('pay-next-1')?.addEventListener('click', () => {
        PaymentsPage._state.step = 2;
        PaymentsPage._loadWizardStep();
      });
    }

    // Step 2: Select enrollment
    else if (step === 2) {
      const enrollments = await EnrollmentService.getActiveByStudent(student.id);
      // Get next pending due for each
      const enriched = await Promise.all(enrollments.map(async e => {
        const dues = await DueScheduleService.getNextPending(e.id, 1);
        return { ...e, nextDue: dues[0] || null };
      }));

      content.innerHTML = `
        <h3 style="margin-bottom:var(--space-4)">Select Enrollment for <em>${student.full_name}</em></h3>
        ${enriched.length === 0 ? UI.emptyState('📋','No active enrollments','Enroll student in a class first.') :
          enriched.map(e => `
            <div class="enrollment-select-card ${enrollment && enrollment.id === e.id ? 'selected' : ''}"
                 onclick="PaymentsPage._selectEnrollment(${JSON.stringify({id:e.id,class_name:e.class_name,fee_agreed:e.fee_agreed,teacher_id:e.teacher_id||'',class_id:e.class_id,months_paid_count:e.months_paid_count||0,total_outstanding:e.total_outstanding||0}).replace(/"/g,'&quot;')})">
              <div class="esc-class">${e.class_name}</div>
              <div class="esc-details">${e.subject_name||''} · ${e.grade_name||''} · ${e.teacher_name||''}</div>
              <div class="esc-meta">
                <div class="esc-meta-item">Fee: <span>Rs. ${e.fee_agreed}</span></div>
                <div class="esc-meta-item">Next due: <span>${e.nextDue ? Fmt.monthYear(e.nextDue.due_month) : 'None pending'}</span></div>
                <div class="esc-meta-item">Outstanding: <span class="${e.total_outstanding > 0 ? 'text-danger' : ''}">${Fmt.currency(e.total_outstanding, cur)}</span></div>
              </div>
            </div>
          `).join('')}
      `;
      footer.innerHTML = `<button class="btn btn-outline" onclick="PaymentsPage._payWizBack()">← Back</button>
                          <button class="btn btn-primary" id="pay-next-2" ${!enrollment?'disabled':''}>Next →</button>`;
      document.getElementById('pay-next-2')?.addEventListener('click', () => {
        PaymentsPage._state.step = 3;
        PaymentsPage._loadWizardStep();
      });
    }

    // Step 3: Payment details with live calculation
    else if (step === 3) {
      const advDisc = settings.advance_discount_pct || 5;
      const advMin  = settings.advance_discount_min_months || 2;

      content.innerHTML = `
        <h3 style="margin-bottom:var(--space-4)">Payment Details</h3>
        <p class="text-muted" style="margin-bottom:var(--space-4)">${student.full_name} → ${enrollment.class_name}</p>

        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label class="form-label">Amount Per Month (Rs.)</label>
            <input class="form-control" type="number" id="pay-amount" value="${enrollment.fee_agreed}" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Months to Pay</label>
            <input class="form-control" type="number" id="pay-months" value="1" min="1" max="12" />
          </div>
          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select class="form-control" id="pay-method">
              ${['Cash','Card','Bank Transfer','Online'].map(v=>`<option value="${v}">${v}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Paid By (name)</label>
            <input class="form-control" id="pay-paid-by" placeholder="Parent/student name" />
          </div>
          <div class="form-group form-full">
            <label class="form-check">
              <input type="checkbox" id="pay-advance-disc" disabled />
              <span class="form-check-label">Advance Discount (${advDisc}%) — requires ≥${advMin} months</span>
            </label>
          </div>
        </div>

        <!-- Live payment summary -->
        <div class="payment-summary-box" id="pay-summary">
          <div class="ps-label">Total Amount Due</div>
          <div class="ps-value" id="pay-total">Rs. 0.00</div>
          <div class="payment-split">
            <div class="payment-split-item">
              <div class="split-label">Teacher</div>
              <div class="split-value" id="pay-teacher-split">Rs. 0</div>
            </div>
            <div class="payment-split-item">
              <div class="split-label">Center</div>
              <div class="split-value" id="pay-center-split">Rs. 0</div>
            </div>
          </div>
        </div>
        <div id="pay-discount-info" style="font-size:var(--font-size-xs);color:var(--text-muted);margin-top:-var(--space-2)"></div>

        <div class="form-group">
          <label class="form-label">Notes</label>
          <input class="form-control" id="pay-notes" placeholder="Optional notes..." />
        </div>
      `;

      footer.innerHTML = `<button class="btn btn-outline" onclick="PaymentsPage._payWizBack()">← Back</button>
                          <button class="btn btn-primary" id="pay-save-btn">💾 Save Payment</button>`;

      // Live calculation
      const classDoc = await ClassService.getById(enrollment.class_id);
      const commPct  = (classDoc && classDoc.teacher_commission_pct !== undefined)
        ? classDoc.teacher_commission_pct
        : (settings.default_commission_pct || 60);

      const recalc = () => {
        const amt   = parseFloat(document.getElementById('pay-amount').value)  || 0;
        const mos   = parseInt(document.getElementById('pay-months').value)    || 1;
        const disc  = document.getElementById('pay-advance-disc').checked;
        const discEl = document.getElementById('pay-advance-disc');
        discEl.disabled = mos < advMin;
        if (mos < advMin && disc) discEl.checked = false;

        const calc = PaymentService.calculate(amt, mos, commPct, advDisc, discEl.checked);
        document.getElementById('pay-total').textContent = Fmt.currency(calc.amountPaid, cur);
        document.getElementById('pay-teacher-split').textContent = Fmt.currency(calc.teacherAmt, cur);
        document.getElementById('pay-center-split').textContent  = Fmt.currency(calc.centerAmt, cur);
        document.getElementById('pay-discount-info').textContent =
          discEl.checked ? `Advance discount: -${Fmt.currency(calc.discount, cur)}` : '';
      };

      document.getElementById('pay-amount').addEventListener('input', recalc);
      document.getElementById('pay-months').addEventListener('input', recalc);
      document.getElementById('pay-advance-disc').addEventListener('change', recalc);
      recalc();

      document.getElementById('pay-save-btn').addEventListener('click', async () => {
        const btn = document.getElementById('pay-save-btn');
        UI.btnLoading(btn, true, 'Recording...');
        try {
          const amt  = parseFloat(document.getElementById('pay-amount').value);
          const mos  = parseInt(document.getElementById('pay-months').value);
          const disc = document.getElementById('pay-advance-disc').checked;
          const calc = PaymentService.calculate(amt, mos, commPct, advDisc, disc);

          const payment = await PaymentService.recordPayment({
            enrollmentId:   enrollment.id,
            months:         mos,
            amountPerMonth: amt,
            discountAmount: calc.discount,
            discountReason: disc ? `Advance discount ${advDisc}%` : '',
            paymentMethod:  document.getElementById('pay-method').value,
            paidBy:         document.getElementById('pay-paid-by').value,
            notes:          document.getElementById('pay-notes').value
          });

          PaymentsPage._state.lastPayment = payment;
          PaymentsPage._state.step = 4;
          PaymentsPage._loadWizardStep();
        } catch (e) {
          UI.toastError(e.message);
        } finally {
          UI.btnLoading(btn, false);
        }
      });
    }

    // Step 4: Receipt
    else if (step === 4) {
      const p = PaymentsPage._state.lastPayment;
      PaymentsPage._renderReceipt(content, footer, p, cur, settings);
    }
  },

  _renderReceipt(content, footer, p, cur, settings) {
    const centerName = settings.center_name || 'Musthak Classes';
    content.innerHTML = `
      <div class="receipt-box" id="receipt-preview">
        <div class="receipt-header">
          <h2>${centerName}</h2>
          <div>PAYMENT RECEIPT</div>
          <div class="receipt-number">${p.receipt_number}</div>
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-row"><span>Student</span><span>${p.student_name}</span></div>
        <div class="receipt-row"><span>Class</span><span>${p.class_name}</span></div>
        <div class="receipt-row"><span>Months Paid</span><span>${p.months_paid} month(s)</span></div>
        <div class="receipt-row"><span>Period</span><span>${p.months_covered ? p.months_covered.map(m => Fmt.monthYear(m)).join(', ') : '—'}</span></div>
        <div class="receipt-row"><span>Payment Method</span><span>${p.payment_method}</span></div>
        <div class="receipt-row"><span>Paid By</span><span>${p.paid_by||'—'}</span></div>
        <div class="receipt-divider"></div>
        ${p.discount_amount > 0 ? `<div class="receipt-row"><span>Subtotal</span><span>${Fmt.currency(p.subtotal, cur)}</span></div>
        <div class="receipt-row"><span>Discount</span><span>-${Fmt.currency(p.discount_amount, cur)}</span></div>` : ''}
        <div class="receipt-row total"><span>TOTAL PAID</span><span>${Fmt.currency(p.amount_paid, cur)}</span></div>
        <div class="receipt-divider"></div>
        <div class="receipt-row"><span>Teacher Portion</span><span>${Fmt.currency(p.teacher_amount, cur)}</span></div>
        <div class="receipt-row"><span>Center Portion</span><span>${Fmt.currency(p.center_amount, cur)}</span></div>
        <div class="receipt-stamp">
          <div>Paid on ${Fmt.datetime(p.payment_date)}</div>
          <div>${centerName} — Thank you!</div>
        </div>
      </div>
      ${p.notification_sent ? `<div class="alert alert-success mt-4">✅ Receipt sent via Email & WhatsApp</div>` : ''}
    `;
    footer.innerHTML = `
      <button class="btn btn-outline" onclick="UI.closeModal();Router.navigate('payments')">Close</button>
      <button class="btn btn-primary" onclick="PaymentsPage._printReceipt()">🖨 Print</button>
    `;
    UI.toastSuccess('Payment recorded!');
  },

  _printReceipt() {
    const box = document.getElementById('receipt-preview');
    if (!box) return;
    document.getElementById('print-area').innerHTML = `<div class="print-receipt">${box.innerHTML}</div>`;
    window.print();
    document.getElementById('print-area').innerHTML = '';
  },

  _showReceipt(p) {
    const settings = PaymentsPage._state.settings || { currency_symbol: 'Rs.', center_name: 'Musthak Classes' };
    const cur = settings.currency_symbol || 'Rs.';
    UI.showModal({
      title: 'Payment Receipt',
      size: 'sm',
      body: '',
      footer: `<button class="btn btn-outline" onclick="UI.closeModal()">Close</button>
               <button class="btn btn-primary" onclick="PaymentsPage._printReceipt()">🖨 Print</button>`
    });
    const content = document.getElementById('modal-body');
    const footer  = document.getElementById('modal-footer');
    PaymentsPage._renderReceipt(content, footer, p, cur, settings);
  },

  _selectStudent(student) {
    PaymentsPage._state.student = student;
    document.getElementById('pay-student-results').innerHTML = '';
    document.getElementById('pay-student-search').value = student.full_name;
    const selEl = document.getElementById('pay-selected-student');
    if (selEl) selEl.remove();
    const div = document.createElement('div');
    div.id = 'pay-selected-student';
    div.className = 'alert alert-success';
    div.innerHTML = `Selected: <strong>${student.full_name}</strong>`;
    document.getElementById('pay-wiz-content').appendChild(div);
    const btn = document.getElementById('pay-next-1');
    if (btn) btn.disabled = false;
  },

  _selectEnrollment(enr) {
    PaymentsPage._state.enrollment = enr;
    document.querySelectorAll('.enrollment-select-card').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    const btn = document.getElementById('pay-next-2');
    if (btn) btn.disabled = false;
  },

  _payWizBack() {
    PaymentsPage._state.step--;
    PaymentsPage._loadWizardStep();
  }
};

window.PaymentsPage = PaymentsPage;
