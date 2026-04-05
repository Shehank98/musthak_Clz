// ============================================================
// ATTENDANCE PAGE
// ============================================================

const AttendancePage = {
  async load(el) {
    const classes = await ClassService.getAll('Active');
    el.innerHTML = `
      <div class="page-header">
        <div><h2>Attendance</h2><p>Mark and track class attendance</p></div>
        <button class="btn btn-primary" id="start-session-btn">+ Start Session</button>
      </div>
      <div class="tabs">
        <button class="tab-btn" data-tab="tab-sessions">Sessions</button>
        <button class="tab-btn" data-tab="tab-scan">QR Scan</button>
      </div>
      <div id="tab-sessions" class="tab-panel">
        <div class="filter-bar">
          <select class="form-control" id="att-class-filter" style="max-width:300px">
            <option value="">All Classes</option>
            ${classes.map(c=>`<option value="${c.id}">${c.class_name}</option>`).join('')}
          </select>
        </div>
        <div id="sessions-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
      </div>
      <div id="tab-scan" class="tab-panel">
        <div class="card">
          <div class="card-header"><h3>QR Scan Attendance</h3></div>
          <div class="card-body">
            <p class="text-muted mb-4">Select a session first, then use the camera to scan student QR cards.</p>
            <div class="form-group" style="max-width:400px">
              <label class="form-label">Active Session</label>
              <select class="form-control" id="scan-session-select">
                <option value="">Select session...</option>
              </select>
            </div>
            <div id="qr-scanner-container" style="max-width:400px;margin-top:var(--space-4)"></div>
            <div id="scan-result" style="margin-top:var(--space-4)"></div>
          </div>
        </div>
      </div>
    `;

    UI.initTabs(el);
    await AttendancePage._loadSessions();

    document.getElementById('att-class-filter').addEventListener('change', async () => {
      const classId = document.getElementById('att-class-filter').value;
      await AttendancePage._loadSessions(classId || null);
    });

    document.getElementById('start-session-btn').addEventListener('click', () => AttendancePage._showStartSession(classes));

    // QR scan tab
    document.querySelector('[data-tab="tab-scan"]').addEventListener('click', async () => {
      const sessions = await AttendanceService.getSessions(null, 20);
      const openSessions = sessions.filter(s => s.status === 'Open');
      const select = document.getElementById('scan-session-select');
      select.innerHTML = '<option value="">Select session...</option>' +
        openSessions.map(s => `<option value="${s.id}">${s.class_name} — ${Fmt.date(s.session_date)}</option>`).join('');

      select.addEventListener('change', () => {
        const sessionId = select.value;
        if (!sessionId) { QRScanner.stop(); document.getElementById('qr-scanner-container').innerHTML = ''; return; }
        AttendancePage._startScan(sessionId);
      });
    });
  },

  async _loadSessions(classId = null) {
    const sessions = await AttendanceService.getSessions(classId, 20);
    const el = document.getElementById('sessions-list');
    if (!el) return;
    if (sessions.length === 0) { el.innerHTML = UI.emptyState('✅','No sessions yet','Start a session to take attendance.'); return; }
    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Class</th><th>Date</th><th>Time</th><th>Present/Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${sessions.map(s => `
              <tr>
                <td class="font-semibold">${s.class_name}</td>
                <td>${Fmt.date(s.session_date)}</td>
                <td>${s.start_time||'—'} ${s.end_time?'– '+s.end_time:''}</td>
                <td>${s.total_present||0}/${s.total_enrolled||0}</td>
                <td>${UI.statusBadge(s.status)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-ghost btn-sm" onclick="AttendancePage._viewSession('${s.id}')" title="View">👁</button>
                    ${s.status==='Open' ? `<button class="btn btn-ghost btn-sm" onclick="AttendancePage._closeSession('${s.id}')" title="Close">🔒</button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _viewSession(sessionId) {
    const session = await AttendanceService.getSessionById(sessionId);
    const records = await AttendanceService.getRecords(sessionId);
    if (!session) return;

    UI.showModal({
      title: `Attendance — ${session.class_name}`,
      size:  'lg',
      body: `
        <p class="text-muted" style="margin-bottom:var(--space-4)">${Fmt.date(session.session_date)} · ${session.start_time||''} – ${session.end_time||''} · ${session.total_present||0}/${session.total_enrolled||0} present</p>
        <div class="table-container">
          <table class="table">
            <thead><tr><th>Student</th><th>Status</th><th>Marked By</th><th>Time</th><th>Actions</th></tr></thead>
            <tbody>
              ${records.map(r => `
                <tr>
                  <td class="font-semibold">${r.student_name}</td>
                  <td>${UI.statusBadge(r.status)}</td>
                  <td>${r.marked_by||'—'}</td>
                  <td>${Fmt.datetime(r.marked_at)}</td>
                  <td>
                    ${session.status === 'Open' ? `
                      <select class="form-control" style="width:auto;font-size:12px" onchange="AttendancePage._updateRecord('${sessionId}','${r.student_id}',this.value)">
                        ${['Present','Absent','Late','Excused'].map(v=>`<option value="${v}" ${r.status===v?'selected':''}>${v}</option>`).join('')}
                      </select>
                    ` : r.status}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `,
      footer: `<button class="btn btn-outline" onclick="UI.closeModal()">Close</button>
               ${session.status==='Open' ? `<button class="btn btn-danger" onclick="AttendancePage._closeSession('${sessionId}')">🔒 Close Session</button>` : ''}`
    });
  },

  async _updateRecord(sessionId, studentId, status) {
    try {
      await AttendanceService.markAttendance(sessionId, studentId, status, 'admin');
    } catch (e) { UI.toastError(e.message); }
  },

  async _closeSession(sessionId) {
    if (!await UI.confirm('Close this attendance session? No more changes allowed.')) return;
    await AttendanceService.closeSession(sessionId);
    UI.toastSuccess('Session closed.');
    UI.closeModal();
    await AttendancePage._loadSessions();
  },

  _showStartSession(classes) {
    const today = Fmt.toISODate(new Date());
    UI.showModal({
      title: 'Start Attendance Session',
      size:  'sm',
      body: `
        <form id="session-form" novalidate>
          <div class="form-group">
            <label class="form-label">Class <span class="required">*</span></label>
            <select class="form-control" name="class_id" required>
              <option value="">Select class...</option>
              ${classes.map(c=>`<option value="${c.id}">${c.class_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date</label>
            <input class="form-control" type="date" name="session_date" value="${today}" />
          </div>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label">Start Time</label>
              <input class="form-control" type="time" name="start_time" />
            </div>
            <div class="form-group">
              <label class="form-label">End Time</label>
              <input class="form-control" type="time" name="end_time" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Topic Covered</label>
            <input class="form-control" name="topic" placeholder="Optional..." />
          </div>
        </form>
      `,
      footer: `<button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="save-session-btn">Start Session</button>`
    });
    document.getElementById('save-session-btn').addEventListener('click', async () => {
      const form = document.getElementById('session-form');
      const { valid, errors } = Validators.form(form, { class_id: ['required'] });
      if (!valid) { Validators.showErrors(form, errors); return; }
      const btn = document.getElementById('save-session-btn');
      UI.btnLoading(btn, true);
      try {
        const data = Object.fromEntries(new FormData(form));
        const sessionId = await AttendanceService.createSession(
          data.class_id, new Date(data.session_date),
          data.start_time, data.end_time, data.topic
        );
        UI.closeModal();
        UI.toastSuccess('Session started!');
        await AttendancePage._loadSessions();
        AttendancePage._viewSession(sessionId);
      } catch (e) { UI.toastError(e.message); }
      finally { UI.btnLoading(btn, false); }
    });
  },

  _startScan(sessionId) {
    const container = document.getElementById('qr-scanner-container');
    const resultEl  = document.getElementById('scan-result');
    if (!container) return;
    container.innerHTML = `<div id="qr-reader"></div>
      <button class="btn btn-danger btn-sm" style="margin-top:var(--space-2)" onclick="QRScanner.stop();document.getElementById('qr-reader').innerHTML=''">Stop Camera</button>`;

    QRScanner.start('qr-reader',
      async (studentId) => {
        try {
          const student = await StudentService.getById(studentId);
          if (!student) { UI.toast('Student not found for this QR.', 'warning'); return; }
          await AttendanceService.markAttendance(sessionId, studentId, 'Present', 'qr_scan');
          resultEl.innerHTML = `<div class="alert alert-success">✅ Marked Present: <strong>${student.full_name}</strong></div>`;
          UI.toastSuccess(`Present: ${student.full_name}`);
        } catch (e) { UI.toastError(e.message); }
      },
      null
    );
  }
};

window.AttendancePage = AttendancePage;
