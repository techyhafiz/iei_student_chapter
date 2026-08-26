const API_URL = 'http://localhost:5000/api';

// State
let authToken = null;
let currentUser = null;
let selectedAdminId = null;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const logoutBtn = document.getElementById('logoutBtn');
const superAdminTools = document.getElementById('superAdminTools');
const normalAdminView = document.getElementById('normalAdminView');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetMsg = document.getElementById('resetMsg');
const adminListContainer = document.getElementById('adminListContainer');
const resetPasswordSection = document.getElementById('resetPasswordSection');
const targetAdminName = document.getElementById('targetAdminName');
const targetAdminEmail = document.getElementById('targetAdminEmail');
const cancelResetBtn = document.getElementById('cancelResetBtn');

// Login Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginError.textContent = '';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Success
    authToken = data.token; // Keep in memory only
    currentUser = data.user;
    
    // Clear password from memory explicitly
    document.getElementById('password').value = '';

    showDashboard();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  }
});

// Fetch Admins
async function fetchAdmins() {
  try {
    const res = await fetch(`${API_URL}/admins`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch admins');
    
    renderAdminList(data.admins);
  } catch (err) {
    adminListContainer.innerHTML = `<p class="error-msg">${err.message}</p>`;
  }
}

function renderAdminList(admins) {
  if (!admins || admins.length === 0) {
    adminListContainer.innerHTML = '<p>No normal admins found.</p>';
    return;
  }
  
  let html = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  admins.forEach(admin => {
    html += `
      <tr>
        <td>${admin.name}</td>
        <td>${admin.email}</td>
        <td>${admin.phone || '-'}</td>
        <td>${admin.role}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="openResetForm('${admin.id}', '${admin.name}', '${admin.email}')">Reset Password</button>
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  adminListContainer.innerHTML = html;
}

// Global functions for inline handlers
window.openResetForm = (id, name, email) => {
  selectedAdminId = id; // Security: store in memory, not hidden input
  targetAdminName.textContent = name;
  targetAdminEmail.textContent = email;
  
  resetMsg.className = 'msg hidden';
  resetPasswordForm.reset();
  
  resetPasswordSection.classList.remove('hidden');
  resetPasswordSection.scrollIntoView({ behavior: 'smooth' });
};

cancelResetBtn.addEventListener('click', () => {
  selectedAdminId = null;
  resetPasswordSection.classList.add('hidden');
  resetPasswordForm.reset();
});

// Reset Password Handler
resetPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetMsg.className = 'msg hidden';
  resetMsg.textContent = '';

  if (!selectedAdminId) {
    resetMsg.textContent = 'No admin selected';
    resetMsg.className = 'msg error-msg';
    return;
  }

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    resetMsg.textContent = 'Passwords do not match';
    resetMsg.className = 'msg error-msg';
    return;
  }

  if (newPassword.length < 8) {
    resetMsg.textContent = 'Password must be at least 8 characters long';
    resetMsg.className = 'msg error-msg';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/admin/reset-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ adminId: selectedAdminId, newPassword, confirmPassword }) // Only sending required fields
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }

    // Success
    resetMsg.textContent = 'Password reset successfully. Share the new password with the admin privately.';
    resetMsg.className = 'msg success-msg';
    
    // Clear form and state
    resetPasswordForm.reset();
    selectedAdminId = null;
  } catch (err) {
    resetMsg.textContent = err.message;
    resetMsg.className = 'msg error-msg';
  }
});

// Logout Handler
logoutBtn.addEventListener('click', () => {
  authToken = null;
  currentUser = null;
  selectedAdminId = null;
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  resetPasswordSection.classList.add('hidden');
  resetPasswordForm.reset();
  resetMsg.className = 'msg hidden';
});

// View Logic
function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');

  userName.textContent = currentUser.name || currentUser.email;
  userRole.textContent = currentUser.role.replace('_', ' ');

  if (currentUser.role === 'super_admin') {
    superAdminTools.classList.remove('hidden');
    normalAdminView.classList.add('hidden');
    fetchAdmins();
  } else {
    superAdminTools.classList.add('hidden');
    normalAdminView.classList.remove('hidden');
  }
}
