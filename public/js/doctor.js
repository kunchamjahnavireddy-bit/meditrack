// MediTrack - Doctor Clinical Dashboard, Emergency Access & Patient File Engine

document.addEventListener('DOMContentLoaded', async () => {
  const user = getCurrentUser();
  if (user.role !== 'doctor') {
    showAccessDeniedPage('Access Denied: Only verified doctors have access to the Doctor Dashboard.');
    return;
  }

  renderDoctorHeader(user);
  await loadDoctorAssignedAppointments();
  fetchDoctorProfile();
  initDoctorPatientSearchHandler();
  initEmergencySearchHandler();
  initDoctorPrescriptionFormHandler();
  initDoctorNotesFormHandler();
  initDoctorFollowupFormHandler();
  initDoctorProfileFormHandler();
});

function renderDoctorHeader(user) {
  const titleEl = document.getElementById('doctor-welcome-title');
  const subEl = document.getElementById('doctor-welcome-sub');

  if (titleEl) titleEl.textContent = `Welcome, ${user.fullName || 'Doctor'}`;
  if (subEl) subEl.textContent = `Doctor ID: ${user.doctorId || 'DOC001'} | Hospital Verified Account`;
}

async function fetchDoctorProfile() {
  try {
    const res = await fetchWithAuth('/api/doctors/me');
    if (!res.ok) return;

    const doc = await res.json();
    setVal('doc_prof_id', doc.doctorId || 'DOC001');
    setVal('doc_prof_license', doc.medicalLicenseNumber || 'N/A');
    setVal('doc_prof_name', doc.name || '');
    setVal('doc_prof_specialty', doc.specialty || '');
    setVal('doc_prof_department', doc.department || 'General Medicine');
    setVal('doc_prof_phone', doc.phone || '');
    setVal('doc_prof_email', doc.email || '');
    setVal('doc_prof_location', doc.location || 'Kurnool');
  } catch (err) {
    console.error('Error loading doctor profile:', err);
  }
}

function toggleDoctorProfileModal(show) {
  const modal = document.getElementById('doctor-profile-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
  if (show) fetchDoctorProfile();
}

function initDoctorProfileFormHandler() {
  const form = document.getElementById('doctor-profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById('doc_prof_name').value.trim(),
      specialty: document.getElementById('doc_prof_specialty').value.trim(),
      department: document.getElementById('doc_prof_department').value.trim(),
      phone: document.getElementById('doc_prof_phone').value.trim(),
      email: document.getElementById('doc_prof_email').value.trim(),
      location: document.getElementById('doc_prof_location').value.trim()
    };

    try {
      const res = await fetchWithAuth('/api/doctors/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update doctor profile.', 'error');
        return;
      }

      showToast('Doctor Profile updated successfully!', 'success');
      toggleDoctorProfileModal(false);

      const user = getCurrentUser();
      user.fullName = payload.name;
      localStorage.setItem('meditrack_user', JSON.stringify(user));
      renderDoctorHeader(user);

    } catch (err) {
      console.error('Error updating doctor profile:', err);
      showToast('Server communication error.', 'error');
    }
  });
}

