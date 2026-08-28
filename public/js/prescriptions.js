// MediTrack - Prescriptions Module (Patient / Doctor / Receptionist)

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const role = user.role || 'receptionist';

  // Customize UI according to role permissions
  renderPrescriptionWorkspaceForRole(role, user);
  loadPrescriptionsList(role, user);
});

function renderPrescriptionWorkspaceForRole(role, user) {
  const doctorFormCard = document.getElementById('doctor-prescription-form-card');
  const receptionistNotice = document.getElementById('receptionist-prescription-notice');
  const pageTitle = document.getElementById('prescription-page-title');
  const pageSub = document.getElementById('prescription-page-sub');

  if (role === 'doctor') {
    if (doctorFormCard) doctorFormCard.style.display = 'block';
    if (receptionistNotice) receptionistNotice.style.display = 'none';
    if (pageTitle) pageTitle.textContent = 'Prescription Management & Consultation';
    if (pageSub) pageSub.textContent = 'Create and issue digital prescriptions for hospital patients';
    initDoctorPrescriptionForm();
  } else if (role === 'receptionist') {
    if (doctorFormCard) doctorFormCard.style.display = 'none';
    if (receptionistNotice) {
      receptionistNotice.style.display = 'block';
      receptionistNotice.innerHTML = `
        <div class="alert alert-info">
          <span>📋</span>
          <div>
            <strong>Receptionist Prescription View:</strong> Search patients to verify prescribed medicines, dosage, and duration. Complete medical profile history is restricted.
          </div>
        </div>
      `;
    }
    if (pageTitle) pageTitle.textContent = 'Receptionist Prescription & Pharmacy View';
    if (pageSub) pageSub.textContent = 'Verify doctor prescriptions & prescribed medicines for patients';
  } else if (role === 'patient') {
    if (doctorFormCard) doctorFormCard.style.display = 'none';
    if (receptionistNotice) receptionistNotice.style.display = 'none';
    if (pageTitle) pageTitle.textContent = 'My Issued Prescriptions';
    if (pageSub) pageSub.textContent = `Prescriptions & prescribed medication history for Patient ${user.patientId || ''}`;
  }
}

async function loadPrescriptionsList(role, user) {
  const container = document.getElementById('prescriptions-list-container');
  if (!container) return;

  try {
    let url = '/api/prescriptions';
    if (role === 'patient') {
      url = `/api/prescriptions/patient/${user.patientId || 'PAT001'}`;
    }

    const res = await fetchWithAuth(url);
    if (!res.ok) return;

    const prescriptions = await res.json();
    renderPrescriptions(prescriptions, role);

    // Search bar listener
    const searchInput = document.getElementById('prescription-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = prescriptions.filter(p =>
          p.patientId.toLowerCase().includes(query) ||
          p.patientName.toLowerCase().includes(query) ||
          p.doctorName.toLowerCase().includes(query)
        );
        renderPrescriptions(filtered, role);
      });
    }

  } catch (err) {
    console.error('Error loading prescriptions:', err);
  }
}

function renderPrescriptions(prescriptions, role) {
  const container = document.getElementById('prescriptions-list-container');
  if (!container) return;

  if (!prescriptions || prescriptions.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3.5rem 1.5rem; color:var(--text-muted);">
        <div style="font-size:3rem; margin-bottom:0.5rem;">💊</div>
        <p style="font-size:1.1rem; font-weight:600;">No prescriptions found.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  prescriptions.forEach(p => {
    let medicinesHtml = '';
    if (p.medicines && p.medicines.length > 0) {
      p.medicines.forEach(m => {
        medicinesHtml += `
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
      <div class="card" style="margin-bottom:2rem; border-color:#cbd5e1; box-shadow:var(--shadow-md);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding-bottom:1.25rem; border-bottom:1px solid var(--border-color); margin-bottom:1.25rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span class="badge badge-blue" style="font-size:1rem; padding:0.4rem 1rem;">${p.prescriptionId}</span>
              <h3 style="font-size:1.35rem; font-weight:800; color:var(--text-main); margin:0;">${p.patientName}</h3>
              <span class="badge badge-green">${p.patientId}</span>
            </div>
            <div style="font-size:0.95rem; color:var(--text-muted); margin-top:0.35rem; font-weight:600;">
              👨‍⚕️ Prescribed by: <strong>${p.doctorName}</strong> | 📅 Date: ${p.prescriptionDate}
            </div>
          </div>
          ${role === 'receptionist' ? `
            <span class="badge badge-orange" style="font-size:0.95rem;">Pharmacy Verification Mode</span>
          ` : ''}
        </div>

        <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:1rem;">💊 Prescribed Medicines & Dosage Instructions</h4>
        
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
            <tbody>
              ${medicinesHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });
}

function initDoctorPrescriptionForm() {
  const form = document.getElementById('doctor-prescription-form');
  if (!form) return;

  // Load patients dropdown
  fetchWithAuth('/api/patients').then(res => res.json()).then(patients => {
    const select = document.getElementById('rx_patient_id');
    if (select && Array.isArray(patients)) {
      select.innerHTML = '<option value="">-- Choose Registered Patient --</option>';
      patients.forEach(pat => {
        select.innerHTML += `<option value="${pat.patientId}">${pat.patientId} - ${pat.fullName}</option>`;
      });
    }
  }).catch(e => console.error(e));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const patientId = document.getElementById('rx_patient_id').value;
    const medicineName = document.getElementById('medicine_name').value.trim();
    const dosage = document.getElementById('dosage').value.trim();
    const frequency = document.getElementById('frequency').value.trim();
    const duration = document.getElementById('duration').value.trim();
    const instructions = document.getElementById('instructions').value.trim();

    if (!patientId || !medicineName || !dosage || !frequency || !duration) {
      showToast('Please complete all medicine details.', 'error');
      return;
    }

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

      showToast('Prescription issued successfully.', 'success');
      form.reset();
      loadPrescriptionsList('doctor', getCurrentUser());

    } catch (err) {
      console.error('Error creating prescription:', err);
      showToast('Failed to connect to server.', 'error');
    }
  });
}
