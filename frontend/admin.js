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
  
  // Team CMS Cleanup
  loadedTeams = [];
  loadedMembers = [];
  document.getElementById('teamManagementSection').classList.add('hidden');
  document.getElementById('memberFormSection').classList.add('hidden');
  document.getElementById('teamFormSection').classList.add('hidden');
  document.getElementById('memberPhotoFormSection').classList.add('hidden');
  document.getElementById('memberForm').reset();
  document.getElementById('teamForm').reset();
  document.getElementById('memberPhotoForm').reset();
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
  }

  // Team CMS Permission Check
  const teamManagementSection = document.getElementById('teamManagementSection');
  const hasTeamPerm = currentUser.role === 'super_admin' || (currentUser.permissions && currentUser.permissions.team);
  
  if (hasTeamPerm) {
    teamManagementSection.classList.remove('hidden');
    if (normalAdminWelcomeMsg) normalAdminWelcomeMsg.classList.add('hidden');
    // Fetch initial team data
    fetchAdminTeams();
    fetchAdminMembers();
  } else {
    teamManagementSection.classList.add('hidden');
  }

  if (!hasEventsPerm && !hasTeamPerm && currentUser.role !== 'super_admin') {
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

// ============================================================
// TEAM MANAGEMENT LOGIC
// ============================================================

let loadedTeams = [];
let loadedMembers = [];
let currentTeamDetailsId = null;

// DOM Elements
const teamViewFaculty = document.getElementById('teamViewFaculty');
const teamViewExecutive = document.getElementById('teamViewExecutive');
const teamViewTeams = document.getElementById('teamViewTeams');
const tabBtnFaculty = document.getElementById('tabBtnFaculty');
const tabBtnExecutive = document.getElementById('tabBtnExecutive');
const tabBtnTeams = document.getElementById('tabBtnTeams');

const facultyListContainer = document.getElementById('facultyListContainer');
const executiveListContainer = document.getElementById('executiveListContainer');
const teamsListContainer = document.getElementById('teamsListContainer');

const teamListView = document.getElementById('teamListView');
const teamDetailsView = document.getElementById('teamDetailsView');
const teamDetailsTitle = document.getElementById('teamDetailsTitle');
const teamDetailsStatus = document.getElementById('teamDetailsStatus');
const teamLeadContainer = document.getElementById('teamLeadContainer');
const teamMembersListContainer = document.getElementById('teamMembersListContainer');

// Form Elements
const memberFormSection = document.getElementById('memberFormSection');
const memberFormTitle = document.getElementById('memberFormTitle');
const memberForm = document.getElementById('memberForm');
const memberMsg = document.getElementById('memberMsg');
const cancelMemberBtn = document.getElementById('cancelMemberBtn');

const teamFormSection = document.getElementById('teamFormSection');
const teamFormTitle = document.getElementById('teamFormTitle');
const teamForm = document.getElementById('teamForm');
const teamMsg = document.getElementById('teamMsg');
const cancelTeamBtn = document.getElementById('cancelTeamBtn');

const memberPhotoFormSection = document.getElementById('memberPhotoFormSection');
const targetMemberPhotoName = document.getElementById('targetMemberPhotoName');
const currentMemberPhotoDisplay = document.getElementById('currentMemberPhotoDisplay');
const memberPhotoForm = document.getElementById('memberPhotoForm');
const memberPhotoMsg = document.getElementById('memberPhotoMsg');
const removeMemberPhotoBtn = document.getElementById('removeMemberPhotoBtn');
const cancelMemberPhotoBtn = document.getElementById('cancelMemberPhotoBtn');

// Tab Switching
window.switchTeamTab = (tab) => {
  if (teamViewFaculty) teamViewFaculty.classList.add('hidden');
  if (teamViewExecutive) teamViewExecutive.classList.add('hidden');
  if (teamViewTeams) teamViewTeams.classList.add('hidden');
  
  [tabBtnFaculty, tabBtnExecutive, tabBtnTeams].forEach(btn => {
    if (btn) {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--fg)';
    }
  });

  if (tab === 'faculty') {
    if (teamViewFaculty) teamViewFaculty.classList.remove('hidden');
    if (tabBtnFaculty) {
      tabBtnFaculty.style.background = 'var(--primary)';
      tabBtnFaculty.style.color = '#000';
    }
  } else if (tab === 'executive') {
    if (teamViewExecutive) teamViewExecutive.classList.remove('hidden');
    if (tabBtnExecutive) {
      tabBtnExecutive.style.background = 'var(--primary)';
      tabBtnExecutive.style.color = '#000';
    }
  } else if (tab === 'teams') {
    if (teamViewTeams) teamViewTeams.classList.remove('hidden');
    if (tabBtnTeams) {
      tabBtnTeams.style.background = 'var(--primary)';
      tabBtnTeams.style.color = '#000';
    }
    if (window.closeTeamDetails) closeTeamDetails(); // always reset to list view
  }
};

