if (!localStorage.getItem("adminLoggedIn")) {
  // redirect to admin login page in this folder
  window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "login.html";
}

let currentDate = new Date();
let blockedDates = JSON.parse(localStorage.getItem("blockedDates")) || [];
let bookedDates = JSON.parse(localStorage.getItem("bookedDates")) || [];

// normalize checkin/checkout field names helpers
function _getCheckin(obj) { if (!obj) return ''; return obj.checkIn || obj.checkin || obj.check_in || obj.date || ''; }
function _getCheckout(obj) { if (!obj) return ''; return obj.checkOut || obj.checkout || obj.check_out || ''; }

const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");
// API URL (use backend server where MongoDB is connected)
const API_BASE = (window.API_BASE && String(window.API_BASE).replace(/\/$/, '')) || 'https://the-night-garden-stay.onrender.com';
const API_URL = API_BASE + '/api/bookings';

// add admin controls container (if present in DOM, append controls)
const adminControls = document.getElementById('adminControls') || (() => {
  const c = document.createElement('div');
  c.id = 'adminControls';
  c.style.display = 'flex';
  c.style.gap = '8px';
  c.style.justifyContent = 'center';
  if (calendar && calendar.parentNode) calendar.parentNode.insertBefore(c, calendar);
  return c;
})();

// quick action: release all booked dates (make them available)
function releaseAllBookedDates() {
  if (!confirm('This will remove ALL booked flags and make those dates available. Booking records will NOT be deleted. Are you sure?')) return;
  try {
    bookedDates = [];
    localStorage.setItem('bookedDates', JSON.stringify(bookedDates));
    try { localStorage.setItem('ngi_booked_updated', Date.now()); } catch(e){}
    // broadcast as well
    try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'booked:cleared' }); bc.close(); } } catch(e){}
    renderCalendar();
    alert('All booked dates have been released. Note: booking records still exist in Bookings.');
  } catch (err) { console.warn('releaseAllBookedDates failed', err); alert('Failed to release booked dates'); }
}

// render a Release button for convenience
try {
  if (adminControls) {
    const btn = document.createElement('button');
    btn.id = 'releaseBookedBtn';
    btn.type = 'button';
    btn.innerText = 'Release all booked dates';
    btn.style.background = '#ff6b6b';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.padding = '8px 10px';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    adminControls.appendChild(btn);
    btn.addEventListener('click', releaseAllBookedDates);
  }
} catch (e) { /* ignore */ }

// ===== Manage lists UI =====
function renderLists() {
  try {
    const bookedEl = document.getElementById('bookedList');
    const blockedEl = document.getElementById('blockedList');
    if (!bookedEl || !blockedEl) return;

    const b = (JSON.parse(localStorage.getItem('bookedDates') || '[]') || []).slice().sort();
    const bl = (JSON.parse(localStorage.getItem('blockedDates') || '[]') || []).slice().sort();

    bookedEl.innerHTML = b.length ? b.map(d => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.03)"><span>${d}</span><span><button class='unbook-btn' data-date='${d}' style='background:#ff6b6b;color:#fff;border:0;padding:4px 8px;border-radius:6px;cursor:pointer'>Unbook</button></span></div>`).join('') : '<div style="color:#ccc">No booked dates</div>';

    blockedEl.innerHTML = bl.length ? bl.map(d => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.03)"><span>${d}</span><span><button class='unblock-btn' data-date='${d}' style='background:#2ecc71;color:#012;border:0;padding:4px 8px;border-radius:6px;cursor:pointer'>Unblock</button></span></div>`).join('') : '<div style="color:#ccc">No blocked dates</div>';

    // wire buttons
    bookedEl.querySelectorAll('.unbook-btn').forEach(btn => btn.addEventListener('click', async (e) => {
      const d = btn.dataset.date;
      if (!confirm(`Remove booked flag for ${d}? This will NOT delete booking records.`)) return;
      // try safe remove
      try { await removeBookedDateSingle(d); localStorage.setItem('ngi_booked_updated', Date.now()); renderCalendar(); renderLists(); } catch (err) { console.warn(err); }
    }));

    blockedEl.querySelectorAll('.unblock-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const d = btn.dataset.date;
      if (!confirm(`Unblock ${d}?`)) return;
      blockedDates = (JSON.parse(localStorage.getItem('blockedDates')||'[]')).filter(x => x !== d);
      localStorage.setItem('blockedDates', JSON.stringify(blockedDates));
      try { localStorage.setItem('ngi_blocked_updated', Date.now()); } catch(e){}
      renderCalendar(); renderLists();
    }));
  } catch (e) { console.warn('renderLists failed', e); }
}

// helper to remove single date safely (checks approved bookings)
async function removeBookedDateSingle(dateStr) {
  try {
  // fetch bookings and determine if other approved bookings cover the date
  let resp = await fetch(API_URL);
    if (!resp.ok) resp = null;
    const all = resp ? await resp.json() : [];
    const claimedByOther = (all || []).some(bk => {
      try {
        if (!bk || String(bk.status).toLowerCase() !== 'approved') return false;
  const cs = (_getCheckin(bk) || '').split('T')[0];
  const ce = (_getCheckout(bk) || '').split('T')[0];
        if (!cs || !ce) return false;
        return (dateStr >= cs && dateStr <= ce);
      } catch (e) { return false; }
    });

    if (claimedByOther) {
      if (!confirm(`${dateStr} is covered by an approved booking. Force remove booked flag?`)) return;
    }

    const list = JSON.parse(localStorage.getItem('bookedDates') || '[]');
    const filtered = list.filter(x => x !== dateStr);
    localStorage.setItem('bookedDates', JSON.stringify(filtered));
    // broadcast
    try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'booked:removed', dates: [dateStr] }); bc.close(); } } catch(e){}
    return true;
  } catch (e) { console.warn('removeBookedDateSingle failed', e); }
}

