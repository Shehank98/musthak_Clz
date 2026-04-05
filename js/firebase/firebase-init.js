// ============================================================
// FIREBASE-INIT.JS — Initialize Firebase app, expose db/auth/storage
// ============================================================

(function() {
  if (!window.DEMO_MODE) {
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    } catch (e) {
      // Already initialized (hot-reload)
    }
  }

  window.db      = firebase.firestore();
  window.auth    = firebase.auth();
  window.storage = firebase.storage();

  // Enable offline persistence (skip in demo mode)
  if (!window.DEMO_MODE) {
    window.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  }
})();
