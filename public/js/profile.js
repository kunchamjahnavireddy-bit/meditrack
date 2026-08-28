// MediTrack - Integrated Patient Dashboard & Notifications Module

const defaultTimeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
let currentDoctors = [];
let currentPatientLocation = 'Kurnool';

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user.role !== 'patient') {
    showAccessDeniedPage('Access Denied: Only patients have access to the Patient Dashboard.');
    return;
  }

  let patientId = user.patientId || 'PAT001';

  fetchPatientAndProfile(patientId);
  fetchPatientNotifications(patientId);
  fetchPatientMedicalReports();
  fetchMyAppointments();
  fetchMyPrescriptions(patientId);
  initDemographicsFormHandler(patientId);
  initProfileFormHandler(patientId);
  initBookAppointmentModule();
  initReportFormHandler();
});

async function fetchPatientAndProfile(patientId) {
  try {
    const resPat = await fetchWithAuth(`/api/patients/${patientId}`);
    if (!resPat.ok) return;

    const patient = await resPat.json();

    document.querySelectorAll('.patient-name-display').forEach(el => el.textContent = patient.fullName);
    document.querySelectorAll('.patient-id-display').forEach(el => el.textContent = patient.patientId);

    currentPatientLocation = patient.patientLocation || (patient.address ? patient.address.split(',')[0].trim() : 'Kurnool');

    const locEl = document.getElementById('patient-location-display');
    if (locEl) locEl.textContent = currentPatientLocation;

    const demoSub = document.getElementById('patient-demographics-sub');
    if (demoSub) {
      demoSub.textContent = `${patient.age} yrs • ${patient.gender} • DOB: ${patient.dateOfBirth}`;
    }

    // Populate Demographics Form
    setVal('edit_full_name', patient.fullName);
    setVal('edit_age', patient.age);
    setVal('edit_gender', patient.gender);
    setVal('edit_date_of_birth', patient.dateOfBirth);
    setVal('edit_phone', patient.phone);
    setVal('edit_patient_location', currentPatientLocation);
    setVal('edit_email', patient.email);
    setVal('edit_address', patient.address);

    // Medical Profile
    const resProf = await fetchWithAuth(`/api/profiles/${patientId}`);
    if (resProf.ok) {
      const profile = await resProf.json();
      populateProfileForm(profile);
    }
  } catch (err) {
    console.error('Error loading patient details:', err);
  }
}

