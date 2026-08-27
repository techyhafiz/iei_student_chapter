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

const managePermissionsSection = document.getElementById('managePermissionsSection');
const targetPermAdminName = document.getElementById('targetPermAdminName');
const targetPermAdminEmail = document.getElementById('targetPermAdminEmail');
const managePermissionsForm = document.getElementById('managePermissionsForm');
const permMsg = document.getElementById('permMsg');
const cancelPermBtn = document.getElementById('cancelPermBtn');
const savePermissionsBtn = document.getElementById('savePermissionsBtn');

let loadedAdmins = []; // Store the full list of admins securely in memory

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
    
    loadedAdmins = data.admins;
    renderAdminList(loadedAdmins);
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
        <td style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-danger" onclick="openResetForm('${admin.id}', '${admin.name}', '${admin.email}')">Reset Password</button>
          <button class="btn btn-sm" onclick="openPermissionsForm('${admin.id}')">Manage Permissions</button>
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
  
  managePermissionsSection.classList.add('hidden'); // Close other modal
  resetPasswordSection.classList.remove('hidden');
  resetPasswordSection.scrollIntoView({ behavior: 'smooth' });
};

cancelResetBtn.addEventListener('click', () => {
  selectedAdminId = null;
  resetPasswordSection.classList.add('hidden');
  resetPasswordForm.reset();
});

let originalPermissions = {};

window.openPermissionsForm = (id) => {
  const admin = loadedAdmins.find(a => a.id === id);
  if (!admin) return;

  selectedAdminId = id;
  targetPermAdminName.textContent = admin.name;
  targetPermAdminEmail.textContent = admin.email;
  
  permMsg.className = 'msg hidden';
  managePermissionsForm.reset();
  
  // Set current permissions
  originalPermissions = admin.permissions || {};
  document.getElementById('perm_team').checked = !!originalPermissions.team;
  document.getElementById('perm_events').checked = !!originalPermissions.events;
  document.getElementById('perm_gallery').checked = !!originalPermissions.gallery;
  document.getElementById('perm_calendar').checked = !!originalPermissions.calendar;

  resetPasswordSection.classList.add('hidden'); // Close other modal
  managePermissionsSection.classList.remove('hidden');
  managePermissionsSection.scrollIntoView({ behavior: 'smooth' });
};

cancelPermBtn.addEventListener('click', () => {
  selectedAdminId = null;
  originalPermissions = {};
  managePermissionsSection.classList.add('hidden');
  managePermissionsForm.reset();
});

// Manage Permissions Handler
managePermissionsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  permMsg.className = 'msg hidden';
  permMsg.textContent = '';

  if (!selectedAdminId) {
    permMsg.textContent = 'No admin selected';
    permMsg.className = 'msg error-msg';
    return;
  }

  savePermissionsBtn.disabled = true;
  savePermissionsBtn.textContent = 'Saving...';

  const newPermissions = {
    team: document.getElementById('perm_team').checked,
    events: document.getElementById('perm_events').checked,
    gallery: document.getElementById('perm_gallery').checked,
    calendar: document.getElementById('perm_calendar').checked,
  };

  let hasErrors = false;
  let successfulUpdates = 0;

  try {
    for (const [key, value] of Object.entries(newPermissions)) {
      if (!!originalPermissions[key] !== value) {
        // Only send request if the permission actually changed
        const res = await fetch(`${API_URL}/admins/${selectedAdminId}/permissions`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ permission: key, enabled: value })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || `Failed to update ${key} permission`);
        }
        successfulUpdates++;
      }
    }

    if (successfulUpdates > 0) {
      permMsg.textContent = 'Permissions updated successfully.';
      permMsg.className = 'msg success-msg';
      // Refresh the admin list to get the latest permissions
      await fetchAdmins(); 
      // Update originalPermissions so further saves work correctly without reopening
      const updatedAdmin = loadedAdmins.find(a => a.id === selectedAdminId);
      if (updatedAdmin) originalPermissions = updatedAdmin.permissions || {};
    } else {
      permMsg.textContent = 'No changes were made.';
      permMsg.className = 'msg success-msg';
    }
  } catch (err) {
    hasErrors = true;
    permMsg.textContent = err.message;
    permMsg.className = 'msg error-msg';
  } finally {
    savePermissionsBtn.disabled = false;
    savePermissionsBtn.textContent = 'Save Permissions';
  }
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
  loadedAdmins = [];
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  resetPasswordSection.classList.add('hidden');
  managePermissionsSection.classList.add('hidden');
  resetPasswordForm.reset();
  managePermissionsForm.reset();
  resetMsg.className = 'msg hidden';
  permMsg.className = 'msg hidden';
  
  // Events CMS Cleanup
  loadedEvents = [];
  document.getElementById('eventsManagementSection').classList.add('hidden');
  document.getElementById('eventFormSection').classList.add('hidden');
  document.getElementById('posterFormSection').classList.add('hidden');
  document.getElementById('eventForm').reset();
  document.getElementById('posterForm').reset();
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
  
  // Events CMS Permission Check
  const eventsManagementSection = document.getElementById('eventsManagementSection');
  const normalAdminWelcomeMsg = document.getElementById('normalAdminWelcomeMsg');
  const hasEventsPerm = currentUser.role === 'super_admin' || (currentUser.permissions && currentUser.permissions.events);
  
  if (hasEventsPerm) {
    eventsManagementSection.classList.remove('hidden');
    if (normalAdminWelcomeMsg) normalAdminWelcomeMsg.classList.add('hidden');
    fetchAdminEvents();
  } else {
    eventsManagementSection.classList.add('hidden');
    if (normalAdminWelcomeMsg) normalAdminWelcomeMsg.classList.remove('hidden');
  }
}

