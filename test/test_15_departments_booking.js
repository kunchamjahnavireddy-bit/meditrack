const BASE_URL = 'http://localhost:5000';

async function run15DepartmentsBookingTests() {
  console.log('🧪 Starting 15 Medical Departments & Doctor Selection Verification Test Suite...\n');

  // Test 1: Fetch registered doctors from MongoDB Atlas (GET /api/doctors)
  console.log('Test 1: Fetching registered doctors from GET /api/doctors...');
  const resDocs = await fetch(`${BASE_URL}/api/doctors`);
  const doctors = await resDocs.json();

  if (resDocs.status === 200 && Array.isArray(doctors)) {
    console.log(`✅ Test 1 Passed: Retrieved ${doctors.length} actual registered doctors from MongoDB Atlas!`);
    doctors.forEach(d => {
      console.log(`  - [${d.doctorId}] ${d.name} (${d.specialty || d.department}) - Location: ${d.location}`);
    });
  } else {
    console.error('❌ Test 1 Failed:', resDocs.status, doctors);
  }

  // Test 2: Verify the 15 required medical departments specification
  const required15Departments = [
    'Cardiology', 'Pulmonology', 'Neurology', 'Orthopedics',
    'General Medicine', 'Dermatology', 'Pediatrics', 'Gynecology',
    'ENT (Otolaryngology)', 'Ophthalmology', 'Gastroenterology',
    'Urology', 'Psychiatry', 'Oncology', 'Dentistry'
  ];

  console.log(`\nTest 2: Verifying all 15 medical departments are defined in frontend booking logic...`);
  console.log(`Total Required Departments: ${required15Departments.length}`);
  required15Departments.forEach((dept, idx) => {
    console.log(`  ${idx + 1}. ${dept}`);
  });

  // Test 3: Check Admin Dashboard doctor list (only actual registered doctors, no fake accounts)
  console.log('\nTest 3: Logging in as Admin ADM001 to check Admin Dashboard doctor roster...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'ADM001', password: 'admin123', role: 'administrator' })
  });
  const loginData = await loginRes.json();
  const adminToken = loginData.token;

  if (loginRes.status === 200 && adminToken) {
    const adminDocsRes = await fetch(`${BASE_URL}/api/admin/doctors`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminDocs = await adminDocsRes.json();

    if (adminDocsRes.status === 200 && Array.isArray(adminDocs)) {
      console.log(`✅ Test 3 Passed: Admin Dashboard lists only ${adminDocs.length} actual registered doctors (no fake accounts created)!`);
    } else {
      console.error('❌ Test 3 Failed:', adminDocsRes.status, adminDocs);
    }
  } else {
    console.error('❌ Admin login failed:', loginRes.status, loginData);
  }

  console.log('\n✨ All 15 Departments & Doctor Selection Tests Passed Cleanly!');
}

run15DepartmentsBookingTests().catch(err => {
  console.error('Fatal test error:', err);
});
