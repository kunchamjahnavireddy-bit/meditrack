// MediTrack - Admin Control Center Engine

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    return; // app.js handles access denial
  }

  fetchAdminSystemOverview();
  fetchAdminPatients();
  fetchAdminDoctors();
  fetchAdminAppointments();
  fetchAdminHospitals();
  fetchAdminAuditLogs();

  initAdminFormHandlers();
  initDeleteAccountFormHandler();
  initDoctorFormHandler();
  initPatientFormHandler();
});

async function fetchAdminSystemOverview() {
  try {
    const res = await fetchWithAuth('/api/admin/overview');
    if (!res.ok) return;

    const data = await res.json();

    // Patients
    setTxt('stat-patients-total', data.patients.total);
    setTxt('stat-patients-active', data.patients.active);
    setTxt('stat-patients-inactive', data.patients.inactive);
    setTxt('stat-patients-deceased', data.patients.deceased);
    setTxt('stat-patients-deleted', data.patients.deleted || 0);

    // Doctors
    setTxt('stat-doctors-total', data.doctors.total);
    setTxt('stat-doctors-active', data.doctors.active);
    setTxt('stat-doctors-suspended', data.doctors.suspended);
    setTxt('stat-doctors-deleted', data.doctors.deleted || 0);

    // Hospitals & Appointments
    setTxt('stat-hospitals-total', data.hospitals.total);
    setTxt('stat-appts-today', data.todaysAppointments);

  } catch (err) {
    console.error('Error loading admin system overview:', err);
  }
}

