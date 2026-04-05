// ============================================================
// WHATSAPP.JS — CallMeBot API wrapper
// Note: parent must first activate their number with CallMeBot:
//   Send WhatsApp to +34 644 68 18 43 with message:
//   "I allow callmebot to send me messages"
// ============================================================

const NotificationWhatsApp = {
  /**
   * Send a WhatsApp message via CallMeBot API.
   * Uses a CORS proxy (allorigins.win) since GitHub Pages can't
   * call external APIs directly without a proxy.
   *
   * @param {string} phone  e.g. "+94771234567"
   * @param {string} message
   * @param {string} apiKey  CallMeBot API key
   */
  async send(phone, message, apiKey) {
    if (!phone || !apiKey) {
      console.warn('WhatsApp: missing phone or API key');
      return;
    }
    // Normalize phone: ensure + prefix, remove spaces
    const normalizedPhone = phone.replace(/\s/g, '');
    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${normalizedPhone}&text=${encodedMsg}&apikey=${apiKey}`;

    // Use a CORS proxy for browser-side requests
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`WhatsApp send failed: ${response.status}`);
    }
    return response.json();
  },

  // Build a reminder message string
  reminderMessage(studentName, className, amountDue, dueDate, currency, centerPhone) {
    return `Reminder: ${studentName} has a payment of ${currency} ${amountDue} due on ${Fmt.date(dueDate)} for ${className}. Please contact: ${centerPhone}`;
  },

  // Build overdue message string
  overdueMessage(studentName, className, balance, currency, centerPhone) {
    return `OVERDUE NOTICE: ${studentName} has an outstanding balance of ${currency} ${balance} for ${className}. Please settle immediately. Contact: ${centerPhone}`;
  }
};

window.NotificationWhatsApp = NotificationWhatsApp;
