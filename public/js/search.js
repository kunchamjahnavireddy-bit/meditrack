// MediTrack - Patient Search & Retrieval Module

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || '';

  const inputEl = document.getElementById('table-search-input');
  if (inputEl) inputEl.value = query;

  executeSearch(query);

  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = document.getElementById('table-search-input').value.trim();
      window.location.href = `/search.html?q=${encodeURIComponent(val)}`;
    });
  }
});

async function executeSearch(query) {
  try {
    const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
    const patients = await res.json();

    renderPatientDirectoryTable(patients);

    // If query matches exact PAT ID or single result, render unified record
    const recordContainer = document.getElementById('selected-patient-record-container');
    if (!recordContainer) return;

    let selectedPatient = null;
    if (patients && patients.length > 0) {
      if (patients.length === 1 || query.toUpperCase().startsWith('PAT')) {
        selectedPatient = patients.find(p => p.patientId.toUpperCase() === query.toUpperCase()) || patients[0];
      }
    }

    if (selectedPatient) {
      recordContainer.style.display = 'block';
      await renderUnifiedPatientFile(selectedPatient);
    } else {
      recordContainer.style.display = 'none';
    }
  } catch (err) {
    console.error('Error executing search:', err);
  }
}

function renderPatientDirectoryTable(patients) {
  const tbody = document.getElementById('patient-directory-tbody');
  const countBadge = document.getElementById('patient-count-badge');
  if (!tbody) return;

  if (countBadge) countBadge.textContent = `${patients ? patients.length : 0} Registered`;

  if (!patients || patients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No patients matching search query.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  patients.forEach(pat => {
    tbody.innerHTML += `
      <tr>
        <td><span class="badge badge-blue" style="font-size:0.95rem;"><strong>${pat.patientId}</strong></span></td>
        <td><strong>${pat.fullName}</strong></td>
        <td>${pat.age} yrs / ${pat.gender}</td>
        <td>${pat.phone}</td>
        <td>${pat.email}</td>
        <td>
          <a href="/search.html?q=${pat.patientId}" class="btn btn-secondary" style="min-height:38px; padding:0.4rem 0.9rem; font-size:0.9rem;">Select Record ➔</a>
        </td>
      </tr>
    `;
  });
}

async function renderUnifiedPatientFile(patient) {
  const pid = patient.patientId;

  // 1. Demographics
  document.getElementById('record-patient-id').textContent = patient.patientId;
  document.getElementById('record-full-name').textContent = patient.fullName;
  document.getElementById('record-contact').textContent = `📞 ${patient.phone} | ✉️ ${patient.email}`;
  document.getElementById('record-initial').textContent = patient.fullName[0].toUpperCase();

  document.getElementById('edit-profile-btn').href = `/profile.html?patientId=${pid}`;
  document.getElementById('book-appointment-btn').href = `/appointments.html?patientId=${pid}`;

  document.getElementById('record-personal-info').innerHTML = `
    <div class="field-pair">
      <span class="field-label">Patient ID</span>
      <span class="field-value" style="font-weight:800; color:var(--primary); font-size:1.2rem;">${patient.patientId}</span>
    </div>
    <div class="field-pair">
      <span class="field-label">Full Name</span>
      <span class="field-value">${patient.fullName}</span>
    </div>
    <div class="field-pair">
      <span class="field-label">Age & Gender</span>
      <span class="field-value">${patient.age} Years • ${patient.gender}</span>
    </div>
    <div class="field-pair">
      <span class="field-label">Date of Birth</span>
      <span class="field-value">${patient.dateOfBirth}</span>
    </div>
    <div class="field-pair">
      <span class="field-label">Contact Phone</span>
      <span class="field-value">${patient.phone}</span>
    </div>
    <div class="field-pair">
      <span class="field-label">Email Address</span>
      <span class="field-value">${patient.email}</span>
    </div>
    <div class="field-pair">
      <span class="field-label">Residential Address</span>
      <span class="field-value">${patient.address}</span>
    </div>
    ${patient.location && patient.location.latitude ? `
    <div class="field-pair" style="grid-column: 1 / -1; background:#e0f2fe; padding:0.8rem 1rem; border-radius:10px;">
      <span class="field-label" style="color:#0369a1;">📍 GPS Coordinates</span>
      <span class="field-value" style="color:#0c4a6e; font-weight:700;">Lat: ${patient.location.latitude}, Lng: ${patient.location.longitude}</span>
    </div>` : ''}
  `;

  // 2. Medical Profile
  try {
    const resProf = await fetch(`/api/profiles/${pid}`);
    const profContainer = document.getElementById('record-medical-profile');
    if (resProf.ok) {
      const prof = await resProf.json();
      profContainer.innerHTML = `
        <div class="field-pair">
          <span class="field-label">Blood Group</span>
          <span class="field-value"><span class="badge badge-red" style="font-size:0.95rem;">${prof.bloodGroup || 'Not Specified'}</span></span>
        </div>
        <div class="field-pair">
          <span class="field-label">Known Allergies</span>
          <span class="field-value" style="color:#b91c1c; font-weight:700;">${prof.allergies || 'None'}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Existing Chronic Diseases</span>
          <span class="field-value" style="font-weight:600;">${prof.existingDiseases || 'None'}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Previous Medical History</span>
          <span class="field-value">${prof.medicalHistory || 'None'}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Current Medications</span>
          <span class="field-value" style="color:var(--primary); font-weight:700;">${prof.currentMedications || 'None'}</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Emergency Contact</span>
          <span class="field-value">${prof.emergencyName || 'N/A'} (${prof.emergencyPhone || 'N/A'})</span>
        </div>
        <div class="field-pair">
          <span class="field-label">Insurance Details</span>
          <span class="field-value">${prof.insuranceDetails || 'None'}</span>
        </div>
      `;
    } else {
      profContainer.innerHTML = `<div class="alert alert-info">No medical profile on record for this patient.</div>`;
    }
  } catch (err) {
    console.error('Error loading profile in search:', err);
  }

  // 3. Appointments History
  try {
    const resAppts = await fetch(`/api/appointments/${pid}`);
    const appts = await resAppts.json();
    const apptTbody = document.getElementById('record-appointments-tbody');
    if (apptTbody) {
      if (!appts || appts.length === 0) {
        apptTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No appointments recorded for this patient.</td></tr>`;
        return;
      }
      apptTbody.innerHTML = '';
      appts.forEach(a => {
        apptTbody.innerHTML += `
          <tr>
            <td><strong>#APT${a.appointmentId}</strong></td>
            <td><strong>${a.doctorName}</strong></td>
            <td>General Care</td>
            <td>${a.appointmentDate}</td>
            <td><span class="badge badge-orange">${a.appointmentTime}</span></td>
            <td>${a.reason || 'Checkup'}</td>
            <td><span class="badge badge-green">${a.status}</span></td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error('Error loading appointments in search:', err);
  }
}
