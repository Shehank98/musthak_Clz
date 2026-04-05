// ============================================================
// SUBJECT SERVICE
// ============================================================

const SubjectService = {
  col: () => db.collection('subjects'),

  async getAll() {
    const snap = await SubjectService.col().orderBy('subject_name').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async create(data) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return SubjectService.col().add({ ...data, created_at: now });
  },

  async update(id, data) {
    await SubjectService.col().doc(id).update(data);
  },

  async delete(id) {
    const used = await db.collection('classes').where('subject_id', '==', id).limit(1).get();
    if (!used.empty) throw new Error('Subject is used by a class. Remove or reassign classes first.');
    await SubjectService.col().doc(id).delete();
  },

  async seed() {
    const existing = await SubjectService.getAll();
    if (existing.length > 0) return;
    const defaults = [
      { subject_name: 'Mathematics',  subject_code: 'MATH', description: '', status: 'Active' },
      { subject_name: 'Physics',      subject_code: 'PHYS', description: '', status: 'Active' },
      { subject_name: 'Chemistry',    subject_code: 'CHEM', description: '', status: 'Active' },
      { subject_name: 'English',      subject_code: 'ENG',  description: '', status: 'Active' },
      { subject_name: 'Biology',      subject_code: 'BIO',  description: '', status: 'Active' },
      { subject_name: 'ICT',          subject_code: 'ICT',  description: '', status: 'Active' },
    ];
    const batch = db.batch();
    defaults.forEach(s => batch.set(SubjectService.col().doc(), { ...s, created_at: firebase.firestore.FieldValue.serverTimestamp() }));
    await batch.commit();
  }
};

window.SubjectService = SubjectService;
