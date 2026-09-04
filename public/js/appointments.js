// MediTrack - Appointment Scheduling Module

const defaultTimeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const role = user.role || 'receptionist';

  loadDropdownData();
  loadAppointmentsAgenda(role);
  initSlotAvailabilityPicker();
  initAppointmentBookingHandler();
});

function getDoctorImage(specialty) {
  const spec = (specialty || '').toLowerCase();
  if (spec.includes('cardio')) return '/images/meditrack_doc_cardiologist.jpg';
  if (spec.includes('pulmon')) return '/images/meditrack_doc_pulmonologist.jpg';
  if (spec.includes('neuro')) return '/images/meditrack_doc_neurologist.jpg';
  if (spec.includes('ortho')) return '/images/meditrack_doc_orthopedist.jpg';
  if (spec.includes('pediat')) return '/images/meditrack_doc_pediatrician.jpg';
  return '/images/meditrack_hero_physician.jpg';
}

const meditrackDepartments = [
  { id: 'cardiology', name: 'Cardiology', desc: 'Heart and blood vessels', icon: '🫀', keywords: ['cardio', 'heart'] },
  { id: 'pulmonology', name: 'Pulmonology', desc: 'Lungs and respiratory system', icon: '🫁', keywords: ['pulmon', 'lung', 'respirat'] },
  { id: 'neurology', name: 'Neurology', desc: 'Brain and nervous system', icon: '🧠', keywords: ['neuro', 'brain', 'nerves'] },
  { id: 'orthopedics', name: 'Orthopedics', desc: 'Bones, joints, and muscles', icon: '🦴', keywords: ['ortho', 'bone', 'joint'] },
  { id: 'general_medicine', name: 'General Medicine', desc: 'Common illnesses and overall health', icon: '🩺', keywords: ['general', 'medicine', 'physician', 'health'] },
  { id: 'dermatology', name: 'Dermatology', desc: 'Skin, hair, and nails', icon: '🧴', keywords: ['derma', 'skin'] },
  { id: 'pediatrics', name: 'Pediatrics', desc: 'Children’s healthcare', icon: '👶', keywords: ['pediat', 'child'] },
  { id: 'gynecology', name: 'Gynecology', desc: 'Women’s reproductive health', icon: '🩺', keywords: ['gynec', 'obstet', 'women'] },
  { id: 'ent', name: 'ENT (Otolaryngology)', desc: 'Ear, nose, and throat', icon: '👂', keywords: ['ent', 'otolaryng', 'ear', 'nose', 'throat'] },
  { id: 'ophthalmology', name: 'Ophthalmology', desc: 'Eyes and vision', icon: '👁️', keywords: ['ophthalm', 'eye', 'vision'] },
  { id: 'gastroenterology', name: 'Gastroenterology', desc: 'Digestive system', icon: '🩺', keywords: ['gastro', 'stomach', 'digest'] },
  { id: 'urology', name: 'Urology', desc: 'Urinary system', icon: '🩺', keywords: ['uro', 'kidney', 'urinar'] },
  { id: 'psychiatry', name: 'Psychiatry', desc: 'Mental and behavioral health', icon: '🧠', keywords: ['psych', 'mental', 'behavior'] },
  { id: 'oncology', name: 'Oncology', desc: 'Cancer diagnosis and treatment', icon: '🔬', keywords: ['oncol', 'cancer', 'tumor'] },
  { id: 'dentistry', name: 'Dentistry', desc: 'Teeth and oral health', icon: '🦷', keywords: ['dent', 'oral', 'tooth'] }
];

