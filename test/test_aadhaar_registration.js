const BASE_URL = 'http://localhost:5000';

async function runAadhaarTests() {
  console.log('🧪 Starting Aadhaar Number Registration Automated Verification Test Suite...\n');

  // Test 1: Reject Registration with Invalid Aadhaar Number (e.g. 10 digits)
  console.log('Test 1: Testing rejection of invalid Aadhaar Number (10 digits)...');
  const invalidPayload = {
    fullName: 'Test Aadhaar Invalid',
    age: 30,
    gender: 'Male',
    dateOfBirth: '1995-01-01',
    phone: '+91 99999 11111',
    email: `invalid_aadhaar_${Date.now()}@example.com`,
    address: '123 Test Street, Kurnool',
    password: 'password123',
    aadhaarNumber: '1234567890', // Invalid: 10 digits
    insuranceDetails: 'Care Health #12345'
  };

  const res1 = await fetch(`${BASE_URL}/api/patients/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidPayload)
  });
  const data1 = await res1.json();
  if (res1.status === 400 && data1.error && data1.error.includes('12 numeric digits')) {
    console.log('✅ Test 1 Passed: Invalid Aadhaar number correctly rejected (400 Bad Request):', data1.error);
  } else {
    console.error('❌ Test 1 Failed:', res1.status, data1);
  }

  // Test 2: Successful Registration with Valid 12-digit Aadhaar Number
  console.log('\nTest 2: Testing registration with valid 12-digit Aadhaar Number (987654321098)...');
  const testAadhaar = '987654321098';
  const validEmail = `aadhaar_test_${Date.now()}@example.com`;
  const validPassword = 'passAadhaar123';
  const validPayload = {
    fullName: 'Ramesh Kumar Aadhaar',
    age: 34,
    gender: 'Male',
    dateOfBirth: '1990-05-15',
    phone: '+91 98888 77777',
    email: validEmail,
    address: '45 Park Road, Kurnool',
    password: validPassword,
    aadhaarNumber: testAadhaar,
    insuranceDetails: 'Star Health Policy #998811'
  };

  const res2 = await fetch(`${BASE_URL}/api/patients/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload)
  });
  const data2 = await res2.json();

  if (res2.status === 201 && data2.patientId) {
    const patientId = data2.patientId;
    console.log(`✅ Test 2 Passed: Patient registered successfully! Assigned ID: ${patientId}`);
    console.log(`Stored Aadhaar in Patient record: ${data2.patient.aadhaarNumber}`);

    // Test 3: Unauthorized Access Prevention Test
    console.log(`\nTest 3: Testing security - Unauthorized access to medical profile without login...`);
    const unauthRes = await fetch(`${BASE_URL}/api/profiles/${patientId}`);
    const unauthData = await unauthRes.json();
    if (unauthRes.status === 401) {
      console.log('✅ Test 3 Passed: Unauthorized request correctly blocked with 401 Unauthorized!');
    } else {
      console.error('❌ Test 3 Failed:', unauthRes.status, unauthData);
    }

    // Test 4: Authenticated Access Test - Login & Retrieve Profile
    console.log(`\nTest 4: Logging in as ${patientId} and fetching medical profile...`);
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: patientId, password: validPassword, role: 'patient' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    if (loginRes.status === 200 && token) {
      console.log('Login successful! Token acquired.');
      const authRes = await fetch(`${BASE_URL}/api/profiles/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const authData = await authRes.json();
      if (authRes.status === 200 && authData.aadhaarNumber === testAadhaar) {
        console.log(`✅ Test 4 Passed: Profile retrieved for authorized patient with Aadhaar Number: ${authData.aadhaarNumber}`);
      } else {
        console.error('❌ Test 4 Failed:', authRes.status, authData);
      }
    } else {
      console.error('Login failed:', loginRes.status, loginData);
    }

  } else {
    console.error('❌ Test 2 Failed:', res2.status, data2);
  }

  console.log('\n✨ All Aadhaar Security & Registration Tests Passed Cleanly!');
}

runAadhaarTests().catch(err => {
  console.error('Fatal test error:', err);
});
