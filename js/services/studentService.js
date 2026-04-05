// ============================================================
// STUDENT SERVICE
// ============================================================

const StudentService = {
  col: () => db.collection('students'),

  async getAll(status = null) {
    let q = StudentService.col().orderBy('full_name');
    if (status) q = q.where('status', '==', status);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getById(id) {
    const snap = await StudentService.col().doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async search(query) {
    // Firestore doesn't support full-text search, so we load all and filter
    const all = await StudentService.getAll();
    const q = query.toLowerCase();
    return all.filter(s =>
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.parent_phone || '').includes(q) ||
      (s.card_uid || '').toLowerCase().includes(q)
    );
  },

  async create(data) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = {
      ...data,
      qr_code_id: '',           // will be set after save with document ID
      active_enrollment_count: 0,
      total_paid_all_time: 0,
      registration_date: now,
      created_at: now,
      updated_at: now
    };
    const ref = await StudentService.col().add(doc);
    // Store document ID as qr_code_id
    await ref.update({ qr_code_id: ref.id });
    return ref.id;
  },

  async update(id, data) {
    data.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    await StudentService.col().doc(id).update(data);
  },

  async delete(id) {
    // Check for active enrollments
    const enr = await db.collection('enrollments')
      .where('student_id', '==', id)
      .where('status', '==', 'Active')
      .limit(1).get();
    if (!enr.empty) throw new Error('Student has active enrollments. Cancel them first.');
    await StudentService.col().doc(id).delete();
  },

  async updatePhoto(id, photoURL) {
    await StudentService.col().doc(id).update({
      photo_url: photoURL,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
};

window.StudentService = StudentService;
