// ============================================================
// QR SCANNER — html5-qrcode wrapper for attendance marking
// ============================================================

const QRScanner = {
  _instance: null,
  _running:  false,

  /**
   * Start camera scanning.
   * @param {string} containerId  — DOM element ID for the camera view
   * @param {function} onScan     — callback(studentId) called on successful scan
   * @param {function} onError    — callback(error) optional
   */
  start(containerId, onScan, onError) {
    if (QRScanner._running) QRScanner.stop();

    QRScanner._instance = new Html5Qrcode(containerId);
    QRScanner._running  = true;

    const config = {
      fps:         10,
      qrbox:       { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    QRScanner._instance.start(
      { facingMode: 'environment' }, // back camera
      config,
      (decodedText) => {
        // Extract studentId from the URL
        const studentId = QRScanner._extractStudentId(decodedText);
        if (studentId && onScan) {
          // Brief pause to avoid duplicate scans
          QRScanner._instance.pause(true);
          onScan(studentId);
          setTimeout(() => {
            if (QRScanner._running && QRScanner._instance) {
              try { QRScanner._instance.resume(); } catch(e) {}
            }
          }, 2000);
        }
      },
      onError
    ).catch(err => {
      console.error('QR Scanner start failed:', err);
      QRScanner._running = false;
      if (onError) onError(err);
    });
  },

  stop() {
    if (QRScanner._instance && QRScanner._running) {
      QRScanner._running = false;
      QRScanner._instance.stop().catch(() => {});
      QRScanner._instance = null;
    }
  },

  _extractStudentId(text) {
    // QR contains full URL: .../index.html#/portal/STUDENT_ID
    // or just the studentId directly
    if (text.includes('#/portal/')) {
      return text.split('#/portal/')[1].trim();
    }
    // Fallback: assume the whole text is the studentId
    if (text && text.length > 10 && !text.includes(' ')) return text.trim();
    return null;
  },

  isRunning() { return QRScanner._running; }
};

window.QRScanner = QRScanner;
