// booking.js — CLEAN & FIXED VERSION (NO DISAPPEARING DATA)

document.addEventListener("DOMContentLoaded", () => {

  const bookingForm = document.getElementById("bookingForm");
  if (!bookingForm) return;

  const checkinInput = document.getElementById("checkin");
  const checkoutInput = document.getElementById("checkout");

  const payBtn = document.getElementById("payAdvanceBtn");
  const submitBtn = document.getElementById("requestBookingBtn");

  const aadhaarInput = document.getElementById("aadhaarFile");
  aadhaarInput.addEventListener("change", () => {
  const file = aadhaarInput.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    window.aadhaarBase64 = reader.result;
  };

  reader.readAsDataURL(file);
});
  const aadhaarConsent = document.getElementById("aadhaarConsent");
  const paymentStatus = document.getElementById("paymentStatus");
  const notificationDiv = document.getElementById("notificationMessage");

  const API_BASE =
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://YOUR_BACKEND_URL";
  const ADVANCE_AMOUNT = 2000;

  let paymentDone = false;
  let savedAadhaarId = null;
  let savedAadhaarUrl = null;
  let paymentInfo = null;

  // ---------- DATE SETUP ----------
  // local YYYY-MM-DD formatter to avoid timezone/UTC mismatches
  function toLocalISO_booking(d) {
    const dt = (d instanceof Date) ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const today = toLocalISO_booking(new Date());
  if (checkinInput) checkinInput.min = today;
  if (checkoutInput) checkoutInput.min = today;

  // ---------- INITIAL STATES ----------
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.type = "button"; // 🔥 VERY IMPORTANT FIX
  }
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.type = "button";
  }

  // Prevent native form submission (defensive) which can cause reloads and clear file inputs
  bookingForm.addEventListener('submit', (e) => { e.preventDefault(); });

  // Prevent Enter key in inputs from submitting the form unexpectedly (allow Enter in textarea)
  bookingForm.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (e.key === 'Enter' && tag === 'INPUT') {
      e.preventDefault();
    }
  });

  // ---------- HELPERS ----------
  function notify(msg, isError = false) {
    if (paymentStatus) paymentStatus.innerText = msg || "";
    if (notificationDiv) {
      notificationDiv.style.display = msg ? "block" : "none";
      notificationDiv.style.color = isError ? "crimson" : "green";
      notificationDiv.innerText = msg || "";
    }
  }

  // spinner helpers (injects minimal CSS once)
  function ensureSpinnerStyle(){
    if (document.getElementById('ngiSpinnerStyle')) return;
    const s = document.createElement('style');
    s.id = 'ngiSpinnerStyle';
    s.textContent = `@keyframes ngi-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} .ngi-spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(0,0,0,0.12);border-top-color:#2ecc71;border-radius:50%;animation:ngi-spin 0.9s linear infinite;margin-left:8px;vertical-align:middle}`;
    document.head.appendChild(s);
  }

  function showSpinner(target){
    try{
      ensureSpinnerStyle();
      const container = target || document.getElementById('upiContainer') || document.getElementById('paymentStatus') || document.body;
      if (!container) return null;
      let sp = container.querySelector('#ngi_spinner');
      if (!sp){
        sp = document.createElement('span');
        sp.id = 'ngi_spinner';
        sp.className = 'ngi-spinner';
        // insert after target's first child or append
        if (container.appendChild) container.appendChild(sp);
      }
      sp.style.display = 'inline-block';
      return sp;
    }catch(e){}
    return null;
  }

  function hideSpinner(){
    try{ const sp = document.getElementById('ngi_spinner'); if (sp) sp.style.display = 'none'; }catch(e){}
  }

  // ---------- DRAFT AUTOSAVE ----------
  const DRAFT_KEY = 'ngi_booking_draft';
  function saveDraft() {
    try {
      const draft = {
        name: bookingForm.querySelector("input[type=text]")?.value || '',
        email: bookingForm.querySelector("input[type=email]")?.value || '',
        phone: bookingForm.querySelector("input[type=tel]")?.value || '',
        checkin: checkinInput?.value || '',
        checkout: checkoutInput?.value || '',
        guests: bookingForm.querySelector('select')?.value || '1',
        message: bookingForm.querySelector('textarea')?.value || ''
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) { /* ignore */ }
  }

  function restoreDraft() {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d) return;
      if (d.name) bookingForm.querySelector("input[type=text]").value = d.name;
      if (d.email) bookingForm.querySelector("input[type=email]").value = d.email;
      if (d.phone) bookingForm.querySelector("input[type=tel]").value = d.phone;
      if (d.checkin) checkinInput.value = d.checkin;
      if (d.checkout) checkoutInput.value = d.checkout;
      if (d.guests) bookingForm.querySelector('select').value = d.guests;
      if (d.message) bookingForm.querySelector('textarea').value = d.message;
    } catch (e) { /* ignore */ }
  }

  // wire autosave on inputs
  ['input','change','keyup'].forEach(ev => {
    bookingForm.addEventListener(ev, (e) => {
      const t = e.target;
      if (!t) return;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') saveDraft();
    });
  });

  // restore draft on load
  try { restoreDraft(); } catch(e){}
  // read any dates saved by calendar (localStorage) and apply to inputs
  function applyLocalStorageDates() {
    try {
      const c = localStorage.getItem('checkin');
      const o = localStorage.getItem('checkout');
      if (c && checkinInput) {
        checkinInput.value = c;
      } else if (checkinInput && !checkinInput.value) {
        // default to today if no saved checkin
        try { checkinInput.value = today; } catch(e){}
      }
      if (o && checkoutInput) checkoutInput.value = o;
    } catch (e) { /* ignore */ }
  }
  try { applyLocalStorageDates(); } catch(e){}

  // listen for cross-tab updates to localStorage so booking page updates automatically
  window.addEventListener('storage', (e) => {
    if (!e) return;
    if (e.key === 'checkin' || e.key === 'checkout') {
      applyLocalStorageDates();
      // also refresh displayed price when dates change from another tab
      try { updatePriceDisplay(); } catch (err) { /* ignore */ }
    }
  });

  // ---------- PRICE CALCULATION (weekday vs weekend) ----------
  const priceDisplay = document.getElementById('priceDisplay');
  const guestsSelect = bookingForm.querySelector('select[name=guests]') || bookingForm.querySelector('select');

  function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }

  function isWeekend(dateStr) {
    const d = parseLocalDate(dateStr) || parseLocalDate(today);
    if (!d) return false;
    const day = d.getDay(); // 0 = Sun, 6 = Sat
    return day === 0 || day === 6;
  }

  function computePrice(guestsValue, dateStr) {
    const weekend = isWeekend(dateStr);
    // mapping per user request
    if (weekend) {
      // weekend: below10=12k, 10-15=14k, 15-20=16k, 20+=18k
      switch (String(guestsValue)) {
        case '1': return 12000;
        case '2': return 14000;
        case '3': return 16000;
        case '4': return 18000;
        default: return 12000;
      }
    } else {
      // normal days: below10=9k, 10-15=10k, 15-20=11k
      // NOTE: if user selects 20+ on a weekday, we show the highest weekday tier (11,000)
      switch (String(guestsValue)) {
        case '1': return 9000;
        case '2': return 10000;
        case '3': return 11000;
        case '4': return 11000; // assume 20+ same as 15-20 on weekdays
        default: return 9000;
      }
    }
  }

  function formatRupees(n) {
    try { return '₹' + Number(n).toLocaleString('en-IN'); } catch (e) { return '₹' + n; }
  }

  function updatePriceDisplay() {
    if (!priceDisplay) return;
    const guestsVal = guestsSelect ? guestsSelect.value : '';
    const dateVal = (checkinInput && checkinInput.value) ? checkinInput.value : today;
    if (!guestsVal) {
      priceDisplay.innerText = 'Select guests to see price';
      return;
    }
    const price = computePrice(guestsVal, dateVal);
    const when = isWeekend(dateVal) ? 'Weekend' : 'Weekday';
    priceDisplay.innerText = `${when} price: ${formatRupees(price)} (total)`;
  }

  // wire listeners
  if (guestsSelect) guestsSelect.addEventListener('change', updatePriceDisplay);
  if (checkinInput) checkinInput.addEventListener('change', updatePriceDisplay);
  // ensure price is shown on load
  try { updatePriceDisplay(); } catch(e){}

  function updatePayBtnState() {
    const hasFile = aadhaarInput?.files?.length > 0;
    const consent = aadhaarConsent?.checked;
    payBtn.disabled = !(hasFile && consent);
  }

  aadhaarInput?.addEventListener("change", updatePayBtnState);
  aadhaarConsent?.addEventListener("change", updatePayBtnState);

  // ---------- PAY BUTTON ----------
  payBtn?.addEventListener("click", async () => {

    if (!aadhaarInput.files[0]) {
      notify("Please upload Aadhaar photo", true);
      return;
    }
    // disable pay button to avoid duplicate clicks
    try { payBtn.disabled = true; } catch(e){}
    // show the UPI QR immediately so user sees feedback while upload runs
    notify("Preparing UPI QR... (uploading Aadhaar in background)");
    showSpinner(document.getElementById('paymentStatus') || document.getElementById('upiContainer'));
  try { showUpiQr(); } catch(e) { console.warn('showUpiQr initial render failed', e); }

    try {
      const fd = new FormData();
      fd.append("aadhaar", aadhaarInput.files[0]);

      const res = await fetch(`${API_BASE}/api/upload-aadhaar`, {
        method: "POST",
        body: fd
      });

      if (!res.ok) throw new Error("Aadhaar upload failed: " + res.status);

      const data = await res.json();
      savedAadhaarId = data.fileId || Date.now();
      // normalize returned url (server may return relative path like /uploads/<file>)
      if (data.url) {
        if (/^https?:\/\//i.test(data.url)) savedAadhaarUrl = data.url;
        else savedAadhaarUrl = API_BASE.replace(/\/$/, '') + (data.url.charAt(0) === '/' ? data.url : '/' + data.url);
      } else {
        savedAadhaarUrl = null;
      }

      notify("Aadhaar uploaded.");
  hideSpinner();
  // ensure QR is visible (idempotent)
  try { showUpiQr(); } catch(e){}
  try { updatePayBtnState(); } catch(e){}
    } catch (err) {
      console.error('Aadhaar upload failed:', err);
      // Fallback: continue in demo mode so the user can complete the UPI flow locally
      try {
    savedAadhaarId = 'dev_aadhaar_' + Date.now();
    savedAadhaarUrl = null; // no server URL in demo fallback
    notify('Aadhaar upload failed — continuing in demo mode (no backend).');
        console.warn('Falling back to demo Aadhaar id:', savedAadhaarId);
  hideSpinner();
        try { showUpiQr(); } catch(e){}
  try { updatePayBtnState(); } catch(e){}
      } catch (e2) {
        console.error('Fallback demo mode also failed', e2);
        hideSpinner();
        notify("Aadhaar upload failed", true);
      }
    }
  });

  // ---------- UPI FLOW ----------
  function showUpiQr() {
    const upiContainer = document.getElementById("upiContainer");
    if (!upiContainer) return;

    const upiVpa = "thenightgarden@upi";
    const upiName = "The Night Garden Stay";

    const upiUri =
      `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(upiName)}&am=${ADVANCE_AMOUNT}&cu=INR`;

    const qrUrl =
      `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(upiUri)}`;
    // allow overriding with a local/static QR image (set in booking.html as window.NIGHT_UPI_QR)
    const qrImg = (window && window.NIGHT_UPI_QR) ? window.NIGHT_UPI_QR : qrUrl;

    upiContainer.innerHTML = `
      <h4>Pay ₹${ADVANCE_AMOUNT} Advance</h4>
  <img src="${qrImg}" width="220" />
      <p><strong>UPI:</strong> ${upiVpa}</p>
      <button type="button" id="upiPaidBtn">I've Paid</button>
    `;

    upiContainer.style.display = "block";
    // persist that QR was shown so it can be restored after accidental reload
    try { sessionStorage.setItem('ngi_upi_shown','1'); } catch(e){}
    upiContainer.scrollIntoView({ behavior: "smooth" });

    document.getElementById("upiPaidBtn").addEventListener("click", () => {
      paymentDone = true;
      paymentInfo = {
        method: "UPI",
        amount: ADVANCE_AMOUNT,
        time: new Date().toISOString()
      };

      submitBtn.disabled = false;
      try { sessionStorage.setItem('ngi_payment_done','1'); } catch(e){}
      notify("Payment confirmed. You can now request booking ✅");
    });
  }

  // restore UPI UI if in-progress (defensive)
  try {
    const upiShown = sessionStorage.getItem('ngi_upi_shown');
    const paid = sessionStorage.getItem('ngi_payment_done');
    if (upiShown) {
      try { showUpiQr(); } catch(e){}
    }
    if (paid) {
      paymentDone = true; submitBtn.disabled = false; notify('Payment previously confirmed — you can request booking');
    }
  } catch(e){}

  // ---------- FINAL BOOKING SUBMIT ----------
 submitBtn.addEventListener("click", async () => {

  if (!bookingForm.checkValidity()) {
    bookingForm.reportValidity();
    return;
  }

  if (!paymentDone) {
    notify("Please complete ₹2000 advance payment first", true);
    return;
  }

  const booking = {
    name: bookingForm.querySelector("input[type=text]").value.trim(),
    email: bookingForm.querySelector("input[type=email]").value.trim(),
    phone: bookingForm.querySelector("input[type=tel]").value.trim(),
    checkin: checkinInput.value,
    checkout: checkoutInput.value,
    guests: bookingForm.querySelector("select")?.value || "1",
    message: bookingForm.querySelector("textarea")?.value || "",
    aadhaarId: savedAadhaarId,
    aadhaarUrl: savedAadhaarUrl,
    payment: paymentInfo,
    status: "pending",
    time: new Date().toLocaleString()
  };

  try {
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking)
    });

  if (!res.ok) throw new Error("Booking API failed");

  // Try to read returned booking (demo server returns { success: true, booking })
  let result = {};
  try { result = await res.json(); } catch (e) { result = {}; }

  // determine booking id from response or generate one
  const created = result.booking || result || {};
  const bookingId = created.id || created._id || created.bookingId || created.orderId || Date.now();

  // user-facing success message
  notify(`🎉 Congratulations — booking successful! Reference: ${bookingId}`);

  // notify admin via cross-tab signals (localStorage flag + BroadcastChannel)
  try { localStorage.setItem('ngi_bookings_updated', Date.now()); } catch (e){}
  try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'bookings:updated', id: bookingId, time: Date.now() }); bc.close(); } } catch (e){}

  // reset form and UI
  bookingForm.reset();
  submitBtn.disabled = true;
  payBtn.disabled = true;
  paymentDone = false;

  } catch (err) {
    console.error("Booking submission failed:", err);
    // Fallback: save booking to localStorage so admin (same-origin) can still see it
    try {
      const local = JSON.parse(localStorage.getItem('bookings')||'[]');
      const fallbackId = booking.id || ('local_' + Date.now());
      const saved = Object.assign({ id: fallbackId }, booking);
      local.push(saved);
      localStorage.setItem('bookings', JSON.stringify(local));
      try { localStorage.setItem('ngi_bookings_updated', Date.now()); } catch(e){}
      try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'bookings:updated', id: saved.id, time: Date.now() }); bc.close(); } } catch (e){}
      notify(`🎉 Congratulations — booking saved locally! Reference: ${saved.id}`);
      // reset UI
      bookingForm.reset(); submitBtn.disabled = true; payBtn.disabled = true; paymentDone = false;
    } catch (e2) {
      console.error('Fallback save failed', e2);
      notify("❌ Booking failed — please try again", true);
    }
  }
});


});
