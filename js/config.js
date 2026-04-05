// ============================================================
// CONFIG.JS — Firebase config + App constants
// ============================================================
// IMPORTANT: Replace FIREBASE_CONFIG values with your own from
// the Firebase console (console.firebase.google.com).
// These placeholder values will not work until replaced.
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const APP_CONFIG = {
  appName:                 "Musthak Class Management",
  currency:                "Rs.",
  receiptPrefix:           "RCP",
  defaultCommissionPct:    60,
  advanceDiscountPct:      5,
  advanceDiscountMinMonths: 2,
  lateFeeEnabled:          false,
  lateFeeAmount:           10,
  gracePeriodDays:         3,
  dueScheduleMonths:       12,   // how many months ahead to generate dues
  version:                 "1.0.0"
};

// Default super admin — auto-created on first load
// Change credentials in Settings → Admin Account after going live
const DEFAULT_ADMIN = {
  email:    "admin@gmail.com",
  password: "admin123"
};

// Expose globally
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.APP_CONFIG      = APP_CONFIG;
window.DEFAULT_ADMIN   = DEFAULT_ADMIN;
