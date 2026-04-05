// ============================================================
// STUDENT PORTAL — Public page (no auth required)
// Reached via QR scan: #/portal/{studentId}
// Shows student dues and payment history to parents
// ============================================================

const StudentPortalPage = {
  async load(studentId) {
    const portalEl = document.getElementById('portal-screen');
    if (!portalEl) return;

    portalEl.innerHTML = `
      <div style="min-height:100vh;background:linear-gradient(135deg,#1e3a8a,#1e40af);padding:var(--space-4)">
        <div style="max-width:480px;margin:0 auto;padding-top:var(--space-8)">
          <div id="portal-content">
            <div class="loading-spinner"><div class="spinner" style="border-top-color:white"></div></div>
          </div>
        </div>
      </div>
    `;

    try {
      const student = await StudentService.getById(studentId);
      if (!student) {
        portalEl.querySelector('#portal-content').innerHTML = `
          <div style="text-align:center;color:white;padding:var(--space-8)">
            <div style="font-size:3rem;margin-bottom:var(--space-4)">❌</div>
            <h2>Student Not Found</h2>
            <p style="opacity:0.8;margin-top:var(--space-2)">The QR code may be outdated or invalid.</p>
          </div>
        `;
        return;
      }

      const settings = await SettingsService.get();
      const cur = settings.currency_symbol || 'Rs.';
      const enrollments = await EnrollmentService.getActiveByStudent(studentId);
      const payments    = await PaymentService.getByStudent(studentId, 5);

      // Get next due for each enrollment
      const enriched = await Promise.all(enrollments.map(async e => {
        const dues = await DueScheduleService.getNextPending(e.id, 1);
        return { ...e, nextDue: dues[0] || null };
      }));

      const totalOutstanding = enriched.reduce((s, e) => s + (e.nextDue ? e.nextDue.balance : 0), 0);

      portalEl.querySelector('#portal-content').innerHTML = `
        <!-- Header card -->
        <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border-radius:var(--radius-xl);padding:var(--space-6);margin-bottom:var(--space-4);color:white;text-align:center">
          ${student.photo_url
            ? `<img src="${student.photo_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto var(--space-3);border:3px solid rgba(255,255,255,0.5)" alt="${student.full_name}">`
            : `<div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;margin:0 auto var(--space-3)">${Fmt.initials(student.full_name)}</div>`}
          <h1 style="font-size:var(--font-size-2xl);margin-bottom:var(--space-1)">${student.full_name}</h1>
          <p style="opacity:0.8;font-size:var(--font-size-sm)">${settings.center_name || 'Musthak Classes'}</p>
        </div>

        <!-- Outstanding due card -->
        ${totalOutstanding > 0 ? `
          <div style="background:#fee2e2;border-radius:var(--radius-xl);padding:var(--space-5);margin-bottom:var(--space-4);text-align:center">
            <div style="font-size:var(--font-size-xs);font-weight:700;text-transform:uppercase;color:#991b1b;letter-spacing:0.05em">Outstanding Amount</div>
            <div style="font-size:var(--font-size-3xl);font-weight:800;color:#dc2626">${Fmt.currency(totalOutstanding, cur)}</div>
            <div style="font-size:var(--font-size-xs);color:#991b1b;margin-top:var(--space-1)">Please pay at the next class or contact us</div>
          </div>
        ` : `
          <div style="background:#dcfce7;border-radius:var(--radius-xl);padding:var(--space-4);margin-bottom:var(--space-4);text-align:center">
            <div style="font-size:1.5rem">✅</div>
            <div style="color:#166534;font-weight:700">All dues are paid!</div>
          </div>
        `}

        <!-- Active Enrollments -->
        ${enrollments.length > 0 ? `
          <div style="background:white;border-radius:var(--radius-xl);padding:var(--space-5);margin-bottom:var(--space-4)">
            <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);color:var(--text-primary)">Active Classes</h3>
            ${enriched.map(e => `
              <div style="border:1px solid var(--border);border-radius:var(--radius);padding:var(--space-3);margin-bottom:var(--space-3)">
                <div style="font-weight:700;font-size:var(--font-size-sm)">${e.class_name}</div>
                <div style="color:var(--text-muted);font-size:var(--font-size-xs);margin-top:2px">${e.subject_name||''} · ${e.grade_name||''} · ${e.teacher_name||''}</div>
                <div style="display:flex;justify-content:space-between;margin-top:var(--space-2);font-size:var(--font-size-xs)">
                  <span>Monthly fee: <strong>${Fmt.currency(e.fee_agreed, cur)}</strong></span>
                  ${e.nextDue ? `<span style="color:${DateHelpers.daysOverdue(e.nextDue.due_date)>0?'#dc2626':'#1e40af'}">
                    Next due: <strong>${Fmt.date(e.nextDue.due_date)}</strong> (${Fmt.currency(e.nextDue.balance, cur)})
                  </span>` : '<span style="color:#166534">✅ Paid up</span>'}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Recent payments -->
        ${payments.length > 0 ? `
          <div style="background:white;border-radius:var(--radius-xl);padding:var(--space-5);margin-bottom:var(--space-4)">
            <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);color:var(--text-primary)">Recent Payments</h3>
            ${payments.map(p => `
              <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border-light);font-size:var(--font-size-sm)">
                <div>
                  <div style="font-weight:600">${p.class_name}</div>
                  <div style="color:var(--text-muted);font-size:11px">${Fmt.date(p.payment_date)} · ${p.receipt_number}</div>
                </div>
                <div style="font-weight:700;color:#059669">${Fmt.currency(p.amount_paid, cur)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Contact -->
        <div style="background:rgba(255,255,255,0.15);border-radius:var(--radius-xl);padding:var(--space-5);text-align:center;color:white">
          <p style="opacity:0.8;font-size:var(--font-size-sm);margin-bottom:var(--space-3)">For enquiries contact:</p>
          <p style="font-weight:700;font-size:var(--font-size-lg)">${settings.center_name || 'Musthak Classes'}</p>
          ${settings.center_phone ? `
            <a href="tel:${settings.center_phone}" style="display:inline-flex;align-items:center;gap:var(--space-2);background:white;color:var(--primary);padding:var(--space-3) var(--space-6);border-radius:var(--radius-full);font-weight:700;margin-top:var(--space-3);text-decoration:none">
              📞 Call Now
            </a>
          ` : ''}
        </div>

        <p style="text-align:center;color:rgba(255,255,255,0.5);font-size:11px;margin-top:var(--space-4)">
          Powered by Musthak CMS
        </p>
      `;
    } catch (e) {
      console.error('Portal load error:', e);
      portalEl.querySelector('#portal-content').innerHTML = `
        <div style="text-align:center;color:white;padding:var(--space-8)">
          <div style="font-size:3rem;margin-bottom:var(--space-4)">⚠️</div>
          <h2>Error Loading Data</h2>
          <p style="opacity:0.8;margin-top:var(--space-2)">${e.message}</p>
        </div>
      `;
    }
  }
};

window.StudentPortalPage = StudentPortalPage;
