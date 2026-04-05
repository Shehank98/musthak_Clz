// ============================================================
// CSV EXPORT
// ============================================================

const CSVExport = {
  _download(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  _escape(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g,'""')}"` : s;
  },

  _toCSV(rows, headers) {
    const lines = [headers.join(',')];
    rows.forEach(row => lines.push(headers.map(h => CSVExport._escape(row[h])).join(',')));
    return lines.join('\r\n');
  },

  payments(payments, filename = 'payments.csv') {
    const rows = payments.map(p => ({
      receipt_number: p.receipt_number,
      student_name:   p.student_name,
      class_name:     p.class_name,
      amount_paid:    p.amount_paid,
      teacher_amount: p.teacher_amount,
      center_amount:  p.center_amount,
      payment_method: p.payment_method,
      payment_date:   Fmt.date(p.payment_date),
      months_paid:    p.months_paid,
      months_covered: (p.months_covered||[]).join('; ')
    }));
    const csv = CSVExport._toCSV(rows, ['receipt_number','student_name','class_name','amount_paid','teacher_amount','center_amount','payment_method','payment_date','months_paid','months_covered']);
    CSVExport._download(csv, filename);
  },

  exportDues(dues, filename = 'dues.csv') {
    const rows = dues.map(d => ({
      student_id: d.student_id,
      class_id:   d.class_id,
      due_month:  d.due_month,
      due_date:   Fmt.date(d.due_date),
      amount_due: d.amount_due,
      amount_paid: d.amount_paid,
      balance:    d.balance,
      status:     d.status,
      days_overdue: DateHelpers.daysOverdue(d.due_date)
    }));
    const csv = CSVExport._toCSV(rows, ['student_id','class_id','due_month','due_date','amount_due','amount_paid','balance','status','days_overdue']);
    CSVExport._download(csv, filename);
  },

  generic(rows, filename = 'export.csv') {
    if (!rows || rows.length === 0) { UI.toast('No data to export.', 'warning'); return; }
    const headers = Object.keys(rows[0]).filter(k => !['id','__key__'].includes(k));
    const csv = CSVExport._toCSV(rows.map(r => {
      const cleaned = {};
      headers.forEach(h => { cleaned[h] = r[h] instanceof Object && r[h].toDate ? Fmt.date(r[h]) : r[h]; });
      return cleaned;
    }), headers);
    CSVExport._download(csv, filename);
  }
};

window.CSVExport = CSVExport;