// ----------------------------------------------------
// PATIENT LOOKUP CONNECTED TO MONGODB PATIENT COLLECTION
// ----------------------------------------------------
function initDoctorPatientSearchHandler() {
  const form = document.getElementById('doctor-patient-search-form');
  const resultsDiv = document.getElementById('doctor-search-live-results');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('doctor_search_pat_id').value.trim();
    if (!query) return;

    if (resultsDiv) resultsDiv.innerHTML = `<p style="color:var(--primary); font-weight:600;">Searching MongoDB Patient Collection for '${query}'...</p>`;

    try {
      const res = await fetchWithAuth(`/api/patients?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        if (resultsDiv) resultsDiv.innerHTML = `<div class="alert alert-error">Failed to search MongoDB patient database.</div>`;
        return;
      }

      const patients = await res.json();
      if (!patients || patients.length === 0) {
        if (resultsDiv) {
          resultsDiv.innerHTML = `
            <div class="alert alert-info" style="margin-top:0.75rem;">
              No registered patient found matching '${query}' in MongoDB. If this is an emergency for an unlinked patient, use <strong>Emergency Patient Search</strong> below.
            </div>
          `;
        }
        return;
      }

      let html = `<div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.75rem;">`;
      patients.forEach(p => {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:1rem 1.25rem; flex-wrap:wrap; gap:0.75rem;">
            <div>
              <strong style="font-size:1.1rem; color:var(--text-main);">${p.fullName}</strong>
              <span class="badge badge-blue" style="margin-left:0.5rem;">${p.patientId}</span>
              <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">
                ${p.age} yrs • ${p.gender} • 📞 ${p.phone} • 📍 ${p.patientLocation || 'Kurnool'}
              </div>
            </div>
            <div style="display:flex; gap:0.5rem;">
              <button onclick="inspectPatientRecord('${p.patientId}')" class="btn btn-primary" style="min-height:38px; padding:0.4rem 1rem; font-size:0.88rem;">
                View Patient File ➔
              </button>
              <button onclick="executeEmergencySearchDirect('${p.patientId}')" class="btn btn-secondary" style="min-height:38px; padding:0.4rem 0.85rem; font-size:0.88rem; background:#ef4444; color:#fff; border:none;">
                🚨 Emergency Access
              </button>
            </div>
          </div>
        `;
      });
      html += `</div>`;

      if (resultsDiv) resultsDiv.innerHTML = html;

    } catch (err) {
      console.error('Error executing doctor patient search:', err);
      if (resultsDiv) resultsDiv.innerHTML = `<div class="alert alert-error">Server communication error during search.</div>`;
    }
  });
}

function executeEmergencySearchDirect(patientId) {
  const emergencyInput = document.getElementById('emergency_pat_id');
  if (emergencyInput) emergencyInput.value = patientId;
  scrollSection('emergency-search-card');
  const emergencyForm = document.getElementById('emergency-search-form');
  if (emergencyForm) emergencyForm.dispatchEvent(new Event('submit'));
}

async function loadDoctorAssignedAppointments() {
  const agendaTbody = document.getElementById('doctor-agenda-tbody');
  const agendaBadge = document.getElementById('doctor-agenda-count');

  try {
    const res = await fetchWithAuth('/api/doctors/me/appointments');
    if (!res.ok) {
      if (agendaTbody) agendaTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2.5rem; color:var(--text-muted);">Failed to load doctor appointments.</td></tr>`;
      return;
    }

    const appointments = await res.json();

    if (agendaBadge) agendaBadge.textContent = `${appointments.length} Appointments`;

    if (!appointments || appointments.length === 0) {
      if (agendaTbody) {
        agendaTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No appointments assigned to you yet. Patients book appointments via their dashboard.</td></tr>`;
      }
      renderEmptyPatientInspector();
      return;
    }

    if (agendaTbody) {
      agendaTbody.innerHTML = '';
      appointments.forEach(a => {
        const pid = a.patientId || '';
        const st = a.status || 'Pending';
        const isPending = st === 'Pending';
        const isCompleted = st === 'Completed';
        const statusBadgeClass = st === 'Completed' ? 'badge-green' : (st === 'Confirmed' ? 'badge-blue' : (st === 'Cancelled' ? 'badge-red' : 'badge-orange'));

        agendaTbody.innerHTML += `
          <tr>
            <td>
              <strong style="font-size:0.95rem; display:block;">${a.appointmentDate}</strong>
              <span class="badge badge-orange">${a.appointmentTime}</span>
            </td>
            <td>
              <strong>${a.patientName || a.patientId}</strong>
              <span style="font-size:0.85rem; color:var(--primary); font-weight:700; display:block;">(${pid})</span>
            </td>
            <td><span class="badge ${statusBadgeClass}">${st}</span></td>
            <td>
              <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
                <button onclick="inspectPatientRecord('${pid}')" class="btn btn-primary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem;">
                  View Patient ➔
                </button>
                ${isPending ? `
                  <button onclick="handleAppointmentAction(${a.appointmentId}, 'confirm')" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem; background:#22c55e; color:#fff; border:none;">
                    Confirm ✓
                  </button>
                ` : ''}
                ${!isCompleted && st !== 'Cancelled' ? `
                  <button onclick="markAppointmentCompleted(${a.appointmentId})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem; background:#0ea5e9; color:#fff; border:none;">
                    Complete ✓
                  </button>
                ` : ''}
                <button onclick="openNotesModal('${pid}', ${a.appointmentId}, '${escapeJs(a.patientName || pid)}')" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem;">
                  📝 Notes
                </button>
                <button onclick="openPrescriptionModal('${pid}', '${escapeJs(a.patientName || pid)}')" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem;">
                  + Prescription
                </button>
                <button onclick="openFollowupModal('${pid}', '${escapeJs(a.patientName || pid)}')" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem;">
                  🗓️ Follow-up
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    }

    if (appointments.length > 0 && appointments[0].patientId) {
      inspectPatientRecord(appointments[0].patientId);
    }

  } catch (err) {
    console.error('Error loading doctor appointments:', err);
  }
}

async function markAppointmentCompleted(appointmentId) {
  try {
    const res = await fetchWithAuth(`/api/doctors/appointments/${appointmentId}/complete`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to complete appointment.', 'error');
      return;
    }
    showToast('Appointment marked as Completed!', 'success');
    loadDoctorAssignedAppointments();
  } catch (err) {
    console.error('Error completing appointment:', err);
  }
}

async function handleAppointmentAction(appointmentId, action) {
  try {
    const res = await fetchWithAuth(`/api/appointments/${appointmentId}/${action}`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || `Failed to ${action} appointment.`, 'error');
      return;
    }
    showToast(`Appointment ${action === 'confirm' ? 'Confirmed' : 'Cancelled'}!`, 'success');
    loadDoctorAssignedAppointments();
  } catch (err) {
    console.error(`Error during appointment ${action}:`, err);
  }
}

async function inspectPatientRecord(patientId) {
  const inspector = document.getElementById('doctor-patient-inspector');
  if (!inspector) return;

  inspector.innerHTML = `
    <div style="text-align:center; padding:3.5rem 1.5rem; color:var(--primary);">
      <div style="font-size:3rem; margin-bottom:0.75rem;">⏳</div>
      <p style="font-size:1.15rem; font-weight:700;">Loading clinical record for ${patientId}...</p>
    </div>
  `;

  try {
    const res = await fetchWithAuth(`/api/doctors/patients/${patientId}`);

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      inspector.innerHTML = `
        <div class="alert alert-error" style="margin:1.5rem;">
          <strong style="font-size:1.1rem; display:block; margin-bottom:0.35rem;">🚫 Access Restricted</strong>
          ${data.error || 'You do not have a booked appointment with this patient. Use Emergency Search for immediate emergency access.'}
          <div style="margin-top:0.75rem;">
            <button onclick="executeEmergencySearchDirect('${patientId}')" class="btn btn-secondary" style="background:#dc2626; color:#fff; border:none; min-height:36px; padding:0.3rem 0.85rem; font-size:0.85rem;">
              🚨 Execute Emergency Access Search for ${patientId}
            </button>
          </div>
        </div>
      `;
      return;
    }

    if (!res.ok) {
      inspector.innerHTML = `<div class="alert alert-error" style="margin:1.5rem;">⚠️ Patient record not found for ID: ${patientId}</div>`;
      return;
    }

    const data = await res.json();
    renderUnifiedClinicalFile(data, inspector);

  } catch (err) {
    console.error('Error inspecting patient record:', err);
    inspector.innerHTML = `<div class="alert alert-error" style="margin:1.5rem;">Failed to load patient information.</div>`;
  }
}

function initEmergencySearchHandler() {
  const form = document.getElementById('emergency-search-form');
  const resultsDiv = document.getElementById('emergency-search-results');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = document.getElementById('emergency_pat_id').value.trim().toUpperCase();
    if (!pid) return;

    resultsDiv.innerHTML = `<p style="color:#b91c1c; font-weight:700; padding:1rem 0;">🚨 Executing Emergency Patient Search & Audit Logging for ${pid}...</p>`;

    try {
      const res = await fetchWithAuth(`/api/doctors/emergency/patients/${pid}`);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMessage = errData.error || 'Emergency search failed.';
        if (res.status === 404) {
          errMessage = `Patient Not Found: No patient was found with Patient ID ${pid} in MongoDB database.`;
        } else if (res.status === 403) {
          errMessage = `403 Forbidden: Only authorized doctors can use Emergency Patient Search.`;
        }
        resultsDiv.innerHTML = `<div class="alert alert-error" style="margin-top:1rem;">⚠️ ${errMessage}</div>`;
        return;
      }

      const data = await res.json();
      const auditLog = data.auditLog || {};
      const auditLogId = data.auditLogId || auditLog.logId || `EMG-${Date.now()}`;
      const logTime = auditLog.accessedAt ? new Date(auditLog.accessedAt).toLocaleString() : new Date().toLocaleString();
      const reason = auditLog.reason || 'Emergency treatment required';

      const infoHtml = renderEmergencyPatientInformationHtml(data);

      resultsDiv.innerHTML = `
        <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:12px; padding:1.25rem; margin-top:1rem; margin-bottom:1rem;">
          <h4 style="color:#991b1b; font-size:1.1rem; font-weight:800; margin:0 0 0.35rem 0;">🚨 Emergency Access Audit Recorded</h4>
          <p style="font-size:0.95rem; color:#7f1d1d; margin:0;">
            Audit Log ID: <strong>${auditLogId}</strong> | Timestamp: <strong>${logTime}</strong> | Reason: <strong>${reason}</strong>
          </p>
        </div>
        ${infoHtml}
      `;

      const inspector = document.getElementById('doctor-patient-inspector');
      if (inspector) renderUnifiedClinicalFile(data, inspector);

    } catch (err) {
      console.error('Error executing emergency search:', err);
      resultsDiv.innerHTML = `<div class="alert alert-error">Emergency lookup failed.</div>`;
    }
  });
}

