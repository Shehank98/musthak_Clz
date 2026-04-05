// ============================================================
// FIREBASE-INIT.JS — Initialize Firebase app, expose db/auth/storage
// ============================================================

(function() {
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  } catch (e) {
    // Already initialized (hot-reload)
  }

  window.db      = firebase.firestore();
  window.auth    = firebase.auth();
  window.storage = firebase.storage();

  // Enable offline persistence (optional, best-effort)
  window.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
})();
