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

function renderAllDoctorsGrid(doctors) {
  const grid = document.getElementById('all-doctors-grid');
  const countTag = document.getElementById('all-doctors-count-tag');
  if (!grid) return;

  if (!doctors || doctors.length === 0) {
    grid.innerHTML = `<p class="text-muted" style="padding:1rem;">No registered doctors found in MongoDB database.</p>`;
    if (countTag) countTag.textContent = '0 Doctors';
    return;
  }

  if (countTag) countTag.textContent = `${doctors.length} Registered Doctor${doctors.length === 1 ? '' : 's'}`;

  grid.innerHTML = doctors.map(doc => {
    const imgUrl = getDoctorImage(doc.specialty || doc.department);
    return `
      <div class="card" style="margin-bottom:0; background:#ffffff; border:1px solid var(--border-color); border-radius:18px; padding:1.25rem; box-shadow:var(--shadow-subtle); display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s ease;">
        <div>
          <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.85rem;">
            <img src="${imgUrl}" alt="${doc.name}" style="width:68px; height:68px; border-radius:14px; object-fit:cover; border:2px solid #e2e8f0; background:#f1f5f9; flex-shrink:0;">
            <div>
              <span class="badge badge-blue" style="font-size:0.75rem; padding:0.2rem 0.6rem; margin-bottom:0.25rem; display:inline-block; font-weight:700;">ID: ${doc.doctorId}</span>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-heading); margin:0 0 0.15rem 0;">${doc.name}</h3>
              <span style="font-size:0.85rem; color:var(--primary); font-weight:700;">🩺 ${doc.specialty || doc.department || 'Specialist'}</span>
            </div>
          </div>

          <div style="font-size:0.88rem; color:var(--text-body); line-height:1.55; margin-bottom:1.1rem; padding:0.75rem; background:#f8fafc; border-radius:12px; border:1px solid #f1f5f9;">
            <div style="margin-bottom:0.25rem;">📍 <strong>Location:</strong> ${doc.location || 'Hospital Network'}</div>
            <div style="margin-bottom:0.25rem;">📜 <strong>License / Dept:</strong> ${doc.medicalLicenseNumber || doc.department || 'MCI Verified'}</div>
            <div>🕒 <strong>Available Slots:</strong> Mon - Sat (09:00 AM - 04:00 PM)</div>
          </div>
        </div>

        <button type="button" onclick="selectDoctorForBooking('${doc.doctorId}')" class="btn btn-secondary" style="width:100%; min-height:42px; font-size:0.92rem; font-weight:700; background:#e0f2fe; color:#0369a1; border-color:#7dd3fc;">
          📅 Select & Book Consultation
        </button>
      </div>
    `;
  }).join('');
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

async function loadDropdownData() {
  try {
    const resPat = await fetchWithAuth('/api/patients');
    if (resPat.ok) {
      const patients = await resPat.json();
      const patSelect = document.getElementById('patient_id');
      if (patSelect && Array.isArray(patients)) {
        patSelect.innerHTML = '<option value="">-- Choose Registered Patient --</option>';
        patients.forEach(pat => {
          patSelect.innerHTML += `<option value="${pat.patientId}">${pat.patientId} - ${pat.fullName} (${pat.phone})</option>`;
        });
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

    const patientId = document.getElementById('patient_id') ? document.getElementById('patient_id').value : null;
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

      showToast('Appointment Booked Successfully!', 'success');
      form.reset();
      loadAppointmentsAgenda(getCurrentUser().role);
      document.querySelectorAll('.slot-card').forEach(c => c.classList.remove('selected'));
      const slotNotice = document.getElementById('slot-notice');
      if (slotNotice) slotNotice.style.display = 'none';

    } catch (err) {
      console.error('Error booking appointment:', err);
      showToast('Failed to connect to server.', 'error');
    }
  });
}