// add single booked/blocked date from the input
function wireManageControls() {
  try {
    const addBookedBtn = document.getElementById('addBookedBtn');
    const addBlockedBtn = document.getElementById('addBlockedBtn');
    const dateInput = document.getElementById('dateInput');
    const refreshListsBtn = document.getElementById('refreshListsBtn');

    if (addBookedBtn) addBookedBtn.addEventListener('click', () => {
      const d = (dateInput.value||'').trim();
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d)) return alert('Enter date as YYYY-MM-DD');
      const list = JSON.parse(localStorage.getItem('bookedDates') || '[]');
      if (!list.includes(d)) {
        list.push(d);
        localStorage.setItem('bookedDates', JSON.stringify(list.sort()));
        try { localStorage.setItem('ngi_booked_updated', Date.now()); } catch(e){}
        try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'booked:updated', dates: [d] }); bc.close(); } } catch(e){}
      }
      renderCalendar(); renderLists();
    });

    if (addBlockedBtn) addBlockedBtn.addEventListener('click', () => {
      const d = (dateInput.value||'').trim();
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d)) return alert('Enter date as YYYY-MM-DD');
      const list = JSON.parse(localStorage.getItem('blockedDates') || '[]');
      if (!list.includes(d)) {
        list.push(d);
        localStorage.setItem('blockedDates', JSON.stringify(list.sort()));
        try { localStorage.setItem('ngi_blocked_updated', Date.now()); } catch(e){}
        try { if (window.BroadcastChannel) { const bc = new BroadcastChannel('ngi_channel'); bc.postMessage({ type: 'blocked:updated', dates: [d] }); bc.close(); } } catch(e){}
      }
      renderCalendar(); renderLists();
    });

    if (refreshListsBtn) refreshListsBtn.addEventListener('click', () => { renderLists(); renderCalendar(); });
  } catch (e) { console.warn('wireManageControls failed', e); }
}

// initialize lists UI
try { wireManageControls(); renderLists(); } catch (e) {}

function renderCalendar() {
  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthYear.textContent =
    currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric"
    });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const div = document.createElement("div");
    div.className = "day";
    div.textContent = day;

    if (bookedDates.includes(dateStr)) {
      div.classList.add("booked");
      // booked dates are shown but clicking prompts for admin action
      div.onclick = () => handleBookedClick(dateStr);
    } else {
      if (blockedDates.includes(dateStr)) {
        div.classList.add("blocked");
      }
      div.onclick = () => toggleDate(dateStr);
    }
    calendar.appendChild(div);
  }
}

function toggleDate(dateStr) {
  if (blockedDates.includes(dateStr)) {
    blockedDates = blockedDates.filter(d => d !== dateStr);
  } else {
    blockedDates.push(dateStr);
  }

  localStorage.setItem("blockedDates", JSON.stringify(blockedDates));
  renderCalendar();
}

async function handleBookedClick(dateStr) {
  try {
    // fetch bookings and find any approved bookings that include this date
  let resp = await fetch(API_URL);
    if (!resp.ok) resp = null;
    const all = resp ? await resp.json() : [];
    const matches = (all || []).filter(b => {
      try {
        if (!b || String(b.status).toLowerCase() !== 'approved') return false;
  const cs = (_getCheckin(b) || '').split('T')[0];
  const ce = (_getCheckout(b) || '').split('T')[0];
        if (!cs || !ce) return false;
        return (dateStr >= cs && dateStr <= ce);
      } catch (e) { return false; }
    });

    if (!matches || matches.length === 0) {
      // safe to remove
      if (!confirm(`Date ${dateStr} is marked booked, but no approved booking record was found. Remove booked flag for this date?`)) return;
      bookedDates = bookedDates.filter(d => d !== dateStr);
      localStorage.setItem('bookedDates', JSON.stringify(bookedDates));
      try { localStorage.setItem('ngi_booked_updated', Date.now()); } catch(e){}
      renderCalendar();
      alert('Date removed from booked list.');
      return;
    }

    // there are approved bookings covering this date — list them and ask admin
    const ids = matches.map(m => (m.id || m._id || m.bookingId || m.orderId || 'unknown')).slice(0,5);
    let msg = `Date ${dateStr} is covered by ${matches.length} approved booking(s).\n`;
    msg += `Booking IDs (sample): ${ids.join(', ')}\n\n`;
    msg += `Recommended: delete the booking(s) from Bookings to free this date.\n`;
    msg += `If you still want to force-remove the booked flag for this single date, confirm below.\n\nProceed to force-remove?`;

    if (confirm(msg)) {
      // forced removal — remove the single date regardless of bookings
      bookedDates = bookedDates.filter(d => d !== dateStr);
      localStorage.setItem('bookedDates', JSON.stringify(bookedDates));
      try { localStorage.setItem('ngi_booked_updated', Date.now()); } catch(e){}
      renderCalendar();
      alert('Date force-removed from booked list. Note: booking records still exist — consider deleting them if appropriate.');
    }
  } catch (err) {
    console.warn('handleBookedClick failed', err);
    alert('Could not verify booking records — check console.');
  }
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

// initial render
renderCalendar();

// Listen for cross-tab/local changes so admin interface stays in sync
window.addEventListener('storage', (e) => {
  try {
    if (!e) return;
    if (e.key === 'blockedDates') {
      blockedDates = JSON.parse(localStorage.getItem('blockedDates') || '[]');
      renderCalendar();
    }
    if (e.key === 'bookedDates') {
      bookedDates = JSON.parse(localStorage.getItem('bookedDates') || '[]');
      renderCalendar();
    }
  } catch (err) { console.warn('admin availability storage listener', err); }
});
