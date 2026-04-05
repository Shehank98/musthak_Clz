// ============================================================
// VALIDATORS.JS
// ============================================================

const Validators = {
  email(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
  },

  phone(v) {
    return /^[\d\s\+\-\(\)]{7,15}$/.test(v || '');
  },

  required(v) {
    return v !== null && v !== undefined && String(v).trim() !== '';
  },

  positiveNumber(v) {
    return !isNaN(parseFloat(v)) && parseFloat(v) > 0;
  },

  nonNegativeNumber(v) {
    return !isNaN(parseFloat(v)) && parseFloat(v) >= 0;
  },

  paymentDueDay(v) {
    const n = parseInt(v);
    return !isNaN(n) && n >= 1 && n <= 28;
  },

  // Validate a form object: { fieldId: [rules...] }
  // Returns { valid: bool, errors: { fieldId: message } }
  form(formEl, rules) {
    const errors = {};
    for (const [field, checks] of Object.entries(rules)) {
      const el = formEl.querySelector(`[name="${field}"], #${field}`);
      const val = el ? el.value.trim() : '';
      for (const check of checks) {
        let msg = null;
        if (check === 'required' && !Validators.required(val))  msg = 'This field is required.';
        if (check === 'email'    && val && !Validators.email(val)) msg = 'Enter a valid email.';
        if (check === 'phone'    && val && !Validators.phone(val)) msg = 'Enter a valid phone number.';
        if (check === 'positive' && !Validators.positiveNumber(val)) msg = 'Must be a positive number.';
        if (msg) { errors[field] = msg; break; }
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },

  // Show/clear errors on a form
  showErrors(formEl, errors) {
    // Clear existing
    formEl.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
    formEl.querySelectorAll('.form-error').forEach(el => el.remove());
    // Apply new
    for (const [field, msg] of Object.entries(errors)) {
      const el = formEl.querySelector(`[name="${field}"], #${field}`);
      if (el) {
        el.classList.add('error');
        const err = document.createElement('div');
        err.className = 'form-error';
        err.textContent = msg;
        el.parentNode.appendChild(err);
      }
    }
  },

  clearErrors(formEl) {
    formEl.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
    formEl.querySelectorAll('.form-error').forEach(el => el.remove());
  }
};

window.Validators = Validators;
