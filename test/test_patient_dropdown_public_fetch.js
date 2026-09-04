const BASE_URL = 'http://localhost:5000';

async function testPatientDropdownPublicFetch() {
  console.log('🧪 Starting Patient Dropdown Public Fetch & Details Verification Test...');

  // Step 1: Fetch registered patients list via public GET /api/patients
  console.log('\nStep 1: Fetching registered patients list via public GET /api/patients (without headers)...');
  const publicRes = await fetch(`${BASE_URL}/api/patients`);
  const patientsList = await publicRes.json();

  if (publicRes.status !== 200 || !Array.isArray(patientsList) || patientsList.length === 0) {
    console.error('❌ Step 1 Failed: GET /api/patients public fetch failed:', publicRes.status, patientsList);
    process.exit(1);
  }
  console.log(`✅ Step 1 Passed: Successfully fetched ${patientsList.length} registered patient records from MongoDB Atlas!`);

  // Step 2: Verify Patient Dropdown Option strings match "PAT001 - Patient Name" format
  console.log('\nStep 2: Verifying Patient Dropdown option strings match "PAT001 - Patient Name" format...');
  patientsList.slice(0, 5).forEach(pat => {
    const optionText = `${pat.patientId} - ${pat.fullName}`;
    console.log(`  - Formatted Option: "${optionText}"`);
    if (!pat.patientId || !pat.fullName) {
      console.error('❌ Step 2 Failed: Patient record missing patientId or fullName:', pat);
      process.exit(1);
    }
  });
  console.log('✅ Step 2 Passed: All patient records generate valid dropdown option text!');

  // Step 3: Select target patient PAT001 and inspect complete profile details
  const targetPatient = patientsList.find(p => p.patientId === 'PAT001') || patientsList[0];
  console.log(`\nStep 3: Selecting patient ${targetPatient.patientId} and inspecting complete profile fields...`);
  
  console.log(`  - Patient ID: ${targetPatient.patientId}`);
  console.log(`  - Full Name: ${targetPatient.fullName}`);
  console.log(`  - Age / Gender: ${targetPatient.age} Yrs • ${targetPatient.gender}`);
  console.log(`  - Date of Birth: ${targetPatient.dateOfBirth}`);
  console.log(`  - Phone: ${targetPatient.phone}`);
  console.log(`  - Email: ${targetPatient.email}`);
  console.log(`  - Address: ${targetPatient.address || targetPatient.patientLocation}`);
  console.log(`  - Blood Group: ${targetPatient.bloodGroup}`);
  console.log(`  - Emergency Contact: ${targetPatient.emergencyContact}`);
  console.log(`  - Insurance Details: ${targetPatient.insuranceDetails}`);
  console.log(`  - Aadhaar Number: ${targetPatient.aadhaarNumber}`);
  console.log(`  - Allergies: ${targetPatient.allergies}`);
  console.log(`  - Existing Diseases: ${targetPatient.existingDiseases}`);
  console.log(`  - Current Medications: ${targetPatient.currentMedications}`);
  console.log(`  - Medical History: ${targetPatient.medicalHistory}`);

  if (!targetPatient.fullName || targetPatient.age === undefined || !targetPatient.phone) {
    console.error('❌ Step 3 Failed: Target patient record missing demographic fields:', targetPatient);
    process.exit(1);
  }
  console.log('✅ Step 3 Passed: Target patient details successfully verified!');

  // Step 4: Login as Admin ADM001 and compare with Admin Dashboard list
  console.log('\nStep 4: Logging in as Admin ADM001 to verify Admin Dashboard patients match 1:1...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'ADM001', password: 'admin123', role: 'admin' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  const adminPatRes = await fetch(`${BASE_URL}/api/admin/patients`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminPatients = await adminPatRes.json();

  const adminIds = adminPatients.map(p => p.patientId).sort();
  const dropdownIds = patientsList.map(p => p.patientId).sort();

  if (adminIds.length === dropdownIds.length && adminIds.every((id, idx) => id === dropdownIds[idx])) {
    console.log(`✅ Step 4 Passed: Patient Dropdown contains ALL ${adminIds.length} registered patients from Admin Dashboard!`);
  } else {
    console.error('❌ Step 4 Failed: Patient list count or IDs mismatch between Admin Dashboard and Dropdown!', { adminIds, dropdownIds });
    process.exit(1);
  }

  console.log('\n✨ All Patient Dropdown Verification Tests Passed Cleanly!');
}

testPatientDropdownPublicFetch().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