async function fetchAdminPatients() {
  const tbody = document.getElementById('admin-patients-tbody');
  if (!tbody) return;

  const statusFilter = (document.getElementById('patient_filter_status') ? document.getElementById('patient_filter_status').value : '').trim();
  let url = '/api/admin/patients';
  if (statusFilter) url += `?status=${encodeURIComponent(statusFilter)}`;

  try {
    const res = await fetchWithAuth(url);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Failed to load patients list.</td></tr>`;
      return;
    }

    const patients = await res.json();
    if (!patients || patients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">No patients matching current filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    patients.forEach(p => {
      const st = p.accountStatus || 'active';
      const badgeClass = st === 'active' ? 'badge-green' :
                         (st === 'deceased' ? 'badge-red' :
                         (st === 'deleted' ? 'badge' : 'badge-orange'));
      const badgeStyle = st === 'deleted' ? 'background:#334155; color:#f8fafc;' : '';

      tbody.innerHTML += `
        <tr style="${st === 'deleted' ? 'opacity:0.75; background:#f8fafc;' : ''}">
          <td><strong style="color:var(--primary);">${p.patientId}</strong></td>
          <td><strong>${p.fullName}</strong></td>
          <td>${p.age} yrs / ${p.gender}</td>
          <td>
            <div style="font-size:0.9rem;">📞 ${p.phone}</div>
            <div style="font-size:0.85rem; color:var(--text-muted);">✉️ ${p.email}</div>
          </td>
          <td>📍 <strong>${p.patientLocation || 'Kurnool'}</strong></td>
          <td><span class="badge ${badgeClass}" style="text-transform:capitalize; ${badgeStyle}">${st}</span></td>
          <td>
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              ${st !== 'deleted' ? `
                <button onclick="changePatientStatus('${p.patientId}', '${st === 'active' ? 'inactive' : 'active'}')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem;">
                  ${st === 'active' ? 'Deactivate ✕' : 'Reactivate ➔'}
                </button>
                ${st !== 'deceased' ? `
                  <button onclick="changePatientStatus('${p.patientId}', 'deceased')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem; background:#ef4444; color:#fff; border:none;">
                    Deceased ✝
                  </button>
                ` : ''}
                <button onclick="openDeleteModal('${p.patientId}', '${escapeJs(p.fullName)}', '${escapeJs(p.email)}', 'patient', '${st}')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem; background:#475569; color:#fff; border:none;">
                  Disable Login 🗑️
                </button>
                <button onclick="confirmPermanentDeletion('${p.patientId}', 'Patient')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem; background:#dc2626; color:#fff; border:none;">
                  Delete Permanently ⚠️
                </button>
              ` : `
                <button onclick="confirmPermanentDeletion('${p.patientId}', 'Patient')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem; background:#dc2626; color:#fff; border:none;">
                  Delete Permanently ⚠️
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error('Error fetching admin patients:', err);
  }
}

async function changePatientStatus(patientId, newStatus) {
  if (!confirm(`Are you sure you want to set Patient ${patientId} account status to '${newStatus}'?`)) return;

  try {
    const res = await fetchWithAuth(`/api/admin/patients/${patientId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to update patient status.', 'error');
      return;
    }

    showToast(data.message || 'Patient status updated successfully!', 'success');
    fetchAdminSystemOverview();
    fetchAdminPatients();
    fetchAdminAuditLogs();

  } catch (err) {
    console.error('Error updating patient status:', err);
    showToast('Server communication error.', 'error');
  }
}

async function fetchAdminDoctors() {
  const tbody = document.getElementById('admin-doctors-tbody');
  if (!tbody) return;

  const statusFilter = (document.getElementById('doctor_filter_status') ? document.getElementById('doctor_filter_status').value : '').trim();
  let url = '/api/admin/doctors';
  if (statusFilter) url += `?status=${encodeURIComponent(statusFilter)}`;

  try {
    const res = await fetchWithAuth(url);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Failed to load doctors list.</td></tr>`;
      return;
    }

    const doctors = await res.json();
    if (!doctors || doctors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">No doctors matching current filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    doctors.forEach(d => {
      const st = d.accountStatus || 'active';
      const licSt = d.licenseStatus || 'active';
      const badgeClass = st === 'active' ? 'badge-green' :
                         (st === 'suspended' ? 'badge-red' :
                         (st === 'deleted' ? 'badge' : 'badge-orange'));
      const badgeStyle = st === 'deleted' ? 'background:#334155; color:#f8fafc;' : '';

      tbody.innerHTML += `
        <tr style="${st === 'deleted' ? 'opacity:0.75; background:#f8fafc;' : ''}">
          <td><strong style="color:var(--primary); font-weight:800;">${d.doctorId}</strong></td>
          <td><strong>${d.name}</strong></td>
          <td><span style="font-size:0.88rem; color:var(--text-body); font-weight:600;">${d.email || (d.doctorId.toLowerCase() + '@meditrack.org')}</span></td>
          <td>
            <strong>${d.specialty || 'General Medicine'}</strong> <br>
            <small style="color:var(--text-muted); font-weight:600;">${d.department || d.specialty || 'Medicine'}</small>
          </td>
          <td><code>${d.medicalLicenseNumber || 'MCI-REG'}</code></td>
          <td>📍 <strong>${d.location || 'Hospital Network'}</strong></td>
          <td><span class="badge ${badgeClass}" style="text-transform:capitalize; ${badgeStyle}">${st}</span></td>
          <td>
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              ${st !== 'deleted' ? `
                <button onclick="changeDoctorStatus('${d.doctorId}', '${st === 'active' ? 'suspended' : 'active'}')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem;">
                  ${st === 'active' ? 'Suspend ✕' : 'Activate ➔'}
                </button>
                <button onclick="openDeleteModal('${d.doctorId}', '${escapeJs(d.name)}', '${escapeJs(d.email || 'N/A')}', 'doctor', '${st}')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem; background:#475569; color:#fff; border:none;">
                  Disable Login 🗑️
                </button>
                <button onclick="confirmPermanentDeletion('${d.doctorId}', 'Doctor')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem; background:#dc2626; color:#fff; border:none;">
                  Delete Permanently ⚠️
                </button>
              ` : `
                <button onclick="confirmPermanentDeletion('${d.doctorId}', 'Doctor')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem; background:#dc2626; color:#fff; border:none;">
                  Delete Permanently ⚠️
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error('Error fetching admin doctors:', err);
  }
}

async function changeDoctorStatus(doctorId, newStatus) {
  const reason = prompt(`Enter reason for updating Doctor ${doctorId} status to '${newStatus}':`, 'Administrative status update');
  if (reason === null) return;

  try {
    const res = await fetchWithAuth(`/api/admin/doctors/${doctorId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, licenseStatus: newStatus === 'suspended' ? 'suspended' : 'active', reason })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to update doctor status.', 'error');
      return;
    }

    showToast(data.message || 'Doctor status updated successfully!', 'success');
    fetchAdminSystemOverview();
    fetchAdminDoctors();
    fetchAdminAuditLogs();

  } catch (err) {
    console.error('Error updating doctor status:', err);
    showToast('Server communication error.', 'error');
  }
}

