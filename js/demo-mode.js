// ============================================================
// DEMO-MODE.JS — Mock Firebase when real config is not set
// Allows previewing all pages without a Firebase project.
// ============================================================

(function() {
  const cfg = window.FIREBASE_CONFIG || {};
  const isPlaceholder = !cfg.apiKey || cfg.apiKey === 'YOUR_API_KEY';
  if (!isPlaceholder) return; // real config → do nothing

  window.DEMO_MODE = true;
  console.info('[Demo Mode] Firebase not configured — running with mock data.');

  // ── Fake user ──────────────────────────────────────────────
  const FAKE_USER = { uid: 'demo-admin', email: DEFAULT_ADMIN.email };
  let _authListeners = [];

  // ── Minimal Firestore mock ─────────────────────────────────
  function makeQuery() {
    const q = {
      _where: [],
      _order: [],
      _limit: null,
      where(f, op, v) { return makeQuery(); },
      orderBy()       { return makeQuery(); },
      limit()         { return makeQuery(); },
      startAfter()    { return makeQuery(); },
      get()           { return Promise.resolve({ empty: true, docs: [], forEach() {} }); },
      onSnapshot(cb)  { cb({ empty: true, docs: [], forEach() {} }); return () => {}; }
    };
    return q;
  }

  function makeDocRef(data) {
    const ref = {
      id: 'demo-' + Math.random().toString(36).slice(2),
      get()            { return Promise.resolve({ exists: false, data: () => null, id: ref.id }); },
      set()            { return Promise.resolve(); },
      update()         { return Promise.resolve(); },
      delete()         { return Promise.resolve(); },
      onSnapshot(cb)   { cb({ exists: false, data: () => null, id: ref.id }); return () => {}; },
      collection(name) { return makeColRef(name); }
    };
    return ref;
  }

  function makeColRef(name) {
    return {
      id: name,
      doc(id)          { return makeDocRef(); },
      add(data)        { return Promise.resolve({ id: 'demo-' + Date.now() }); },
      where()          { return makeQuery(); },
      orderBy()        { return makeQuery(); },
      limit()          { return makeQuery(); },
      get()            { return Promise.resolve({ empty: true, docs: [], forEach() {} }); },
      onSnapshot(cb)   { cb({ empty: true, docs: [], forEach() {} }); return () => {}; }
    };
  }

  // Firestore batch mock
  function makeBatch() {
    return {
      set()    { return this; },
      update() { return this; },
      delete() { return this; },
      commit() { return Promise.resolve(); }
    };
  }

  // Firestore FieldValue mock
  const FieldValueMock = {
    serverTimestamp: () => new Date().toISOString(),
    increment:       (n) => n,
    arrayUnion:      (...a) => a,
    arrayRemove:     (...a) => a
  };

  // ── Replace firebase global ────────────────────────────────
  window.firebase = {
    initializeApp() {},
    auth() {
      return {
        currentUser: FAKE_USER,
        signInWithEmailAndPassword() { return Promise.resolve({ user: FAKE_USER }); },
        signOut()                    { return Promise.resolve(); },
        createUserWithEmailAndPassword() { return Promise.resolve({ user: FAKE_USER }); },
        onAuthStateChanged(cb)       {
          _authListeners.push(cb);
          // Emit logged-in immediately (async so scripts finish registering first)
          setTimeout(() => cb(FAKE_USER), 100);
          return () => {};
        }
      };
    },
    firestore() {
      const fs = {
        collection: (name) => makeColRef(name),
        doc:        (path) => makeDocRef(),
        batch:      () => makeBatch(),
        FieldValue: FieldValueMock,
        Timestamp:  { now: () => ({ toDate: () => new Date() }), fromDate: (d) => d }
      };
      fs.enablePersistence = () => Promise.resolve();
      return fs;
    },
    storage() {
      return {
        ref: () => ({
          put:            () => Promise.resolve(),
          getDownloadURL: () => Promise.resolve(''),
          child:          () => this
        })
      };
    }
  };

  // Also expose FieldValue on the firestore function so code like
  // firebase.firestore.FieldValue works
  window.firebase.firestore.FieldValue = FieldValueMock;

  // ── Patch AuthService to return fake user synchronously ────
  // (AuthService is defined later; patch it after all scripts load)
  window.addEventListener('load', () => {
    if (window.AuthService) {
      AuthService.getCurrentUser = () => FAKE_USER;
      AuthService.signIn  = () => Promise.resolve({ user: FAKE_USER });
      AuthService.signOut = async () => { window.location.hash = '#/login'; };
      AuthService.createAdmin = () => Promise.resolve();
    }
  });

  // Show a demo banner
  window.addEventListener('load', () => {
    const banner = document.createElement('div');
    banner.id = 'demo-banner';
    banner.style.cssText = `
      position:fixed; bottom:0; left:0; right:0; z-index:9999;
      background:#f59e0b; color:#1c1917; text-align:center;
      padding:6px 12px; font-size:12px; font-weight:600;
    `;
    banner.textContent = '⚠ Demo Mode — Firebase not configured. All data is empty. Edit js/config.js with real Firebase credentials to go live.';
    document.body.appendChild(banner);
  });
})();
