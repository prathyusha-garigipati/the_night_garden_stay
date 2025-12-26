// Admin reviews management
if (!localStorage.getItem("adminLoggedIn")) {
  window.location.href = "login.html";
}

const reviews = JSON.parse(localStorage.getItem("reviews")) || [];
const container = document.getElementById("pendingReviews");

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, function (m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;', '"':'&quot;', "'":'&#39;'})[m];
  });
}

function renderReviews() {
  if (!container) return;
  container.innerHTML = "";

  reviews.forEach((review, index) => {
    if (review.status === "pending") {
      const div = document.createElement("div");
      div.style.border = "1px solid #444";
      div.style.padding = "10px";
      div.style.marginBottom = "10px";

      const text = review.text || review.message || "";

      div.innerHTML = `
        <strong>${escapeHTML(review.name || 'Guest')}</strong> (${escapeHTML(review.rating || '')}★)
        <p>${escapeHTML(text)}</p>
        <button onclick="approve(${index})">Approve</button>
        <button onclick="reject(${index})">Reject</button>
      `;

      container.appendChild(div);
    }
  });
}

function persistReviews() {
  localStorage.setItem("reviews", JSON.stringify(reviews));
  try {
    if (typeof Storage !== 'undefined' && Storage.set) Storage.set('reviews', reviews);
  } catch (e) {
    // ignore
  }
}

function approve(index) {
  if (!reviews[index]) return;
  reviews[index].status = "approved";
  persistReviews();
  renderReviews();
}

function reject(index) {
  if (!reviews[index]) return;
  reviews[index].status = "rejected";
  persistReviews();
  renderReviews();
}

renderReviews();
