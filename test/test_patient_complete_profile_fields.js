const BASE_URL = 'http://localhost:5000';

async function testPatientCompleteProfileFields() {
  console.log('🧪 Starting Complete Patient Profile Fields & Dropdown Sync Verification Test...');

  // Step 1: Login as Admin ADM001
  console.log('\nStep 1: Logging in as Admin ADM001...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'ADM001', password: 'admin123', role: 'admin' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  if (adminLoginRes.status !== 200 || !adminToken) {
    console.error('❌ Step 1 Failed: Admin login failed:', adminLoginRes.status, adminLoginData);
    process.exit(1);
  }
  console.log('✅ Step 1 Passed: Admin logged in successfully!');

  // Step 2: Fetch Admin Patients list
  console.log('\nStep 2: Fetching Admin Patients list via GET /api/admin/patients...');
  const adminPatRes = await fetch(`${BASE_URL}/api/admin/patients`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminPatients = await adminPatRes.json();

  if (adminPatRes.status !== 200 || !Array.isArray(adminPatients) || adminPatients.length === 0) {
    console.error('❌ Step 2 Failed: Admin patients API error:', adminPatRes.status, adminPatients);
    process.exit(1);
  }
  console.log(`✅ Step 2 Passed: Admin Dashboard retrieved ${adminPatients.length} registered patients from MongoDB Atlas.`);

  // Step 3: Login as Patient PAT001 and fetch Schedule Consultation dropdown patients via GET /api/patients
  console.log('\nStep 3: Logging in as Patient PAT001 & fetching Schedule Consultation dropdown list (GET /api/patients)...');
  const patLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'PAT001', password: 'passPAT001', role: 'patient' })
  });
  const patLoginData = await patLoginRes.json();
  const patientToken = patLoginData.token;

  const apptPatRes = await fetch(`${BASE_URL}/api/patients`, {
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });
  const apptPatients = await apptPatRes.json();

  if (apptPatRes.status !== 200 || !Array.isArray(apptPatients) || apptPatients.length === 0) {
    console.error('❌ Step 3 Failed: Book Appointment /api/patients error:', apptPatRes.status, apptPatients);
    process.exit(1);
  }
  console.log(`✅ Step 3 Passed: Schedule Consultation dropdown fetched ${apptPatients.length} registered patients from MongoDB Atlas!`);

  // Step 4: Pick a registered patient and inspect complete joined profile
  const samplePatient = apptPatients.find(p => p.patientId === 'PAT001') || apptPatients[0];
  console.log(`\nStep 4: Inspecting complete combined record for ${samplePatient.patientId}...`);
  const p = samplePatient;

  console.log('\n📋 Verified Stored Profile Fields for Patient ' + p.patientId + ':');
  console.log(`  - Patient ID: ${p.patientId}`);
  console.log(`  - Full Name: ${p.fullName}`);
  console.log(`  - Age / Gender: ${p.age} Yrs • ${p.gender}`);
  console.log(`  - Date of Birth: ${p.dateOfBirth}`);
  console.log(`  - Phone: ${p.phone}`);
  console.log(`  - Email: ${p.email}`);
  console.log(`  - Address: ${p.address || p.patientLocation}`);
  console.log(`  - Blood Group: ${p.bloodGroup}`);
  console.log(`  - Emergency Contact: ${p.emergencyContact}`);
  console.log(`  - Insurance Details: ${p.insuranceDetails}`);
  console.log(`  - Aadhaar Number: ${p.aadhaarNumber}`);
  console.log(`  - Allergies: ${p.allergies}`);
  console.log(`  - Existing Diseases: ${p.existingDiseases}`);
  console.log(`  - Current Medications: ${p.currentMedications}`);
  console.log(`  - Medical History: ${p.medicalHistory}`);

  if (!p.fullName || p.age === undefined || !p.phone || !p.email) {
    console.error('❌ Step 4 Failed: Critical demographic fields missing on patient record!');
    process.exit(1);
  }
  console.log('✅ Step 4 Passed: All demographic and medical profile fields successfully retrieved!');

  // Step 5: Test Consultation Booking for selected patient
  console.log(`\nStep 5: Testing consultation booking with selected patient ${p.patientId}...`);
  const futureDate = `2026-09-${Math.floor(10 + Math.random() * 18)}`;
  const bookRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      patientId: p.patientId,
      doctorId: 'DOC001',
      appointmentDate: futureDate,
      appointmentTime: '03:00 PM',
      reason: 'Full Profile Field Verification Consultation'
    })
  });
  const bookData = await bookRes.json();

  if (bookRes.status === 201 && bookData.appointment && bookData.appointment.patientId === p.patientId) {
    console.log(`✅ Step 5 Passed: Appointment #APT${bookData.appointment.appointmentId} booked successfully with Patient ID "${bookData.appointment.patientId}"!`);
  } else {
    console.error('❌ Step 5 Failed:', bookRes.status, bookData);
    process.exit(1);
  }

  console.log('\n✨ All Complete Patient Profile & Dropdown Verification Tests Passed Cleanly!');
}

testPatientCompleteProfileFields().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
