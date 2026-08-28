// MediTrack - Receptionist Dashboard & Operations Engine

async function initReceptionistDashboard() {
  const todayBadge = document.getElementById('rec-today-date-badge');
  const todayStr = new Date().toISOString().split('T')[0];
  if (todayBadge) todayBadge.textContent = `Today: ${todayStr}`;

  loadReceptionistKPIStats();
  loadTodayAppointments();
  loadUpcomingAppointments();
  loadDoctorSchedules();
  loadReceptionistPrescriptions();
  initPatientSearchHandler();
  initRescheduleFormHandler();
}

async function loadReceptionistKPIStats() {
  try {
    const res = await fetchWithAuth('/api/receptionist/stats');
    if (!res.ok) return;

    const stats = await res.json();
    const patEl = document.getElementById('stat-total-patients');
    const apptEl = document.getElementById('stat-total-appointments');
    const availEl = document.getElementById('stat-available-today');
    const bookedEl = document.getElementById('stat-booked-today');

    if (patEl) patEl.textContent = stats.totalPatients !== undefined ? stats.totalPatients : 0;
    if (apptEl) apptEl.textContent = stats.totalAppointments !== undefined ? stats.totalAppointments : 0;
    if (availEl) availEl.textContent = stats.availableToday !== undefined ? stats.availableToday : 0;
    if (bookedEl) bookedEl.textContent = stats.bookedToday !== undefined ? stats.bookedToday : 0;
  } catch (err) {
    console.error("Error loading receptionist KPI stats:", err);
  }
}

async function loadTodayAppointments() {
  const tbody = document.getElementById('rec-today-tbody');
  if (!tbody) return;

  try {
    const res = await fetchWithAuth('/api/receptionist/appointments/today');
    if (!res.ok) return;

    const appointments = await res.json();

    if (!appointments || appointments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No appointments scheduled for today.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    appointments.forEach(a => {
      const st = a.status || 'Pending';
      const statusBadgeClass = st === 'Confirmed' ? 'badge-green' : (st === 'Cancelled' ? 'badge-red' : 'badge-orange');

      tbody.innerHTML += `
        <tr>
          <td><span class="badge badge-orange"><strong>${a.appointmentTime}</strong></span></td>
          <td><strong>${a.patientName}</strong> <span class="badge badge-blue" style="font-size:0.8rem;">${a.patientId}</span></td>
          <td><strong>${a.doctorName}</strong></td>
          <td><span class="badge ${statusBadgeClass}">${st}</span></td>
          <td>
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              ${st === 'Pending' ? `
                <button onclick="confirmAppointmentByRec(${a.appointmentId})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem; background:#22c55e; color:#fff; border:none;">
                  Confirm ✓
                </button>
              ` : ''}
              ${st !== 'Cancelled' ? `
                <button onclick="openRescheduleModal(${a.appointmentId}, '${a.appointmentDate}', '${a.appointmentTime}')" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem;">
                  Reschedule 🗓️
                </button>
                <button onclick="cancelAppointmentByRec(${a.appointmentId})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem; background:#ef4444; color:#fff; border:none;">
                  Cancel ✕
                </button>
              ` : ''}
              <button onclick="printAppointmentSlip(${JSON.stringify(a).replace(/"/g, '&quot;')})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem;">
                🖨️ Print Slip
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Error loading today's appointments:", err);
  }
}

async function loadUpcomingAppointments() {
  const tbody = document.getElementById('rec-upcoming-tbody');
  if (!tbody) return;

  try {
    const res = await fetchWithAuth('/api/receptionist/appointments/upcoming');
    if (!res.ok) return;

    const appointments = await res.json();

    if (!appointments || appointments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No upcoming appointments scheduled after today.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    appointments.forEach(a => {
      const st = a.status || 'Pending';
      const statusBadgeClass = st === 'Confirmed' ? 'badge-green' : (st === 'Cancelled' ? 'badge-red' : 'badge-orange');

      tbody.innerHTML += `
        <tr>
          <td>
            <strong>${a.appointmentDate}</strong>
            <span class="badge badge-orange" style="margin-left:0.5rem;">${a.appointmentTime}</span>
          </td>
          <td><strong>${a.patientName}</strong> <span class="badge badge-blue" style="font-size:0.8rem;">${a.patientId}</span></td>
          <td><strong>${a.doctorName}</strong></td>
          <td><span class="badge ${statusBadgeClass}">${st}</span></td>
          <td>
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              ${st === 'Pending' ? `
                <button onclick="confirmAppointmentByRec(${a.appointmentId})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem; background:#22c55e; color:#fff; border:none;">
                  Confirm ✓
                </button>
              ` : ''}
              ${st !== 'Cancelled' ? `
                <button onclick="openRescheduleModal(${a.appointmentId}, '${a.appointmentDate}', '${a.appointmentTime}')" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem;">
                  Reschedule 🗓️
                </button>
                <button onclick="cancelAppointmentByRec(${a.appointmentId})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem; background:#ef4444; color:#fff; border:none;">
                  Cancel ✕
                </button>
              ` : ''}
              <button onclick="printAppointmentSlip(${JSON.stringify(a).replace(/"/g, '&quot;')})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.65rem; font-size:0.8rem;">
                🖨️ Print Slip
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Error loading upcoming appointments:", err);
  }
}

