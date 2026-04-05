// ============================================================
// FORMATTERS.JS — Currency, date, receipt number, etc.
// ============================================================

const Fmt = {
  currency(amount, symbol) {
    const sym = symbol || (window.APP_CONFIG && window.APP_CONFIG.currency) || 'Rs.';
    const n = parseFloat(amount) || 0;
    return `${sym} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  number(n) {
    return parseFloat(n || 0).toLocaleString('en-US');
  },

  // "2026-04-05" → "Apr 5, 2026"
  date(d) {
    if (!d) return '—';
    const dt = d.toDate ? d.toDate() : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  // "2026-04-05 14:30" style
  datetime(d) {
    if (!d) return '—';
    const dt = d.toDate ? d.toDate() : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  // "2026-01" → "January 2026"
  monthYear(str) {
    if (!str) return '—';
    const [y, m] = str.split('-');
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${names[parseInt(m,10)-1]} ${y}`;
  },

  // Current timestamp → "RCP20260405143022"
  receiptNumber() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${window.APP_CONFIG.receiptPrefix}${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  },

  // "2026-04" style from Date
  toMonthKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  },

  // Days since date
  daysAgo(date) {
    const d = date && date.toDate ? date.toDate() : new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    return diff;
  },

  // "2 hours ago" / "3 days ago"
  timeAgo(date) {
    const d = date && date.toDate ? date.toDate() : new Date(date);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)   return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  },

  // Phone: "+94771234567" or "0771234567"
  phone(p) {
    return p || '—';
  },

  // Initials from full name
  initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();
  },

  // Percentage
  pct(n) {
    return `${parseFloat(n || 0).toFixed(1)}%`;
  },

  // Firestore Timestamp → JS Date
  toDate(val) {
    if (!val) return null;
    if (val.toDate) return val.toDate();
    if (val instanceof Date) return val;
    return new Date(val);
  },

  // Date → "YYYY-MM-DD" string
  toISODate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().slice(0, 10);
  }
};

window.Fmt = Fmt;