function renderEmergencyPatientInformationHtml(data) {
  const pat = data.patient || {};
  const prof = data.profile || {};
  const reports = data.medicalReports || [];

  let reportsHtml = '';
  if (reports.length > 0) {
    reports.forEach(r => {
      const fileTarget = (r.fileUrl && r.fileUrl !== '#') ? r.fileUrl : '#';
      const fileName = r.fileName || (r.fileUrl ? r.fileUrl.split('/').pop() : 'Document');
      const uploadDateStr = r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

      reportsHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #fca5a5; border-radius:8px; padding:0.85rem 1rem; margin-bottom:0.65rem; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem;">
              <strong style="color:var(--text-main); font-size:0.95rem;">${r.title}</strong>
              <span class="badge badge-blue" style="font-size:0.75rem;">🏷️ ${r.reportType}</span>
            </div>
            <div style="font-size:0.82rem; color:var(--text-muted); display:flex; gap:1rem; flex-wrap:wrap;">
              <span>📄 <strong>File Name:</strong> ${fileName}</span>
              <span>📅 <strong>Uploaded:</strong> ${uploadDateStr}</span>
            </div>
          </div>
          <button onclick="if('${fileTarget}' !== '#') { window.open('${fileTarget}', '_blank'); } else { showToast('Report file link unavailable', 'warning'); }" class="btn btn-secondary" style="min-height:32px; padding:0.25rem 0.65rem; font-size:0.8rem;">
            📂 View Report
          </button>
        </div>
      `;
    });
  } else {
    reportsHtml = `<p style="color:var(--text-muted); font-size:0.9rem;">No medical reports uploaded.</p>`;
  }

  const valOrNotProvided = (val) => {
    if (val === undefined || val === null) return 'Not provided';
    const str = String(val).trim();
    return (str === '' || str === 'N/A' || str === 'null' || str === 'undefined') ? 'Not provided' : str;
  };

  return `
    <div style="background:#ffffff; border:2px solid #fca5a5; border-radius:14px; padding:1.75rem; margin-top:1rem; box-shadow:0 10px 25px -5px rgba(225,29,72,0.15);">
      <h3 style="font-size:1.4rem; font-weight:800; color:#991b1b; border-bottom:2px solid #fca5a5; padding-bottom:0.75rem; margin-bottom:1.25rem;">
        📋 Patient Emergency Medical File
      </h3>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.1rem; margin-bottom:1.5rem;">
        <div class="field-pair">
          <span class="field-label">Patient ID</span>
          <span class="field-value"><strong style="color:var(--primary); font-size:1.1rem;">${valOrNotProvided(pat.patientId)}</strong></span>
        </div>
        <div class="field-pair">
          <span class="field-label">Patient Name</span>
          <span class="field-value"><strong>${valOrNotProvided(pat.name || pat.fullName)}</strong></span>
        </div>
        <div class="field-pair">
          <span class="field-label">Age / Gender</span>
          <span class="field-value">${valOrNotProvided(pat.age)} yrs / ${valOrNotProvided(pat.gender)}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Blood Group</span>
          <span class="field-value"><span class="badge badge-red" style="font-size:0.95rem; font-weight:800;">${valOrNotProvided(prof.bloodGroup)}</span></span>
        </div>
        <div class="field-pair">
          <span class="field-label">Known Allergies</span>
          <span class="field-value" style="color:#b91c1c; font-weight:800;">${valOrNotProvided(prof.allergies)}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Existing Diseases</span>
          <span class="field-value" style="font-weight:700;">${valOrNotProvided(prof.existingDiseases)}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Current Medications</span>
          <span class="field-value" style="color:var(--primary); font-weight:800;">${valOrNotProvided(prof.currentMedications)}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Previous Medical History</span>
          <span class="field-value">${valOrNotProvided(prof.medicalHistory)}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Previous Surgeries</span>
          <span class="field-value">${valOrNotProvided(prof.surgeries)}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Accident History</span>
          <span class="field-value">${valOrNotProvided(prof.accidentHistory)}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Emergency Contact</span>
          <span class="field-value" style="font-weight:800; color:#15803d;">${valOrNotProvided(prof.emergencyContact)}</span>
        </div>
      </div>

      <div style="border-top:1px solid #fca5a5; padding-top:1rem;">
        <h4 style="font-size:1.1rem; font-weight:800; color:#991b1b; margin-bottom:0.75rem;">Medical Reports:</h4>
        ${reportsHtml}
      </div>
    </div>
  `;
}

function renderUnifiedClinicalFile(data, container) {
  const pat = data.patient || {};
  const prof = data.profile || {};
  const notes = data.consultationNotes || [];
  const rxList = data.prescriptions || [];
  const reports = data.medicalReports || [];

  let notesHtml = '';
  if (notes.length > 0) {
    notes.forEach(n => {
      notesHtml += `
        <div style="background:#fff; border:1px solid var(--border-color); border-radius:10px; padding:1rem; margin-bottom:0.75rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
            <strong style="color:var(--primary); font-size:1.05rem;">Diagnosis: ${n.diagnosis}</strong>
            <span style="font-size:0.85rem; color:var(--text-muted);">${new Date(n.createdAt).toLocaleDateString()}</span>
          </div>
          <p style="font-size:0.95rem; color:var(--text-main); margin:0;">${n.treatmentNotes}</p>
        </div>
      `;
    });
  } else {
    notesHtml = `<p style="color:var(--text-muted);">No consultation notes recorded yet.</p>`;
  }

  let rxHtml = '';
  if (rxList.length > 0) {
    rxList.forEach(rx => {
      let medsListHtml = '';
      (rx.medicines || []).forEach(m => {
        medsListHtml += `
          <tr style="background:#fff;">
            <td><strong>${m.medicineName}</strong></td>
            <td><span class="badge badge-blue">${m.dosage}</span></td>
            <td>${m.frequency}</td>
            <td>${m.duration}</td>
            <td><em style="color:var(--text-muted);">${m.instructions || 'N/A'}</em></td>
          </tr>
        `;
      });
      rxHtml += `
        <div style="background:#fff; border:1px solid var(--border-color); border-radius:10px; padding:1rem; margin-bottom:0.75rem;">
          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">
            <strong>${rx.prescriptionId}</strong> • Issued on ${rx.prescriptionDate} by ${rx.doctorName}
          </div>
          <div class="table-responsive">
            <table class="data-table" style="font-size:0.85rem;">
              <thead>
                <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
              </thead>
              <tbody>${medsListHtml}</tbody>
            </table>
          </div>
        </div>
      `;
    });
  } else {
    rxHtml = `<p style="color:var(--text-muted);">No issued prescriptions on record.</p>`;
  }

  let reportsHtml = '';
  if (reports.length > 0) {
    reports.forEach(r => {
      const fileTarget = (r.fileUrl && r.fileUrl !== '#') ? r.fileUrl : '#';
      const fileName = r.fileName || (r.fileUrl ? r.fileUrl.split('/').pop() : 'Document');
      const uploadDateStr = r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

      reportsHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--border-color); border-radius:10px; padding:0.95rem 1.25rem; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.75rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
              <strong style="color:var(--text-main); font-size:1.05rem;">${r.title}</strong>
              <span class="badge badge-blue" style="font-size:0.8rem;">🏷️ ${r.reportType}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted); display:flex; gap:1.1rem; flex-wrap:wrap; margin-top:0.25rem;">
              <span>📄 <strong>File Name:</strong> ${fileName}</span>
              <span>📅 <strong>Uploaded:</strong> ${uploadDateStr}</span>
            </div>
          </div>
          <button onclick="if('${fileTarget}' !== '#') { window.open('${fileTarget}', '_blank'); } else { showToast('Report file link unavailable', 'warning'); }" class="btn btn-secondary" style="min-height:36px; padding:0.3rem 0.75rem; font-size:0.85rem;">
            📂 View Report
          </button>
        </div>
      `;
    });
  } else {
    reportsHtml = `<p style="color:var(--text-muted);">No uploaded medical reports found.</p>`;
  }

  container.innerHTML = `
    ${data.accessType === 'EMERGENCY' ? `
      <div style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:0.85rem 1.25rem; border-radius:10px; margin-bottom:1.25rem; font-weight:700; font-size:0.95rem;">
        🚨 EMERGENCY ACCESS MODE (Audit Log: ${data.auditLog ? data.auditLog.logId : 'Active'})
      </div>
    ` : ''}

    <!-- Demographics Header -->
    <div style="background-color:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.5rem; margin-bottom:1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
        <div>
          <h4 style="font-size:1.4rem; font-weight:800; color:var(--text-main); margin:0;">${pat.fullName || pat.name}</h4>
          <span style="font-size:0.95rem; color:var(--text-muted); font-weight:600;">
            Patient ID: <strong style="color:var(--primary); font-size:1.05rem;">${pat.patientId}</strong> • ${pat.age} yrs • ${pat.gender} • DOB: ${pat.dateOfBirth}
          </span>
        </div>
        <span class="badge badge-green" style="font-size:0.9rem; padding:0.4rem 1rem;">📍 ${pat.patientLocation}</span>
      </div>

      <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap:1rem;">
        <div class="field-pair">
          <span class="field-label">Phone Number</span>
          <span class="field-value">${pat.phone}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Email Address</span>
          <span class="field-value">${pat.email}</span>
        </div>
        <div class="field-pair full-width">
          <span class="field-label">Residential Address</span>
          <span class="field-value">${pat.address}</span>
        </div>
      </div>
    </div>

    <!-- Clinical Details Grid -->
    <div style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.5rem; margin-bottom:1.5rem;">
      <h4 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
        📋 Clinical Medical Profile
      </h4>

      <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap:1.1rem;">
        <div class="field-pair">
          <span class="field-label">Blood Group</span>
          <span class="field-value"><span class="badge badge-red" style="font-size:0.9rem; font-weight:800;">${prof.bloodGroup || 'Not Specified'}</span></span>
        </div>
        <div class="field-pair">
          <span class="field-label">Insurance Policy</span>
          <span class="field-value">${prof.insuranceDetails || 'None'}</span>
        </div>
        <div class="field-pair full-width">
          <span class="field-label">Known Allergies</span>
          <span class="field-value" style="color:#b91c1c; font-weight:700;">${prof.allergies || 'None'}</span>
        </div>
        <div class="field-pair full-width">
          <span class="field-label">Existing Chronic Diseases</span>
          <span class="field-value" style="font-weight:700;">${prof.existingDiseases || 'None'}</span>
        </div>
        <div class="field-pair full-width">
          <span class="field-label">Previous Medical History</span>
          <span class="field-value">${prof.medicalHistory || 'None'}</span>
        </div>
        <div class="field-pair full-width">
          <span class="field-label">Current Daily Medications</span>
          <span class="field-value" style="color:var(--primary); font-weight:700;">${prof.currentMedications || 'None'}</span>
        </div>
        <div class="field-pair full-width">
          <span class="field-label">Surgeries / Accident History</span>
          <span class="field-value">${prof.surgeries || prof.accidentHistory || 'None'}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Emergency Contact Name</span>
          <span class="field-value">${prof.emergencyName || 'N/A'}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Emergency Contact Phone</span>
          <span class="field-value" style="font-weight:700; color:#15803d;">${prof.emergencyPhone || 'N/A'}</span>
        </div>
      </div>
    </div>

    <!-- Consultation Notes -->
    <div style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.5rem; margin-bottom:1.5rem;">
      <h4 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
        📝 Doctor Consultation Notes & Diagnoses
      </h4>
      ${notesHtml}
    </div>

    <!-- Prescriptions -->
    <div style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.5rem; margin-bottom:1.5rem;">
      <h4 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
        💊 Prescriptions History
      </h4>
      ${rxHtml}
    </div>

    <!-- Uploaded Reports -->
    <div style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.5rem;">
      <h4 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
        📁 Uploaded Patient Reports
      </h4>
      ${reportsHtml}
    </div>
  `;
}