async function loadDoctorSchedules() {
  const tbody = document.getElementById('rec-schedules-tbody');
  if (!tbody) return;

  try {
    const res = await fetchWithAuth('/api/receptionist/appointments/schedules');
    if (!res.ok) return;

    const schedules = await res.json();

    if (!schedules || schedules.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No doctor schedules available.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    schedules.forEach(s => {
      const st = s.status || 'Pending';
      const statusBadgeClass = st === 'Confirmed' ? 'badge-green' : (st === 'Cancelled' ? 'badge-red' : 'badge-orange');

      tbody.innerHTML += `
        <tr>
          <td>
            <strong>${s.doctorName}</strong>
            <span class="badge badge-blue" style="font-size:0.8rem; display:block; width:max-content; margin-top:0.25rem;">${s.doctorId}</span>
          </td>
          <td>
            <span class="badge badge-blue">${s.specialization}</span>
            <span style="font-size:0.85rem; color:var(--text-muted); display:block; margin-top:0.2rem;">📍 ${s.location}</span>
          </td>
          <td>
            <strong>${s.appointmentDate}</strong>
            <span class="badge badge-orange">${s.appointmentTime}</span>
          </td>
          <td>
            <strong>${s.patientName}</strong>
            <span style="font-size:0.85rem; color:var(--primary); font-weight:700; display:block;">(${s.patientId})</span>
          </td>
          <td><span class="badge ${statusBadgeClass}">${st}</span></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Error loading doctor schedules:", err);
  }
}

function initPatientSearchHandler() {
  const form = document.getElementById('rec-patient-search-form');
  const resultDiv = document.getElementById('rec-patient-basic-result');
  if (!form || !resultDiv) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = document.getElementById('rec_search_pat_id').value.trim().toUpperCase();
    if (!pid) return;

    resultDiv.innerHTML = `<p style="color:var(--primary); font-weight:600; padding:1rem 0;">Searching basic details & doctor prescriptions for ${pid}...</p>`;

    try {
      // 1. Fetch Basic Patient Information
      const patRes = await fetchWithAuth(`/api/receptionist/patients/${pid}/basic`);
      if (!patRes.ok) {
        resultDiv.innerHTML = `<div class="alert alert-error" style="margin-top:1rem;">Patient ID <strong>${pid}</strong> not found in MongoDB patient database.</div>`;
        return;
      }

      const pat = await patRes.json();

      // 2. Fetch Doctor's Issued Prescriptions for this Patient
      const rxRes = await fetchWithAuth(`/api/receptionist/prescriptions/${pid}`);
      let prescriptions = [];
      if (rxRes.ok) {
        prescriptions = await rxRes.json();
      }

      // Render Doctor Prescriptions View
      let rxContentHtml = '';
      if (prescriptions && prescriptions.length > 0) {
        prescriptions.forEach(p => {
          let medsRows = '';
          (p.medicines || []).forEach(m => {
            medsRows += `
              <tr style="background:#fff;">
                <td><strong style="color:var(--primary); font-size:1.05rem;">${m.medicineName}</strong></td>
                <td><span class="badge badge-blue">${m.dosage}</span></td>
                <td><strong>${m.frequency}</strong></td>
                <td>${m.duration}</td>
                <td><em style="color:var(--text-muted);">${m.instructions || 'N/A'}</em></td>
              </tr>
            `;
          });

          rxContentHtml += `
            <div style="background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:1.25rem; margin-top:1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem; margin-bottom:0.85rem; flex-wrap:wrap; gap:0.5rem;">
                <div>
                  <strong style="font-size:1.15rem; color:var(--text-main);">${p.prescriptionId}</strong>
                  <span style="font-size:0.9rem; color:var(--text-muted); margin-left:0.5rem;">Prescribed by: <strong>${p.doctorName}</strong> on ${p.prescriptionDate}</span>
                </div>
                <button onclick="printPrescriptionSlip(${JSON.stringify(p).replace(/"/g, '&quot;')})" class="btn btn-secondary" style="min-height:34px; padding:0.3rem 0.85rem; font-size:0.85rem;">
                  🖨️ Print Prescription
                </button>
              </div>
              <div class="table-responsive">
                <table class="data-table" style="font-size:0.9rem;">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Dosage</th>
                      <th>Timing / Frequency</th>
                      <th>Duration</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>${medsRows}</tbody>
                </table>
              </div>
            </div>
          `;
        });
      } else {
        rxContentHtml = `
          <div class="alert alert-info" style="margin-top:1rem; background:#eff6ff; border-color:#bfdbfe; color:#1e40af;">
            ℹ️ <strong>No prescription available.</strong> (No doctor prescriptions issued yet for Patient ${pid})
          </div>
        `;
      }

      // 3. Render Combined Receptionist Search View
      resultDiv.innerHTML = `
        <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:16px; padding:1.75rem; margin-top:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.75rem;">
            <div>
              <h3 style="font-size:1.4rem; font-weight:800; color:var(--text-main); margin:0;">${pat.fullName}</h3>
              <span class="badge badge-blue" style="font-size:0.95rem; margin-top:0.25rem;">Patient ID: <strong>${pat.patientId}</strong></span>
            </div>
            <span class="badge badge-green">📍 Location: ${pat.patientLocation || 'Kurnool'}</span>
          </div>

          <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:0.85rem;">👤 Basic Patient Information:</h4>
          <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.1rem; margin-bottom:1.5rem;">
            <div class="field-pair">
              <span class="field-label">Age & Gender</span>
              <span class="field-value"><strong>${pat.age} Years • ${pat.gender}</strong></span>
            </div>
            <div class="field-pair">
              <span class="field-label">Date of Birth</span>
              <span class="field-value">${pat.dateOfBirth}</span>
            </div>
            <div class="field-pair">
              <span class="field-label">Phone Number</span>
              <span class="field-value">📞 <strong>${pat.phone}</strong></span>
            </div>
            <div class="field-pair">
              <span class="field-label">Email Address</span>
              <span class="field-value">✉️ ${pat.email}</span>
            </div>
            <div class="field-pair" style="grid-column: 1 / -1;">
              <span class="field-label">Residential Address</span>
              <span class="field-value">${pat.address}</span>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-color); padding-top:1.25rem;">
            <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem;">💊 Doctor's Prescription Information:</h4>
            ${rxContentHtml}
          </div>
        </div>
      `;

    } catch (err) {
      console.error("Error searching basic patient details:", err);
      resultDiv.innerHTML = `<div class="alert alert-error">Server communication error.</div>`;
    }
  });
}

async function loadReceptionistPrescriptions() {
  const container = document.getElementById('rec-prescriptions-container');
  if (!container) return;

  const rxForm = document.getElementById('rec-rx-search-form');
  if (rxForm) {
    rxForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pid = document.getElementById('rec_rx_pat_id').value.trim().toUpperCase();
      fetchPrescriptions(pid);
    });
  }

  fetchPrescriptions('');
}

async function fetchPrescriptions(patientId) {
  const container = document.getElementById('rec-prescriptions-container');
  if (!container) return;

  container.innerHTML = `<p style="color:var(--primary); font-weight:600;">Loading prescription medicine details...</p>`;

  try {
    const url = patientId ? `/api/receptionist/prescriptions/${patientId}` : '/api/receptionist/prescriptions';
    const res = await fetchWithAuth(url);
    if (!res.ok) return;

    const prescriptions = await res.json();

    if (!prescriptions || prescriptions.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info" style="background:#eff6ff; border-color:#bfdbfe; color:#1e40af;">
          ℹ️ <strong>No prescription available.</strong> ${patientId ? `(No prescriptions on file for Patient ${patientId})` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    prescriptions.forEach(p => {
      let medsHtml = '';
      if (p.medicines && p.medicines.length > 0) {
        p.medicines.forEach(m => {
          medsHtml += `
            <tr>
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
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <strong style="font-size:1.2rem; color:var(--text-main);">${p.prescriptionId}</strong>
              <span style="font-size:0.95rem; color:var(--text-muted); margin-left:0.75rem;">Patient: <strong>${p.patientName} (${p.patientId})</strong> | Doctor: <strong>${p.doctorName}</strong> on ${p.prescriptionDate}</span>
            </div>
            <button onclick="printPrescriptionSlip(${JSON.stringify(p).replace(/"/g, '&quot;')})" class="btn btn-secondary" style="min-height:36px; padding:0.35rem 0.85rem; font-size:0.85rem;">
              🖨️ Print Prescription
            </button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Timing / Frequency</th>
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
    console.error("Error loading prescriptions:", err);
  }
}

