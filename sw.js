// ============================================================
// SERVICE WORKER — offline support for static assets
// ============================================================

const CACHE_NAME = 'musthak-cms-v1';
const STATIC_ASSETS = [
  './index.html',
  './css/main.css',
  './css/layout.css',
  './css/components.css',
  './css/dashboard.css',
  './css/payments.css',
  './css/print.css',
  './js/config.js',
  './js/app.js',
  './js/router.js',
  './js/firebase/firebase-init.js',
  './js/firebase/auth.js',
  './js/firebase/storage.js',
  './js/utils/formatters.js',
  './js/utils/validators.js',
  './js/utils/ui.js',
  './js/utils/dateHelpers.js',
  './js/services/settingsService.js',
  './js/services/studentService.js',
  './js/services/teacherService.js',
  './js/services/subjectService.js',
  './js/services/gradeService.js',
  './js/services/classService.js',
  './js/services/enrollmentService.js',
  './js/services/paymentService.js',
  './js/services/dueScheduleService.js',
  './js/services/attendanceService.js',
  './js/notifications/emailjs.js',
  './js/notifications/whatsapp.js',
  './js/qr/qrGenerator.js',
  './js/qr/qrScanner.js',
  './js/reports/pdfExport.js',
  './js/reports/csvExport.js',
  './js/pages/login.js',
  './js/pages/dashboard.js',
  './js/pages/students.js',
  './js/pages/teachers.js',
  './js/pages/subjects.js',
  './js/pages/grades.js',
  './js/pages/classes.js',
  './js/pages/enrollments.js',
  './js/pages/payments.js',
  './js/pages/attendance.js',
  './js/pages/reports.js',
  './js/pages/settings.js',
  './js/pages/studentPortal.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only cache GET requests for same-origin or CDN static assets
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
