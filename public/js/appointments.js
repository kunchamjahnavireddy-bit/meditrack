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
          docSelect.innerHTML += `<option value="${doc.doctorId}">${doc.name} (${doc.specialty})</option>`;
        });
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
