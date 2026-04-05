// ============================================================
// REPORTS PAGE — 7 report types with PDF/CSV export
// ============================================================

const ReportsPage = {
  _chart: null,

  async load(el) {
    const settings = await SettingsService.get();
    const cur = settings.currency_symbol || 'Rs.';
    const now = new Date();
    const curYear  = now.getFullYear();
    const curMonth = String(now.getMonth()+1).padStart(2,'0');

    el.innerHTML = `
      <div class="page-header"><div><h2>Reports</h2><p>Financial and operational analytics</p></div></div>

      <div class="tabs" id="report-tabs">
        <button class="tab-btn" data-tab="tab-r1">Financial</button>
        <button class="tab-btn" data-tab="tab-r2">By Class</button>
        <button class="tab-btn" data-tab="tab-r3">By Teacher</button>
        <button class="tab-btn" data-tab="tab-r4">Defaulters</button>
        <button class="tab-btn" data-tab="tab-r5">Enrollments</button>
        <button class="tab-btn" data-tab="tab-r6">Attendance</button>
        <button class="tab-btn" data-tab="tab-r7">Trends</button>
      </div>

      <!-- Financial Summary -->
      <div id="tab-r1" class="tab-panel">
        <div class="card">
          <div class="card-header">
            <h3>Financial Summary</h3>
            <div class="flex gap-2">
              <select class="form-control" id="r1-month" style="width:auto">
                ${Array.from({length:12},(_,i)=>{const m=String(i+1).padStart(2,'0');return `<option value="${m}" ${m===curMonth?'selected':''}>${new Date(2000,i).toLocaleString('en',{month:'long'})}</option>`}).join('')}
              </select>
              <select class="form-control" id="r1-year" style="width:auto">
                ${[curYear-1,curYear,curYear+1].map(y=>`<option value="${y}" ${y===curYear?'selected':''}>${y}</option>`).join('')}
              </select>
              <button class="btn btn-primary btn-sm" id="r1-load">Load</button>
              <button class="btn btn-outline btn-sm" id="r1-pdf">PDF</button>
              <button class="btn btn-outline btn-sm" id="r1-csv">CSV</button>
            </div>
          </div>
          <div id="r1-content" class="card-body"><p class="text-muted">Click Load to generate report.</p></div>
        </div>
      </div>

      <!-- By Class -->
      <div id="tab-r2" class="tab-panel">
        <div class="card">
          <div class="card-header">
            <h3>Revenue by Class</h3>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm" id="r2-load">Load</button>
              <button class="btn btn-outline btn-sm" id="r2-pdf">PDF</button>
              <button class="btn btn-outline btn-sm" id="r2-csv">CSV</button>
            </div>
          </div>
          <div id="r2-content" class="card-body"><p class="text-muted">Click Load to generate report.</p></div>
        </div>
      </div>

      <!-- By Teacher -->
      <div id="tab-r3" class="tab-panel">
        <div class="card">
          <div class="card-header">
            <h3>Teacher Earnings</h3>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm" id="r3-load">Load</button>
              <button class="btn btn-outline btn-sm" id="r3-pdf">PDF</button>
              <button class="btn btn-outline btn-sm" id="r3-csv">CSV</button>
            </div>
          </div>
          <div id="r3-content" class="card-body"><p class="text-muted">Click Load to generate report.</p></div>
        </div>
      </div>

      <!-- Defaulters -->
      <div id="tab-r4" class="tab-panel">
        <div class="card">
          <div class="card-header">
            <h3>Defaulters List</h3>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm" id="r4-load">Load</button>
              <button class="btn btn-outline btn-sm" id="r4-pdf">PDF</button>
              <button class="btn btn-outline btn-sm" id="r4-csv">CSV</button>
            </div>
          </div>
          <div id="r4-content" class="card-body"><p class="text-muted">Click Load to generate report.</p></div>
        </div>
      </div>

      <!-- Enrollments -->
      <div id="tab-r5" class="tab-panel">
        <div class="card">
          <div class="card-header">
            <h3>Enrollment Report</h3>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm" id="r5-load">Load</button>
              <button class="btn btn-outline btn-sm" id="r5-csv">CSV</button>
            </div>
          </div>
          <div id="r5-content" class="card-body"><p class="text-muted">Click Load to generate report.</p></div>
        </div>
      </div>

      <!-- Attendance -->
      <div id="tab-r6" class="tab-panel">
        <div class="card">
          <div class="card-header"><h3>Attendance Analytics</h3><button class="btn btn-primary btn-sm" id="r6-load">Load</button></div>
          <div id="r6-content" class="card-body"><p class="text-muted">Click Load to generate report.</p></div>
        </div>
      </div>

      <!-- Trends -->
      <div id="tab-r7" class="tab-panel">
        <div class="card">
          <div class="card-header"><h3>Monthly Revenue Trends</h3><button class="btn btn-primary btn-sm" id="r7-load">Load</button></div>
          <div class="card-body"><canvas id="trends-chart" height="100"></canvas></div>
        </div>
      </div>
    `;

    UI.initTabs(el);

    // Wire up buttons
    document.getElementById('r1-load').addEventListener('click', () => ReportsPage._loadFinancial(cur));
    document.getElementById('r2-load').addEventListener('click', () => ReportsPage._loadByClass(cur));
    document.getElementById('r3-load').addEventListener('click', () => ReportsPage._loadByTeacher(cur));
    document.getElementById('r4-load').addEventListener('click', () => ReportsPage._loadDefaulters(cur));
    document.getElementById('r5-load').addEventListener('click', () => ReportsPage._loadEnrollments());
    document.getElementById('r6-load').addEventListener('click', () => ReportsPage._loadAttendance());
    document.getElementById('r7-load').addEventListener('click', () => ReportsPage._loadTrends(cur));

    document.getElementById('r1-pdf').addEventListener('click', () => PDFExport.financial(ReportsPage._data.financial, cur, settings));
    document.getElementById('r1-csv').addEventListener('click', () => CSVExport.payments(ReportsPage._data.financialPayments || [], 'financial.csv'));
    document.getElementById('r2-pdf').addEventListener('click', () => PDFExport.byClass(ReportsPage._data.byClass, cur));
    document.getElementById('r2-csv').addEventListener('click', () => CSVExport.generic(ReportsPage._data.byClass || [], 'revenue_by_class.csv'));
    document.getElementById('r3-pdf').addEventListener('click', () => PDFExport.byTeacher(ReportsPage._data.byTeacher, cur));
    document.getElementById('r3-csv').addEventListener('click', () => CSVExport.generic(ReportsPage._data.byTeacher || [], 'teacher_earnings.csv'));
    document.getElementById('r4-pdf').addEventListener('click', () => PDFExport.defaulters(ReportsPage._data.defaulters, cur));
    document.getElementById('r4-csv').addEventListener('click', () => CSVExport.exportDues(ReportsPage._data.defaulters || [], 'defaulters.csv'));
    document.getElementById('r5-csv').addEventListener('click', () => CSVExport.generic(ReportsPage._data.enrollments || [], 'enrollments.csv'));
  },

  _data: {},

  async _loadFinancial(cur) {
    const month  = document.getElementById('r1-month').value;
    const year   = document.getElementById('r1-year').value;
    const monthKey = `${year}-${month}`;
    const start  = DateHelpers.fromMonthKey(monthKey);
    const end    = DateHelpers.addMonths(start, 1);

    const snap = await db.collection('payments')
      .where('payment_date', '>=', firebase.firestore.Timestamp.fromDate(start))
      .where('payment_date', '<',  firebase.firestore.Timestamp.fromDate(end))
      .where('status', '==', 'Completed').get();
    const payments = snap.docs.map(d => d.data());
    ReportsPage._data.financialPayments = payments;

    const total   = payments.reduce((s, p) => s + (p.amount_paid||0), 0);
    const teacher = payments.reduce((s, p) => s + (p.teacher_amount||0), 0);
    const center  = payments.reduce((s, p) => s + (p.center_amount||0), 0);

    ReportsPage._data.financial = { monthKey, total, teacher, center, count: payments.length, payments };

    document.getElementById('r1-content').innerHTML = `
      <div class="stats-grid" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-icon green">💰</div><div class="stat-info"><div class="stat-label">Total Revenue</div><div class="stat-value">${Fmt.currency(total, cur)}</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">👨‍🏫</div><div class="stat-info"><div class="stat-label">Teacher Payouts</div><div class="stat-value">${Fmt.currency(teacher, cur)}</div></div></div>
        <div class="stat-card"><div class="stat-icon teal">🏫</div><div class="stat-info"><div class="stat-label">Center Revenue</div><div class="stat-value">${Fmt.currency(center, cur)}</div></div></div>
        <div class="stat-card"><div class="stat-icon purple">📄</div><div class="stat-info"><div class="stat-label">Transactions</div><div class="stat-value">${payments.length}</div></div></div>
      </div>
      ${payments.length === 0 ? UI.emptyState('💰','No payments this month') : `
        <div class="table-container">
          <table class="table">
            <thead><tr><th>Receipt</th><th>Student</th><th>Class</th><th>Amount</th><th>Teacher</th><th>Center</th><th>Date</th></tr></thead>
            <tbody>
              ${payments.map(p=>`<tr>
                <td><code style="font-size:11px">${p.receipt_number}</code></td>
                <td>${p.student_name}</td>
                <td>${p.class_name}</td>
                <td class="font-semibold">${Fmt.currency(p.amount_paid, cur)}</td>
                <td>${Fmt.currency(p.teacher_amount, cur)}</td>
                <td>${Fmt.currency(p.center_amount, cur)}</td>
                <td>${Fmt.date(p.payment_date)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  async _loadByClass(cur) {
    const payments = await PaymentService.getAll(500);
    const classMap = {};
    payments.forEach(p => {
      if (!classMap[p.class_id]) classMap[p.class_id] = { class_name: p.class_name, total: 0, teacher: 0, center: 0, count: 0 };
      classMap[p.class_id].total   += p.amount_paid   || 0;
      classMap[p.class_id].teacher += p.teacher_amount || 0;
      classMap[p.class_id].center  += p.center_amount  || 0;
      classMap[p.class_id].count   ++;
    });
    const rows = Object.values(classMap).sort((a,b) => b.total - a.total);
    ReportsPage._data.byClass = rows;

    document.getElementById('r2-content').innerHTML = rows.length === 0 ? UI.emptyState('🏫','No data') : `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Class</th><th>Transactions</th><th>Total Revenue</th><th>Teacher</th><th>Center</th></tr></thead>
          <tbody>
            ${rows.map(r=>`<tr>
              <td class="font-semibold">${r.class_name}</td>
              <td>${r.count}</td>
              <td class="font-semibold text-success">${Fmt.currency(r.total, cur)}</td>
              <td>${Fmt.currency(r.teacher, cur)}</td>
              <td>${Fmt.currency(r.center, cur)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _loadByTeacher(cur) {
    const payments = await PaymentService.getAll(500);
    const teacherMap = {};
    payments.forEach(p => {
      if (!teacherMap[p.teacher_id]) teacherMap[p.teacher_id] = { teacher_name: p.teacher_name, earnings: 0, count: 0 };
      teacherMap[p.teacher_id].earnings += p.teacher_amount || 0;
      teacherMap[p.teacher_id].count    ++;
    });
    const rows = Object.values(teacherMap).sort((a,b) => b.earnings - a.earnings);
    ReportsPage._data.byTeacher = rows;

    document.getElementById('r3-content').innerHTML = rows.length === 0 ? UI.emptyState('👨‍🏫','No data') : `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Teacher</th><th>Payments</th><th>Total Earnings</th></tr></thead>
          <tbody>
            ${rows.map(r=>`<tr>
              <td class="font-semibold">${r.teacher_name}</td>
              <td>${r.count}</td>
              <td class="font-semibold text-success">${Fmt.currency(r.earnings, cur)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _loadDefaulters(cur) {
    const dues = await DueScheduleService.getAllPending();
    const overdue = dues.filter(d => DateHelpers.daysOverdue(d.due_date) > 0);
    ReportsPage._data.defaulters = overdue;

    const studentIds = [...new Set(overdue.map(d => d.student_id))].slice(0, 50);
    const sMap = {};
    await Promise.all(studentIds.map(async id => { const s = await StudentService.getById(id); if (s) sMap[id] = s; }));

    document.getElementById('r4-content').innerHTML = overdue.length === 0 ? `<div class="alert alert-success">✅ No defaulters!</div>` : `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Student</th><th>Phone</th><th>Month</th><th>Amount</th><th>Days Overdue</th></tr></thead>
          <tbody>
            ${overdue.map(d => {
              const s = sMap[d.student_id];
              return `<tr>
                <td class="font-semibold">${s ? s.full_name : d.student_id.substring(0,8)}</td>
                <td>${s ? (s.parent_phone||s.phone||'—') : '—'}</td>
                <td>${Fmt.monthYear(d.due_month)}</td>
                <td class="text-danger font-semibold">${Fmt.currency(d.balance, cur)}</td>
                <td>${DateHelpers.daysOverdue(d.due_date)}d</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _loadEnrollments() {
    const enrollments = await EnrollmentService.getAll('Active');
    ReportsPage._data.enrollments = enrollments;
    document.getElementById('r5-content').innerHTML = `
      <p class="text-muted mb-4">${enrollments.length} active enrollments</p>
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Student</th><th>Class</th><th>Subject</th><th>Grade</th><th>Fee</th><th>Start Date</th></tr></thead>
          <tbody>
            ${enrollments.map(e=>`<tr>
              <td>${e.student_name}</td>
              <td>${e.class_name}</td>
              <td>${e.subject_name||'—'}</td>
              <td>${e.grade_name||'—'}</td>
              <td>Rs. ${e.fee_agreed}</td>
              <td>${Fmt.date(e.start_date)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _loadAttendance() {
    const sessions = await AttendanceService.getSessions(null, 50);
    document.getElementById('r6-content').innerHTML = sessions.length === 0 ? UI.emptyState('✅','No sessions') : `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Class</th><th>Date</th><th>Present</th><th>Absent</th><th>Total</th><th>Rate</th></tr></thead>
          <tbody>
            ${sessions.map(s=>{
              const rate = s.total_enrolled > 0 ? Math.round((s.total_present/s.total_enrolled)*100) : 0;
              return `<tr>
                <td>${s.class_name}</td>
                <td>${Fmt.date(s.session_date)}</td>
                <td class="text-success">${s.total_present||0}</td>
                <td class="text-danger">${s.total_absent||0}</td>
                <td>${s.total_enrolled||0}</td>
                <td><span class="badge ${rate>=75?'badge-success':rate>=50?'badge-warning':'badge-danger'}">${rate}%</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _loadTrends(cur) {
    const now = new Date();
    const keys = DateHelpers.monthRange(DateHelpers.addMonths(now, -11), now);

    const snap = await db.collection('payments').where('status','==','Completed').get();
    const payments = snap.docs.map(d => d.data());

    const byMonth = {};
    keys.forEach(k => byMonth[k] = 0);
    payments.forEach(p => {
      const k = Fmt.toMonthKey(Fmt.toDate(p.payment_date));
      if (byMonth[k] !== undefined) byMonth[k] += p.amount_paid || 0;
    });

    const labels = keys.map(k => Fmt.monthYear(k));
    const values = keys.map(k => byMonth[k]);

    if (ReportsPage._chart) ReportsPage._chart.destroy();
    const ctx = document.getElementById('trends-chart');
    if (ctx) {
      ReportsPage._chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: `Revenue (${cur})`,
            data: values,
            backgroundColor: 'rgba(59,130,246,0.7)',
            borderColor: 'rgba(30,64,175,1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }
};

window.ReportsPage = ReportsPage;
