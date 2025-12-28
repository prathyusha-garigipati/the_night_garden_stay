if (!localStorage.getItem("adminLoggedIn")) {
  window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "login.html";
}

// environment-aware API base (useful if this file later calls backend)
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
  : "https://the-night-garden-stay.onrender.com";

const table = document.getElementById("bookingTable");
let bookings = JSON.parse(localStorage.getItem("bookings")) || [];

function renderBookings() {
  if (!table) return;
  table.innerHTML = "";

  bookings.forEach(b => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${b.name}</td>
      <td>${b.checkIn || b.checkin || ''} → ${b.checkOut || b.checkout || ''}</td>
      <td>${b.guests || ''}</td>
      <td>
        <span class="status ${b.status}">
          ${b.status}
        </span>
      </td>
      <td>
        <button class="action-btn" onclick="updateStatus(${b.id}, 'Confirmed')">Confirm</button>
        <button class="action-btn" onclick="updateStatus(${b.id}, 'Cancelled')">Cancel</button>
      </td>
    `;

    table.appendChild(row);
  });
}

function updateStatus(id, status) {
  bookings = bookings.map(b => (b.id === id ? { ...b, status } : b));

  
}

renderBookings();

// Optional admin approval UI (in case page includes #bookingsList)
const bookingsListContainer = document.getElementById('bookingsList');
if (bookingsListContainer) {
  const pubBookings = JSON.parse(localStorage.getItem('bookings')) || [];
  bookingsListContainer.innerHTML = '';
  pubBookings.forEach((b, i) => {
    if (b.status === 'pending') {
      const div = document.createElement('div');
      div.innerHTML = `
  <strong>${b.name}</strong> - ${b.checkIn || b.checkin || b.date || ''}
        <button onclick="approvePublic(${i})">Approve</button>
        <button onclick="rejectPublic(${i})">Reject</button>
      `;
      bookingsListContainer.appendChild(div);
    }
  });

  window.approvePublic = function (index) {
    const pb = JSON.parse(localStorage.getItem('bookings')) || [];
    if (!pb[index]) return;
    pb[index].status = 'approved';
    
    // optionally block date
    const blocked = JSON.parse(localStorage.getItem('blockedDates')) || [];
    if (pb[index].date) blocked.push(pb[index].date);
    
  };

  window.rejectPublic = function (index) {
    const pb = JSON.parse(localStorage.getItem('bookings')) || [];
    if (!pb[index]) return;
    pb[index].status = 'rejected';
  
  };
}


