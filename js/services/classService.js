// ============================================================
// CLASS SERVICE
// ============================================================

const ClassService = {
  col: () => db.collection('classes'),

  async getAll(status = null) {
    let q = ClassService.col().orderBy('class_name');
    if (status) q = q.where('status', '==', status);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getById(id) {
    const snap = await ClassService.col().doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async getByTeacher(teacherId) {
    const snap = await ClassService.col()
      .where('teacher_id', '==', teacherId)
      .where('status', '==', 'Active').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async create(data) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return ClassService.col().add({
      ...data,
      current_enrollment: 0,
      waiting_list_count: 0,
      created_at: now,
      updated_at: now
    });
  },

  async update(id, data) {
    data.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    await ClassService.col().doc(id).update(data);
  },

  async delete(id) {
    const enr = await db.collection('enrollments')
      .where('class_id', '==', id)
      .where('status', '==', 'Active').limit(1).get();
    if (!enr.empty) throw new Error('Class has active enrollments. Cancel them first.');
    await ClassService.col().doc(id).delete();
  },

  // Get today's classes based on schedule_days
  async getToday() {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = days[new Date().getDay()];
    const all = await ClassService.getAll('Active');
    return all.filter(c => (c.schedule_days || []).includes(today))
              .sort((a,b) => (a.schedule_time || '').localeCompare(b.schedule_time || ''));
  }
};

window.ClassService = ClassService;
