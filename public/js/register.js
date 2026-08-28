// MediTrack - Public Patient Registration Client Module

document.addEventListener('DOMContentLoaded', () => {
  fetchNextPatientId();
  initRegistrationForm();
  initGPSLocationHandler();
  initGoogleMapsPicker();
});

async function fetchNextPatientId() {
  try {
    const res = await fetch('/api/patients/next-id');
    const data = await res.json();
    const tagDisplay = document.getElementById('next-patient-id-tag');
    if (tagDisplay && data.nextPatientId) {
      tagDisplay.textContent = data.nextPatientId;
    }
  } catch (err) {
    console.error('Error fetching next PAT ID:', err);
  }
}

function initRegistrationForm() {
  const form = document.getElementById('patient-registration-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm_password').value.trim();

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please verify your password.', 'error');
      return;
    }

    const payload = {
      fullName: document.getElementById('full_name').value.trim(),
      password: password,
      age: document.getElementById('age').value,
      gender: document.getElementById('gender').value,
      dateOfBirth: document.getElementById('date_of_birth').value,
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim(),
      address: document.getElementById('address').value.trim(),
      latitude: document.getElementById('latitude').value || null,
      longitude: document.getElementById('longitude').value || null
    };

    try {
      const res = await fetch('/api/patients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to register patient account.', 'error');
        return;
      }

      // Display exact Registration Successful banner & hide form
      form.style.display = 'none';

      const successCard = document.getElementById('registration-success-container');
      const successPatIdTag = document.getElementById('success-patient-id');

      if (successPatIdTag) successPatIdTag.textContent = data.patientId;
      if (successCard) {
        successCard.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      showToast('Registration Successful!', 'success');

    } catch (err) {
      console.error('Error submitting patient registration:', err);
      showToast('Server communication error.', 'error');
    }
  });
}

function initGPSLocationHandler() {
  const btn = document.getElementById('use-gps-location-btn');
  const latInput = document.getElementById('latitude');
  const lngInput = document.getElementById('longitude');
  const statusNotice = document.getElementById('gps-status-notice');

  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Requesting GPS Location...';
    if (statusNotice) {
      statusNotice.className = 'alert alert-info';
      statusNotice.style.display = 'flex';
      statusNotice.innerHTML = 'Requesting device GPS location permission...';
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (latInput) latInput.value = lat;
        if (lngInput) lngInput.value = lng;

        btn.disabled = false;
        btn.innerHTML = '✅ Location Saved';
        btn.style.background = '#dcfce7';
        btn.style.color = '#15803d';

        if (statusNotice) {
          statusNotice.className = 'alert alert-success';
          statusNotice.innerHTML = `GPS Coordinates Captured: <strong>Latitude ${lat.toFixed(4)}, Longitude ${lng.toFixed(4)}</strong>`;
        }

        if (window.googleMapMarker && window.googleMap) {
          const pos = { lat, lng };
          window.googleMap.setCenter(pos);
          window.googleMapMarker.setPosition(pos);
        }
      },
      (error) => {
        btn.disabled = false;
        btn.innerHTML = '🛰️ Use My Current Location';
        console.error('GPS Geolocation Error:', error);
        if (statusNotice) {
          statusNotice.className = 'alert alert-error';
          statusNotice.innerHTML = `GPS Permission Denied or Unavailable: ${error.message}`;
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

async function initGoogleMapsPicker() {
  const canvas = document.getElementById('google-map-canvas');
  if (!canvas) return;

  try {
    const res = await fetch('/api/config/maps-key');
    const { apiKey } = await res.json();

    if (apiKey && apiKey !== 'SAMPLE_KEY_REPLACE_WITH_REAL_GOOGLE_MAPS_KEY') {
      loadGoogleMapsScript(apiKey);
    } else {
      renderFallbackMapCanvas(canvas);
    }
  } catch (err) {
    renderFallbackMapCanvas(canvas);
  }
}

function loadGoogleMapsScript(apiKey) {
  if (window.google && window.google.maps) return;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapInstance`;
  script.async = true;
  script.defer = true;
  window.initGoogleMapInstance = initGoogleMapInstance;
  document.head.appendChild(script);
}

function initGoogleMapInstance() {
  const canvas = document.getElementById('google-map-canvas');
  if (!canvas) return;
  const defaultPos = { lat: 28.6139, lng: 77.2090 };
  const map = new google.maps.Map(canvas, { zoom: 14, center: defaultPos });
  const marker = new google.maps.Marker({ position: defaultPos, map, draggable: true });
  window.googleMap = map;
  window.googleMapMarker = marker;
}

function renderFallbackMapCanvas(canvas) {
  canvas.innerHTML = `
    <div style="background: linear-gradient(135deg, #e0f2fe, #bae6fd); height: 100%; min-height: 170px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1rem; border-radius: 14px; border: 2px dashed #0284c7;">
      <div style="font-size: 2rem; margin-bottom: 0.25rem;">📍</div>
      <div style="font-size: 1.05rem; font-weight: 800; color: #0369a1;">Interactive Location Pinning Canvas</div>
      <p style="font-size: 0.875rem; color: #0c4a6e; max-width: 480px; margin-top: 0.2rem;">
        Click <strong>"Use My Current Location"</strong> to store address GPS coordinates.
      </p>
    </div>
  `;
}
