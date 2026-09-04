const BASE_URL = 'http://localhost:5000';

async function testDropdownPatientSelection() {
  console.log('🧪 Starting Patient Dropdown Selection Automated Verification Test...');

  // Step 1: Login as Receptionist REC001 (or Staff)
  console.log('Step 1: Logging in as Receptionist REC001...');
  const recLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'REC001', password: 'rec123', role: 'receptionist' })
  });
  const recLoginData = await recLoginRes.json();
  const token = recLoginData.token;

  if (recLoginRes.status !== 200 || !token) {
    console.error('❌ Step 1 Failed: Receptionist login failed:', recLoginRes.status, recLoginData);
    process.exit(1);
  }
  console.log('✅ Step 1 Passed: Receptionist REC001 logged in successfully!');

  // Step 2: Fetch list of registered patients via GET /api/patients
  console.log('\nStep 2: Fetching list of registered patients via GET /api/patients...');
  const listRes = await fetch(`${BASE_URL}/api/patients`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const patientsList = await listRes.json();

  if (listRes.status !== 200 || !Array.isArray(patientsList) || patientsList.length === 0) {
    console.error('❌ Step 2 Failed: Unable to fetch patients list:', listRes.status, patientsList);
    process.exit(1);
  }
  console.log(`✅ Step 2 Passed: Fetched ${patientsList.length} registered patient records from database.`);

  // Step 3: Pick target patient PAT001 and inspect demographic fields
  const targetPatient = patientsList.find(p => p.patientId === 'PAT001') || patientsList[0];
  console.log(`\nStep 3: Verifying patient details for ${targetPatient.patientId}...`);
  console.log(`  - Name: ${targetPatient.fullName}`);
  console.log(`  - Age: ${targetPatient.age}`);
  console.log(`  - Gender: ${targetPatient.gender}`);
  console.log(`  - Phone: ${targetPatient.phone}`);
  console.log(`  - Email: ${targetPatient.email}`);
  console.log(`  - Address: ${targetPatient.address || targetPatient.patientLocation}`);

  if (!targetPatient.fullName || targetPatient.age === undefined || !targetPatient.phone) {
    console.error('❌ Step 3 Failed: Missing demographic fields on selected patient:', targetPatient);
    process.exit(1);
  }
  console.log('✅ Step 3 Passed: Target patient object contains all necessary demographic fields!');

  // Step 4: Verify GET /api/patients/:patientId endpoint for staff
  console.log(`\nStep 4: Testing GET /api/patients/${targetPatient.patientId} single-patient fetch endpoint...`);
  const singleRes = await fetch(`${BASE_URL}/api/patients/${targetPatient.patientId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const singleData = await singleRes.json();

  if (singleRes.status === 200 && singleData.patientId === targetPatient.patientId && singleData.fullName) {
    console.log(`✅ Step 4 Passed: GET /api/patients/${targetPatient.patientId} returned 200 OK with full details!`);
    console.log(`  - Retreived Name: ${singleData.fullName}`);
  } else {
    console.error('❌ Step 4 Failed:', singleRes.status, singleData);
    process.exit(1);
  }

  console.log('\n✨ All Patient Dropdown Selection Automated Tests Passed Cleanly!');
}

testDropdownPatientSelection().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