// ============================================================
// EVENTS MANAGEMENT LOGIC
// ============================================================

let loadedEvents = [];

const eventsListContainer = document.getElementById('eventsListContainer');
const eventFormSection = document.getElementById('eventFormSection');
const eventForm = document.getElementById('eventForm');
const eventMsg = document.getElementById('eventMsg');
const openCreateEventBtn = document.getElementById('openCreateEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');

const posterFormSection = document.getElementById('posterFormSection');
const posterForm = document.getElementById('posterForm');
const posterMsg = document.getElementById('posterMsg');
const cancelPosterBtn = document.getElementById('cancelPosterBtn');
const removePosterBtn = document.getElementById('removePosterBtn');

async function fetchAdminEvents() {
  try {
    const res = await fetch(`${API_URL}/events/admin`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch events');
    
    loadedEvents = data.events || [];
    renderEventsList(loadedEvents);
  } catch (err) {
    eventsListContainer.innerHTML = `<p class="error-msg">${err.message}</p>`;
  }
}

function renderEventsList(events) {
  if (!events || events.length === 0) {
    eventsListContainer.innerHTML = '<p>No events found. Create one to get started.</p>';
    return;
  }
  
  let html = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Status</th>
            <th>Poster</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  events.forEach(ev => {
    const hasPoster = !!ev.poster_url;
    html += `
      <tr>
        <td class="mono">${ev.event_date ? ev.event_date.split('T')[0] : '-'}</td>
        <td>${ev.title}</td>
        <td><span class="badge" style="background: ${ev.status === 'published' ? '#00e676' : ev.status === 'archived' ? '#ff4d4d' : 'var(--primary)'}">${ev.status}</span></td>
        <td>${hasPoster ? 'Yes' : 'No'}</td>
        <td style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm" onclick="openEventForm('${ev.id}')">Edit</button>
          <button class="btn btn-sm" onclick="openPosterForm('${ev.id}')">Poster</button>
          ${ev.status !== 'published' ? `<button class="btn btn-sm" style="background: #00e676; color: #000;" onclick="publishEvent('${ev.id}')">Publish</button>` : ''}
          ${ev.status !== 'archived' ? `<button class="btn btn-sm btn-danger" onclick="archiveEvent('${ev.id}')">Archive</button>` : ''}
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  eventsListContainer.innerHTML = html;
}

// Event Form Handlers
openCreateEventBtn.addEventListener('click', () => {
  eventForm.reset();
  document.getElementById('eventId').value = '';
  document.getElementById('eventFormTitle').textContent = 'Create Event';
  eventMsg.className = 'msg hidden';
  posterFormSection.classList.add('hidden');
  eventFormSection.classList.remove('hidden');
  eventFormSection.scrollIntoView({ behavior: 'smooth' });
});

window.openEventForm = (id) => {
  const ev = loadedEvents.find(e => e.id === id);
  if (!ev) return;
  
  eventForm.reset();
  document.getElementById('eventId').value = ev.id;
  document.getElementById('eventFormTitle').textContent = 'Edit Event';
  
  document.getElementById('eventTitle').value = ev.title || '';
  document.getElementById('eventDesc').value = ev.description || '';
  document.getElementById('eventCategory').value = ev.category || '';
  document.getElementById('eventDate').value = ev.event_date ? ev.event_date.split('T')[0] : '';
  document.getElementById('eventStartTime').value = ev.start_time || '';
  document.getElementById('eventEndTime').value = ev.end_time || '';
  document.getElementById('eventLocation').value = ev.location || '';
  document.getElementById('eventRegUrl').value = ev.registration_url || '';
  document.getElementById('eventStatus').value = ev.status || 'draft';
  
  eventMsg.className = 'msg hidden';
  posterFormSection.classList.add('hidden');
  eventFormSection.classList.remove('hidden');
  eventFormSection.scrollIntoView({ behavior: 'smooth' });
};

cancelEventBtn.addEventListener('click', () => {
  eventFormSection.classList.add('hidden');
  eventForm.reset();
});

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  eventMsg.className = 'msg hidden';
  
  const id = document.getElementById('eventId').value;
  const payload = {
    title: document.getElementById('eventTitle').value,
    description: document.getElementById('eventDesc').value,
    category: document.getElementById('eventCategory').value,
    event_date: document.getElementById('eventDate').value,
    start_time: document.getElementById('eventStartTime').value || null,
    end_time: document.getElementById('eventEndTime').value || null,
    location: document.getElementById('eventLocation').value,
    registration_url: document.getElementById('eventRegUrl').value,
    status: document.getElementById('eventStatus').value
  };
  
  const saveBtn = document.getElementById('saveEventBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  try {
    const url = id ? `${API_URL}/events/${id}` : `${API_URL}/events`;
    const method = id ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save event');
    
    eventMsg.textContent = 'Event saved successfully.';
    eventMsg.className = 'msg success-msg';
    
    await fetchAdminEvents();
    
    // Close form after a short delay on successful create
    if (!id) {
      setTimeout(() => {
        eventFormSection.classList.add('hidden');
        eventForm.reset();
      }, 1500);
    }
  } catch (err) {
    eventMsg.textContent = err.message;
    eventMsg.className = 'msg error-msg';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Event';
  }
});

// Publish/Archive Inline Handlers
window.publishEvent = async (id) => {
  await updateEventStatus(id, 'published');
};

window.archiveEvent = async (id) => {
  if (confirm("Are you sure you want to archive this event? It will be hidden from the public website.")) {
    // Note: The prompt instructed to use PUT /api/events/:id with status = archived, but we'll use DELETE if the backend requires it, but let's just use DELETE since that's what the backend has documented for archiving. Wait, prompt specifically said "Use PUT /api/events/:id with status = archived".
    await updateEventStatus(id, 'archived');
  }
};

async function updateEventStatus(id, status) {
  try {
    // Finding existing event to maintain its data in PUT request
    const ev = loadedEvents.find(e => e.id === id);
    if (!ev) return;
    
    const payload = { ...ev, status };
    
    const res = await fetch(`${API_URL}/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Failed to ${status} event`);
    
    await fetchAdminEvents();
  } catch (err) {
    alert(err.message);
  }
}

// Poster Form Handlers
window.openPosterForm = (id) => {
  const ev = loadedEvents.find(e => e.id === id);
  if (!ev) return;
  
  posterForm.reset();
  document.getElementById('posterEventId').value = ev.id;
  document.getElementById('targetPosterEventName').textContent = ev.title;
  
  const display = document.getElementById('currentPosterDisplay');
  if (ev.poster_url) {
    // Add cache buster to bypass browser caching for replaced images
    display.innerHTML = `<img src="${ev.poster_url}?t=${Date.now()}" class="event-poster-preview" alt="Current Poster">`;
    removePosterBtn.classList.remove('hidden');
  } else {
    display.innerHTML = `<div class="event-poster-placeholder">No Poster Uploaded</div>`;
    removePosterBtn.classList.add('hidden');
  }
  
  posterMsg.className = 'msg hidden';
  eventFormSection.classList.add('hidden');
  posterFormSection.classList.remove('hidden');
  posterFormSection.scrollIntoView({ behavior: 'smooth' });
};

cancelPosterBtn.addEventListener('click', () => {
  posterFormSection.classList.add('hidden');
  posterForm.reset();
});

posterForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  posterMsg.className = 'msg hidden';
  
  const id = document.getElementById('posterEventId').value;
  const fileInput = document.getElementById('posterFile');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    posterMsg.textContent = 'Please select a file to upload';
    posterMsg.className = 'msg error-msg';
    return;
  }
  
  const saveBtn = document.getElementById('savePosterBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Uploading...';
  
  const formData = new FormData();
  formData.append('poster', fileInput.files[0]);
  
  try {
    const res = await fetch(`${API_URL}/events/${id}/poster`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
        // Do not set Content-Type, fetch will automatically set it to multipart/form-data with boundary
      },
      body: formData
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to upload poster');
    
    posterMsg.textContent = 'Poster uploaded successfully.';
    posterMsg.className = 'msg success-msg';
    
    await fetchAdminEvents();
    // Refresh the poster display
    window.openPosterForm(id); 
  } catch (err) {
    posterMsg.textContent = err.message;
    posterMsg.className = 'msg error-msg';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Upload/Replace Poster';
  }
});

removePosterBtn.addEventListener('click', async () => {
  const id = document.getElementById('posterEventId').value;
  if (!confirm("Are you sure you want to remove the poster?")) return;
  
  posterMsg.className = 'msg hidden';
  removePosterBtn.disabled = true;
  
  try {
    const res = await fetch(`${API_URL}/events/${id}/poster`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to remove poster');
    
    posterMsg.textContent = 'Poster removed successfully.';
    posterMsg.className = 'msg success-msg';
    
    await fetchAdminEvents();
    window.openPosterForm(id);
  } catch (err) {
    posterMsg.textContent = err.message;
    posterMsg.className = 'msg error-msg';
  } finally {
    removePosterBtn.disabled = false;
  }
});
