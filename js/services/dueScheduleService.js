// ============================================================
// DUE SCHEDULE SERVICE
// ============================================================

const DueScheduleService = {
  col: () => db.collection('due_schedules'),

  /**
   * Generate N months of due schedule documents for an enrollment.
   * Called on enrollment creation and renewal.
   */
  async generate(enrollmentId, studentId, classId, startDate, paymentDueDay, feeAmount, months) {
    months = months || APP_CONFIG.dueScheduleMonths;
    const dueDates = DateHelpers.generateDueDates(startDate, paymentDueDay, months);
    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    dueDates.forEach(({ due_month, due_date }) => {
      const ref = DueScheduleService.col().doc();
      batch.set(ref, {
        enrollment_id: enrollmentId,
        student_id:    studentId,
        class_id:      classId,
        due_month,
        due_date:      firebase.firestore.Timestamp.fromDate(due_date),
        amount_due:    feeAmount,
        amount_paid:   0,
        balance:       feeAmount,
        status:        'Pending',
        late_fee:      0,
        payment_id:    null,
        reminder_sent_at:      null,
        overdue_notice_sent_at: null,
        created_at:    now,
        updated_at:    now
      });
    });

    await batch.commit();
  },

  // Get N oldest pending dues for an enrollment
  async getNextPending(enrollmentId, count = 1) {
    const snap = await DueScheduleService.col()
      .where('enrollment_id', '==', enrollmentId)
      .where('status', '==', 'Pending')
      .orderBy('due_date', 'asc')
      .limit(count)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Get all dues for an enrollment
  async getByEnrollment(enrollmentId) {
    const snap = await DueScheduleService.col()
      .where('enrollment_id', '==', enrollmentId)
      .orderBy('due_date', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Get all pending dues (for dashboard / pending dues page)
  async getAllPending(studentId = null) {
    let q = DueScheduleService.col().where('status', '==', 'Pending').orderBy('due_date', 'asc');
    if (studentId) q = q.where('student_id', '==', studentId);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Get overdue dues (past grace period)
  async getOverdue(gracePeriodDays = 3) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - gracePeriodDays);
    const snap = await DueScheduleService.col()
      .where('status', '==', 'Pending')
      .where('due_date', '<', firebase.firestore.Timestamp.fromDate(cutoff))
      .orderBy('due_date', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async markReminderSent(dueId) {
    await DueScheduleService.col().doc(dueId).update({
      reminder_sent_at: firebase.firestore.FieldValue.serverTimestamp(),
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async waive(dueId, reason) {
    await DueScheduleService.col().doc(dueId).update({
      status: 'Waived',
      discount_reason: reason || '',
      balance: 0,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // Cancel all pending dues for an enrollment (on enrollment cancel)
  async cancelByEnrollment(enrollmentId) {
    const snap = await DueScheduleService.col()
      .where('enrollment_id', '==', enrollmentId)
      .where('status', '==', 'Pending').get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, {
      status: 'Cancelled',
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    }));
    await batch.commit();
  },

  // This month total pending amount across all enrollments
  async thisMonthPending() {
    const monthKey = DateHelpers.currentMonthKey();
    const snap = await DueScheduleService.col()
      .where('due_month', '==', monthKey)
      .where('status', '==', 'Pending').get();
    return snap.docs.reduce((sum, d) => sum + (d.data().balance || 0), 0);
  }
};

window.DueScheduleService = DueScheduleService;