function renderAllDoctorsGrid(doctors) {
  const container = document.getElementById('all-doctors-grid');
  const countTag = document.getElementById('all-doctors-count-tag');
  if (!container) return;

  const docList = Array.isArray(doctors) ? doctors : [];
  if (countTag) {
    countTag.textContent = `${docList.length} Registered Doctor${docList.length === 1 ? '' : 's'} Across 15 Departments`;
  }

  let html = '';

  meditrackDepartments.forEach(dept => {
    // Find registered doctors matching this department
    const deptDocs = docList.filter(doc => {
      const spec = ((doc.specialty || '') + ' ' + (doc.department || '')).toLowerCase();
      return dept.keywords.some(kw => spec.includes(kw)) || spec.includes(dept.name.toLowerCase());
    });

    html += `
      <div class="card" style="margin-bottom:1.5rem; background:#ffffff; border:1px solid var(--border-color); border-radius:18px; padding:1.35rem; box-shadow:var(--shadow-subtle);">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e0f2fe; padding-bottom:0.75rem; margin-bottom:1.15rem; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-heading); margin:0 0 0.15rem 0; display:flex; align-items:center; gap:0.5rem;">
              <span>${dept.icon}</span> <span>${dept.name}</span>
            </h3>
            <p style="font-size:0.88rem; color:var(--text-muted); margin:0; font-weight:500;">${dept.desc}</p>
          </div>
          <span class="badge ${deptDocs.length > 0 ? 'badge-blue' : 'badge'}" style="font-size:0.8rem; font-weight:700;">
            ${deptDocs.length > 0 ? `${deptDocs.length} Doctor${deptDocs.length === 1 ? '' : 's'} Available` : '0 Doctors'}
          </span>
        </div>
    `;

    if (deptDocs.length > 0) {
      html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:1.15rem;">`;
      deptDocs.forEach(doc => {
        const imgUrl = getDoctorImage(doc.specialty || doc.department);
        html += `
          <div class="card" style="margin-bottom:0; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:1.15rem; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s ease;">
            <div>
              <div style="display:flex; align-items:center; gap:0.85rem; margin-bottom:0.75rem;">
                <img src="${imgUrl}" alt="${doc.name}" style="width:60px; height:60px; border-radius:14px; object-fit:cover; border:2px solid #bae6fd; flex-shrink:0;">
                <div>
                  <span class="badge badge-blue" style="font-size:0.75rem; padding:0.15rem 0.5rem; margin-bottom:0.2rem; display:inline-block; font-weight:700;">ID: ${doc.doctorId}</span>
                  <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-heading); margin:0 0 0.1rem 0;">${doc.name}</h4>
                  <span style="font-size:0.83rem; color:var(--primary); font-weight:700;">🩺 ${doc.specialty || doc.department || dept.name}</span>
                </div>
              </div>

              <div style="font-size:0.85rem; color:var(--text-body); line-height:1.5; margin-bottom:1rem; padding:0.65rem; background:#ffffff; border-radius:10px; border:1px solid #e2e8f0;">
                <div style="margin-bottom:0.2rem;">📍 <strong>Location:</strong> ${doc.location || 'Hospital Network'}</div>
                <div style="margin-bottom:0.2rem;">📜 <strong>License / Dept:</strong> ${doc.medicalLicenseNumber || doc.department || 'MCI Verified'}</div>
                <div>🕒 <strong>Available Slots:</strong> Mon - Sat (09:00 AM - 04:00 PM)</div>
              </div>
            </div>

            <button type="button" onclick="selectDoctorForBooking('${doc.doctorId}')" class="btn btn-secondary" style="width:100%; min-height:40px; font-size:0.9rem; font-weight:700; background:#e0f2fe; color:#0369a1; border-color:#7dd3fc;">
              📅 Select & Book Consultation
            </button>
          </div>
        `;
      });
      html += `</div>`;
    } else {
      html += `
        <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:12px; padding:1.1rem; text-align:center; color:var(--text-muted); font-size:0.92rem; font-weight:600;">
          No doctors currently available
        </div>
      `;
    }

    html += `</div>`;
  });

  container.innerHTML = html;
}

