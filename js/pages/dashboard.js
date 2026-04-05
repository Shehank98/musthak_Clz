// ============================================================
// DASHBOARD PAGE
// ============================================================

const DashboardPage = {
  async load(el) {
    el.innerHTML = `
      <div class="quick-actions">
        <div class="quick-action-card" onclick="Router.navigate('payments')">
          <div class="qa-icon">💰</div><div class="qa-label">Record Payment</div>
        </div>
        <div class="quick-action-card" onclick="Router.navigate('enrollments')">
          <div class="qa-icon">📋</div><div class="qa-label">New Enrollment</div>
        </div>
        <div class="quick-action-card" onclick="Router.navigate('students')">
          <div class="qa-icon">👨‍🎓</div><div class="qa-label">Add Student</div>
        </div>
        <div class="quick-action-card" onclick="Router.navigate('attendance')">
          <div class="qa-icon">✅</div><div class="qa-label">Mark Attendance</div>
        </div>
      </div>

      <div class="stats-grid" id="dash-stats">
        ${[1,2,3,4,5,6,7,8].map(() => `
          <div class="stat-card">
            <div class="stat-icon blue">⟳</div>
            <div class="stat-info">
              <div class="stat-label">Loading...</div>
              <div class="stat-value">—</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3>Recent Payments</h3></div>
          <div id="dash-payments"><div class="loading-spinner"><div class="spinner"></div></div></div>
        </div>
        <div>
          <div class="card mb-4" style="margin-bottom:var(--space-4)">
            <div class="card-header"><h3>Overdue Dues</h3></div>
            <div class="card-body" id="dash-overdue"><div class="loading-spinner"><div class="spinner"></div></div></div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Today's Classes</h3></div>
            <div class="card-body" id="dash-today"><div class="loading-spinner"><div class="spinner"></div></div></div>
          </div>
        </div>
      </div>
    `;

    try {
      await Promise.all([
        DashboardPage._loadStats(),
        DashboardPage._loadRecentPayments(),
        DashboardPage._loadOverdue(),
        DashboardPage._loadToday()
      ]);
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  },

  async _loadStats() {
    const [students, teachers, classes, enrollments, revenue, pendingDues] = await Promise.all([
      db.collection('students').where('status','==','Active').get(),
      db.collection('teachers').where('status','==','Active').get(),
      db.collection('classes').where('status','==','Active').get(),
      db.collection('enrollments').where('status','==','Active').get(),
      PaymentService.thisMonthRevenue(),
      DueScheduleService.getAllPending()
    ]);

    const pendingTotal = pendingDues.reduce((s, d) => s + (d.balance || 0), 0);
    const settings     = await SettingsService.get();
    const cur          = settings.currency_symbol || 'Rs.';

    const stats = [
      { icon:'👨‍🎓', color:'blue',   label:'Active Students',    value: students.size },
      { icon:'📋',   color:'teal',   label:'Active Enrollments', value: enrollments.size },
      { icon:'👨‍🏫', color:'green',  label:'Active Teachers',    value: teachers.size },
      { icon:'🏫',   color:'purple', label:'Active Classes',     value: classes.size },
      { icon:'💰',   color:'green',  label:'This Month Revenue', value: Fmt.currency(revenue.total, cur) },
      { icon:'🏦',   color:'blue',   label:'Teacher Payouts',    value: Fmt.currency(revenue.teacher, cur) },
      { icon:'📈',   color:'teal',   label:'Center Revenue',     value: Fmt.currency(revenue.center, cur) },
      { icon:'⚠️',   color:'yellow', label:'Pending Dues',       value: Fmt.currency(pendingTotal, cur), sub: `${pendingDues.length} due(s)` }
    ];

    document.getElementById('dash-stats').innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-icon ${s.color}">${s.icon}</div>
        <div class="stat-info">
          <div class="stat-label">${s.label}</div>
          <div class="stat-value">${s.value}</div>
          ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  async _loadRecentPayments() {
    const payments = await PaymentService.getAll(10);
    const settings = await SettingsService.get();
    const cur = settings.currency_symbol || 'Rs.';
    const el = document.getElementById('dash-payments');
    if (!el) return;

    if (payments.length === 0) {
      el.innerHTML = UI.emptyState('💰', 'No payments yet');
      return;
    }

    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr>
            <th>Student</th><th>Class</th><th>Amount</th><th>Method</th><th>Date</th><th>Receipt</th>
          </tr></thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td class="font-semibold">${p.student_name}</td>
                <td>${p.class_name}</td>
                <td class="font-semibold text-success">${Fmt.currency(p.amount_paid, cur)}</td>
                <td>${UI.badge(p.payment_method, 'info')}</td>
                <td>${Fmt.date(p.payment_date)}</td>
                <td><code class="font-mono" style="font-size:11px">${p.receipt_number}</code></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _loadOverdue() {
    const settings = await SettingsService.get();
    const overdue  = await DueScheduleService.getOverdue(settings.grace_period_days || 3);
    const cur = settings.currency_symbol || 'Rs.';
    const el  = document.getElementById('dash-overdue');
    if (!el) return;

    if (overdue.length === 0) {
      el.innerHTML = `<p class="text-success text-center" style="padding:var(--space-4)">✅ No overdue payments</p>`;
      return;
    }

    // Load student names
    const studentIds = [...new Set(overdue.map(d => d.student_id))].slice(0, 10);
    const studentsMap = {};
    await Promise.all(studentIds.map(async id => {
      const s = await StudentService.getById(id);
      if (s) studentsMap[id] = s;
    }));

    el.innerHTML = overdue.slice(0, 8).map(d => {
      const s = studentsMap[d.student_id];
      const days = DateHelpers.daysOverdue(d.due_date);
      return `
        <div class="overdue-item">
          <div>
            <div class="overdue-name">${d.student_id ? (s ? s.full_name : d.student_id) : '—'}</div>
            <div class="overdue-class">${Fmt.monthYear(d.due_month)} · ${days}d overdue</div>
          </div>
          <div class="overdue-amount">${Fmt.currency(d.balance, cur)}</div>
        </div>
      `;
    }).join('');
  },

  async _loadToday() {
    const todayClasses = await ClassService.getToday();
    const el = document.getElementById('dash-today');
    if (!el) return;

    if (todayClasses.length === 0) {
      el.innerHTML = `<p class="text-muted text-center" style="padding:var(--space-4)">No classes scheduled today</p>`;
      return;
    }

    el.innerHTML = todayClasses.map(c => `
      <div class="today-class-item">
        <div class="today-class-time">${c.schedule_time || '—'}</div>
        <div class="today-class-info">
          <div class="today-class-name">${c.class_name}</div>
          <div class="today-class-teacher">${c.teacher_name} · ${c.grade_name || ''}</div>
        </div>
        <span class="badge badge-success">${c.current_enrollment}/${c.max_capacity}</span>
      </div>
    `).join('');
  }
};

window.DashboardPage = DashboardPage;
