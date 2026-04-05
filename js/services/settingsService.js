// ============================================================
// SETTINGS SERVICE — Firestore settings/global document
// ============================================================

const SettingsService = {
  _cache: null,

  async get() {
    if (SettingsService._cache) return SettingsService._cache;
    const snap = await db.collection('settings').doc('global').get();
    if (snap.exists) {
      SettingsService._cache = snap.data();
    } else {
      // Bootstrap default settings
      SettingsService._cache = SettingsService._defaults();
      await db.collection('settings').doc('global').set(SettingsService._cache);
    }
    return SettingsService._cache;
  },

  async save(data) {
    data.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('settings').doc('global').set(data, { merge: true });
    SettingsService._cache = null; // clear cache
  },

  clearCache() { SettingsService._cache = null; },

  _defaults() {
    return {
      center_name:   'Musthak Classes',
      center_address: '',
      center_phone:  '',
      center_email:  '',
      currency_symbol: 'Rs.',
      academic_year: '2026-2027',
      default_commission_pct: 60,
      advance_discount_pct: 5,
      advance_discount_min_months: 2,
      late_fee_enabled: false,
      late_fee_amount: 10,
      grace_period_days: 3,
      emailjs_service_id: '',
      emailjs_template_payment: '',
      emailjs_template_reminder: '',
      emailjs_template_overdue: '',
      emailjs_public_key: '',
      callmebot_api_key: '',
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    };
  }
};

window.SettingsService = SettingsService;