async function confirmAppointmentByRec(appointmentId) {
  try {
    const res = await fetchWithAuth(`/api/receptionist/appointments/${appointmentId}/confirm`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to confirm appointment.', 'error');
      return;
    }
    showToast('Appointment Confirmed successfully!', 'success');
    initReceptionistDashboard();
  } catch (err) {
    console.error("Error confirming appointment:", err);
  }
}

async function cancelAppointmentByRec(appointmentId) {
  if (!confirm("Are you sure you want to cancel this appointment?")) return;
  try {
    const res = await fetchWithAuth(`/api/receptionist/appointments/${appointmentId}/cancel`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to cancel appointment.', 'error');
      return;
    }
    showToast('Appointment Cancelled.', 'success');
    initReceptionistDashboard();
  } catch (err) {
    console.error("Error cancelling appointment:", err);
  }
}

function openRescheduleModal(appointmentId, currentDate, currentTime) {
  document.getElementById('reschedule_appt_id').value = appointmentId;
  const title = document.getElementById('reschedule-appt-title');
  if (title) title.textContent = `#APT${appointmentId}`;
  
  const dateInput = document.getElementById('reschedule_date');
  if (dateInput) dateInput.value = currentDate || new Date().toISOString().split('T')[0];

  const timeSelect = document.getElementById('reschedule_time');
  if (timeSelect && currentTime) timeSelect.value = currentTime;

  toggleRescheduleModal(true);
}

