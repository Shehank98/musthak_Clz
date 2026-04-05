// ============================================================
// PDF EXPORT — using jsPDF + jsPDF-AutoTable
// ============================================================

const PDFExport = {
  _header(doc, title, subtitle, settings) {
    const centerName = (settings && settings.center_name) || 'Musthak Classes';
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(centerName, 14, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 30);
    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(subtitle, 14, 38);
      doc.setTextColor(0);
    }
    doc.setDrawColor(200);
    doc.line(14, 42, 196, 42);
    return 48;
  },

  financial(data, cur, settings) {
    if (!data) { UI.toast('Load the report first.', 'warning'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = PDFExport._header(doc, 'Financial Summary', `Month: ${Fmt.monthYear(data.monthKey)}`, settings);

    // Summary boxes
    doc.setFontSize(11);
    doc.text(`Total Revenue: ${Fmt.currency(data.total, cur)}`, 14, y+8);
    doc.text(`Teacher Payouts: ${Fmt.currency(data.teacher, cur)}`, 14, y+16);
    doc.text(`Center Revenue: ${Fmt.currency(data.center, cur)}`, 14, y+24);
    doc.text(`Transactions: ${data.count}`, 14, y+32);

    if (data.payments && data.payments.length > 0) {
      doc.autoTable({
        startY: y + 40,
        head: [['Receipt', 'Student', 'Class', 'Amount', 'Teacher', 'Center', 'Date']],
        body: data.payments.map(p => [
          p.receipt_number, p.student_name, p.class_name,
          Fmt.currency(p.amount_paid, cur), Fmt.currency(p.teacher_amount, cur),
          Fmt.currency(p.center_amount, cur), Fmt.date(p.payment_date)
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] }
      });
    }
    doc.save(`financial_${data.monthKey}.pdf`);
  },

  byClass(rows, cur) {
    if (!rows) { UI.toast('Load the report first.', 'warning'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    PDFExport._header(doc, 'Revenue by Class', `Generated: ${Fmt.date(new Date())}`);
    doc.autoTable({
      startY: 50,
      head: [['Class', 'Transactions', 'Total Revenue', 'Teacher', 'Center']],
      body: rows.map(r => [r.class_name, r.count, Fmt.currency(r.total, cur), Fmt.currency(r.teacher, cur), Fmt.currency(r.center, cur)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] }
    });
    doc.save('revenue_by_class.pdf');
  },

  byTeacher(rows, cur) {
    if (!rows) { UI.toast('Load the report first.', 'warning'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    PDFExport._header(doc, 'Teacher Earnings', `Generated: ${Fmt.date(new Date())}`);
    doc.autoTable({
      startY: 50,
      head: [['Teacher', 'Payments', 'Total Earnings']],
      body: rows.map(r => [r.teacher_name, r.count, Fmt.currency(r.earnings, cur)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] }
    });
    doc.save('teacher_earnings.pdf');
  },

  defaulters(dues, cur) {
    if (!dues) { UI.toast('Load the report first.', 'warning'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    PDFExport._header(doc, 'Defaulters List', `Generated: ${Fmt.date(new Date())} — ${dues.length} records`);
    doc.autoTable({
      startY: 50,
      head: [['Student ID', 'Month', 'Due Date', 'Balance', 'Days Overdue']],
      body: dues.map(d => [
        d.student_id.substring(0,8),
        Fmt.monthYear(d.due_month),
        Fmt.date(d.due_date),
        Fmt.currency(d.balance, cur),
        DateHelpers.daysOverdue(d.due_date) + ' days'
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 38] }
    });
    doc.save('defaulters.pdf');
  },

  receipt(payment, cur, settings) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: 'a6' });
    const centerName = (settings && settings.center_name) || 'Musthak Classes';

    doc.setFontSize(14);
    doc.setFont('helvetica','bold');
    doc.text(centerName, 74, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.text('PAYMENT RECEIPT', 74, 22, { align: 'center' });
    doc.setFontSize(8);
    doc.text(payment.receipt_number, 74, 28, { align: 'center' });
    doc.line(10, 32, 138, 32);

    const rows = [
      ['Student',       payment.student_name],
      ['Class',         payment.class_name],
      ['Months Paid',   `${payment.months_paid} month(s)`],
      ['Period',        (payment.months_covered||[]).map(m=>Fmt.monthYear(m)).join(', ')],
      ['Method',        payment.payment_method],
      ['Paid By',       payment.paid_by||'—'],
      ['Date',          Fmt.date(payment.payment_date)]
    ];

    let y = 38;
    rows.forEach(([k, v]) => {
      doc.setFont('helvetica','bold');
      doc.text(k + ':', 12, y);
      doc.setFont('helvetica','normal');
      doc.text(String(v), 60, y);
      y += 7;
    });

    doc.line(10, y, 138, y);
    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica','bold');
    doc.text(`TOTAL: ${Fmt.currency(payment.amount_paid, cur)}`, 74, y, { align: 'center' });

    doc.save(`receipt_${payment.receipt_number}.pdf`);
  }
};

window.PDFExport = PDFExport;
