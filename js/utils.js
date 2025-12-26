const Utils = {
  formatDate(dateStr) {
    return new Date(dateStr).toDateString();
  },

  today() {
    const dt = new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  unique(array) {
    return [...new Set(array)];
  }
};
