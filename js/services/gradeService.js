// ============================================================
// GRADE SERVICE
// ============================================================

const GradeService = {
  col: () => db.collection('grades'),

  async getAll() {
    const snap = await GradeService.col().orderBy('grade_order').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async create(data) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return GradeService.col().add({ ...data, created_at: now });
  },

  async update(id, data) {
    await GradeService.col().doc(id).update(data);
  },

  async delete(id) {
    const used = await db.collection('classes').where('grade_id', '==', id).limit(1).get();
    if (!used.empty) throw new Error('Grade is used by a class. Remove or reassign classes first.');
    await GradeService.col().doc(id).delete();
  },

  async seed() {
    const existing = await GradeService.getAll();
    if (existing.length > 0) return;
    const defaults = [
      { grade_name: 'Grade 6',  grade_order: 6,  description: '', status: 'Active' },
      { grade_name: 'Grade 7',  grade_order: 7,  description: '', status: 'Active' },
      { grade_name: 'Grade 8',  grade_order: 8,  description: '', status: 'Active' },
      { grade_name: 'Grade 9',  grade_order: 9,  description: '', status: 'Active' },
      { grade_name: 'Grade 10', grade_order: 10, description: '', status: 'Active' },
      { grade_name: 'Grade 11', grade_order: 11, description: '', status: 'Active' },
      { grade_name: 'O/L',      grade_order: 12, description: 'Ordinary Level', status: 'Active' },
      { grade_name: 'A/L',      grade_order: 13, description: 'Advanced Level', status: 'Active' },
    ];
    const batch = db.batch();
    defaults.forEach(g => batch.set(GradeService.col().doc(), { ...g, created_at: firebase.firestore.FieldValue.serverTimestamp() }));
    await batch.commit();
  }
};

window.GradeService = GradeService;
