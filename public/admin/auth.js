// Authentication helpers for admin pages.
// Behavior:
// - In normal mode, pages call requireAuth() to redirect to login.html when not authenticated.
// - In dev mode (either running on localhost or when URL has ?dev=true) the check is skipped so you can preview pages without logging in.

function isDevMode() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('dev') === 'true' || params.get('dev') === '1') return true;
  } catch (e) {}
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function requireAuth() {
  if (isDevMode()) {
    // Add a small banner so it's obvious you're in dev-bypass mode
    try {
      if (!document.getElementById('admin-dev-banner')) {
        const b = document.createElement('div');
        b.id = 'admin-dev-banner';
        b.style.position = 'fixed';
        b.style.left = '10px';
        b.style.bottom = '10px';
        b.style.zIndex = '9999';
        b.style.background = 'rgba(255,200,0,0.95)';
        b.style.color = '#000';
        b.style.padding = '6px 10px';
        b.style.borderRadius = '6px';
        b.style.fontSize = '13px';
        b.innerText = 'DEV MODE: authentication bypassed';
        document.body.appendChild(b);
      }
    } catch (e) {}
    return;
  }

  if (localStorage.getItem("adminLoggedIn") !== "true") {
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "login.html";
}

function loginAdmin(username, password) {
  // Example credentials
  if(username === "admin" && password === "1234"){
    localStorage.setItem("adminLoggedIn", "true");
    window.location.href = "dashboard.html"; // Redirect to dashboard
  } else {
    alert("Invalid credentials");
  }
}
