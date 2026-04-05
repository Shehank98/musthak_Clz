// ============================================================
// EMAILJS.JS — Email notification wrappers
// Uses EmailJS browser SDK (loaded via CDN in index.html)
// ============================================================

const NotificationEmailJS = {
  _init(settings) {
    if (!settings.emailjs_public_key) return false;
    try {
      emailjs.init({ publicKey: settings.emailjs_public_key });
      return true;
    } catch (e) {
      console.warn('EmailJS init failed:', e);
      return false;
    }
  },

  async sendPaymentReceipt(toEmail, params, settings) {
    if (!settings.emailjs_service_id || !settings.emailjs_template_payment) {
      console.warn('EmailJS not configured for payment receipt.');
      return;
    }
    if (!NotificationEmailJS._init(settings)) return;
    return emailjs.send(
      settings.emailjs_service_id,
      settings.emailjs_template_payment,
      { ...params, to_email: toEmail }
    );
  },

  async sendDueReminder(toEmail, params, settings) {
    if (!settings.emailjs_service_id || !settings.emailjs_template_reminder) {
      console.warn('EmailJS not configured for reminders.');
      return;
    }
    if (!NotificationEmailJS._init(settings)) return;
    return emailjs.send(
      settings.emailjs_service_id,
      settings.emailjs_template_reminder,
      { ...params, to_email: toEmail }
    );
  },

  async sendOverdueNotice(toEmail, params, settings) {
    if (!settings.emailjs_service_id || !settings.emailjs_template_overdue) {
      console.warn('EmailJS not configured for overdue notices.');
      return;
    }
    if (!NotificationEmailJS._init(settings)) return;
    return emailjs.send(
      settings.emailjs_service_id,
      settings.emailjs_template_overdue,
      { ...params, to_email: toEmail }
    );
  }
};

window.NotificationEmailJS = NotificationEmailJS;
