// ============================================================
// PAYMENT SERVICE — Most critical service
// Handles fee recording, due schedule updates, notifications
// ============================================================

const PaymentService = {
  col: () => db.collection('payments'),

  /**
   * Record a payment. All Firestore writes are atomic (batch).
   * After commit, triggers email + WhatsApp notifications async.
   *
   * @param {Object} opts
   * @returns {Object} payment object (for receipt display)
   */
  async recordPayment({
    enrollmentId,
    months,
    amountPerMonth,
    discountAmount,
    discountReason,
    paymentMethod,
    paidBy,
    notes
  }) {
    // 1. Load enrollment
    const enr = await EnrollmentService.getById(enrollmentId);
    if (!enr || enr.status !== 'Active') throw new Error('Enrollment not found or inactive.');

    // 2. Load settings for commission
    const settings = await SettingsService.get();
    const classDoc  = await ClassService.getById(enr.class_id);
    const commissionPct = classDoc.teacher_commission_pct !== undefined
      ? classDoc.teacher_commission_pct
      : settings.default_commission_pct;

    // 3. Fetch N oldest pending due_schedules
    months = parseInt(months) || 1;
    const pendingDues = await DueScheduleService.getNextPending(enrollmentId, months);

    // 4. Calculations
    const subtotal   = parseFloat(amountPerMonth) * months;
    const discount   = parseFloat(discountAmount) || 0;
    const amountPaid = subtotal - discount;
    const teacherAmt = Math.round(amountPaid * (commissionPct / 100) * 100) / 100;
    const centerAmt  = Math.round((amountPaid - teacherAmt) * 100) / 100;

    // 5. Determine months covered
    const monthsCovered = pendingDues.map(d => d.due_month);
    // If paying more months than pending dues, fill forward
    if (monthsCovered.length < months) {
      const lastKey = monthsCovered.length > 0
        ? monthsCovered[monthsCovered.length - 1]
        : DateHelpers.currentMonthKey();
      let cur = DateHelpers.fromMonthKey(lastKey);
      while (monthsCovered.length < months) {
        cur = DateHelpers.addMonths(cur, 1);
        monthsCovered.push(Fmt.toMonthKey(cur));
      }
    }

    // 6. Generate receipt number
    const receiptNo = Fmt.receiptNumber();

    // 7. Current user
    const user = AuthService.getCurrentUser();

    // 8. Payment document
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentDoc = {
      enrollment_id:    enrollmentId,
      student_id:       enr.student_id,
      student_name:     enr.student_name,
      class_id:         enr.class_id,
      class_name:       enr.class_name,
      teacher_id:       enr.teacher_id,
      teacher_name:     enr.teacher_name,
      amount_per_month: parseFloat(amountPerMonth),
      months_paid:      months,
      subtotal,
      discount_amount:  discount,
      discount_reason:  discountReason || '',
      amount_paid:      amountPaid,
      teacher_amount:   teacherAmt,
      center_amount:    centerAmt,
      teacher_commission_pct: commissionPct,
      payment_date:     now,
      months_covered:   monthsCovered,
      payment_method:   paymentMethod || 'Cash',
      receipt_number:   receiptNo,
      paid_by:          paidBy || '',
      recorded_by:      user ? user.uid : 'system',
      status:           'Completed',
      notification_sent: false,
      notes:            notes || '',
      created_at:       now
    };

    // 9. Batch write
    const batch = db.batch();
    const paymentRef = PaymentService.col().doc();
    batch.set(paymentRef, paymentDoc);

    // Update due_schedule docs
    pendingDues.forEach(due => {
      batch.update(db.collection('due_schedules').doc(due.id), {
        status:       'Paid',
        amount_paid:  due.amount_due,
        balance:      0,
        payment_id:   paymentRef.id,
        updated_at:   now
      });
    });

    // Calculate next due date
    const remainingDues = await DueScheduleService.getNextPending(enrollmentId, months + 1);
    const nextPending   = remainingDues.find(d => !pendingDues.some(p => p.id === d.id));
    const nextDueDate   = nextPending
      ? nextPending.due_date
      : firebase.firestore.Timestamp.fromDate(DateHelpers.nextDueDate(enr.payment_due_day));

    // Update enrollment
    batch.update(EnrollmentService.col().doc(enrollmentId), {
      total_paid:       firebase.firestore.FieldValue.increment(amountPaid),
      months_paid_count: firebase.firestore.FieldValue.increment(months),
      last_payment_date: now,
      next_due_date:    nextDueDate,
      total_outstanding: firebase.firestore.FieldValue.increment(-amountPaid),
      updated_at:       now
    });

    // Update student total
    batch.update(db.collection('students').doc(enr.student_id), {
      total_paid_all_time: firebase.firestore.FieldValue.increment(amountPaid),
      updated_at: now
    });

    await batch.commit();

    // 10. Build return object (for receipt + notification)
    const paymentResult = {
      id: paymentRef.id,
      ...paymentDoc,
      payment_date: new Date(),
      receipt_number: receiptNo,
      months_covered: monthsCovered,
      enrollment: enr
    };

    // 11. Trigger notifications (non-blocking — never fail the payment)
    PaymentService._sendNotifications(paymentResult, settings).catch(console.warn);

    // 12. Mark notification sent
    paymentRef.update({ notification_sent: true }).catch(() => {});

    return paymentResult;
  },

  // Send email + WhatsApp receipts
  async _sendNotifications(payment, settings) {
    const student = await StudentService.getById(payment.student_id);
    if (!student) return;

    const params = {
      center_name:    settings.center_name || 'Musthak Classes',
      center_phone:   settings.center_phone || '',
      currency:       settings.currency_symbol || 'Rs.',
      receipt_number: payment.receipt_number,
      student_name:   student.full_name,
      parent_name:    student.parent_name || student.full_name,
      class_name:     payment.class_name,
      months_covered: payment.months_covered.map(m => Fmt.monthYear(m)).join(', '),
      amount_paid:    Fmt.currency(payment.amount_paid, settings.currency_symbol),
      payment_date:   Fmt.date(new Date()),
      payment_method: payment.payment_method
    };

    // Email
    if (student.parent_email || student.email) {
      const email = student.parent_email || student.email;
      await NotificationEmailJS.sendPaymentReceipt(email, params, settings)
        .then(() => PaymentService._logNotification(payment.id, 'payment_receipt', 'email', student.id, email, 'sent', null))
        .catch(e  => PaymentService._logNotification(payment.id, 'payment_receipt', 'email', student.id, email, 'failed', e.message));
    }

    // WhatsApp
    const waNum = student.parent_whatsapp || student.parent_phone;
    if (waNum && settings.callmebot_api_key) {
      const msg = `Payment received for ${student.full_name}: ${Fmt.currency(payment.amount_paid, settings.currency_symbol)} for ${payment.class_name} (${params.months_covered}). Receipt: ${payment.receipt_number}. - ${params.center_name}`;
      await NotificationWhatsApp.send(waNum, msg, settings.callmebot_api_key)
        .then(() => PaymentService._logNotification(payment.id, 'payment_receipt', 'whatsapp', student.id, waNum, 'sent', null))
        .catch(e  => PaymentService._logNotification(payment.id, 'payment_receipt', 'whatsapp', student.id, waNum, 'failed', e.message));
    }
  },

  async _logNotification(paymentId, type, channel, studentId, contact, status, error) {
    await db.collection('notifications_log').add({
      type,
      channel,
      recipient_student_id: studentId,
      recipient_contact:    contact,
      status,
      error_message:        error || null,
      sent_at:              firebase.firestore.FieldValue.serverTimestamp(),
      related_payment_id:   paymentId
    });
  },

  // Get payment history
  async getAll(limit = 50) {
    const snap = await PaymentService.col()
      .orderBy('created_at', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByStudent(studentId, limit = 20) {
    const snap = await PaymentService.col()
      .where('student_id', '==', studentId)
      .orderBy('created_at', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByEnrollment(enrollmentId) {
    const snap = await PaymentService.col()
      .where('enrollment_id', '==', enrollmentId)
      .orderBy('created_at', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // This month revenue
  async thisMonthRevenue() {
    const monthKey = DateHelpers.currentMonthKey();
    const start = DateHelpers.fromMonthKey(monthKey);
    const end   = DateHelpers.addMonths(start, 1);
    const snap  = await PaymentService.col()
      .where('payment_date', '>=', firebase.firestore.Timestamp.fromDate(start))
      .where('payment_date', '<',  firebase.firestore.Timestamp.fromDate(end))
      .where('status', '==', 'Completed').get();
    const docs = snap.docs.map(d => d.data());
    return {
      total:   docs.reduce((s, d) => s + (d.amount_paid   || 0), 0),
      teacher: docs.reduce((s, d) => s + (d.teacher_amount || 0), 0),
      center:  docs.reduce((s, d) => s + (d.center_amount  || 0), 0),
      count:   docs.length
    };
  },

  // Calculate payment (no Firestore write — for live preview)
  calculate(amountPerMonth, months, commissionPct, advanceDiscountPct, applyDiscount) {
    const subtotal   = parseFloat(amountPerMonth) * parseInt(months);
    const discount   = applyDiscount ? Math.round(subtotal * (advanceDiscountPct / 100) * 100) / 100 : 0;
    const amountPaid = subtotal - discount;
    const teacherAmt = Math.round(amountPaid * (commissionPct / 100) * 100) / 100;
    const centerAmt  = Math.round((amountPaid - teacherAmt) * 100) / 100;
    return { subtotal, discount, amountPaid, teacherAmt, centerAmt };
  }
};

window.PaymentService = PaymentService;
