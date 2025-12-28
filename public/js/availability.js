/* availability.js - clean calendar + booking selection
   - generates a grid with data-date on each day
   - clicking two available days will store checkin/checkout in localStorage
     and navigate to booking page
   - respects booked / blocked lists and tries to read from Storage helper
*/

// ===== CONFIG (defaults, may be overridden from Storage helper) =====
// Defaults are empty. Real booked/blocked dates should come from localStorage or the Storage helper.
let bookedDates = [];
let blockedDates = [];

// If true, selecting a start and end date will automatically navigate to booking.html
// Set to false to disable automatic redirect (keeps selection on the calendar).
const AUTO_NAVIGATE_TO_BOOKING = false;

let selectedStart = null;
let selectedEnd = null;

// ===== CURRENT VIEW =====
let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

// ===== ELEMENTS =====
const calendarContainer = document.getElementById("calendar");
const monthYearEl = document.getElementById("monthYear");
const prevBtn = document.getElementById("prevMonth");
const nextBtn = document.getElementById("nextMonth");

// Try to get dynamic lists from Storage helper (graceful fallback)
try {
  if (typeof Storage !== 'undefined' && Storage.get) {
    const sBooked = Storage.get('bookedDates');
    const sBlocked = Storage.get('blockedDates');
    if (Array.isArray(sBooked) && sBooked.length) bookedDates = sBooked;
    if (Array.isArray(sBlocked) && sBlocked.length) blockedDates = sBlocked;
  }
} catch (err) {
  // ignore and use defaults/local arrays
}

// Also accept plain localStorage arrays (used by admin tools)
function refreshFromLocalStorage() {
  try {
    const rawBooked = localStorage.getItem('bookedDates');
    const rawBlocked = localStorage.getItem('blockedDates');
    if (rawBooked) {
      try { const parsed = JSON.parse(rawBooked); if (Array.isArray(parsed)) bookedDates = parsed; } catch(e){}
    }
    if (rawBlocked) {
      try { const parsed = JSON.parse(rawBlocked); if (Array.isArray(parsed)) blockedDates = parsed; } catch(e){}
    }
  } catch (e) { /* ignore */ }
}
// initial pull from localStorage
try { refreshFromLocalStorage(); } catch (e) {}

// Local date formatter (YYYY-MM-DD) using local timezone to avoid UTC mismatches
function toLocalISO(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ===== GENERATE CALENDAR =====
function generateCalendar(month = currentMonth, year = currentYear) {
  if (!calendarContainer) return;
  calendarContainer.innerHTML = "";

  // compute today's ISO date (local) once per render (used for past/today checks)
  const todayIso = toLocalISO(new Date());
  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
  monthYearEl.innerText = `${monthNames[month]} ${year}`;

  // First weekday of month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty slots for first day
  for (let i = 0; i < firstDay; i++) {
    const emptyEl = document.createElement("div");
    calendarContainer.appendChild(emptyEl);
  }

  // Generate day cells
  for (let day = 1; day <= daysInMonth; day++) {
  const dateObj = new Date(year, month, day);
  const dateStr = toLocalISO(dateObj);

    const dayEl = document.createElement("div");
    dayEl.classList.add("calendar-day");
    dayEl.dataset.date = dateStr;
    dayEl.innerText = day;

    // mark booked/blocked/past/available
    if (bookedDates.includes(dateStr)) {
      dayEl.classList.add("booked");
    } else if (blockedDates.includes(dateStr)) {
      dayEl.classList.add("blocked");
    } else if (dateStr < todayIso) {
      // past dates should be greyed out and non-clickable
      dayEl.classList.add('past');
    } else {
      dayEl.classList.add("available");
      dayEl.addEventListener('click', () => handleDayClick(dateStr, dayEl));
    }
    // highlight today so users can easily see/choose it
    if (dateStr === todayIso) {
      dayEl.classList.add('today');
      // gentle visual emphasis if no dedicated CSS
      try { dayEl.style.border = '2px solid var(--accent, #2ecc71)'; dayEl.style.borderRadius = '6px'; } catch (e) {}
    }

    calendarContainer.appendChild(dayEl);
  }
}
  // show debug status (helpful to diagnose why a date appears booked/past)
  try { showDebugStatus(todayIso); } catch (e) { console.warn('showDebugStatus failed', e); }

// ===== DAY CLICK HANDLING =====
function handleDayClick(dateStr, el) {
  // Toggle selections: choose start then end; when both chosen, store and navigate
  if (!selectedStart) {
    selectedStart = dateStr;
    el.style.boxShadow = "0 0 15px var(--accent)";
    return;
  }

  if (!selectedEnd) {
    // ensure end is not before start
    if (dateStr < selectedStart) {
      // swap
      selectedEnd = selectedStart;
      selectedStart = dateStr;
    } else {
      selectedEnd = dateStr;
    }
    highlightRange(selectedStart, selectedEnd);

    // save to localStorage. Navigation to booking is optional (controlled by AUTO_NAVIGATE_TO_BOOKING)
    localStorage.setItem('checkin', selectedStart);
    localStorage.setItem('checkout', selectedEnd);
    // slight delay so user sees visual highlight; only navigate if enabled
    if (AUTO_NAVIGATE_TO_BOOKING) {
      setTimeout(() => { window.location.href = 'booking.html'; }, 350);
    } else {
      // show in-page feedback with a button to proceed to booking
      showSavedMessage();
    }
    return;
  }

  // if both already set, reset and start new selection
  resetSelection();
  selectedStart = dateStr;
  el.style.boxShadow = "0 0 15px rgba(255,77,77,0.8)";
  selectedEnd = null;
}

function highlightRange(start, end) {
  document.querySelectorAll('.calendar-day.available').forEach(el => {
    el.style.boxShadow = '';
    const d = el.dataset.date;
    if (d >= start && d <= end) {
      el.style.boxShadow = '0 0 20px rgba(255,77,77,0.9)';
    }
  });
}

function resetSelection() {
  selectedStart = null;
  selectedEnd = null;
  document.querySelectorAll('.calendar-day').forEach(el => el.style.boxShadow = '');
}

// ===== NAVIGATION =====
if (prevBtn) prevBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  generateCalendar(currentMonth, currentYear);
});

