const BASE_URL = 'http://localhost:5000';

async function runPatientBookConsultationFlowTests() {
  console.log('🧪 Starting Patient Book Consultation Flow Automated Verification Test Suite...\n');

  // Step 1: Login as existing Patient PAT001
  console.log('Step 1: Logging in as existing Patient PAT001...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'PAT001', password: 'passPAT001', role: 'patient' })
  });
  const loginData = await loginRes.json();
  const patientToken = loginData.token;

  if (loginRes.status !== 200 || !patientToken) {
    console.error('❌ Step 1 Failed: Patient PAT001 login failed:', loginRes.status, loginData);
    process.exit(1);
  }
  console.log('✅ Step 1 Passed: Patient PAT001 logged in successfully!');

  // Step 2: Fetch patient profile details via GET /api/patients/me
  console.log('\nStep 2: Fetching registered patient details via GET /api/patients/me...');
  const meRes = await fetch(`${BASE_URL}/api/patients/me`, {
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });
  const meData = await meRes.json();

  if (meRes.status === 200 && meData.patientId === 'PAT001' && meData.fullName) {
    console.log('✅ Step 2 Passed: Retrieved registered patient details from MongoDB Atlas!');
    console.log(`  - Patient ID: ${meData.patientId}`);
    console.log(`  - Patient Name: ${meData.fullName}`);
    console.log(`  - Age / Gender: ${meData.age} Yrs • ${meData.gender}`);
    console.log(`  - Phone: ${meData.phone}`);
    console.log(`  - Email: ${meData.email}`);
    console.log(`  - Address: ${meData.address || meData.patientLocation}`);
  } else {
    console.error('❌ Step 2 Failed:', meRes.status, meData);
    process.exit(1);
  }

  // Step 3: Select Doctor DOC001 & Book Appointment
  console.log('\nStep 3: Patient PAT001 booking consultation with Doctor DOC001...');
  const futureDate = `2026-09-${Math.floor(10 + Math.random() * 18)}`;
  const slotTime = '11:00 AM';

  const bookRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      patientId: 'PAT001',
      doctorId: 'DOC001',
      appointmentDate: futureDate,
      appointmentTime: slotTime,
      reason: 'Routine Health Consultation'
    })
  });
  const bookData = await bookRes.json();

  if (bookRes.status === 201 && bookData.appointment) {
    const apptId = bookData.appointment.appointmentId;
    console.log(`✅ Step 3 Passed: Appointment #APT${apptId} booked successfully!`);
    console.log(`  - Patient ID: ${bookData.appointment.patientId}`);
    console.log(`  - Doctor ID: ${bookData.appointment.doctorId}`);
    console.log(`  - Date & Time: ${bookData.appointment.appointmentDate} at ${bookData.appointment.appointmentTime}`);

    // Step 4: Verify appointment appears in Patient Dashboard Agenda
    console.log('\nStep 4: Verifying appointment appears in Patient Dashboard agenda (GET /api/patients/me/appointments)...');
    const patApptsRes = await fetch(`${BASE_URL}/api/patients/me/appointments`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const patAppts = await patApptsRes.json();
    const foundInPatientAgenda = patAppts.find(a => a.appointmentId === apptId);

    if (foundInPatientAgenda) {
      console.log(`✅ Step 4 Passed: Appointment #APT${apptId} appears in Patient PAT001 agenda!`);
    } else {
      console.error(`❌ Step 4 Failed: Appointment #APT${apptId} missing from Patient agenda!`);
      process.exit(1);
    }

    // Step 5: Verify appointment appears in Doctor DOC001 Dashboard Agenda
    console.log('\nStep 5: Logging in as Doctor DOC001 to verify appointment in Doctor Dashboard...');
    const docLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: 'DOC001', password: 'doc123', role: 'doctor' })
    });
    const docLoginData = await docLoginRes.json();
    const docToken = docLoginData.token;

    if (docLoginRes.status === 200 && docToken) {
      const docApptsRes = await fetch(`${BASE_URL}/api/doctors/me/appointments`, {
        headers: { 'Authorization': `Bearer ${docToken}` }
      });
      const docAppts = await docApptsRes.json();
      const foundInDocAgenda = docAppts.find(a => a.appointmentId === apptId);

      if (foundInDocAgenda) {
        console.log(`✅ Step 5 Passed: Appointment #APT${apptId} appears in Doctor DOC001 agenda with Patient Name "${foundInDocAgenda.patientName}"!`);
      } else {
        console.error(`❌ Step 5 Failed: Appointment #APT${apptId} missing from Doctor agenda!`);
        process.exit(1);
      }
    } else {
      console.error('❌ Doctor DOC001 login failed:', docLoginRes.status, docLoginData);
      process.exit(1);
    }

  } else {
    console.error('❌ Step 3 Failed to book appointment:', bookRes.status, bookData);
    process.exit(1);
  }

  console.log('\n✨ All Patient Book Consultation Flow Automated Tests Passed Cleanly!');
}

runPatientBookConsultationFlowTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
