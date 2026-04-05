// ============================================================
// ENROLLMENT SERVICE
// ============================================================

const EnrollmentService = {
  col: () => db.collection('enrollments'),

  async getAll(status = null) {
    let q = EnrollmentService.col().orderBy('enrollment_date', 'desc');
    if (status) q = q.where('status', '==', status);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByStudent(studentId) {
    const snap = await EnrollmentService.col()
      .where('student_id', '==', studentId)
      .orderBy('enrollment_date', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getActiveByStudent(studentId) {
    const snap = await EnrollmentService.col()
      .where('student_id', '==', studentId)
      .where('status', '==', 'Active').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByClass(classId) {
    const snap = await EnrollmentService.col()
      .where('class_id', '==', classId)
      .where('status', '==', 'Active').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getById(id) {
    const snap = await EnrollmentService.col().doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  /**
   * Create a new enrollment with capacity guard + due schedule generation.
   */
  async create(data) {
    const { student_id, class_id, fee_agreed, payment_due_day, start_date } = data;

    // 1. Check class capacity
    const classDoc = await ClassService.getById(class_id);
    if (!classDoc) throw new Error('Class not found.');

    if (classDoc.current_enrollment >= classDoc.max_capacity) {
      throw new Error('Class is at full capacity. Add student to waiting list instead.');
    }

    // 2. Check not already enrolled
    const existing = await EnrollmentService.col()
      .where('student_id', '==', student_id)
      .where('class_id',   '==', class_id)
      .where('status',     '==', 'Active').limit(1).get();
    if (!existing.empty) throw new Error('Student is already enrolled in this class.');

    // 3. Get student info
    const student = await StudentService.getById(student_id);
    if (!student) throw new Error('Student not found.');

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const startDateObj = start_date instanceof Date ? start_date : new Date(start_date);

    // 4. Build enrollment document
    const firstDueDate = DateHelpers.nextDueDate(payment_due_day);
    const enrollDoc = {
      student_id,
      student_name:   student.full_name,
      class_id,
      class_name:     classDoc.class_name,
      teacher_id:     classDoc.teacher_id,
      teacher_name:   classDoc.teacher_name,
      subject_id:     classDoc.subject_id,
      subject_name:   classDoc.subject_name,
      grade_id:       classDoc.grade_id || '',
      grade_name:     classDoc.grade_name || '',
      enrollment_date: now,
      fee_agreed:     parseFloat(fee_agreed) || classDoc.fee_per_month,
      discount_notes: data.discount_notes || '',
      payment_due_day: parseInt(payment_due_day) || 5,
      start_date:     firebase.firestore.Timestamp.fromDate(startDateObj),
      end_date:       null,
      status:         'Active',
      waiting_list:   false,
      total_paid:     0,
      months_paid_count: 0,
      last_payment_date: null,
      next_due_date:  firebase.firestore.Timestamp.fromDate(firstDueDate),
      total_outstanding: 0,
      notes:          data.notes || '',
      created_at:     now,
      updated_at:     now
    };

    // 5. Batch: create enrollment + increment class counter + increment student counter
    const batch = db.batch();
    const enrollRef = EnrollmentService.col().doc();
    batch.set(enrollRef, enrollDoc);
    batch.update(db.collection('classes').doc(class_id), {
      current_enrollment: firebase.firestore.FieldValue.increment(1),
      updated_at: now
    });
    batch.update(db.collection('students').doc(student_id), {
      active_enrollment_count: firebase.firestore.FieldValue.increment(1),
      updated_at: now
    });
    await batch.commit();

    // 6. Generate due schedule (outside batch — multiple docs)
    await DueScheduleService.generate(
      enrollRef.id, student_id, class_id,
      startDateObj, parseInt(payment_due_day) || 5,
      parseFloat(fee_agreed) || classDoc.fee_per_month,
      APP_CONFIG.dueScheduleMonths
    );

    return enrollRef.id;
  },

  async cancel(id, reason = '') {
    const enr = await EnrollmentService.getById(id);
    if (!enr) throw new Error('Enrollment not found.');

    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    batch.update(EnrollmentService.col().doc(id), {
      status: 'Cancelled',
      end_date: now,
      notes: enr.notes ? enr.notes + '\nCancelled: ' + reason : 'Cancelled: ' + reason,
      updated_at: now
    });
    batch.update(db.collection('classes').doc(enr.class_id), {
      current_enrollment: firebase.firestore.FieldValue.increment(-1),
      updated_at: now
    });
    batch.update(db.collection('students').doc(enr.student_id), {
      active_enrollment_count: firebase.firestore.FieldValue.increment(-1),
      updated_at: now
    });
    await batch.commit();

    // Cancel pending dues
    await DueScheduleService.cancelByEnrollment(id);
  },

  async update(id, data) {
    data.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    await EnrollmentService.col().doc(id).update(data);
  }
};

window.EnrollmentService = EnrollmentService;
