// MediTrack - Client Side Interaction & Real-Time Availability Engine

document.addEventListener('DOMContentLoaded', () => {
  initAppointmentSlotPicker();
  initPatientSearchFilter();
  initFormValidations();
});

/**
 * Real-time Appointment Slot Picker with Doctor & Date change triggers
 */
function initAppointmentSlotPicker() {
  const doctorSelect = document.getElementById('doctor_id');
  const dateInput = document.getElementById('appointment_date');
  const timeInput = document.getElementById('appointment_time');
  const slotContainer = document.getElementById('slot-grid-container');
  const slotNotice = document.getElementById('slot-notice');

  if (!doctorSelect || !dateInput || !slotContainer) return;

  // Standard predefined hospital slots
  const defaultSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

  async function fetchAndRenderSlots() {
    const doctorId = doctorSelect.value;
    const dateVal = dateInput.value;

    if (!doctorId || !dateVal) {
      slotContainer.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Select a Doctor and Date above to view available time slots.</p>';
      if (slotNotice) slotNotice.style.display = 'none';
      return;
    }

    slotContainer.innerHTML = '<p style="color:var(--primary); font-size:0.85rem;">Checking live slot availability...</p>';

    try {
      const response = await fetch(`/api/available-slots?doctor_id=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(dateVal)}`);
      const data = await response.json();

      const bookedSlots = data.booked_slots || [];
      slotContainer.innerHTML = '';

      defaultSlots.forEach(slot => {
        const isBooked = bookedSlots.includes(slot);
        const card = document.createElement('div');
        
        card.className = `slot-card ${isBooked ? 'booked' : 'available'}`;
        card.innerHTML = `
          <div class="slot-time">${slot}</div>
          <div class="slot-status-tag">${isBooked ? 'Booked' : 'Available'}</div>
        `;

        if (!isBooked) {
          card.addEventListener('click', () => {
            // Deselect previous
            document.querySelectorAll('.slot-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            if (timeInput) {
              timeInput.value = slot;
            }
            if (slotNotice) {
              slotNotice.className = 'alert alert-info';
              slotNotice.style.display = 'flex';
              slotNotice.innerHTML = `Selected Slot: <strong>${slot}</strong> on <strong>${dateVal}</strong>`;
            }
          });
        }

        slotContainer.appendChild(card);
      });

    } catch (err) {
      console.error('Error fetching slots:', err);
      slotContainer.innerHTML = '<p style="color:#ef4444; font-size:0.85rem;">Failed to load live slots. Please try again.</p>';
    }
  }

  doctorSelect.addEventListener('change', fetchAndRenderSlots);
  dateInput.addEventListener('change', fetchAndRenderSlots);

  // If page loads with pre-filled doctor & date
  if (doctorSelect.value && dateInput.value) {
    fetchAndRenderSlots();
  }
}

/**
 * Instant Search Filter for Search & Doctor tables
 */
function initPatientSearchFilter() {
  const searchInput = document.getElementById('table-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.data-table tbody tr');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  });
}

/**
 * Client-side Form Validation
 */
function initFormValidations() {
  const regForm = document.getElementById('patient-registration-form');
  if (!regForm) return;

  regForm.addEventListener('submit', (e) => {
    const phoneInput = document.getElementById('phone');
    const ageInput = document.getElementById('age');
    const emailInput = document.getElementById('email');

    if (phoneInput) {
      const phoneDigits = phoneInput.value.replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        alert('Please enter a valid phone number (between 7 and 15 digits).');
        e.preventDefault();
        return;
      }
    }

    if (ageInput) {
      const ageVal = parseInt(ageInput.value, 10);
      if (isNaN(ageVal) || ageVal <= 0 || ageVal > 120) {
        alert('Please enter a valid age between 1 and 120.');
        e.preventDefault();
        return;
      }
    }

    if (emailInput && emailInput.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.value.trim())) {
        alert('Please enter a valid email address.');
        e.preventDefault();
        return;
      }
    }
  });
}
