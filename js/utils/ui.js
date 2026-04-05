// ============================================================
// UI.JS — Toast, modal, confirm dialog, avatar, DOM helpers
// ============================================================

const UI = {
  // ---- Toast notifications ----
  toast(msg, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  toastSuccess(msg) { UI.toast(msg, 'success'); },
  toastError(msg)   { UI.toast(msg, 'error', 6000); },
  toastWarning(msg) { UI.toast(msg, 'warning'); },

  // ---- Global modal ----
  showModal({ title, body, footer, size = '', onClose } = {}) {
    const backdrop = document.getElementById('modal-backdrop');
    const modal    = document.getElementById('global-modal');
    const titleEl  = document.getElementById('modal-title');
    const bodyEl   = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    titleEl.textContent = title || '';
    bodyEl.innerHTML    = body  || '';
    footerEl.innerHTML  = footer || '';

    // Size classes
    modal.className = 'modal ' + (size ? `modal-${size}` : '');
    backdrop.classList.remove('hidden');

    const close = () => {
      backdrop.classList.add('hidden');
      if (onClose) onClose();
    };

    document.getElementById('modal-close').onclick = close;
    backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
    return { close };
  },

  closeModal() {
    document.getElementById('modal-backdrop').classList.add('hidden');
  },

  // ---- Confirm dialog ----
  confirm(message, title = 'Confirm') {
    return new Promise(resolve => {
      UI.showModal({
        title,
        body: `<p style="margin-bottom:0;font-size:var(--font-size-base)">${message}</p>`,
        footer: `
          <button class="btn btn-outline" id="confirm-cancel">Cancel</button>
          <button class="btn btn-danger"  id="confirm-ok">Confirm</button>
        `,
        onClose: () => resolve(false)
      });
      document.getElementById('confirm-cancel').onclick = () => { UI.closeModal(); resolve(false); };
      document.getElementById('confirm-ok').onclick     = () => { UI.closeModal(); resolve(true);  };
    });
  },

  // ---- Page title ----
  setPageTitle(title) {
    const el = document.getElementById('page-title');
    if (el) el.textContent = title;
  },

  // ---- Loading ----
  showLoader(el) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return;
    el.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
  },

  // ---- Avatar initials ----
  avatar(name, size = '') {
    const initials = Fmt.initials(name);
    const colors   = ['#1e40af','#059669','#d97706','#7c3aed','#db2777','#0891b2'];
    const color    = colors[(name || '').length % colors.length];
    const cls      = size ? `avatar avatar-${size}` : 'avatar';
    return `<div class="${cls}" style="background:${color}">${initials}</div>`;
  },

  // ---- Status badge ----
  badge(text, type = 'gray') {
    return `<span class="badge badge-${type}">${text}</span>`;
  },

  statusBadge(status) {
    const map = {
      'Active':     'success',
      'Inactive':   'gray',
      'Completed':  'info',
      'Cancelled':  'danger',
      'Graduated':  'purple',
      'Pending':    'warning',
      'Paid':       'success',
      'Partial':    'warning',
      'Waived':     'info',
      'Overdue':    'danger',
      'Waiting':    'warning',
      'Open':       'success',
      'Closed':     'gray',
      'Present':    'success',
      'Absent':     'danger',
      'Late':       'warning',
      'Excused':    'info',
      'Refunded':   'danger',
      'Offered':    'info',
      'Enrolled':   'success',
      'Declined':   'danger'
    };
    return UI.badge(status, map[status] || 'gray');
  },

  // ---- Empty state ----
  emptyState(icon, title, message = '') {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h3>${title}</h3>
        ${message ? `<p>${message}</p>` : ''}
      </div>
    `;
  },

  // ---- Tab switching ----
  initTabs(containerEl) {
    const buttons = containerEl.querySelectorAll('.tab-btn');
    const panels  = containerEl.querySelectorAll('.tab-panel');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        buttons.forEach(b => b.classList.toggle('active', b === btn));
        panels.forEach(p => p.classList.toggle('active', p.id === target));
      });
    });
    // Activate first tab
    if (buttons[0]) buttons[0].click();
  },

  // ---- DOM convenience ----
  $: (sel, ctx = document) => ctx.querySelector(sel),
  $$: (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel)),

  // Debounce
  debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  },

  // Set button loading state
  btnLoading(btn, loading, label = '') {
    if (loading) {
      btn.dataset.origLabel = btn.innerHTML;
      btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> ${label || 'Loading...'}`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.origLabel || label;
      btn.disabled  = false;
    }
  }
};

window.UI = UI;
