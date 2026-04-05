// ============================================================
// TEACHER SERVICE
// ============================================================

const TeacherService = {
  col: () => db.collection('teachers'),

  async getAll(status = null) {
    let q = TeacherService.col().orderBy('full_name');
    if (status) q = q.where('status', '==', status);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getById(id) {
    const snap = await TeacherService.col().doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async create(data) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return TeacherService.col().add({
      ...data,
      subjects: data.subjects || [],
      grades: data.grades || [],
      created_at: now,
      updated_at: now
    });
  },

  async update(id, data) {
    data.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    await TeacherService.col().doc(id).update(data);
  },

  async delete(id) {
    const classes = await db.collection('classes')
      .where('teacher_id', '==', id)
      .where('status', '==', 'Active')
      .limit(1).get();
    if (!classes.empty) throw new Error('Teacher has active classes. Reassign them first.');
    await TeacherService.col().doc(id).delete();
  }
};

window.TeacherService = TeacherService;