function renderEmptyPatientInspector() {
  const inspector = document.getElementById('doctor-patient-inspector');
  if (inspector) {
    inspector.innerHTML = `
      <div style="text-align:center; padding:4rem 1.5rem; color:var(--text-muted);">
        <div style="font-size:3.5rem; margin-bottom:0.75rem;">🩺</div>
        <p style="font-size:1.1rem; font-weight:600;">Select an appointed patient on the left or search a Patient ID above to examine clinical records.</p>
      </div>
    `;
  }
}

// Modal Toggle Handlers
function openNotesModal(patientId, appointmentId, patientName) {
  setVal('notes_patient_id', patientId);
  setVal('notes_appt_id', appointmentId || '');
  setTxt('notes-modal-patname', patientName || patientId);
  setVal('notes_diagnosis', '');
  setVal('notes_treatment', '');
  toggleNotesModal(true);
}

function toggleNotesModal(show) {
  const modal = document.getElementById('doctor-notes-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

function openFollowupModal(patientId, patientName) {
  setVal('followup_patient_id', patientId);
  setTxt('followup-modal-patname', patientName || patientId);
  const todayStr = new Date().toISOString().split('T')[0];
  setVal('followup_date', todayStr);
  toggleFollowupModal(true);
}

function toggleFollowupModal(show) {
  const modal = document.getElementById('doctor-followup-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

function openPrescriptionModal(patientId, patientName) {
  setVal('rx_patient_id', patientId);
  setTxt('prescription-modal-patname', patientName || patientId);
  setVal('rx_medicine_name', '');
  setVal('rx_dosage', '');
  setVal('rx_frequency', '');
  setVal('rx_duration', '');
  setVal('rx_instructions', '');
  togglePrescriptionModal(true);
}

function togglePrescriptionModal(show) {
  const modal = document.getElementById('doctor-prescription-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

// Form Handlers
function initDoctorNotesFormHandler() {
  const form = document.getElementById('doctor-add-notes-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('notes_patient_id').value;
    const appointmentId = document.getElementById('notes_appt_id').value;
    const diagnosis = document.getElementById('notes_diagnosis').value.trim();
    const treatmentNotes = document.getElementById('notes_treatment').value.trim();

    try {
      const res = await fetchWithAuth('/api/doctors/consultation-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, appointmentId, diagnosis, treatmentNotes })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to record consultation notes.', 'error');
        return;
      }

      showToast('Diagnosis and treatment notes recorded successfully!', 'success');
      toggleNotesModal(false);
      inspectPatientRecord(patientId);
    } catch (err) {
      console.error('Error recording notes:', err);
    }
  });
}

function initDoctorFollowupFormHandler() {
  const form = document.getElementById('doctor-schedule-followup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('followup_patient_id').value;
    const appointmentDate = document.getElementById('followup_date').value;
    const appointmentTime = document.getElementById('followup_time').value;
    const reason = document.getElementById('followup_reason').value.trim();

    try {
      const res = await fetchWithAuth('/api/doctors/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, appointmentDate, appointmentTime, reason })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to schedule follow-up.', 'error');
        return;
      }

      showToast('Follow-up appointment scheduled successfully!', 'success');
      toggleFollowupModal(false);
      loadDoctorAssignedAppointments();
    } catch (err) {
      console.error('Error scheduling follow-up:', err);
    }
  });
}

function initDoctorPrescriptionFormHandler() {
  const form = document.getElementById('doctor-create-prescription-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('rx_patient_id').value;
    const medicineName = document.getElementById('rx_medicine_name').value.trim();
    const dosage = document.getElementById('rx_dosage').value.trim();
    const frequency = document.getElementById('rx_frequency').value.trim();
    const duration = document.getElementById('rx_duration').value.trim();
    const instructions = document.getElementById('rx_instructions').value.trim();

    const payload = {
      patientId,
      medicines: [
        { medicineName, dosage, frequency, duration, instructions }
      ]
    };

    try {
      const res = await fetchWithAuth('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to issue prescription.', 'error');
        return;
      }

      showToast('Prescription issued successfully!', 'success');
      togglePrescriptionModal(false);
      inspectPatientRecord(patientId);

    } catch (err) {
      console.error('Error issuing prescription:', err);
    }
  });
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

function setTxt(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.textContent = val;
}

function scrollSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function escapeJs(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