// ----------------------------------------------------
// SYSTEM DOCTOR APPOINTMENTS CATALOG
// ----------------------------------------------------
async function fetchAdminAppointments() {
  const tbody = document.getElementById('admin-appts-tbody');
  if (!tbody) return;

  const statusFilter = (document.getElementById('appt_filter_status') ? document.getElementById('appt_filter_status').value : '').trim();
  let url = '/api/admin/appointments';
  if (statusFilter) url += `?status=${encodeURIComponent(statusFilter)}`;

  try {
    const res = await fetchWithAuth(url);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Failed to load appointments catalog.</td></tr>`;
      return;
    }

    const appts = await res.json();
    if (!appts || appts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">No appointments matching current filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    appts.forEach(a => {
      const st = a.status || 'Pending';
      const badgeClass = st === 'Confirmed' ? 'badge-green' :
                         (st === 'Completed' ? 'badge-blue' :
                         (st === 'Cancelled' ? 'badge-red' : 'badge-orange'));

      tbody.innerHTML += `
        <tr>
          <td><strong style="color:var(--primary); font-size:0.88rem;">#APT${a.appointmentId}</strong></td>
          <td>
            <strong>${a.patientName}</strong> <br>
            <code style="font-size:0.8rem;">${a.patientId}</code>
          </td>
          <td>
            <strong>${a.doctorName}</strong> <br>
            <code style="font-size:0.8rem;">${a.doctorId}</code>
          </td>
          <td>
            <span>${a.specialty}</span> <br>
            <small style="color:var(--text-muted);">${a.department || 'Medicine'}</small>
          </td>
          <td>
            📅 <strong>${a.appointmentDate}</strong> <br>
            ⏰ ${a.appointmentTime}
          </td>
          <td><span class="badge ${badgeClass}">${st}</span></td>
        </tr>
      `;
    });

  } catch (err) {
    console.error('Error fetching admin appointments:', err);
  }
}

// ----------------------------------------------------
// ACCOUNT DELETION CONFIRMATION MODAL & HANDLERS
// ----------------------------------------------------
let activeDeleteTargetId = null;

async function confirmPermanentDeletion(targetId, roleName) {
  const confirmed = confirm("Are you sure? This action cannot be undone.");
  if (!confirmed) return;

  try {
    const res = await fetchWithAuth(`/api/admin/users/${targetId}/permanent`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || `Failed to permanently delete ${roleName} account.`, 'error');
      return;
    }

    showToast(data.message || `${roleName} account ${targetId} permanently deleted successfully.`, 'success');

    // Automatically refresh system statistics and tables
    fetchAdminSystemOverview();
    fetchAdminPatients();
    fetchAdminDoctors();
    fetchAdminAuditLogs();

  } catch (err) {
    console.error('Error in permanent deletion:', err);
    showToast('Server communication error during permanent deletion.', 'error');
  }
}

function openDeleteModal(targetId, name, email, role, currentStatus) {
  activeDeleteTargetId = targetId.toUpperCase();

  setTxt('del_modal_target_id', activeDeleteTargetId);
  setTxt('del_modal_name', name);
  setTxt('del_modal_role', role);
  setTxt('del_modal_status', currentStatus);
  setTxt('del_modal_code_display', activeDeleteTargetId);

  const confirmInput = document.getElementById('delete_confirm_input');
  if (confirmInput) confirmInput.value = '';

  const reasonInput = document.getElementById('delete_reason_input');
  if (reasonInput) reasonInput.value = 'Account permanently removed by administrator';

  toggleDeleteModal(true);
}

function toggleDeleteModal(show) {
  const modal = document.getElementById('delete-account-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
  if (!show) activeDeleteTargetId = null;
}

function initDeleteAccountFormHandler() {
  const form = document.getElementById('delete-account-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!activeDeleteTargetId) {
      showToast('No active target user selected for deletion.', 'error');
      return;
    }

    const confirmVal = document.getElementById('delete_confirm_input').value.trim().toUpperCase();
    const reason = document.getElementById('delete_reason_input').value.trim();

    if (confirmVal !== activeDeleteTargetId) {
      showToast(`Confirmation text mismatch. Please type '${activeDeleteTargetId}' to confirm.`, 'error');
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/admin/users/${activeDeleteTargetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete account.', 'error');
        return;
      }

      showToast(data.message || `Account ${activeDeleteTargetId} deleted successfully. Data preserved.`, 'success');
      toggleDeleteModal(false);

      fetchAdminSystemOverview();
      fetchAdminPatients();
      fetchAdminDoctors();
      fetchAdminAuditLogs();

    } catch (err) {
      console.error('Error deleting account:', err);
      showToast('Server communication error.', 'error');
    }
  });
}

// ----------------------------------------------------
// HOSPITAL NETWORK MANAGEMENT
// ----------------------------------------------------
async function fetchAdminHospitals() {
  const tbody = document.getElementById('admin-hospitals-tbody');
  if (!tbody) return;

  try {
    const res = await fetchWithAuth('/api/admin/hospitals');
    if (!res.ok) return;

    const hospitals = await res.json();
    if (!hospitals || hospitals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">No hospitals registered in network.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    hospitals.forEach(h => {
      tbody.innerHTML += `
        <tr>
          <td><strong style="color:var(--primary);">${h.hospitalId}</strong></td>
          <td><strong>${h.name}</strong></td>
          <td>${h.address}</td>
          <td>📍 <strong>${h.location}</strong></td>
          <td>
            <div style="font-size:0.85rem;">📞 ${h.phone}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">✉️ ${h.email}</div>
          </td>
          <td><span class="badge badge-green">${h.status}</span></td>
          <td>
            <button onclick="showToast('Hospital Facility Active', 'info')" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem;">
              Manage ⚙️
            </button>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error('Error fetching admin hospitals:', err);
  }
}

