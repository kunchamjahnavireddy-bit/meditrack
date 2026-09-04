const BASE_URL = 'http://localhost:5000';

async function testAdminAndAppointmentsPatientSync() {
  console.log('🧪 Starting Admin Dashboard & Book Appointment Patient Sync Verification Test...');

  // Step 1: Login as Admin (ADM001) to fetch Admin Dashboard patients
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

  // Step 2: Fetch Admin Patients via GET /api/admin/patients
  console.log('\nStep 2: Fetching Admin Dashboard patients via GET /api/admin/patients...');
  const adminPatRes = await fetch(`${BASE_URL}/api/admin/patients`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminPatients = await adminPatRes.json();

  if (adminPatRes.status !== 200 || !Array.isArray(adminPatients) || adminPatients.length === 0) {
    console.error('❌ Step 2 Failed: Unable to fetch admin patients list:', adminPatRes.status, adminPatients);
    process.exit(1);
  }
  console.log(`✅ Step 2 Passed: Admin Dashboard returned ${adminPatients.length} registered patients from MongoDB Atlas.`);

  // Step 3: Fetch Book Appointment Patients via GET /api/patients as Patient PAT001
  console.log('\nStep 3: Logging in as Patient PAT001 and fetching Book Appointment patients via GET /api/patients...');
  const patLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'PAT001', password: 'passPAT001', role: 'patient' })
  });
  const patLoginData = await patLoginRes.json();
  const patientToken = patLoginData.token;

  if (patLoginRes.status !== 200 || !patientToken) {
    console.error('❌ Step 3 Failed: Patient PAT001 login failed:', patLoginRes.status, patLoginData);
    process.exit(1);
  }

  const apptPatRes = await fetch(`${BASE_URL}/api/patients`, {
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });
  const apptPatients = await apptPatRes.json();

  if (apptPatRes.status !== 200 || !Array.isArray(apptPatients)) {
    console.error('❌ Step 3 Failed: Book Appointment /api/patients failed:', apptPatRes.status, apptPatients);
    process.exit(1);
  }
  console.log(`✅ Step 3 Passed: Book Appointment dropdown API returned ${apptPatients.length} registered patients from MongoDB Atlas.`);

  // Step 4: Compare Admin Dashboard Patients vs Book Appointment Patients
  console.log('\nStep 4: Verifying Admin Dashboard Patients match Book Appointment Patients...');
  const adminIds = adminPatients.map(p => p.patientId).sort();
  const apptIds = apptPatients.map(p => p.patientId).sort();

  console.log(`  - Admin Dashboard Patient IDs: [${adminIds.join(', ')}]`);
  console.log(`  - Book Appointment Patient IDs: [${apptIds.join(', ')}]`);

  const allMatch = adminIds.every(id => apptIds.includes(id)) && apptIds.every(id => adminIds.includes(id));
  if (allMatch) {
    console.log('✅ Step 4 Passed: Admin Dashboard and Book Appointment use the EXACT SAME Patient database records!');
  } else {
    console.error('❌ Step 4 Failed: Patient list mismatch between Admin Dashboard and Book Appointment dropdown!');
    process.exit(1);
  }

  // Step 5: Verify demographic loading & appointment creation with selected patient
  console.log('\nStep 5: Testing consultation booking with selected registered patient PAT002...');
  const targetPatient = apptPatients.find(p => p.patientId === 'PAT002') || apptPatients[0];
  console.log(`  Selected Patient: ${targetPatient.patientId} - ${targetPatient.fullName}`);
  console.log(`  - Age: ${targetPatient.age}`);
  console.log(`  - Gender: ${targetPatient.gender}`);
  console.log(`  - Phone: ${targetPatient.phone}`);
  console.log(`  - Email: ${targetPatient.email}`);
  console.log(`  - Address: ${targetPatient.address || targetPatient.patientLocation}`);

  const futureDate = `2026-10-${Math.floor(10 + Math.random() * 18)}`;
  const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
  const slotTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];
  const bookRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      patientId: targetPatient.patientId,
      doctorId: 'DOC001',
      appointmentDate: futureDate,
      appointmentTime: slotTime,
      reason: 'General Consultation Sync Check'
    })
  });
  const bookData = await bookRes.json();

  if (bookRes.status === 201 && bookData.appointment && bookData.appointment.patientId === targetPatient.patientId) {
    console.log(`✅ Step 5 Passed: Appointment #APT${bookData.appointment.appointmentId} booked successfully with Patient ID "${bookData.appointment.patientId}"!`);
  } else {
    console.error('❌ Step 5 Failed to book appointment with selected patient:', bookRes.status, bookData);
    process.exit(1);
  }

  console.log('\n✨ All Patient Synchronization Automated Tests Passed Cleanly!');
}

testAdminAndAppointmentsPatientSync().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
