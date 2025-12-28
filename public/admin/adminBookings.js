/* adminBookings.js
   Clean Admin Dashboard Script
   Source of truth: BACKEND ONLY
*/

(() => {
  const API_URL = "http://localhost:5000/api/bookings";

  const tbody = document.querySelector("#bookingsTable tbody");
  const totalEl = document.getElementById("totalBookings");

  const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect fill="%23222" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="20">No Image</text></svg>';

  // local ISO formatter to avoid timezone issues when generating YYYY-MM-DD strings
  function toLocalISO_admin(d) {
    const dt = (d instanceof Date) ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /* ================= FETCH BOOKINGS ================= */

  async function fetchBookingsFromApi() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch bookings");

      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data;
    } catch (err) {
      console.error("❌ API ERROR:", err);
      return [];
    }
  }

  /* ================= RENDER BOOKINGS ================= */

  function renderBookings(bookings) {
    tbody.innerHTML = "";

    if (!Array.isArray(bookings) || bookings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14" style="text-align:center;color:#999">
            No bookings found
          </td>
        </tr>`;
      if (totalEl) totalEl.innerText = "0";
      return;
    }

    // helpers to pick common keys
    const pick = (obj, keys) => {
      for (let k of keys) {
        if (!obj) continue;
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
      return null;
    };

    bookings.forEach((b, index) => {
      const tr = document.createElement('tr');

      // payment amount & status
      const payment = b.payment || {};
      const amount = payment.amount || b.amount || b.paymentAmount || b.orderAmount || '';
      const payStatus = payment.status || b.paymentStatus || (payment.txnId || b.txnId ? 'paid' : '') || b.status || '';

      // Aadhaar url detection
      const aadhaarCandidates = [
        b.aadhaarUrl, b.aadhaar_url, b.aadhaar, b.aadhaarFile, b.aadhaar_file,
        b.aadhaarImage, b.aadhaar_image, b.aadhaar_photo, b.idScan, b.id_scan, b.id_image,
        (b.aadhaar && typeof b.aadhaar === 'object' && (b.aadhaar.url || b.aadhaar.path))
      ];
      const aadhaarVal = aadhaarCandidates.find(x => !!x) || '';
      const aadhaarIsUrl = /^https?:\/\//i.test(aadhaarVal) || /^data:/i.test(aadhaarVal) || aadhaarVal.indexOf('/uploads/') === 0;
      const aadhaarSrc = aadhaarIsUrl ? aadhaarVal : (aadhaarVal ? `/uploads/${aadhaarVal}` : '');

      // Render Aadhaar as a clean "View Aadhaar" button (neat) — opens modal on click. Include a small hidden thumbnail for fallback.
      let aadhaarHtml = '';
      if (aadhaarSrc) {
        aadhaarHtml = `<button class="view-aadhaar" data-src="${aadhaarSrc}" aria-label="View Aadhaar" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">View Aadhaar</button>`;
      } else {
        aadhaarHtml = `<span style="color:#999;font-size:13px">No Aadhaar</span>`;
      }

      // proof detection (image or txn id)
      const proofCandidates = [b.proofUrl, b.payment && b.payment.proof && b.payment.proof.url, b.proof_url, b.paymentProofUrl, b.payment && b.payment.proof && b.payment.proof.path, b.proof];
      const proofVal = proofCandidates.find(x => !!x) || '';
      const txnVal = b.txnId || b.payment && b.payment.txn || b.paymentTxn || b.txn || '';
      let proofHtml = '—';
      if (proofVal) {
        const isImg = /\.(png|jpe?g|gif|webp|avif)$/i.test(proofVal) || /^data:/i.test(proofVal) || proofVal.indexOf('/uploads/') === 0;
        if (isImg) {
          proofHtml = `<button class="view-proof" data-src="${proofVal}" aria-label="View Proof" style="padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">View Proof</button>`;
        } else {
          proofHtml = `<a href="${proofVal}" target="_blank" rel="noopener">View proof</a>`;
        }
      } else if (txnVal) {
        proofHtml = `<div style="display:flex;gap:6px;align-items:center"><code style="background:rgba(0,0,0,0.05);padding:6px;border-radius:6px">${txnVal}</code><button class="copy-txn" data-txn="${txnVal}" style="padding:6px;border-radius:6px;border:0;background:#0072ff;color:#fff;cursor:pointer">Copy</button></div>`;
      }

      const timeStr = b.time || b.createdAt || b.created_at || '';

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(b.name || '')}</td>
        <td>${escapeHtml(b.email || '')}</td>
        <td>${escapeHtml(b.phone || '')}</td>
        <td>${escapeHtml(b.checkin || '')}</td>
        <td>${escapeHtml(b.checkout || '')}</td>
  <td>${escapeHtml(guestLabel(b.guests || ''))}</td>
  <td>${formatRupees(computePriceForBooking(b.guests || '1', b.checkin || ''))}</td>
  <td>${escapeHtml(b.message || '')}</td>
  <td><div>${amount ? (Number(amount) ? (Number(amount) >= 100000 ? (Number(amount)/100).toFixed(2) : Number(amount).toFixed(2)) + ' INR' : escapeHtml(String(amount))) : '—'}</div></td>
        <td><span class="status ${escapeHtml((payStatus || '').toLowerCase())}">${escapeHtml(payStatus || '')}</span></td>
        <td>${aadhaarHtml}</td>
        <td>${proofHtml}</td>
        <td>${escapeHtml(formatTime(timeStr))}</td>
        <td>
          <button class="approve" data-id="${b.id || b._id || ''}">Approve</button>
          <button class="reject" data-id="${b.id || b._id || ''}">Reject</button>
          <button class="delete" data-id="${b.id || b._id || ''}">Delete</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    if (totalEl) totalEl.innerText = bookings.length;
    bindActions();
  }

  /* ================= ACTIONS ================= */

  function bindActions() {
    // status/action buttons
    document.querySelectorAll('.approve').forEach(btn => btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'approved')));
    document.querySelectorAll('.reject').forEach(btn => btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'rejected')));
    document.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', () => deleteBooking(btn.dataset.id)));
  

    // copy txn handlers
    document.querySelectorAll('button.copy-txn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.txn;
        try { navigator.clipboard.writeText(t); btn.innerText = 'Copied'; setTimeout(() => btn.innerText = 'Copy', 1500); } catch(e) { console.warn('copy failed', e); }
      });
    });

    // thumbnail/modal delegation (one-time) - handle old .thumb-link and new view buttons
    if (!bindActions._thumbDelegation) {
      bindActions._thumbDelegation = true;
      document.body.addEventListener('click', (ev) => {
        const tl = ev.target.closest && (ev.target.closest('.thumb-link') || ev.target.closest('.view-aadhaar') || ev.target.closest('.view-proof'));
        if (!tl) return;
        ev.preventDefault();
        const src = tl.dataset && tl.dataset.src;
        if (!src) return;
        showImageModal(src);
      });
    }
  }

  async function updateStatus(id, status) {
    if (!confirm(`Mark booking as ${status}?`)) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error("Update failed");

      // Refresh bookings and update calendar/bookedDates if approved
      await fetchAndRender();
      if (String(status).toLowerCase() === 'approved') {
        try {
          // find the booking we just approved and add its date range to bookedDates
          const all = await fetchBookingsFromApi();
          const found = (all || []).find(b => String(b.id || b._id || '') === String(id));
          if (found && found.checkin && found.checkout) addBookedRange(found.checkin, found.checkout);
        } catch (e) { console.warn('Could not add booked range', e); }
      }
    } catch (err) {
      alert("Failed to update status");
      console.error(err);
    }
  }

  async function deleteBooking(id) {
    if (!confirm("Delete this booking permanently?")) return;

    try {
      // fetch booking details before deleting so we can remove booked ranges if needed
      const all = await fetchBookingsFromApi();
      const found = (all || []).find(b => String(b.id || b._id || '') === String(id));

      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Delete failed");

      // If booking was approved, remove its dates from localStorage so they become available
      try {
        if (found && (String(found.status).toLowerCase() === 'approved')) {
          if (found.checkin && found.checkout) await removeBookedRange(found.checkin, found.checkout, false);
        }
      } catch (e) { console.warn('Failed to remove booked range after delete', e); }

      fetchAndRender();
    } catch (err) {
      alert("Failed to delete booking");
      console.error(err);
    }
  }

  // remove a date range (inclusive) from localStorage 'bookedDates'
  // remove a date range (inclusive) from localStorage 'bookedDates'
  // by default this is safe: it will not remove dates that are still covered by
  // other approved bookings. Pass force=true to remove regardless.
  async function removeBookedRange(startDate, endDate, force = false) {
    try {
      const s = (startDate || '').split('T')[0];
      const e = (endDate || '').split('T')[0];
      if (!s || !e) return;
      const a = new Date(s);
      const b = new Date(e);
      if (b < a) return;
      const list = JSON.parse(localStorage.getItem('bookedDates') || '[]');
      const candidate = [];
      for (let d = new Date(a); d <= b; d.setDate(d.getDate()+1)) {
        const iso = toLocalISO_admin(d);
        if (list.includes(iso) && !candidate.includes(iso)) candidate.push(iso);
      }

      if (!candidate.length) return;

      // If not forced, ensure no other approved bookings still claim these dates
      if (!force) {
        try {
          const all = await fetchBookingsFromApi();
          const otherDates = new Set();
          (all || []).forEach(bk => {
            try {
              if (!bk || String(bk.status).toLowerCase() !== 'approved') return;
              const cs = (bk.checkin || '').split('T')[0];
              const ce = (bk.checkout || '').split('T')[0];
              if (!cs || !ce) return;
              for (let d = new Date(cs); d <= new Date(ce); d.setDate(d.getDate()+1)) {
                otherDates.add(toLocalISO_admin(d));
              }
            } catch (e) {}
          });

          // Only remove candidate dates that are NOT present in otherDates
          const removable = candidate.filter(x => !otherDates.has(x));
          if (!removable.length) {
            console.info('No removable booked dates — other approved bookings still cover them', candidate);
            return;
          }
          const filtered = list.filter(x => !removable.includes(x));
          localStorage.setItem('bookedDates', JSON.stringify(filtered));
          try { localStorage.setItem('ngi_booked_updated', Date.now()); } catch(e){}
          try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'booked:removed', dates: removable }); bc.close(); } } catch(e){}
          console.info('Removed booked dates (safe):', removable);
          return;
        } catch (e) { console.warn('removeBookedRange safety check failed', e); }
      }

      // forced removal: remove all candidate dates
      const filtered = list.filter(x => !candidate.includes(x));
      localStorage.setItem('bookedDates', JSON.stringify(filtered));
      try { localStorage.setItem('ngi_booked_updated', Date.now()); } catch(e){}
      try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'booked:removed', dates: candidate }); bc.close(); } } catch(e){}
      console.info('Removed booked dates (forced):', candidate);
    } catch (err) { console.warn('removeBookedRange failed', err); }
  }

  // add a date range to blockedDates
  function addBlockedRange(startDate, endDate) {
    try {
      const s = (startDate || '').split('T')[0];
      const e = (endDate || '').split('T')[0];
      if (!s || !e) return;
      const a = new Date(s);
      const b = new Date(e);
      if (b < a) return;
      const list = JSON.parse(localStorage.getItem('blockedDates') || '[]');
      const toAdd = [];
      for (let d = new Date(a); d <= b; d.setDate(d.getDate()+1)) {
        const iso = toLocalISO_admin(d);
        if (!list.includes(iso) && !toAdd.includes(iso)) toAdd.push(iso);
      }
      if (toAdd.length) {
        const merged = list.concat(toAdd).sort();
        localStorage.setItem('blockedDates', JSON.stringify(merged));
        try { localStorage.setItem('ngi_blocked_updated', Date.now()); } catch(e){}
        try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'blocked:updated', dates: toAdd }); bc.close(); } } catch(e){}
        console.info('Added blocked dates', toAdd);
      }
    } catch (err) { console.warn('addBlockedRange failed', err); }
  }

  // remove a range from blockedDates
  function removeBlockedRange(startDate, endDate) {
    try {
      const s = (startDate || '').split('T')[0];
      const e = (endDate || '').split('T')[0];
      if (!s || !e) return;
      const a = new Date(s);
      const b = new Date(e);
      if (b < a) return;
      const list = JSON.parse(localStorage.getItem('blockedDates') || '[]');
      const toRemove = [];
      for (let d = new Date(a); d <= b; d.setDate(d.getDate()+1)) {
        const iso = toLocalISO_admin(d);
        if (list.includes(iso) && !toRemove.includes(iso)) toRemove.push(iso);
      }
      if (toRemove.length) {
        const filtered = list.filter(x => !toRemove.includes(x));
        localStorage.setItem('blockedDates', JSON.stringify(filtered));
        try { localStorage.setItem('ngi_blocked_updated', Date.now()); } catch(e){}
        try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'blocked:removed', dates: toRemove }); bc.close(); } } catch(e){}
        console.info('Removed blocked dates', toRemove);
      }
    } catch (err) { console.warn('removeBlockedRange failed', err); }
  }

  // helpers for admin buttons to block/unblock based on booking id
  async function blockDates(id) {
    try {
      const all = await fetchBookingsFromApi();
      const found = (all || []).find(b => String(b.id || b._id || '') === String(id));
      if (!found || !found.checkin || !found.checkout) return alert('Booking does not have dates');
      addBlockedRange(found.checkin, found.checkout);
      alert('Dates blocked for booking ' + id);
    } catch (e) { console.warn('blockDates failed', e); alert('Failed to block dates'); }
  }

  async function unblockDates(id) {
    try {
      const all = await fetchBookingsFromApi();
      const found = (all || []).find(b => String(b.id || b._id || '') === String(id));
      if (!found || !found.checkin || !found.checkout) return alert('Booking does not have dates');
      removeBlockedRange(found.checkin, found.checkout);
      alert('Dates unblocked for booking ' + id);
    } catch (e) { console.warn('unblockDates failed', e); alert('Failed to unblock dates'); }
  }

  // add a date range (inclusive) to localStorage 'bookedDates' array and broadcast update
  function addBookedRange(startDate, endDate) {
    try {
      const s = (startDate || '').split('T')[0];
      const e = (endDate || '').split('T')[0];
      if (!s || !e) return;
      const a = new Date(s);
      const b = new Date(e);
      if (b < a) return;
      const list = JSON.parse(localStorage.getItem('bookedDates') || '[]');
      const toAdd = [];
      for (let d = new Date(a); d <= b; d.setDate(d.getDate()+1)) {
        const iso = toLocalISO_admin(d);
        if (!list.includes(iso) && !toAdd.includes(iso)) toAdd.push(iso);
      }
      if (toAdd.length) {
        const merged = list.concat(toAdd).sort();
        localStorage.setItem('bookedDates', JSON.stringify(merged));
        try { localStorage.setItem('ngi_booked_updated', Date.now()); } catch(e){}
        try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'booked:updated', dates: toAdd }); bc.close(); } } catch(e){}
        console.info('Added booked dates', toAdd);
      }
    } catch (err) { console.warn('addBookedRange failed', err); }
  }

  /* ================= HELPERS ================= */

  function formatTime(time) {
    if (!time) return "—";
    try { return new Date(time).toLocaleString(); } catch (e) { return String(time); }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; });
  }

  // ---------- PRICE HELPERS (same rules as public booking page) ----------
  function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const s = (dateStr || '').split('T')[0];
    const parts = s.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }

  function isWeekendDate(dateStr) {
    const d = parseLocalDate(dateStr) || new Date();
    if (!d) return false;
    const day = d.getDay(); // 0 Sun, 6 Sat
    return day === 0 || day === 6;
  }

  function computePriceForBooking(guestsValue, checkinDate) {
    const weekend = isWeekendDate(checkinDate);
    switch (String(guestsValue)) {
      case '1': return weekend ? 12000 : 9000; // below 10
      case '2': return weekend ? 14000 : 10000; // 10-15
      case '3': return weekend ? 16000 : 11000; // 15-20
      case '4': return weekend ? 18000 : 11000; // 20+ -> weekday mapped to 11k
      default: return weekend ? 12000 : 9000;
    }
  }

  function formatRupees(n) {
    try { return '₹' + Number(n).toLocaleString('en-IN'); } catch (e) { return '₹' + n; }
  }

  // map guest select values to readable labels
  function guestLabel(val) {
    switch (String(val)) {
      case '1': return 'below 10';
      case '2': return '10-15';
      case '3': return '15-20';
      case '4': return '20+';
      default: return (val === null || val === undefined || val === '') ? '—' : String(val);
    }
  }

  async function fetchAndRender() {
    const data = await fetchBookingsFromApi();
    renderBookings(data || []);
  }

  // image modal viewer
  function showImageModal(src) {
    try {
      const existing = document.getElementById('adminImgModal'); if (existing) existing.remove();
      const modal = document.createElement('div'); modal.id = 'adminImgModal';
      modal.innerHTML = `<div class="admin-img-overlay" role="dialog" aria-modal="true"><div class="admin-img-wrap"><button class="admin-img-close" aria-label="Close">×</button><img src="${src}" style="max-width:90vw;max-height:90vh"/></div></div>`;
      document.body.appendChild(modal);
      const close = () => { modal.remove(); document.removeEventListener('keydown', onKey); };
      modal.querySelector('.admin-img-close').addEventListener('click', close);
      modal.querySelector('.admin-img-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(); });
      function onKey(e){ if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onKey);
    } catch (err) { console.warn('showImageModal failed', err); }
  }

  /* ================= INIT ================= */

  document.addEventListener("DOMContentLoaded", () => {
    fetchAndRender();
    // refresh periodically
    setInterval(fetchAndRender, 30000);
  });

  // Listen for cross-tab booking updates (booking page broadcasts after create)
  try {
    if (window.BroadcastChannel) {
      const bc = new BroadcastChannel('ngi_channel');
      bc.addEventListener('message', (m) => {
        try { if (m && m.data && m.data.type === 'bookings:updated') { console.info('BroadcastChannel: bookings updated', m.data); fetchAndRender(); } } catch(e){}
      });
    }
  } catch (e) { /* ignore */ }


})();