async function fetchPatientNotifications(patientId) {
  const container = document.getElementById('patient-notifications-container');
  const badgeCount = document.getElementById('unread-notifications-count');
  if (!container) return;

  try {
    const res = await fetchWithAuth(`/api/notifications/patient/${patientId}`);
    if (!res.ok) {
      container.innerHTML = `<p style="color:var(--text-muted);">No notifications yet.</p>`;
      return;
    }

    const notifications = await res.json();
    const unread = notifications.filter(n => n.status === 'unread');

    if (badgeCount) {
      badgeCount.textContent = `${unread.length} Unread`;
      badgeCount.className = unread.length > 0 ? 'badge badge-orange' : 'badge badge-blue';
    }

    if (!notifications || notifications.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); padding:1rem 0;">You have no new notifications.</p>`;
      return;
    }

    let html = '';
    notifications.forEach(n => {
      const isUnread = n.status === 'unread';
      const isConfirmed = n.title.includes('Confirmed');

      html += `
        <div style="background:${isUnread ? '#fffdf5' : '#f8fafc'}; border:1px solid ${isUnread ? '#fde68a' : 'var(--border-color)'}; border-left:5px solid ${isConfirmed ? '#22c55e' : '#ef4444'}; border-radius:12px; padding:1.25rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.35rem;">
              <span class="badge ${isConfirmed ? 'badge-green' : 'badge-red'}">${n.title}</span>
              <span style="font-size:0.85rem; color:var(--text-muted);">${new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <p style="font-size:1rem; font-weight:700; color:var(--text-main); margin:0;">${n.message}</p>
          </div>
          ${isUnread ? `
            <button onclick="markNotificationAsRead('${n.notificationId}', '${patientId}')" class="btn btn-secondary" style="min-height:36px; padding:0.35rem 0.85rem; font-size:0.85rem;">
              Mark as Read ✓
            </button>
          ` : `<span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Read ✓</span>`}
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}

async function markNotificationAsRead(notificationId, patientId) {
  try {
    const res = await fetchWithAuth(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
    if (res.ok) {
      fetchPatientNotifications(patientId);
    }
  } catch (err) {
    console.error('Error marking notification read:', err);
  }
}

async function fetchPatientMedicalReports() {
  const container = document.getElementById('patient-reports-container');
  if (!container) return;

  try {
    const res = await fetchWithAuth('/api/patients/me/reports');
    if (!res.ok) {
      container.innerHTML = `<p style="color:var(--text-muted);">No uploaded medical reports.</p>`;
      return;
    }

    const reports = await res.json();
    if (!reports || reports.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); padding:1rem 0;">No uploaded medical reports found. Click <strong>"+ Upload Report"</strong> to add one.</p>`;
      return;
    }

    let html = '';
    reports.forEach(r => {
      const fileTarget = (r.fileUrl && r.fileUrl !== '#') ? r.fileUrl : '#';
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:1rem 1.25rem; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.75rem;">
          <div>
            <strong style="font-size:1.05rem; color:var(--text-main); display:block;">${r.title}</strong>
            <span class="badge badge-blue" style="font-size:0.8rem; margin-top:0.25rem;">${r.reportType}</span>
            <span style="font-size:0.85rem; color:var(--text-muted); margin-left:0.75rem;">Uploaded: ${new Date(r.uploadedAt).toLocaleDateString()}</span>
          </div>
          <button onclick="if('${fileTarget}' !== '#') { window.open('${fileTarget}', '_blank'); } else { showToast('Report file link unavailable', 'warning'); }" class="btn btn-secondary" style="min-height:36px; padding:0.35rem 0.85rem; font-size:0.85rem;">
            📂 View File
          </button>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (err) {
    console.error('Error fetching medical reports:', err);
  }
}

function toggleReportModal(show) {
  const modal = document.getElementById('report-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

function initReportFormHandler() {
  const form = document.getElementById('upload-report-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('report_title').value.trim();
    const reportType = document.getElementById('report_type').value;
    const fileInput = document.getElementById('report_file_input');

    if (!title) {
      showToast('Please enter a Report Title.', 'error');
      return;
    }

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('Please select a PDF, JPG, or PNG medical report file to upload.', 'error');
      return;
    }

    const file = fileInput.files[0];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      showToast('Invalid file format. Only PDF, JPG, JPEG, and PNG medical files are allowed.', 'error');
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      showToast('File size exceeds the maximum limit of 10MB.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('reportType', reportType);
    formData.append('report_file', file);

    try {
      showToast('Uploading medical report file...', 'info');

      const user = getCurrentUser();
      const headers = {};
      if (user && user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      headers['x-user-role'] = (user && user.role) || 'patient';
      headers['x-patient-id'] = (user && user.patientId) || '';

      const res = await fetch('/api/patients/me/reports', {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to upload medical report.', 'error');
        return;
      }

      showToast('Medical report uploaded successfully!', 'success');
      toggleReportModal(false);
      form.reset();
      fetchPatientMedicalReports();
    } catch (err) {
      console.error('Error uploading medical report:', err);
      showToast('Server communication error during file upload.', 'error');
    }
  });
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

function initDemographicsFormHandler(patientId) {
  const form = document.getElementById('personal-demographics-form');
  const alertDiv = document.getElementById('demographics-form-alert');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (alertDiv) {
      alertDiv.style.display = 'none';
      alertDiv.className = '';
      alertDiv.innerHTML = '';
    }

    const payload = {
      fullName: document.getElementById('edit_full_name').value.trim(),
      age: document.getElementById('edit_age').value,
      gender: document.getElementById('edit_gender').value,
      dateOfBirth: document.getElementById('edit_date_of_birth').value,
      phone: document.getElementById('edit_phone').value.trim(),
      patientLocation: document.getElementById('edit_patient_location').value.trim(),
      email: document.getElementById('edit_email').value.trim(),
      address: document.getElementById('edit_address').value.trim()
    };

    try {
      const res = await fetchWithAuth(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || 'Failed to update personal information.';
        if (alertDiv) {
          alertDiv.className = 'alert alert-error';
          alertDiv.innerHTML = `⚠️ ${errorMsg}`;
          alertDiv.style.display = 'block';
        }
        showToast(errorMsg, 'error');
        return;
      }

      const successMsg = 'Profile details updated successfully.';
      if (alertDiv) {
        alertDiv.className = 'alert alert-success';
        alertDiv.innerHTML = `✓ <strong>${successMsg}</strong>`;
        alertDiv.style.display = 'block';
      }
      showToast(successMsg, 'success');
      fetchPatientAndProfile(patientId);

    } catch (err) {
      console.error('Error updating demographics:', err);
      if (alertDiv) {
        alertDiv.className = 'alert alert-error';
        alertDiv.innerHTML = '⚠️ Server communication error.';
        alertDiv.style.display = 'block';
      }
      showToast('Server communication error.', 'error');
    }
  });
}

async function fetchMyAppointments() {
  const tbody = document.getElementById('my-appointments-tbody');
  if (!tbody) return;

  try {
    const res = await fetchWithAuth('/api/patients/me/appointments');
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">Unable to load appointments.</td></tr>`;
      return;
    }

    const appts = await res.json();

    if (!appts || appts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No appointments booked yet. Click <strong>"Book Appointment"</strong> to schedule one.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    appts.forEach(a => {
      const st = a.status || 'Pending';
      const isCancelled = st === 'Cancelled';
      const isCompleted = st === 'Completed';
      const badgeClass = st === 'Completed' ? 'badge-green' : (st === 'Confirmed' ? 'badge-blue' : (st === 'Cancelled' ? 'badge-red' : 'badge-orange'));

      tbody.innerHTML += `
        <tr>
          <td><strong>#APT${a.appointmentId}</strong></td>
          <td><strong>${a.doctorName}</strong></td>
          <td><span class="badge badge-blue">${a.doctorSpecialization || 'General Physician'}</span></td>
          <td>📍 <strong>${a.doctorLocation || 'Kurnool'}</strong></td>
          <td><strong>${a.appointmentDate}</strong></td>
          <td><span class="badge badge-orange">${a.appointmentTime}</span></td>
          <td><span class="badge ${badgeClass}">${st}</span></td>
          <td>
            ${(!isCancelled && !isCompleted) ? `
              <div style="display:flex; gap:0.35rem;">
                <button onclick="cancelMyAppointment(${a.appointmentId})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem; background:#ef4444; color:#fff; border:none;">
                  Cancel ✕
                </button>
              </div>
            ` : `<span style="font-size:0.85rem; color:var(--text-muted);">${st}</span>`}
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading my appointments:', err);
  }
}

async function cancelMyAppointment(appointmentId) {
  if (!confirm(`Are you sure you want to cancel appointment #APT${appointmentId}?`)) return;

  try {
    const res = await fetchWithAuth(`/api/appointments/${appointmentId}/cancel`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to cancel appointment.', 'error');
      return;
    }

    showToast('Appointment Cancelled!', 'success');
    fetchMyAppointments();
  } catch (err) {
    console.error('Error cancelling appointment:', err);
  }
}

async function fetchMyPrescriptions(patientId) {
  const container = document.getElementById('my-prescriptions-container');
  if (!container) return;

  try {
    const res = await fetchWithAuth(`/api/prescriptions/patient/${patientId}`);
    if (!res.ok) return;

    const prescriptions = await res.json();

    if (!prescriptions || prescriptions.length === 0) {
      container.innerHTML = `<div class="alert alert-info">No issued prescriptions on record.</div>`;
      return;
    }

    container.innerHTML = '';
    prescriptions.forEach(p => {
      let medsHtml = '';
      if (p.medicines && p.medicines.length > 0) {
        p.medicines.forEach(m => {
          medsHtml += `
            <tr style="background:#fff;">
              <td><strong style="color:var(--primary); font-size:1.05rem;">${m.medicineName}</strong></td>
              <td><span class="badge badge-blue">${m.dosage}</span></td>
              <td><strong>${m.frequency}</strong></td>
              <td>${m.duration}</td>
              <td><em style="color:var(--text-muted);">${m.instructions || 'N/A'}</em></td>
            </tr>
          `;
        });
      }

      container.innerHTML += `
        <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:14px; padding:1.5rem; margin-bottom:1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:0.85rem; margin-bottom:1rem;">
            <div>
              <strong style="font-size:1.15rem; color:var(--text-main);">${p.prescriptionId}</strong>
              <span style="font-size:0.95rem; color:var(--text-muted); margin-left:0.75rem;">Prescribed by: <strong>${p.doctorName}</strong> on ${p.prescriptionDate}</span>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Instructions</th>
                </tr>
              </thead>
              <tbody>${medsHtml}</tbody>
            </table>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error loading my prescriptions:', err);
  }
}

function populateProfileForm(profile) {
  if (!profile) return;
  setVal('blood_group', profile.bloodGroup);
  setVal('insurance_details', profile.insuranceDetails);
  setVal('allergies', profile.allergies);
  setVal('existing_diseases', profile.existingDiseases);
  setVal('medical_history', profile.medicalHistory);
  setVal('current_medications', profile.currentMedications);
  setVal('emergency_name', profile.emergencyName);
  setVal('emergency_phone', profile.emergencyPhone);
}

function initProfileFormHandler(patientId) {
  const form = document.getElementById('medical-profile-form');
  const alertDiv = document.getElementById('medical-profile-form-alert');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (alertDiv) {
      alertDiv.style.display = 'none';
      alertDiv.className = '';
      alertDiv.innerHTML = '';
    }

    const payload = {
      bloodGroup: document.getElementById('blood_group').value,
      insuranceDetails: document.getElementById('insurance_details').value.trim(),
      allergies: document.getElementById('allergies').value.trim(),
      existingDiseases: document.getElementById('existing_diseases').value.trim(),
      medicalHistory: document.getElementById('medical_history').value.trim(),
      currentMedications: document.getElementById('current_medications').value.trim(),
      emergencyName: document.getElementById('emergency_name').value.trim(),
      emergencyPhone: document.getElementById('emergency_phone').value.trim()
    };

    try {
      const res = await fetchWithAuth(`/api/profiles/${patientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || 'Failed to update profile.';
        if (alertDiv) {
          alertDiv.className = 'alert alert-error';
          alertDiv.innerHTML = `⚠️ ${errorMsg}`;
          alertDiv.style.display = 'block';
        }
        showToast(errorMsg, 'error');
        return;
      }

      const successMsg = 'Profile details saved successfully.';
      if (alertDiv) {
        alertDiv.className = 'alert alert-success';
        alertDiv.innerHTML = `✓ <strong>${successMsg}</strong>`;
        alertDiv.style.display = 'block';
      }
      showToast(successMsg, 'success');

    } catch (err) {
      console.error('Error saving profile:', err);
      if (alertDiv) {
        alertDiv.className = 'alert alert-error';
        alertDiv.innerHTML = '⚠️ Server communication error.';
        alertDiv.style.display = 'block';
      }
      showToast('Server communication error.', 'error');
    }
  });
}

function toggleAppointmentModal(show) {
  const modal = document.getElementById('appointment-modal');
  if (modal) {
    modal.style.display = show ? 'flex' : 'none';
    if (show) loadSuitableDoctorsList();
  }
}

async function loadSuitableDoctorsList() {
  const grid = document.getElementById('suitable-doctors-grid');
  if (!grid) return;

  try {
    const res = await fetchWithAuth(`/api/doctors?location=${encodeURIComponent(currentPatientLocation)}`);
    currentDoctors = await res.json();

    if (!currentDoctors || currentDoctors.length === 0) {
      grid.innerHTML = `<p class="text-muted">No doctors currently available.</p>`;
      return;
    }

    // Separate matching location doctors from other location doctors
    const pLocUpper = currentPatientLocation.toUpperCase();
    const sameLocDocs = currentDoctors.filter(d => (d.location || '').toUpperCase().includes(pLocUpper) || pLocUpper.includes((d.location || '').toUpperCase()));
    const otherLocDocs = currentDoctors.filter(d => !sameLocDocs.includes(d));

    let html = '';

    if (sameLocDocs.length > 0) {
      html += `
        <div style="border-bottom:2px solid #bae6fd; padding-bottom:0.5rem; margin-bottom:0.75rem;">
          <h4 style="font-size:1.05rem; font-weight:800; color:var(--primary); margin:0;">
            📍 Same Location Doctors (${currentPatientLocation})
          </h4>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1.1rem; margin-bottom:1.5rem;">
      `;
      sameLocDocs.forEach(doc => {
        html += renderDoctorBookingCard(doc, true);
      });
      html += `</div>`;
    }

    if (otherLocDocs.length > 0) {
      html += `
        <div style="border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-bottom:0.75rem; margin-top:0.5rem;">
          <h4 style="font-size:1rem; font-weight:700; color:var(--text-muted); margin:0;">
            🌐 Other Location Doctors
          </h4>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1.1rem;">
      `;
      otherLocDocs.forEach(doc => {
        html += renderDoctorBookingCard(doc, false);
      });
      html += `</div>`;
    }

    grid.innerHTML = html;

  } catch (err) {
    console.error('Error loading suitable doctors:', err);
  }
}

function renderDoctorBookingCard(doc, isMatch) {
  const loc = doc.location || 'Kurnool';
  return `
    <div class="doctor-select-card" id="doc-card-${doc.doctorId}" onclick="selectDoctorForBooking('${doc.doctorId}')" style="background:#fff; border:2px solid ${isMatch ? '#0284c7' : 'var(--border-color)'}; border-radius:14px; padding:1.25rem; cursor:pointer; transition:var(--transition); position:relative;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
        <div style="font-size:1.8rem;">🩺</div>
        <span class="badge ${isMatch ? 'badge-green' : 'badge-blue'}" style="font-size:0.8rem;">
          📍 Location: ${loc}
        </span>
      </div>
      <div style="font-size:1.1rem; font-weight:800; color:var(--text-main);">${doc.name}</div>
      <div style="font-size:0.9rem; color:var(--primary); font-weight:700;">${doc.specialty}</div>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Dept: ${doc.department}</div>
      <button type="button" class="btn btn-secondary" style="min-height:36px; width:100%; margin-top:0.85rem; font-size:0.875rem;">
        Select Doctor
      </button>
    </div>
  `;
}

function selectDoctorForBooking(doctorId) {
  document.querySelectorAll('.doctor-select-card').forEach(c => {
    c.style.borderColor = 'var(--border-color)';
    c.style.background = '#fff';
  });

  const card = document.getElementById(`doc-card-${doctorId}`);
  if (card) {
    card.style.borderColor = 'var(--primary)';
    card.style.background = 'var(--primary-light)';
  }

  document.getElementById('selected_doctor_id').value = doctorId;
  fetchAndRenderBookingSlots();
}

function initBookAppointmentModule() {
  const dateInput = document.getElementById('book_appointment_date');
  if (dateInput) {
    const todayStr = new Date().toISOString().split('T')[0];
    dateInput.value = todayStr;
    dateInput.min = todayStr;
    dateInput.addEventListener('change', fetchAndRenderBookingSlots);
  }

  const form = document.getElementById('patient-book-appointment-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const doctorId = document.getElementById('selected_doctor_id').value;
    const appointmentDate = document.getElementById('book_appointment_date').value;
    const appointmentTime = document.getElementById('selected_appointment_time').value;
    const reason = document.getElementById('book_reason').value.trim();

    if (!doctorId || !appointmentDate || !appointmentTime) {
      showToast('Please select a suitable Doctor, Date, and Time Slot.', 'error');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, appointmentDate, appointmentTime, reason })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'This appointment slot is already booked.', 'error');
        return;
      }

      showToast('Appointment Request Submitted (Status: Pending)!', 'success');
      toggleAppointmentModal(false);
      form.reset();
      fetchMyAppointments();

    } catch (err) {
      console.error('Error booking appointment:', err);
      showToast('Server communication error.', 'error');
    }
  });
}

async function fetchAndRenderBookingSlots() {
  const doctorId = document.getElementById('selected_doctor_id').value;
  const dateVal = document.getElementById('book_appointment_date').value;
  const slotGrid = document.getElementById('booking-slot-grid');
  const slotNotice = document.getElementById('booking-slot-notice');
  const timeInput = document.getElementById('selected_appointment_time');

  if (!doctorId || !dateVal || !slotGrid) return;

  slotGrid.innerHTML = `<p style="color:var(--primary); font-size:0.95rem; font-weight:600;">Checking live time slot availability...</p>`;

  try {
    const res = await fetchWithAuth(`/api/appointments/available-slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(dateVal)}`);
    const data = await res.json();
    const bookedSlots = data.bookedSlots || [];

    slotGrid.innerHTML = '';
    if (timeInput) timeInput.value = '';

    defaultTimeSlots.forEach(slot => {
      const isBooked = bookedSlots.includes(slot);
      const card = document.createElement('div');
      card.className = `slot-card ${isBooked ? 'booked' : 'available'}`;
      card.innerHTML = `
        <div class="slot-time">${slot}</div>
        <div class="slot-status-tag">${isBooked ? 'BOOKED' : 'Available'}</div>
      `;

      if (!isBooked) {
        card.addEventListener('click', () => {
          document.querySelectorAll('#booking-slot-grid .slot-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          if (timeInput) timeInput.value = slot;
          if (slotNotice) {
            slotNotice.style.display = 'flex';
            slotNotice.innerHTML = `Selected Slot: <strong>${slot}</strong> on <strong>${dateVal}</strong>`;
          }
        });
      }

      slotGrid.appendChild(card);
    });

  } catch (err) {
    console.error('Error checking slots:', err);
    slotGrid.innerHTML = `<p style="color:#ef4444;">Failed to load time slots.</p>`;
  }
}
