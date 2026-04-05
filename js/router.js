// ============================================================
// ROUTER.JS — Hash-based SPA router with auth guard
// ============================================================

const Router = {
  routes: {},
  currentRoute: null,

  // Register a route: Router.register('dashboard', dashboardPage)
  register(path, handler) {
    Router.routes[path] = handler;
  },

  // Navigate to a hash route
  navigate(path) {
    window.location.hash = '#/' + path;
  },

  // Initialize: listen to hashchange
  init() {
    window.addEventListener('hashchange', () => Router._handle());
    Router._handle(); // handle current hash on load
  },

  _handle() {
    const hash = window.location.hash || '#/dashboard';
    const path = hash.replace('#/', '').split('?')[0];
    const parts = path.split('/');
    const page  = parts[0];
    const param = parts[1] || null; // e.g. student id

    // Public portal — no auth required
    if (page === 'portal') {
      Router._showPortal(param);
      return;
    }

    // Auth guard
    const user = AuthService.getCurrentUser();
    if (!user) {
      Router._showLogin();
      return;
    }

    Router._showApp(page, param);
  },

  _showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('portal-screen').classList.add('hidden');
  },

  _showApp(page, param) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    document.getElementById('portal-screen').classList.add('hidden');

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(a => {
      a.classList.toggle('active', a.dataset.page === page);
    });

    // Update page title
    const titles = {
      dashboard:   'Dashboard',
      students:    'Students',
      teachers:    'Teachers',
      subjects:    'Subjects',
      grades:      'Grades',
      classes:     'Classes',
      enrollments: 'Enrollments',
      payments:    'Payments',
      attendance:  'Attendance',
      reports:     'Reports',
      settings:    'Settings'
    };
    UI.setPageTitle(titles[page] || page);

    // Load page
    const handler = Router.routes[page];
    if (handler) {
      const content = document.getElementById('content-area');
      content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
      try {
        handler(content, param);
      } catch (e) {
        console.error('Page load error:', e);
        content.innerHTML = `<div class="alert alert-danger">Failed to load page: ${e.message}</div>`;
      }
    } else {
      document.getElementById('content-area').innerHTML =
        UI.emptyState('🔍', 'Page not found', `No route registered for "${page}".`);
    }

    Router.currentRoute = page;

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  },

  _showPortal(studentId) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('portal-screen').classList.remove('hidden');
    if (window.StudentPortalPage) StudentPortalPage.load(studentId);
  }
};

window.Router = Router;
