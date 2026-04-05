// ============================================================
// SETTINGS PAGE
// ============================================================

const SettingsPage = {
  async load(el) {
    const settings = await SettingsService.get();
    const s = settings || {};

    el.innerHTML = `
      <div class="page-header">
        <div><h2>Settings</h2><p>Configure your class management system</p></div>
        <button class="btn btn-primary" id="save-settings-btn">💾 Save Settings</button>
      </div>

      <form id="settings-form">
        <div class="form-grid form-grid-2">
          <!-- Center Info -->
          <div class="card" style="grid-column:1/-1">
            <div class="card-header"><h3>Center Information</h3></div>
            <div class="card-body">
              <div class="form-grid form-grid-2">
                <div class="form-group">
                  <label class="form-label">Center Name</label>
                  <input class="form-control" name="center_name" value="${s.center_name||''}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input class="form-control" name="center_phone" value="${s.center_phone||''}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input class="form-control" type="email" name="center_email" value="${s.center_email||''}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Academic Year</label>
                  <input class="form-control" name="academic_year" value="${s.academic_year||'2026-2027'}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Currency Symbol</label>
                  <input class="form-control" name="currency_symbol" value="${s.currency_symbol||'Rs.'}" />
                </div>
                <div class="form-group form-full">
                  <label class="form-label">Address</label>
                  <input class="form-control" name="center_address" value="${s.center_address||''}" />
                </div>
              </div>
            </div>
          </div>

          <!-- Fee Settings -->
          <div class="card">
            <div class="card-header"><h3>Fee & Commission</h3></div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Default Teacher Commission %</label>
                <input class="form-control" type="number" name="default_commission_pct" value="${s.default_commission_pct||60}" min="0" max="100" />
              </div>
              <div class="form-group">
                <label class="form-label">Advance Discount %</label>
                <input class="form-control" type="number" name="advance_discount_pct" value="${s.advance_discount_pct||5}" min="0" max="100" />
              </div>
              <div class="form-group">
                <label class="form-label">Advance Discount Min Months</label>
                <input class="form-control" type="number" name="advance_discount_min_months" value="${s.advance_discount_min_months||2}" min="1" />
              </div>
              <div class="form-group">
                <label class="form-label">Late Fee Amount (Rs.)</label>
                <input class="form-control" type="number" name="late_fee_amount" value="${s.late_fee_amount||10}" min="0" />
              </div>
              <div class="form-group">
                <label class="form-label">Grace Period (days)</label>
                <input class="form-control" type="number" name="grace_period_days" value="${s.grace_period_days||3}" min="0" />
              </div>
              <div class="form-check">
                <input type="checkbox" name="late_fee_enabled" id="late-fee-enabled" ${s.late_fee_enabled?'checked':''} />
                <label class="form-check-label" for="late-fee-enabled">Enable Late Fees</label>
              </div>
            </div>
          </div>

          <!-- EmailJS -->
          <div class="card">
            <div class="card-header"><h3>EmailJS Configuration</h3></div>
            <div class="card-body">
              <div class="alert alert-info" style="margin-bottom:var(--space-4)">
                Sign up at <strong>emailjs.com</strong> (free: 200/month) and create 3 email templates.
              </div>
              <div class="form-group">
                <label class="form-label">Public Key</label>
                <input class="form-control" name="emailjs_public_key" value="${s.emailjs_public_key||''}" placeholder="Your EmailJS public key" />
              </div>
              <div class="form-group">
                <label class="form-label">Service ID</label>
                <input class="form-control" name="emailjs_service_id" value="${s.emailjs_service_id||''}" placeholder="service_xxxxxxx" />
              </div>
              <div class="form-group">
                <label class="form-label">Payment Receipt Template ID</label>
                <input class="form-control" name="emailjs_template_payment" value="${s.emailjs_template_payment||''}" placeholder="template_xxxxxxx" />
              </div>
              <div class="form-group">
                <label class="form-label">Due Reminder Template ID</label>
                <input class="form-control" name="emailjs_template_reminder" value="${s.emailjs_template_reminder||''}" placeholder="template_xxxxxxx" />
              </div>
              <div class="form-group">
                <label class="form-label">Overdue Notice Template ID</label>
                <input class="form-control" name="emailjs_template_overdue" value="${s.emailjs_template_overdue||''}" placeholder="template_xxxxxxx" />
              </div>
            </div>
          </div>

          <!-- WhatsApp -->
          <div class="card" style="grid-column:1/-1">
            <div class="card-header"><h3>WhatsApp (CallMeBot)</h3></div>
            <div class="card-body">
              <div class="alert alert-info">
                <strong>Setup:</strong> Parent must send WhatsApp to <strong>+34 644 68 18 43</strong> with message:<br>
                <code>I allow callmebot to send me messages</code><br>
                They will receive an API key in reply. Enter that key in each student's WhatsApp number field, or use a shared center key below.
              </div>
              <div class="form-group" style="max-width:400px;margin-top:var(--space-4)">
                <label class="form-label">CallMeBot API Key (center default)</label>
                <input class="form-control" name="callmebot_api_key" value="${s.callmebot_api_key||''}" placeholder="Your API key" />
              </div>
            </div>
          </div>

          <!-- Admin -->
          <div class="card">
            <div class="card-header"><h3>Admin Account</h3></div>
            <div class="card-body">
              <p class="text-muted" style="margin-bottom:var(--space-4)">Logged in as: <strong>${AuthService.getCurrentUser()?.email || '—'}</strong></p>
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input class="form-control" type="password" id="new-password" placeholder="Leave blank to keep current" />
              </div>
              <button type="button" class="btn btn-outline btn-sm" id="change-pw-btn">Change Password</button>
            </div>
          </div>

          <!-- About -->
          <div class="card">
            <div class="card-header"><h3>About</h3></div>
            <div class="card-body">
              <div class="info-list">
                <div class="info-row"><span class="info-label">Version</span><span class="info-value">${window.APP_CONFIG.version}</span></div>
                <div class="info-row"><span class="info-label">Tech Stack</span><span class="info-value">HTML/CSS/JS + Firebase</span></div>
                <div class="info-row"><span class="info-label">Hosting</span><span class="info-value">GitHub Pages</span></div>
                <div class="info-row"><span class="info-label">Database</span><span class="info-value">Firebase Firestore</span></div>
              </div>
              <div style="margin-top:var(--space-4)">
                <button type="button" class="btn btn-outline btn-sm" id="seed-btn">🌱 Seed Default Subjects & Grades</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    `;

    document.getElementById('save-settings-btn').addEventListener('click', async () => {
      const form = document.getElementById('settings-form');
      const btn  = document.getElementById('save-settings-btn');
      UI.btnLoading(btn, true);
      try {
        const data = Object.fromEntries(new FormData(form));
        data.late_fee_enabled = form.querySelector('[name="late_fee_enabled"]').checked;
        data.default_commission_pct = parseFloat(data.default_commission_pct)||60;
        data.advance_discount_pct   = parseFloat(data.advance_discount_pct)||5;
        data.advance_discount_min_months = parseInt(data.advance_discount_min_months)||2;
        data.late_fee_amount  = parseFloat(data.late_fee_amount)||10;
        data.grace_period_days = parseInt(data.grace_period_days)||3;
        await SettingsService.save(data);
        UI.toastSuccess('Settings saved!');
      } catch (e) { UI.toastError(e.message); }
      finally { UI.btnLoading(btn, false); }
    });

    document.getElementById('change-pw-btn').addEventListener('click', async () => {
      const pw = document.getElementById('new-password').value;
      if (!pw) { UI.toast('Enter a new password.', 'warning'); return; }
      try {
        await AuthService.changePassword(pw);
        UI.toastSuccess('Password changed!');
        document.getElementById('new-password').value = '';
      } catch (e) { UI.toastError(e.message); }
    });

    document.getElementById('seed-btn').addEventListener('click', async () => {
      await SubjectService.seed();
      await GradeService.seed();
      UI.toastSuccess('Default subjects and grades seeded!');
    });
  }
};

window.SettingsPage = SettingsPage;
