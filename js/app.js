// ============================================================
// APP.JS — Entry point: register pages, init auth + router
// ============================================================

(function() {
  // Auto-create default admin on first load (silently ignored on subsequent loads)
  async function _bootstrapAdmin() {
    try {
      await AuthService.createAdmin(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
    } catch (e) {
      // "email-already-in-use" = already created, that's fine
      // Any other error (e.g. Firebase not yet configured) = ignore silently
    }
  }
  _bootstrapAdmin();

  // Pre-fill login form with default credentials
  document.getElementById('login-email').value    = DEFAULT_ADMIN.email;
  document.getElementById('login-password').value = DEFAULT_ADMIN.password;

  // Register all pages
  Router.register('dashboard',   (el, p) => DashboardPage.load(el, p));
  Router.register('students',    (el, p) => StudentsPage.load(el, p));
  Router.register('teachers',    (el, p) => TeachersPage.load(el, p));
  Router.register('subjects',    (el, p) => SubjectsPage.load(el, p));
  Router.register('grades',      (el, p) => GradesPage.load(el, p));
  Router.register('classes',     (el, p) => ClassesPage.load(el, p));
  Router.register('enrollments', (el, p) => EnrollmentsPage.load(el, p));
  Router.register('payments',    (el, p) => PaymentsPage.load(el, p));
  Router.register('attendance',  (el, p) => AttendancePage.load(el, p));
  Router.register('reports',     (el, p) => ReportsPage.load(el, p));
  Router.register('settings',    (el, p) => SettingsPage.load(el, p));

  // Sidebar toggle (mobile)
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('visible');
  });
  document.getElementById('sidebar-close').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    if (await UI.confirm('Are you sure you want to sign out?', 'Sign Out')) {
      await AuthService.signOut();
      window.location.hash = '#/login';
    }
  });

  // Quick payment button in topbar
  document.getElementById('quick-payment-btn').addEventListener('click', () => {
    Router.navigate('payments');
  });

  // Auth state listener — drives router
  AuthService.onAuthChanged(user => {
    if (window.location.hash.startsWith('#/portal/')) {
      // Public portal — don't redirect
      return;
    }
    if (!user && !window.location.hash.includes('login')) {
      Router._showLogin();
    } else if (user) {
      Router.init();
    } else {
      Router._showLogin();
    }
  });

  // Handle portal on initial load even without auth
  if (window.location.hash.startsWith('#/portal/')) {
    const studentId = window.location.hash.replace('#/portal/', '');
    Router._showPortal(studentId);
  } else {
    // Wait for auth state before routing
    // (handled by onAuthChanged above)
    const user = AuthService.getCurrentUser();
    if (user) Router.init();
    else Router._showLogin();
  }

  // Login form handler
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    const btn      = document.getElementById('login-btn');

    errEl.classList.add('hidden');
    UI.btnLoading(btn, true, 'Signing in...');

    try {
      await AuthService.signIn(email, password);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errEl.textContent = 'Invalid email or password. Please try again.';
      errEl.classList.remove('hidden');
    } finally {
      UI.btnLoading(btn, false, 'Sign In');
    }
  });

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
