// ============================================================
// ATTENDANCE SERVICE
// ============================================================

const AttendanceService = {
  sessions: () => db.collection('attendance_sessions'),
  records:  () => db.collection('attendance_records'),

  async createSession(classId, sessionDate, startTime, endTime, topic) {
    const classDoc = await ClassService.getById(classId);
    if (!classDoc) throw new Error('Class not found.');
    const enrolled = await EnrollmentService.getByClass(classId);

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const sessionRef = await AttendanceService.sessions().add({
      class_id:       classId,
      class_name:     classDoc.class_name,
      teacher_id:     classDoc.teacher_id,
      session_date:   firebase.firestore.Timestamp.fromDate(
                        sessionDate instanceof Date ? sessionDate : new Date(sessionDate)),
      start_time:     startTime || '',
      end_time:       endTime   || '',
      topic_covered:  topic     || '',
      total_enrolled: enrolled.length,
      total_present:  0,
      total_absent:   0,
      status:         'Open',
      notes:          '',
      created_by:     AuthService.getCurrentUser()?.uid || '',
      created_at:     now
    });

    // Pre-create "Absent" records for all enrolled students (will be flipped to Present on scan/mark)
    const batch = db.batch();
    enrolled.forEach(enr => {
      const recRef = AttendanceService.records().doc();
      batch.set(recRef, {
        session_id:    sessionRef.id,
        class_id:      classId,
        student_id:    enr.student_id,
        student_name:  enr.student_name,
        enrollment_id: enr.id,
        status:        'Absent',
        marked_at:     null,
        marked_by:     null,
        notes:         ''
      });
    });
    await batch.commit();

    return sessionRef.id;
  },

  async getSessions(classId = null, limit = 20) {
    let q = AttendanceService.sessions().orderBy('session_date', 'desc').limit(limit);
    if (classId) q = q.where('class_id', '==', classId);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getSessionById(id) {
    const snap = await AttendanceService.sessions().doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async getRecords(sessionId) {
    const snap = await AttendanceService.records()
      .where('session_id', '==', sessionId)
      .orderBy('student_name').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async markAttendance(sessionId, studentId, status, markedBy = 'admin') {
    const snap = await AttendanceService.records()
      .where('session_id', '==', sessionId)
      .where('student_id', '==', studentId).limit(1).get();

    const now = firebase.firestore.FieldValue.serverTimestamp();
    if (!snap.empty) {
      await snap.docs[0].ref.update({ status, marked_at: now, marked_by: markedBy });
    }
    // Recount totals
    await AttendanceService._updateSessionCounts(sessionId);
  },

  async _updateSessionCounts(sessionId) {
    const snap = await AttendanceService.records().where('session_id', '==', sessionId).get();
    const present = snap.docs.filter(d => ['Present','Late'].includes(d.data().status)).length;
    const absent  = snap.docs.filter(d => d.data().status === 'Absent').length;
    await AttendanceService.sessions().doc(sessionId).update({
      total_present: present,
      total_absent: absent
    });
  },

  async closeSession(sessionId) {
    await AttendanceService.sessions().doc(sessionId).update({
      status: 'Closed',
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async getStudentAttendance(studentId, classId = null) {
    let q = AttendanceService.records().where('student_id', '==', studentId);
    if (classId) q = q.where('class_id', '==', classId);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};

window.AttendanceService = AttendanceService;
