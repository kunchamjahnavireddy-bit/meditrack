const BASE_URL = 'http://localhost:5000';

async function runDoctorLicenseRegistrationTests() {
  console.log('🧪 Starting Doctor License Registration & Verification Automated Test Suite...\n');

  const uniqueTimestamp = Date.now();

  // Test 1: Rejection of invalid Medical License Number format
  console.log('Test 1: Testing rejection of invalid Medical License Number format (MCI-99881)...');
  const invalidRes = await fetch(`${BASE_URL}/api/doctors/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Test Invalid',
      medicalLicenseNumber: 'MCI-99881', // Invalid format
      specialty: 'Pulmonology',
      department: 'Pulmonology',
      phone: '+91 98765 11111',
      email: `test_invalid_${uniqueTimestamp}@meditrack.org`,
      password: 'pass12345'
    })
  });
  const invalidData = await invalidRes.json();

  if (invalidRes.status === 400 && invalidData.error && invalidData.error.includes('Format must be LIC-[SPECIALIZATION]-[5 DIGITS]')) {
    console.log(`✅ Test 1 Passed: Invalid license format correctly rejected (400 Bad Request): "${invalidData.error}"`);
  } else {
    console.error('❌ Test 1 Failed:', invalidRes.status, invalidData);
    process.exit(1);
  }

  // Test 2: Successful registration with valid license format LIC-PULMO-99881
  const validLicense = `LIC-PULMO-${uniqueTimestamp.toString().slice(-5)}`;
  const doctorEmail = `dr_pulmo_${uniqueTimestamp}@meditrack.org`;
  const doctorPassword = 'pulmoPassword123';

  console.log(`\nTest 2: Registering doctor with valid license format (${validLicense})...`);
  const regRes = await fetch(`${BASE_URL}/api/doctors/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Ananya Pulmo',
      medicalLicenseNumber: validLicense,
      specialty: 'Pulmonology',
      department: 'Pulmonology & Chest',
      phone: '+91 98765 22222',
      email: doctorEmail,
      password: doctorPassword
    })
  });
  const regData = await regRes.json();

  if (regRes.status === 201 && regData.doctorId && regData.medicalLicenseNumber === validLicense) {
    const assignedDocId = regData.doctorId;
    console.log(`✅ Test 2 Passed: Doctor registered successfully! Assigned Doctor ID: ${assignedDocId}, License: ${regData.medicalLicenseNumber}`);

    // Test 3: License Verification via /api/doctors/verify
    console.log(`\nTest 3: Verifying submitted license (${validLicense}) via /api/doctors/verify...`);
    const verifyRes = await fetch(`${BASE_URL}/api/doctors/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicalLicenseNumber: validLicense })
    });
    const verifyData = await verifyRes.json();

    if (verifyRes.status === 200 && verifyData.verificationStatus === 'verified') {
      console.log(`✅ Test 3 Passed: Doctor ${verifyData.doctorId} license verified successfully!`);

      // Test 4: Login with newly verified doctor credentials
      console.log(`\nTest 4: Logging in as newly registered Doctor ${assignedDocId}...`);
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: assignedDocId,
          password: doctorPassword,
          role: 'doctor'
        })
      });
      const loginData = await loginRes.json();

      if (loginRes.status === 200 && loginData.token) {
        console.log(`✅ Test 4 Passed: Doctor ${assignedDocId} logged in successfully with verified account!`);
      } else {
        console.error(`❌ Test 4 Failed: Login failed for ${assignedDocId}:`, loginRes.status, loginData);
        process.exit(1);
      }

    } else {
      console.error('❌ Test 3 Failed:', verifyRes.status, verifyData);
      process.exit(1);
    }

  } else {
    console.error('❌ Test 2 Failed:', regRes.status, regData);
    process.exit(1);
  }

  console.log('\n✨ All Doctor License Registration & Verification Tests Passed Cleanly!');
}

runDoctorLicenseRegistrationTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
