// ============================================================
// QR GENERATOR — Generate + Print QR cards using qrcode.js
// ============================================================

const QRGenerator = {
  /**
   * Generate a QR code for a student into a container div.
   * @param {string} studentId
   * @param {HTMLElement} container  — will hold the qrcode canvas
   * @param {number} size  — pixel size of QR
   */
  generate(studentId, container, size = 160) {
    container.innerHTML = '';
    const url = QRGenerator.portalUrl(studentId);
    return new QRCode(container, {
      text:          url,
      width:         size,
      height:        size,
      colorDark:     '#000000',
      colorLight:    '#ffffff',
      correctLevel:  QRCode.CorrectLevel.M
    });
  },

  portalUrl(studentId) {
    return `${window.location.origin}${window.location.pathname}#/portal/${studentId}`;
  },

  /**
   * Print a QR card for a student.
   * Renders into the hidden #print-area and calls window.print().
   */
  async printCard(student, settings) {
    const centerName = (settings && settings.center_name) || 'Musthak Classes';
    const printArea  = document.getElementById('print-area');

    // Build QR canvas first
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    const qrCode = new QRCode(tempDiv, {
      text:         QRGenerator.portalUrl(student.id),
      width:        160,
      height:       160,
      colorDark:    '#000000',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });

    // Wait a tick for QRCode to render
    await new Promise(r => setTimeout(r, 200));

    const canvas = tempDiv.querySelector('canvas');
    const imgSrc = canvas ? canvas.toDataURL() : '';
    document.body.removeChild(tempDiv);

    printArea.innerHTML = `
      <div class="print-qr-card">
        <div class="pqr-center-name">${centerName}</div>
        ${imgSrc ? `<img src="${imgSrc}" class="pqr-qr" width="160" height="160" alt="QR" />` : '<div style="width:160px;height:160px;background:#eee;margin:0 auto"></div>'}
        <div class="pqr-name">${student.full_name}</div>
        <div class="pqr-id">${student.id.substring(0, 8).toUpperCase()}</div>
      </div>
    `;

    window.print();
    printArea.innerHTML = '';
  },

  /**
   * Print multiple QR cards at once (bulk print).
   */
  async printBulk(students, settings) {
    const centerName = (settings && settings.center_name) || 'Musthak Classes';
    const printArea  = document.getElementById('print-area');

    // Generate all QR images
    const cards = await Promise.all(students.map(async (student) => {
      const tempDiv = document.createElement('div');
      document.body.appendChild(tempDiv);
      new QRCode(tempDiv, {
        text:         QRGenerator.portalUrl(student.id),
        width:        130,
        height:       130,
        colorDark:    '#000000',
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      await new Promise(r => setTimeout(r, 200));
      const canvas = tempDiv.querySelector('canvas');
      const imgSrc = canvas ? canvas.toDataURL() : '';
      document.body.removeChild(tempDiv);
      return { student, imgSrc };
    }));

    printArea.innerHTML = `
      <div class="print-qr-grid">
        ${cards.map(({ student, imgSrc }) => `
          <div class="print-qr-card">
            <div class="pqr-center-name">${centerName}</div>
            ${imgSrc ? `<img src="${imgSrc}" class="pqr-qr" width="130" height="130" alt="QR" />` : ''}
            <div class="pqr-name">${student.full_name}</div>
            <div class="pqr-id">${student.id.substring(0, 8).toUpperCase()}</div>
          </div>
        `).join('')}
      </div>
    `;

    window.print();
    printArea.innerHTML = '';
  }
};

window.QRGenerator = QRGenerator;