function selectDoctorForBooking(doctorId) {
  const docSelect = document.getElementById('doctor_id');
  if (docSelect) {
    docSelect.value = doctorId;
    docSelect.dispatchEvent(new Event('change'));

    const bookingCard = document.getElementById('booking-form-card');
    if (bookingCard) {
      bookingCard.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function renderPatientInfoCard(pat) {
  const idEl = document.getElementById('display_patient_id');
  const nameEl = document.getElementById('display_patient_name');
  const ageGenderEl = document.getElementById('display_patient_age_gender');
  const phoneEl = document.getElementById('display_patient_phone');
  const emailEl = document.getElementById('display_patient_email');
  const addrEl = document.getElementById('display_patient_address');
  const patSelect = document.getElementById('patient_id');

  if (!pat) {
    if (idEl) idEl.textContent = 'Select Patient Account';
    if (nameEl) nameEl.textContent = '-';
    if (ageGenderEl) ageGenderEl.textContent = '-';
    if (phoneEl) phoneEl.textContent = '-';
    if (emailEl) emailEl.textContent = '-';
    if (addrEl) addrEl.textContent = '-';
    return;
  }

  if (idEl) idEl.textContent = pat.patientId || 'PAT-N/A';
  if (nameEl) nameEl.textContent = pat.fullName || '-';

  const ageStr = (pat.age !== undefined && pat.age !== null && pat.age !== '') ? `${pat.age} Yrs` : 'N/A';
  const genderStr = pat.gender || 'N/A';
  if (ageGenderEl) ageGenderEl.textContent = `${ageStr} • ${genderStr}`;

  if (phoneEl) phoneEl.textContent = pat.phone || '-';
  if (emailEl) emailEl.textContent = pat.email || '-';
  if (addrEl) addrEl.textContent = pat.address || pat.patientLocation || '-';

  if (patSelect && pat.patientId) {
    if (!patSelect.querySelector(`option[value="${pat.patientId}"]`)) {
      const opt = document.createElement('option');
      opt.value = pat.patientId;
      opt.textContent = `${pat.patientId} - ${pat.fullName || ''}`;
      patSelect.appendChild(opt);
    }
    patSelect.value = pat.patientId;
  }
}

async function loadDropdownData() {
  try {
    const user = getCurrentUser();
    const patientGroup = document.getElementById('patient-select-group');
    if (patientGroup) patientGroup.style.display = 'block';

    const resPat = await fetchWithAuth('/api/patients');
    if (resPat.ok) {
      const patients = await resPat.json();
      const patSelect = document.getElementById('patient_id');
      if (patSelect && Array.isArray(patients)) {
        patSelect.innerHTML = '<option value="">-- Choose Registered Patient --</option>';
        patients.forEach(pat => {
          patSelect.innerHTML += `<option value="${pat.patientId}">${pat.patientId} - ${pat.fullName} (${pat.phone})</option>`;
        });

        patSelect.onchange = async () => {
          const selId = patSelect.value;
          if (!selId) {
            renderPatientInfoCard(null);
            return;
          }
          const foundPat = patients.find(p => p.patientId && p.patientId.toUpperCase() === selId.toUpperCase());
          if (foundPat) {
            renderPatientInfoCard(foundPat);
          } else {
            const resSingle = await fetchWithAuth(`/api/patients/${selId}`);
            if (resSingle.ok) {
              const singlePat = await resSingle.json();
              renderPatientInfoCard(singlePat);
            }
          }
        };

        // Pre-select logged-in patient's patientId if applicable
        if (user && (user.patientId || (user.role === 'patient' && user.loginId))) {
          const targetId = (user.patientId || user.loginId).toUpperCase();
          const matchOpt = Array.from(patSelect.options).find(opt => opt.value.toUpperCase() === targetId);
          if (matchOpt) {
            patSelect.value = matchOpt.value;
          }
        }

        if (patSelect.value) {
          patSelect.onchange();
        } else {
          renderPatientInfoCard(null);
        }
      }
    }

    const resDoc = await fetchWithAuth('/api/doctors');
    if (resDoc.ok) {
      const doctors = await resDoc.json();
      const docSelect = document.getElementById('doctor_id');
      if (docSelect && Array.isArray(doctors)) {
        docSelect.innerHTML = '<option value="">-- Choose Doctor --</option>';
        doctors.forEach(doc => {
          docSelect.innerHTML += `<option value="${doc.doctorId}">${doc.name} (${doc.specialty || doc.department}) - ${doc.location || 'Hospital'}</option>`;
        });
      }
      renderAllDoctorsGrid(doctors);

      // Check URL search params for ?doctor=DOCxxx
      const urlParams = new URLSearchParams(window.location.search);
      const preDocId = urlParams.get('doctor');
      if (preDocId && docSelect) {
        docSelect.value = preDocId;
        docSelect.dispatchEvent(new Event('change'));
      }
    }
  } catch (err) {
    console.error('Error loading dropdown data:', err);
  }
}

async function loadAppointmentsAgenda(role) {
  const tableBody = document.getElementById('appointments-table-body');
  if (!tableBody) return;

  try {
    const res = await fetchWithAuth('/api/appointments');
    if (!res.ok) return;

    const appointments = await res.json();

    if (!appointments || appointments.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No scheduled appointments found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = '';
    appointments.forEach(appt => {
      tableBody.innerHTML += `
        <tr>
          <td><strong>#APT${appt.appointmentId}</strong></td>
          <td>
            <div><strong>${appt.patientName || appt.patientId}</strong></div>
            <small style="color:var(--text-muted); font-weight:600;">${appt.patientId}</small>
          </td>
          <td>
            <div><strong>${appt.doctorName}</strong></div>
            <small style="color:var(--primary); font-weight:600;">${appt.doctorSpecialization || 'General Physician'}</small>
          </td>
          <td>${appt.appointmentDate}</td>
          <td><span class="badge badge-orange">${appt.appointmentTime}</span></td>
          <td><span class="badge badge-green">${appt.status || 'Confirmed'}</span></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading appointments agenda:', err);
  }
}

function initSlotAvailabilityPicker() {
  const docSelect = document.getElementById('doctor_id');
  const dateInput = document.getElementById('appointment_date');
  const timeInput = document.getElementById('appointment_time');
  const slotGrid = document.getElementById('slot-grid-container');
  const slotNotice = document.getElementById('slot-notice');

  if (!docSelect || !dateInput || !slotGrid) return;

  const todayStr = new Date().toISOString().split('T')[0];
  if (!dateInput.value) dateInput.value = todayStr;
  dateInput.min = todayStr;

  async function fetchAndRenderSlots() {
    const doctorId = docSelect.value;
    const dateVal = dateInput.value;

    if (!doctorId || !dateVal) {
      slotGrid.innerHTML = `<p class="text-muted" style="font-size:1rem; font-weight:500;">Select a Doctor and Date above to load real-time slot availability.</p>`;
      if (slotNotice) slotNotice.style.display = 'none';
      return;
    }

    slotGrid.innerHTML = `<p style="color:var(--primary); font-size:1rem; font-weight:600;">Checking live slot availability...</p>`;

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
            document.querySelectorAll('.slot-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            if (timeInput) timeInput.value = slot;
            if (slotNotice) {
              slotNotice.className = 'alert alert-info';
              slotNotice.style.display = 'flex';
              slotNotice.innerHTML = `Selected Slot: <strong>${slot}</strong> on <strong>${dateVal}</strong>`;
            }
          });
        }

        slotGrid.appendChild(card);
      });

    } catch (err) {
      console.error('Error checking slots:', err);
      slotGrid.innerHTML = `<p style="color:#ef4444;">Failed to check slot availability.</p>`;
    }
  }

  docSelect.addEventListener('change', fetchAndRenderSlots);
  dateInput.addEventListener('change', fetchAndRenderSlots);

  if (docSelect.value && dateInput.value) {
    fetchAndRenderSlots();
  }
}

function initAppointmentBookingHandler() {
  const form = document.getElementById('appointment-booking-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = getCurrentUser();
    let patientId = document.getElementById('patient_id') ? document.getElementById('patient_id').value : null;
    if (!patientId && user && (user.patientId || user.loginId)) {
      patientId = user.patientId || user.loginId;
    }

    const doctorId = document.getElementById('doctor_id').value;
    const appointmentDate = document.getElementById('appointment_date').value;
    const appointmentTime = document.getElementById('appointment_time').value;
    const reason = document.getElementById('reason').value.trim();

    if (!doctorId || !appointmentDate || !appointmentTime) {
      showToast('Please select a Doctor, Date, and Time Slot.', 'error');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, doctorId, appointmentDate, appointmentTime, reason })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'This appointment slot is already booked.', 'error');
        return;
      }

      showToast(`Appointment #APT${data.appointment ? data.appointment.appointmentId : ''} Booked Successfully!`, 'success');
      form.reset();
      loadDropdownData();
      loadAppointmentsAgenda(user ? user.role : 'patient');
      document.querySelectorAll('.slot-card').forEach(c => c.classList.remove('selected'));
      const slotNotice = document.getElementById('slot-notice');
      if (slotNotice) slotNotice.style.display = 'none';

    } catch (err) {
      console.error('Error booking appointment:', err);
      showToast('Failed to connect to server.', 'error');
    }
  });
}
