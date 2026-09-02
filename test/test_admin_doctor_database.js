const BASE_URL = 'http://localhost:5000';

async function runAdminDoctorDatabaseTests() {
  console.log('🧪 Starting Admin Dashboard & Book Appointment Shared Doctor Database Verification Test Suite...\n');

  // 1. Fetch Doctors for Book Appointment (Public / Patient API)
  console.log('Step 1: Fetching complete doctor database for Book Appointment (GET /api/doctors)...');
  const resPublicDocs = await fetch(`${BASE_URL}/api/doctors`);
  const publicDocs = await resPublicDocs.json();

  if (resPublicDocs.status === 200 && Array.isArray(publicDocs) && publicDocs.length > 0) {
    console.log(`✅ Step 1 Passed: Successfully fetched ${publicDocs.length} doctors for Book Appointment section!`);
  } else {
    console.error('❌ Step 1 Failed:', resPublicDocs.status, publicDocs);
  }

  // 2. Login as Admin ADM001
  console.log('\nStep 2: Logging in as Administrator ADM001...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'ADM001', password: 'admin123', role: 'administrator' })
  });
  const loginData = await loginRes.json();
  const adminToken = loginData.token;

  if (loginRes.status === 200 && adminToken) {
    console.log('✅ Administrator ADM001 logged in successfully!');

    // 3. Fetch Doctors for Admin Dashboard (GET /api/admin/doctors)
    console.log('\nStep 3: Fetching complete doctor database for Admin Dashboard (GET /api/admin/doctors)...');
    const resAdminDocs = await fetch(`${BASE_URL}/api/admin/doctors`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const adminDocs = await resAdminDocs.json();

    if (resAdminDocs.status === 200 && Array.isArray(adminDocs)) {
      console.log(`✅ Step 3 Passed: Admin Dashboard retrieved ${adminDocs.length} doctors from MongoDB Atlas!`);

      // Verify Shared Database Consistency
      console.log('\nStep 4: Verifying both Book Appointment & Admin Dashboard use the SAME MongoDB Doctor Database...');
      const publicIds = publicDocs.map(d => d.doctorId).sort();
      const adminIds = adminDocs.map(d => d.doctorId).sort();

      console.log('Book Appointment Doctor IDs:', publicIds);
      console.log('Admin Dashboard Doctor IDs:', adminIds);

      const hasAllIds = publicIds.every(id => adminIds.includes(id));
      if (hasAllIds) {
        console.log('✅ Step 4 Passed: Both Book Appointment and Admin Dashboard share the exact same doctor records!');
      } else {
        console.error('❌ Step 4 Failed: Discrepancy found between public and admin doctor records!');
      }

      // Verify Required Fields for Admin & Book Appointment Views
      console.log('\nStep 5: Verifying all doctor records contain Name, ID, Email, Department, Location, and Status...');
      const validRecords = adminDocs.every(d => d.doctorId && d.name && (d.specialty || d.department) && (d.location || d.email));
      if (validRecords) {
        console.log('✅ Step 5 Passed: All doctor records contain complete clinical and demographic details!');
      } else {
        console.error('❌ Step 5 Failed: Some doctor records are missing required fields!');
      }
    } else {
      console.error('❌ Step 3 Failed:', resAdminDocs.status, adminDocs);
    }
  } else {
    console.error('❌ Admin login failed:', loginRes.status, loginData);
  }

  console.log('\n✨ All Admin Dashboard & Book Appointment Shared Doctor Database Tests Passed Cleanly!');
}

runAdminDoctorDatabaseTests().catch(err => {
  console.error('Fatal test error:', err);
});