// API Fetchers
async function fetchAdminTeams() {
  try {
    const res = await fetch(`${API_URL}/admin/teams`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch teams');
    loadedTeams = data.teams || [];
    renderTeamsList();
    if (currentTeamDetailsId) {
      renderTeamDetails(currentTeamDetailsId);
    }
  } catch (err) {
    if (teamsListContainer) teamsListContainer.innerHTML = `<p class="error-msg">${err.message}</p>`;
  }
}

async function fetchAdminMembers() {
  try {
    const res = await fetch(`${API_URL}/admin/team-members`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch members');
    loadedMembers = data.members || [];
    renderFaculty();
    renderExecutive();
    if (currentTeamDetailsId) {
      renderTeamDetails(currentTeamDetailsId);
    }
  } catch (err) {
    if (facultyListContainer) facultyListContainer.innerHTML = `<p class="error-msg">${err.message}</p>`;
    if (executiveListContainer) executiveListContainer.innerHTML = `<p class="error-msg">${err.message}</p>`;
  }
}

// Renderers
function renderFaculty() {
  const faculty = loadedMembers.filter(m => m.section === 'Faculty');
  renderMemberTable(faculty, facultyListContainer, false);
}

function renderExecutive() {
  const executive = loadedMembers.filter(m => m.section === 'Executive');
  renderMemberTable(executive, executiveListContainer, false);
}

function renderMemberTable(members, container, isDynamicTeamMember = false) {
  if (!container) return;
  if (!members || members.length === 0) {
    container.innerHTML = '<p>No members found in this section.</p>';
    return;
  }
  
  let html = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Name</th>
            <th>Position</th>
            <th>Photo</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Sort by display order
  members.sort((a, b) => a.display_order - b.display_order);

  members.forEach(m => {
    const hasPhoto = !!m.image_url;
    html += `
      <tr>
        <td class="mono">${m.display_order}</td>
        <td>${m.name}</td>
        <td>${m.position || '-'}</td>
        <td>${hasPhoto ? 'Yes' : 'No'}</td>
        <td><span class="badge" style="background: ${m.status === 'published' ? '#00e676' : m.status === 'archived' ? '#ff4d4d' : 'var(--primary)'}">${m.status}</span></td>
        <td style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm" onclick="openMemberFormEdit('${m.id}')">Edit</button>
          <button class="btn btn-sm" onclick="openMemberPhotoForm('${m.id}')">Photo</button>
          ${isDynamicTeamMember && !m.is_lead ? `<button class="btn btn-sm" style="background: var(--primary); color: #000;" onclick="assignLead('${m.team_id}', '${m.id}')">Assign Lead</button>` : ''}
          ${m.status !== 'archived' ? `<button class="btn btn-sm btn-danger" onclick="archiveMember('${m.id}')">Archive</button>` : ''}
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function renderTeamsList() {
  if (!teamsListContainer) return;
  if (!loadedTeams || loadedTeams.length === 0) {
    teamsListContainer.innerHTML = '<p>No dynamic teams found.</p>';
    return;
  }
  
  let html = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Team Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  loadedTeams.sort((a, b) => a.display_order - b.display_order).forEach(t => {
    html += `
      <tr>
        <td class="mono">${t.display_order}</td>
        <td>${t.name}</td>
        <td><span class="badge" style="background: ${t.status === 'published' ? '#00e676' : t.status === 'archived' ? '#ff4d4d' : 'var(--primary)'}">${t.status}</span></td>
        <td style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm" onclick="openTeamDetails('${t.id}')">Manage</button>
          <button class="btn btn-sm" onclick="openTeamFormEdit('${t.id}')">Edit</button>
          ${t.status !== 'archived' ? `<button class="btn btn-sm btn-danger" onclick="archiveTeam('${t.id}')">Archive</button>` : ''}
        </td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>`;
  teamsListContainer.innerHTML = html;
}

window.openTeamDetails = (teamId) => {
  currentTeamDetailsId = teamId;
  if (teamListView) teamListView.classList.add('hidden');
  if (teamDetailsView) teamDetailsView.classList.remove('hidden');
  renderTeamDetails(teamId);
};

window.closeTeamDetails = () => {
  currentTeamDetailsId = null;
  if (teamDetailsView) teamDetailsView.classList.add('hidden');
  if (teamListView) teamListView.classList.remove('hidden');
};

function renderTeamDetails(teamId) {
  const team = loadedTeams.find(t => t.id === teamId);
  if (!team) {
    closeTeamDetails();
    return;
  }
  
  if (teamDetailsTitle) teamDetailsTitle.textContent = team.name;
  if (teamDetailsStatus) teamDetailsStatus.textContent = `Status: ${team.status.toUpperCase()} | Display Order: ${team.display_order}`;
  
  const teamMembers = loadedMembers.filter(m => m.team_id === teamId);
  const lead = teamMembers.find(m => m.is_lead);
  const regulars = teamMembers.filter(m => !m.is_lead);
  
  if (teamLeadContainer) {
    if (lead) {
      const photoSrc = lead.image_url ? `${lead.image_url}?t=${Date.now()}` : '';
      teamLeadContainer.innerHTML = `
        <div class="admin-panel" style="display:flex; gap:1rem; align-items:center; background: rgba(0,0,0,0.2);">
          ${photoSrc ? `<img src="${photoSrc}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:1px solid var(--border);">` : `<div style="width:60px; height:60px; border-radius:50%; border:1px dashed var(--border); display:flex; align-items:center; justify-content:center; font-size:0.7rem;">No Photo</div>`}
          <div style="flex:1;">
            <h5 style="margin:0 0 0.25rem 0; display:flex; align-items:center; gap:0.5rem;">${lead.name} <span class="badge" style="background:#ffd700; color:#000;">TEAM LEAD</span></h5>
            <p style="margin:0; font-size:0.85rem; color:var(--fg-muted);">${lead.position || 'Lead'} | Status: ${lead.status}</p>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <button class="btn btn-sm" onclick="openMemberFormEdit('${lead.id}')">Edit Lead</button>
            <button class="btn btn-sm" onclick="openMemberPhotoForm('${lead.id}')">Photo</button>
            <button class="btn btn-sm btn-danger" onclick="removeLead('${teamId}')">Demote Lead</button>
          </div>
        </div>
      `;
    } else {
      teamLeadContainer.innerHTML = `
        <div class="admin-panel" style="background: rgba(0,0,0,0.2); border-style:dashed;">
          <p style="margin:0; text-align:center; color:var(--fg-muted);">No team lead assigned. Assign one from the members list below.</p>
        </div>
      `;
    }
  }
  
  renderMemberTable(regulars, teamMembersListContainer, true);
}

// ------------------------------------------------------------
// MEMBER FORMS & CRUD
// ------------------------------------------------------------

window.openMemberForm = (section) => {
  if (memberForm) memberForm.reset();
  document.getElementById('memberId').value = '';
  document.getElementById('memberSection').value = section;
  document.getElementById('memberTeamId').value = section === 'Team' ? currentTeamDetailsId : '';
  document.getElementById('memberFormTitle').textContent = `Add ${section} Member`;
  document.getElementById('memberStatus').value = 'published';
  document.getElementById('memberDisplayOrder').value = '0';
  
  if (memberMsg) memberMsg.className = 'msg hidden';
  hideAllTeamForms();
  if (memberFormSection) {
    memberFormSection.classList.remove('hidden');
    memberFormSection.scrollIntoView({ behavior: 'smooth' });
  }
};

window.openMemberFormEdit = (memberId) => {
  const m = loadedMembers.find(x => x.id === memberId);
  if (!m) return;
  
  if (memberForm) memberForm.reset();
  document.getElementById('memberId').value = m.id;
  document.getElementById('memberSection').value = m.section;
  document.getElementById('memberTeamId').value = m.team_id || '';
  document.getElementById('memberFormTitle').textContent = `Edit Member`;
  
  document.getElementById('memberName').value = m.name || '';
  document.getElementById('memberPosition').value = m.position || '';
  document.getElementById('memberLinkedin').value = m.linkedin_url || '';
  document.getElementById('memberDisplayOrder').value = m.display_order || '0';
  document.getElementById('memberStatus').value = m.status || 'draft';
  
  if (memberMsg) memberMsg.className = 'msg hidden';
  hideAllTeamForms();
  if (memberFormSection) {
    memberFormSection.classList.remove('hidden');
    memberFormSection.scrollIntoView({ behavior: 'smooth' });
  }
};

if (cancelMemberBtn) {
  cancelMemberBtn.addEventListener('click', () => {
    if (memberFormSection) memberFormSection.classList.add('hidden');
    if (memberForm) memberForm.reset();
  });
}

if (memberForm) {
  memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (memberMsg) memberMsg.className = 'msg hidden';
    
    const id = document.getElementById('memberId').value;
    const payload = {
      section: document.getElementById('memberSection').value,
      team_id: document.getElementById('memberTeamId').value || null,
      name: document.getElementById('memberName').value,
      position: document.getElementById('memberPosition').value,
      linkedin_url: document.getElementById('memberLinkedin').value || null,
      display_order: parseInt(document.getElementById('memberDisplayOrder').value) || 0,
      status: document.getElementById('memberStatus').value
    };
    
    if (!id) {
      payload.is_lead = false; 
    }
    
    const saveBtn = document.getElementById('saveMemberBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    
    try {
      const url = id ? `${API_URL}/admin/team-members/${id}` : `${API_URL}/admin/team-members`;
      const method = id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save member');
      
      if (memberMsg) {
        memberMsg.textContent = 'Member saved successfully.';
        memberMsg.className = 'msg success-msg';
      }
      
      await fetchAdminMembers();
      
      if (!id) {
        setTimeout(() => {
          if (memberFormSection) memberFormSection.classList.add('hidden');
          if (memberForm) memberForm.reset();
        }, 1500);
      }
    } catch (err) {
      if (memberMsg) {
        memberMsg.textContent = err.message;
        memberMsg.className = 'msg error-msg';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Member';
      }
    }
  });
}

// ------------------------------------------------------------
// TEAM FORMS & CRUD
// ------------------------------------------------------------

window.openTeamForm = () => {
  if (teamForm) teamForm.reset();
  document.getElementById('teamEditId').value = '';
  document.getElementById('teamFormTitle').textContent = 'Create Dynamic Team';
  document.getElementById('teamStatus').value = 'published';
  document.getElementById('teamDisplayOrder').value = '0';
  
  if (teamMsg) teamMsg.className = 'msg hidden';
  hideAllTeamForms();
  if (teamFormSection) {
    teamFormSection.classList.remove('hidden');
    teamFormSection.scrollIntoView({ behavior: 'smooth' });
  }
};

window.openTeamFormEdit = (teamId) => {
  const t = loadedTeams.find(x => x.id === teamId);
  if (!t) return;
  
  if (teamForm) teamForm.reset();
  document.getElementById('teamEditId').value = t.id;
  document.getElementById('teamFormTitle').textContent = `Edit Team`;
  document.getElementById('teamName').value = t.name || '';
  document.getElementById('teamDisplayOrder').value = t.display_order || '0';
  document.getElementById('teamStatus').value = t.status || 'draft';
  
  if (teamMsg) teamMsg.className = 'msg hidden';
  hideAllTeamForms();
  if (teamFormSection) {
    teamFormSection.classList.remove('hidden');
    teamFormSection.scrollIntoView({ behavior: 'smooth' });
  }
};

if (cancelTeamBtn) {
  cancelTeamBtn.addEventListener('click', () => {
    if (teamFormSection) teamFormSection.classList.add('hidden');
    if (teamForm) teamForm.reset();
  });
}

if (teamForm) {
  teamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (teamMsg) teamMsg.className = 'msg hidden';
    
    const id = document.getElementById('teamEditId').value;
    const payload = {
      name: document.getElementById('teamName').value,
      display_order: parseInt(document.getElementById('teamDisplayOrder').value) || 0,
      status: document.getElementById('teamStatus').value
    };
    
    const saveBtn = document.getElementById('saveTeamBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    
    try {
      const url = id ? `${API_URL}/admin/teams/${id}` : `${API_URL}/admin/teams`;
      const method = id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save team');
      
      if (teamMsg) {
        teamMsg.textContent = 'Team saved successfully.';
        teamMsg.className = 'msg success-msg';
      }
      
      await fetchAdminTeams();
      
      if (!id) {
        setTimeout(() => {
          if (teamFormSection) teamFormSection.classList.add('hidden');
          if (teamForm) teamForm.reset();
        }, 1500);
      }
    } catch (err) {
      if (teamMsg) {
        teamMsg.textContent = err.message;
        teamMsg.className = 'msg error-msg';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Team';
      }
    }
  });
}

// ------------------------------------------------------------
// MEMBER PHOTOS
// ------------------------------------------------------------

window.openMemberPhotoForm = (memberId) => {
  const m = loadedMembers.find(x => x.id === memberId);
  if (!m) return;
  
  if (memberPhotoForm) memberPhotoForm.reset();
  document.getElementById('photoMemberId').value = m.id;
  if (targetMemberPhotoName) targetMemberPhotoName.textContent = m.name;
  
  if (currentMemberPhotoDisplay) {
    if (m.image_url) {
      currentMemberPhotoDisplay.innerHTML = `<img src="${m.image_url}?t=${Date.now()}" class="event-poster-preview" style="max-height:150px; border-radius:50%;" alt="Current Photo">`;
      if (removeMemberPhotoBtn) removeMemberPhotoBtn.classList.remove('hidden');
    } else {
      currentMemberPhotoDisplay.innerHTML = `<div class="event-poster-placeholder" style="height:150px; width:150px; border-radius:50%;">No Photo</div>`;
      if (removeMemberPhotoBtn) removeMemberPhotoBtn.classList.add('hidden');
    }
  }
  
  if (memberPhotoMsg) memberPhotoMsg.className = 'msg hidden';
  hideAllTeamForms();
  if (memberPhotoFormSection) {
    memberPhotoFormSection.classList.remove('hidden');
    memberPhotoFormSection.scrollIntoView({ behavior: 'smooth' });
  }
};

if (cancelMemberPhotoBtn) {
  cancelMemberPhotoBtn.addEventListener('click', () => {
    if (memberPhotoFormSection) memberPhotoFormSection.classList.add('hidden');
    if (memberPhotoForm) memberPhotoForm.reset();
  });
}

if (memberPhotoForm) {
  memberPhotoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (memberPhotoMsg) memberPhotoMsg.className = 'msg hidden';
    
    const id = document.getElementById('photoMemberId').value;
    const fileInput = document.getElementById('memberPhotoFile');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
    
    const saveBtn = document.getElementById('saveMemberPhotoBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Uploading...';
    }
    
    const formData = new FormData();
    formData.append('photo', fileInput.files[0]);
    
    try {
      const res = await fetch(`${API_URL}/admin/team-members/${id}/photo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload photo');
      
      if (memberPhotoMsg) {
        memberPhotoMsg.textContent = 'Photo uploaded successfully.';
        memberPhotoMsg.className = 'msg success-msg';
      }
      
      await fetchAdminMembers();
      window.openMemberPhotoForm(id);
    } catch (err) {
      if (memberPhotoMsg) {
        memberPhotoMsg.textContent = err.message;
        memberPhotoMsg.className = 'msg error-msg';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Upload/Replace Photo';
      }
    }
  });
}

if (removeMemberPhotoBtn) {
  removeMemberPhotoBtn.addEventListener('click', async () => {
    const id = document.getElementById('photoMemberId').value;
    if (!confirm("Are you sure you want to remove this photo?")) return;
    
    if (memberPhotoMsg) memberPhotoMsg.className = 'msg hidden';
    removeMemberPhotoBtn.disabled = true;
    
    try {
      const res = await fetch(`${API_URL}/admin/team-members/${id}/photo`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove photo');
      
      if (memberPhotoMsg) {
        memberPhotoMsg.textContent = 'Photo removed successfully.';
        memberPhotoMsg.className = 'msg success-msg';
      }
      
      await fetchAdminMembers();
      window.openMemberPhotoForm(id);
    } catch (err) {
      if (memberPhotoMsg) {
        memberPhotoMsg.textContent = err.message;
        memberPhotoMsg.className = 'msg error-msg';
      }
    } finally {
      removeMemberPhotoBtn.disabled = false;
    }
  });
}

// ------------------------------------------------------------
// LEAD / ARCHIVE OPERATIONS
// ------------------------------------------------------------

window.assignLead = async (teamId, memberId) => {
  try {
    const res = await fetch(`${API_URL}/admin/teams/${teamId}/lead/${memberId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to assign lead');
    await fetchAdminMembers();
  } catch (err) {
    alert(err.message);
  }
};

window.removeLead = async (teamId) => {
  try {
    const res = await fetch(`${API_URL}/admin/teams/${teamId}/lead`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to remove lead');
    await fetchAdminMembers();
  } catch (err) {
    alert(err.message);
  }
};

window.archiveMember = async (id) => {
  if (!confirm("Are you sure you want to archive this member?")) return;
  try {
    const res = await fetch(`${API_URL}/admin/team-members/${id}/archive`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to archive member');
    await fetchAdminMembers();
  } catch (err) {
    alert(err.message);
  }
};

window.archiveTeam = async (id) => {
  if (!confirm("Are you sure you want to archive this team?")) return;
  try {
    const res = await fetch(`${API_URL}/admin/teams/${id}/archive`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to archive team');
    await fetchAdminTeams();
    closeTeamDetails();
  } catch (err) {
    alert(err.message);
  }
};

function hideAllTeamForms() {
  if (memberFormSection) memberFormSection.classList.add('hidden');
  if (teamFormSection) teamFormSection.classList.add('hidden');
  if (memberPhotoFormSection) memberPhotoFormSection.classList.add('hidden');
}