if (nextBtn) nextBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  generateCalendar(currentMonth, currentYear);
});

// ===== INIT =====
generateCalendar();

// ===== SAVED MESSAGE (UI) =====
function showSavedMessage() {
  try {
    let wrap = document.getElementById('ngi_saved_message');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'ngi_saved_message';
      // basic inline styling so no CSS edits required
      wrap.style.position = 'fixed';
      wrap.style.right = '20px';
      wrap.style.bottom = '20px';
      wrap.style.background = 'white';
      wrap.style.border = '1px solid rgba(0,0,0,0.08)';
      wrap.style.padding = '10px 12px';
      wrap.style.borderRadius = '8px';
      wrap.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
      wrap.style.zIndex = 10000;
      document.body.appendChild(wrap);
    }

    wrap.innerHTML = '';
    const msg = document.createElement('span');
    msg.innerText = 'Dates saved — proceed to booking';
    msg.style.marginRight = '8px';
    wrap.appendChild(msg);

    const btn = document.createElement('button');
    btn.id = 'ngi_proceed_btn';
    btn.type = 'button';
    btn.innerText = 'Proceed';
    btn.style.background = 'var(--accent, #2ecc71)';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.padding = '6px 10px';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    wrap.appendChild(btn);

    const close = document.createElement('button');
    close.id = 'ngi_close_btn';
    close.type = 'button';
    close.innerText = 'Close';
    close.style.marginLeft = '8px';
    close.style.background = '#f2f2f2';
    close.style.border = '1px solid #ddd';
    close.style.padding = '6px 8px';
    close.style.borderRadius = '6px';
    close.style.cursor = 'pointer';
    wrap.appendChild(close);

    btn.addEventListener('click', () => {
      // navigate in same tab
      window.location.href = 'booking.html';
    });
    close.addEventListener('click', () => { wrap.style.display = 'none'; });

    // auto-hide after 10s to avoid clutter
    setTimeout(() => { try { wrap.style.display = 'none'; } catch(e){} }, 10000);
  } catch (e) {
    // ignore UI failures
    console.warn('showSavedMessage failed', e);
  }
}

// ===== DEBUG STATUS (on-page) =====
function showDebugStatus(todayIso) {
  try {
    let dbg = document.getElementById('ngi_avail_debug');
    if (!dbg) {
      dbg = document.createElement('div');
      dbg.id = 'ngi_avail_debug';
      dbg.style.position = 'fixed';
      dbg.style.left = '20px';
      dbg.style.top = '20px';
      dbg.style.background = 'rgba(255,255,255,0.95)';
      dbg.style.border = '1px solid rgba(0,0,0,0.08)';
      dbg.style.padding = '8px 10px';
      dbg.style.borderRadius = '6px';
      dbg.style.zIndex = 10001;
      dbg.style.fontSize = '13px';
      dbg.style.color = '#222';
      document.body.appendChild(dbg);
    }

    const todayInBooked = bookedDates.includes(todayIso);
    const todayInBlocked = blockedDates.includes(todayIso);

    dbg.innerHTML = `<div style="font-weight:600;margin-bottom:6px">Calendar debug</div>
      <div>today: <strong>${todayIso}</strong></div>
      <div>bookedDates: <strong>${bookedDates.length}</strong> entries</div>
      <div>blockedDates: <strong>${blockedDates.length}</strong> entries</div>
      <div style="margin-top:6px">today in booked: <strong style='color:${todayInBooked?"crimson":"#2ecc71"}'>${todayInBooked}</strong></div>
      <div>today in blocked: <strong style='color:${todayInBlocked?"crimson":"#2ecc71"}'>${todayInBlocked}</strong></div>`;

    // also log to console for deeper inspection
    console.log('Availability debug — today:', todayIso, 'bookedDates:', bookedDates, 'blockedDates:', blockedDates);
  } catch (e) { console.warn('showDebugStatus error', e); }
}

// Listen for storage changes from admin approval flow and refresh calendar
window.addEventListener('storage', (e) => {
  try {
    if (!e) return;
    if (e.key === 'bookedDates' || e.key === 'blockedDates' || e.key === 'ngi_booked_updated' || e.key === 'ngi_booked_updated') {
      refreshFromLocalStorage();
      generateCalendar(currentMonth, currentYear);
    }
  } catch (err) { /* ignore */ }
});

// Also listen on BroadcastChannel if available for faster cross-tab updates
try {
  if (window.BroadcastChannel) {
    const bc = new BroadcastChannel('ngi_channel');
    bc.addEventListener('message', (m) => {
      try {
        if (!m || !m.data) return;
        if (m.data.type && (m.data.type === 'booked:updated' || m.data.type === 'bookings:updated')) {
          refreshFromLocalStorage();
          generateCalendar(currentMonth, currentYear);
        }
      } catch (e) {}
    });
  }
} catch (e) { /* ignore */ }

// If other scripts provide blocked/booked updates via Storage helper later,
// you could call generateCalendar() again to refresh.