function toggleRescheduleModal(show) {
  const modal = document.getElementById('rec-reschedule-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}

function initRescheduleFormHandler() {
  const form = document.getElementById('rec-reschedule-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const appointmentId = document.getElementById('reschedule_appt_id').value;
    const newDate = document.getElementById('reschedule_date').value;
    const newTime = document.getElementById('reschedule_time').value;

    try {
      const res = await fetchWithAuth(`/api/receptionist/appointments/${appointmentId}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDate, newTime })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to reschedule appointment.', 'error');
        return;
      }

      showToast('Appointment Rescheduled successfully!', 'success');
      toggleRescheduleModal(false);
      initReceptionistDashboard();
    } catch (err) {
      console.error("Error rescheduling appointment:", err);
    }
  });
}

function printAppointmentSlip(appt) {
  const printDoc = document.getElementById('printable-document');
  if (!printDoc) return;

  printDoc.innerHTML = `
    <div style="font-family:sans-serif; padding:1.5rem;">
      <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:1rem; margin-bottom:1.5rem;">
        <h2 style="font-size:1.8rem; margin:0;">🏥 MediTrack Healthcare System</h2>
        <p style="font-size:1.1rem; color:#555; margin-top:0.25rem;">Official Appointment Confirmation Slip</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; font-size:1.1rem; margin-bottom:2rem;">
        <div><strong>Appointment ID:</strong> #APT${appt.appointmentId}</div>
        <div><strong>Status:</strong> ${appt.status}</div>
        <div><strong>Patient Name:</strong> ${appt.patientName}</div>
        <div><strong>Patient ID:</strong> ${appt.patientId}</div>
        <div><strong>Doctor Assigned:</strong> ${appt.doctorName}</div>
        <div><strong>Specialization:</strong> ${appt.doctorSpecialization || 'General Medicine'}</div>
        <div><strong>Date:</strong> ${appt.appointmentDate}</div>
        <div><strong>Time Slot:</strong> ${appt.appointmentTime}</div>
        <div><strong>Clinic Location:</strong> ${appt.doctorLocation || 'Kurnool'}</div>
        <div><strong>Reason for Visit:</strong> ${appt.reason || 'General Consultation'}</div>
      </div>

      <div style="margin-top:3rem; border-top:1px dashed #666; padding-top:1rem; text-align:center; font-size:0.95rem; color:#555;">
        Issued by Front Desk Reception • Please present this slip upon arrival at the clinic desk.
      </div>
    </div>
  `;

  togglePrintModal(true);
}

function printPrescriptionSlip(p) {
  const printDoc = document.getElementById('printable-document');
  if (!printDoc) return;

  let medsRows = '';
  if (p.medicines && p.medicines.length > 0) {
    p.medicines.forEach(m => {
      medsRows += `
        <tr>
          <td style="padding:0.75rem; border:1px solid #333; font-weight:bold;">${m.medicineName}</td>
          <td style="padding:0.75rem; border:1px solid #333;">${m.dosage}</td>
          <td style="padding:0.75rem; border:1px solid #333;">${m.frequency}</td>
          <td style="padding:0.75rem; border:1px solid #333;">${m.duration}</td>
          <td style="padding:0.75rem; border:1px solid #333;">${m.instructions || 'N/A'}</td>
        </tr>
      `;
    });
  }

  printDoc.innerHTML = `
    <div style="font-family:sans-serif; padding:1.5rem;">
      <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:1rem; margin-bottom:1.5rem;">
        <h2 style="font-size:1.8rem; margin:0;">🏥 MediTrack Healthcare Clinic</h2>
        <p style="font-size:1.1rem; color:#555; margin-top:0.25rem;">Medical Prescription & Dispensing Record</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; font-size:1.1rem; margin-bottom:1.75rem;">
        <div><strong>Prescription ID:</strong> ${p.prescriptionId}</div>
        <div><strong>Date:</strong> ${p.prescriptionDate}</div>
        <div><strong>Patient Name:</strong> ${p.patientName}</div>
        <div><strong>Patient ID:</strong> ${p.patientId}</div>
        <div><strong>Doctor Name:</strong> ${p.doctorName}</div>
      </div>

      <h3 style="font-size:1.3rem; margin-bottom:0.75rem;">💊 Prescribed Medicines</h3>
      <table style="width:100%; border-collapse:collapse; text-align:left; font-size:1.05rem; margin-bottom:2rem;">
        <thead>
          <tr style="background:#eee;">
            <th style="padding:0.75rem; border:1px solid #333;">Medicine Name</th>
            <th style="padding:0.75rem; border:1px solid #333;">Dosage</th>
            <th style="padding:0.75rem; border:1px solid #333;">Timing / Frequency</th>
            <th style="padding:0.75rem; border:1px solid #333;">Duration</th>
            <th style="padding:0.75rem; border:1px solid #333;">Instructions</th>
          </tr>
        </thead>
        <tbody>${medsRows}</tbody>
      </table>

      <div style="margin-top:3rem; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <p style="font-size:0.95rem; color:#555;">Dispensed / Verified by: Front Desk Receptionist</p>
        </div>
        <div style="text-align:center; border-top:1px solid #000; padding-top:0.5rem; width:200px;">
          <strong>Doctor Signature</strong>
        </div>
      </div>
    </div>
  `;

  togglePrintModal(true);
}

function togglePrintModal(show) {
  const modal = document.getElementById('printable-modal');
  if (modal) modal.style.display = show ? 'flex' : 'none';
}
