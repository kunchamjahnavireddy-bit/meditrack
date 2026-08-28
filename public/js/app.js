// MediTrack Application Engine, JWT Manager, State & Access Control Router

function getAuthToken() {
  return localStorage.getItem('meditrack_jwt') || sessionStorage.getItem('meditrack_jwt');
}

function getCurrentUser() {
  const userJson = localStorage.getItem('meditrack_user') || sessionStorage.getItem('meditrack_user');
  if (!userJson) return { role: 'guest', fullName: 'Guest User' };
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return { role: 'guest', fullName: 'Guest User' };
  }
}

function saveUserAuthSession(token, user, remember = true) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('meditrack_jwt', token);
  storage.setItem('meditrack_user', JSON.stringify(user));
}

function setCurrentUser(user, token) {
  saveUserAuthSession(token, user, true);
}

function logoutUser() {
  localStorage.removeItem('meditrack_jwt');
  localStorage.removeItem('meditrack_user');
  sessionStorage.removeItem('meditrack_jwt');
  sessionStorage.removeItem('meditrack_user');
  window.location.href = '/login.html';
}

async function fetchWithAuth(url, options = {}) {
  const token = getAuthToken();
  const user = getCurrentUser();

  const headers = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  headers['x-user-role'] = user.role || 'guest';
  if (user.patientId) headers['x-patient-id'] = user.patientId;
  if (user.doctorId) headers['x-doctor-id'] = user.doctorId;
  if (user.receptionistId) headers['x-receptionist-id'] = user.receptionistId;
  if (user.adminId) headers['x-admin-id'] = user.adminId;

  return fetch(url, { ...options, headers });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('flash-messages-container') || document.body;
  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info')}`;
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '9999';
  toast.style.minWidth = '280px';
  toast.style.boxShadow = 'var(--shadow-lg)';
  toast.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4500);
}

document.addEventListener('DOMContentLoaded', () => {
  renderSidebarNavigationByRole();
  renderSidebarUserBadge();
  renderCurrentDateHeader();
  enforcePageAccessPermissions();
});

function renderSidebarNavigationByRole() {
  const navMenu = document.querySelector('.nav-menu');
  if (!navMenu) return;

  const user = getCurrentUser();
  const role = user.role || 'guest';

  let menuHtml = '';

  if (role === 'admin') {
    menuHtml = `
      <li class="nav-item"><a href="/admin.html"><span class="nav-icon">⚙️</span><span>Admin Control Center</span></a></li>
      <li class="nav-item"><a href="/dashboard.html"><span class="nav-icon">📊</span><span>System Overview</span></a></li>
      <li class="nav-item"><a href="/search.html"><span class="nav-icon">🔍</span><span>Search Patients</span></a></li>
      <li class="nav-item"><a href="/appointments.html"><span class="nav-icon">📅</span><span>Appointments Catalog</span></a></li>
    `;
  } else if (role === 'patient') {
    const pId = user.patientId || '';
    menuHtml = `
      <li class="nav-item"><a href="/profile.html?patientId=${pId}#profile-section"><span class="nav-icon">👤</span><span>My Profile</span></a></li>
      <li class="nav-item"><a href="/profile.html?patientId=${pId}#appointments-section"><span class="nav-icon">📅</span><span>My Appointments</span></a></li>
      <li class="nav-item"><a href="/profile.html?patientId=${pId}#prescriptions-section"><span class="nav-icon">💊</span><span>My Prescriptions</span></a></li>
    `;
  } else if (role === 'doctor') {
    menuHtml = `
      <li class="nav-item"><a href="/doctor.html"><span class="nav-icon">🩺</span><span>Doctor Workspace</span></a></li>
      <li class="nav-item"><a href="/doctor.html#doctor-search-container"><span class="nav-icon">🔍</span><span>Search Patient</span></a></li>
      <li class="nav-item"><a href="/doctor.html#emergency-search-card"><span class="nav-icon">🚨</span><span>Emergency Search</span></a></li>
    `;
  } else if (role === 'receptionist') {
    menuHtml = `
      <li class="nav-item"><a href="/dashboard.html"><span class="nav-icon">📊</span><span>Dashboard</span></a></li>
      <li class="nav-item"><a href="/appointments.html"><span class="nav-icon">📅</span><span>Appointments</span></a></li>
      <li class="nav-item"><a href="/prescriptions.html"><span class="nav-icon">💊</span><span>Prescription View</span></a></li>
    `;
  }

  navMenu.innerHTML = menuHtml;
  highlightActiveNav();
}

function enforcePageAccessPermissions() {
  const path = window.location.pathname;

  if (path === '/' || path.includes('login') || path.includes('register') || path.includes('index')) {
    return;
  }

  const user = getCurrentUser();
  const role = user.role || 'guest';

  if (path.includes('/admin') || path.includes('/admin-dashboard')) {
    if (role !== 'admin') {
      showAccessDeniedPage('Access denied. Admin privileges required.');
      return;
    }
  }

  if (role === 'receptionist') {
    if (path.includes('/profile.html') || path.includes('/search.html') || path.includes('/doctor.html')) {
      showAccessDeniedPage('Access Denied: You do not have permission to view the Patient Dashboard.');
    }
  }

  if (role === 'patient') {
    if (path.includes('/search.html') || path.includes('/doctor.html')) {
      showAccessDeniedPage('Access Denied: Patients are only allowed to view their own patient dashboard.');
    }
  }
}

function showAccessDeniedPage(reason = 'Access Denied') {
  const body = document.querySelector('.main-content') || document.body;
  body.innerHTML = `
    <div style="max-width:600px; margin:5rem auto; padding:3rem; background:#fff; border-radius:16px; border:2px solid var(--danger); text-align:center; box-shadow:var(--shadow-xl);">
      <div style="font-size:4rem; margin-bottom:1rem;">🚫</div>
      <h2 style="color:var(--danger); font-size:1.8rem; font-weight:800; margin-bottom:1rem;">Access Restricted</h2>
      <p style="font-size:1.1rem; color:var(--text-muted); margin-bottom:2rem;">${reason}</p>
      <a href="/login.html" class="btn btn-primary">Go to Login Portal ➔</a>
    </div>
  `;
}

function renderSidebarUserBadge() {
  const container = document.getElementById('user-badge-container');
  if (!container) return;

  const user = getCurrentUser();
  const roleLabel = (user.role || 'User').toUpperCase();
  const name = user.fullName || user.loginId || 'MediTrack User';

  container.innerHTML = `
    <div class="user-avatar">${name.charAt(0).toUpperCase()}</div>
    <div>
      <div class="user-name">${name}</div>
      <div class="user-role">${roleLabel}</div>
    </div>
  `;
}

function renderCurrentDateHeader() {
  const dateEl = document.getElementById('current-date-display');
  if (!dateEl) return;
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  dateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

function highlightActiveNav() {
  const links = document.querySelectorAll('.nav-menu a');
  const path = window.location.pathname;

  links.forEach(l => {
    if (l.getAttribute('href') === path || path.includes(l.getAttribute('href'))) {
      l.classList.add('active');
    }
  });
}