function toggleHospitalModal(show) {
  const modal = document.getElementById('create-hospital-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

function initAdminFormHandlers() {
  const form = document.getElementById('create-hospital-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById('hosp_name').value.trim(),
      address: document.getElementById('hosp_address').value.trim(),
      location: document.getElementById('hosp_location').value.trim(),
      phone: document.getElementById('hosp_phone').value.trim(),
      email: document.getElementById('hosp_email').value.trim()
    };

    try {
      const res = await fetchWithAuth('/api/admin/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to register hospital facility.', 'error');
        return;
      }

      showToast(`Hospital Facility '${data.hospital.name}' registered successfully!`, 'success');
      toggleHospitalModal(false);
      form.reset();
      fetchAdminHospitals();
      fetchAdminSystemOverview();

    } catch (err) {
      console.error('Error creating hospital:', err);
      showToast('Server communication error.', 'error');
    }
  });
}

function toggleDoctorModal(show) {
  const modal = document.getElementById('create-doctor-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

function initDoctorFormHandler() {
  const form = document.getElementById('create-doctor-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById('doc_name').value.trim(),
      email: document.getElementById('doc_email').value.trim(),
      specialty: document.getElementById('doc_specialty').value.trim(),
      department: document.getElementById('doc_department').value.trim(),
      medicalLicenseNumber: document.getElementById('doc_license').value.trim(),
      location: document.getElementById('doc_location').value.trim(),
      password: document.getElementById('doc_password').value.trim()
    };

    try {
      const res = await fetchWithAuth('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to register doctor.', 'error');
        return;
      }

      showToast(`Doctor account created successfully (${data.doctorId})!`, 'success');
      toggleDoctorModal(false);
      form.reset();
      fetchAdminDoctors();
      fetchAdminSystemOverview();

    } catch (err) {
      console.error('Error creating doctor:', err);
      showToast('Server communication error.', 'error');
    }
  });
}

function togglePatientModal(show) {
  const modal = document.getElementById('create-patient-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

function initPatientFormHandler() {
  const form = document.getElementById('create-patient-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      fullName: document.getElementById('pat_name').value.trim(),
      age: document.getElementById('pat_age').value,
      gender: document.getElementById('pat_gender').value,
      dateOfBirth: document.getElementById('pat_dob').value,
      phone: document.getElementById('pat_phone').value.trim(),
      email: document.getElementById('pat_email').value.trim(),
      address: document.getElementById('pat_address').value.trim(),
      patientLocation: document.getElementById('pat_location').value.trim(),
      password: document.getElementById('pat_password').value.trim()
    };

    try {
      const res = await fetchWithAuth('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to register patient.', 'error');
        return;
      }

      showToast(`Patient registered successfully (${data.patientId})!`, 'success');
      togglePatientModal(false);
      form.reset();
      fetchAdminPatients();
      fetchAdminSystemOverview();

    } catch (err) {
      console.error('Error creating patient by admin:', err);
      showToast('Server communication error.', 'error');
    }
  });
}

// ----------------------------------------------------
// SECURITY AUDIT LOGS
// ----------------------------------------------------
async function fetchAdminAuditLogs() {
  const tbody = document.getElementById('admin-audit-tbody');
  if (!tbody) return;

  try {
    const res = await fetchWithAuth('/api/admin/audit-logs');
    if (!res.ok) return;

    const logs = await res.json();
    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">No security audit logs recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    logs.slice(0, 50).forEach(l => {
      tbody.innerHTML += `
        <tr>
          <td><code style="font-size:0.8rem;">#LOG${l.logId || l._id}</code></td>
          <td><small style="color:var(--text-muted);">${new Date(l.timestamp).toLocaleString()}</small></td>
          <td><strong>${l.performedBy || 'Admin ADM001'}</strong></td>
          <td><span class="badge badge-orange">${l.action}</span></td>
          <td><code style="color:var(--primary); font-weight:700;">${l.targetId || 'SYSTEM'}</code></td>
          <td><small style="color:var(--text-muted);">${l.details || 'System operation executed'}</small></td>
        </tr>
      `;
    });

  } catch (err) {
    console.error('Error fetching admin audit logs:', err);
  }
}

function setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = (val !== undefined && val !== null) ? val : '-';
}

function escapeJs(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
