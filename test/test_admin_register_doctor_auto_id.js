const BASE_URL = 'http://localhost:5000';

async function runAdminRegisterDoctorAutoIdTests() {
  console.log('🧪 Starting Admin Register New Doctor Auto-Generated ID Verification Test Suite...\n');

  // Step 1: Login as Administrator ADM001
  console.log('Step 1: Logging in as Administrator ADM001...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'ADM001', password: 'admin123', role: 'administrator' })
  });
  const loginData = await loginRes.json();
  const adminToken = loginData.token;

  if (loginRes.status !== 200 || !adminToken) {
    console.error('❌ Admin login failed:', loginRes.status, loginData);
    process.exit(1);
  }
  console.log('✅ Administrator ADM001 logged in successfully!');

  // Step 2: Fetch existing doctors to get current ID list
  console.log('\nStep 2: Fetching existing doctors list before registration...');
  const initialDocsRes = await fetch(`${BASE_URL}/api/admin/doctors`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const initialDocs = await initialDocsRes.json();
  const existingDocIds = initialDocs.map(d => d.doctorId);
  console.log('Existing Doctor IDs:', existingDocIds);

  // Step 3: Admin registers new doctor WITHOUT manual Doctor ID input
  console.log('\nStep 3: Registering a new doctor via Admin Dashboard (auto-generating Doctor ID)...');
  const uniqueTimestamp = Date.now();
  const newDoctorPayload = {
    name: `Dr. Vikram Malhotra ${uniqueTimestamp.toString().slice(-4)}`,
    email: `vikram_${uniqueTimestamp}@meditrack.org`,
    specialty: 'Cardiology',
    department: 'Cardiology',
    medicalLicenseNumber: `MCI-LIC-${uniqueTimestamp}`,
    phone: '+91 91234 56789',
    location: 'Kurnool',
    password: 'docPassword123'
  };

  const createRes = await fetch(`${BASE_URL}/api/admin/doctors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(newDoctorPayload)
  });

  const createData = await createRes.json();

  if (createRes.status === 201 && createData.doctorId) {
    const assignedId = createData.doctorId;
    console.log(`✅ Step 3 Passed: Doctor registered successfully with auto-generated ID: ${assignedId}!`);

    // Verify auto-generated ID format and uniqueness
    if (/^DOC\d{3,}$/i.test(assignedId)) {
      console.log(`  - Format Check: ${assignedId} follows the standard DOCxxx pattern.`);
    } else {
      console.error(`  - Format Warning: ${assignedId} does not match DOCxxx pattern.`);
    }

    if (!existingDocIds.includes(assignedId)) {
      console.log(`  - Uniqueness Check: ${assignedId} is completely unique and did not reuse any existing ID!`);
    } else {
      console.error(`❌ Uniqueness Error: ${assignedId} collided with an existing ID!`);
      process.exit(1);
    }

    // Step 4: Verify new doctor appears in Admin → Doctors list
    console.log('\nStep 4: Verifying new doctor appears in Admin → Doctors list...');
    const updatedDocsRes = await fetch(`${BASE_URL}/api/admin/doctors`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const updatedDocs = await updatedDocsRes.json();
    const foundInAdmin = updatedDocs.find(d => d.doctorId === assignedId);

    if (foundInAdmin) {
      console.log(`✅ Step 4 Passed: Doctor ${assignedId} (${foundInAdmin.name}) found in Admin Doctors table!`);
    } else {
      console.error(`❌ Step 4 Failed: Doctor ${assignedId} missing from Admin Doctors table!`);
      process.exit(1);
    }

    // Step 5: Test login using the newly auto-generated Doctor ID
    console.log(`\nStep 5: Testing Doctor Login using auto-generated ID (${assignedId})...`);
    const docLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: assignedId,
        password: newDoctorPayload.password,
        role: 'doctor'
      })
    });
    const docLoginData = await docLoginRes.json();

    if (docLoginRes.status === 200 && docLoginData.token) {
      console.log(`✅ Step 5 Passed: Doctor ${assignedId} logged in successfully with auto-generated credentials!`);
    } else {
      console.error(`❌ Step 5 Failed: Login failed for Doctor ${assignedId}:`, docLoginRes.status, docLoginData);
      process.exit(1);
    }

    // Step 6: Verify existing doctors (DOC001) are still operational
    console.log('\nStep 6: Verifying existing doctor DOC001 login credentials remain unchanged...');
    const existingDocLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: 'DOC001',
        password: 'doc123',
        role: 'doctor'
      })
    });
    const existingDocLoginData = await existingDocLoginRes.json();

    if (existingDocLoginRes.status === 200 && existingDocLoginData.token) {
      console.log('✅ Step 6 Passed: Existing doctor DOC001 logged in cleanly without disruption!');
    } else {
      console.error('❌ Step 6 Failed: Existing doctor login disrupted:', existingDocLoginRes.status, existingDocLoginData);
      process.exit(1);
    }

  } else {
    console.error('❌ Step 3 Failed to register doctor:', createRes.status, createData);
    process.exit(1);
  }

  console.log('\n✨ All Admin Register New Doctor Auto-Generated ID Tests Passed Cleanly!');
}

runAdminRegisterDoctorAutoIdTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
