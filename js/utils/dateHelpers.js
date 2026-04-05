// ============================================================
// DATE-HELPERS.JS — Due schedule generation, month arithmetic
// JS equivalent of Python's relativedelta
// ============================================================

const DateHelpers = {
  /**
   * Add N months to a date, keeping the day (clamped to end of month).
   */
  addMonths(date, n) {
    const d = new Date(date);
    const targetMonth = d.getMonth() + n;
    d.setMonth(targetMonth);
    // If day overflowed (e.g. Jan 31 + 1 month = Mar 3), snap back to last day
    const expected = ((date.getMonth() + n) % 12 + 12) % 12;
    if (d.getMonth() !== expected) {
      d.setDate(0); // last day of previous month
    }
    return d;
  },

  /**
   * Build a Date for a given month-year with the specified day-of-month.
   * day is clamped to the last valid day of the month.
   */
  dateForDay(year, month, day) {
    // month is 1-based
    const lastDay = new Date(year, month, 0).getDate();
    const d = Math.min(day, lastDay);
    return new Date(year, month - 1, d);
  },

  /**
   * Generate due dates for N months starting from startDate.
   * paymentDueDay: 1-28 (day of month payment is due)
   */
  generateDueDates(startDate, paymentDueDay, months) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const dueDates = [];
    for (let i = 0; i < months; i++) {
      const base = DateHelpers.addMonths(start, i);
      const dueDate = DateHelpers.dateForDay(base.getFullYear(), base.getMonth() + 1, paymentDueDay);
      dueDates.push({
        due_month: Fmt.toMonthKey(base),
        due_date:  dueDate
      });
    }
    return dueDates;
  },

  /**
   * Get current month key "YYYY-MM"
   */
  currentMonthKey() {
    return Fmt.toMonthKey(new Date());
  },

  /**
   * Days overdue (negative = not yet due)
   */
  daysOverdue(dueDate) {
    const d = dueDate && dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  },

  /**
   * Returns "overdue" | "today" | "upcoming" | "paid"
   */
  dueStatus(dueDate, status) {
    if (status === 'Paid')    return 'paid';
    if (status === 'Waived')  return 'paid';
    if (status === 'Cancelled') return 'paid';
    const days = DateHelpers.daysOverdue(dueDate);
    if (days > 0)  return 'overdue';
    if (days === 0) return 'today';
    return 'upcoming';
  },

  /**
   * Next occurrence of a monthly due day from today
   */
  nextDueDate(paymentDueDay) {
    const today = new Date();
    let d = DateHelpers.dateForDay(today.getFullYear(), today.getMonth() + 1, paymentDueDay);
    if (d < today) d = DateHelpers.addMonths(d, 1);
    return d;
  },

  /**
   * Format a date range for display
   */
  formatRange(start, end) {
    return end ? `${Fmt.date(start)} – ${Fmt.date(end)}` : `from ${Fmt.date(start)}`;
  },

  /**
   * "YYYY-MM" string → Date (first of the month)
   */
  fromMonthKey(key) {
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 1);
  },

  /**
   * Get array of month keys between two dates (inclusive)
   */
  monthRange(startDate, endDate) {
    const keys = [];
    let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (cur <= end) {
      keys.push(Fmt.toMonthKey(cur));
      cur = DateHelpers.addMonths(cur, 1);
    }
    return keys;
  }
};

window.DateHelpers = DateHelpers;
