const BASE_URL = 'http://localhost:5000';

async function runLandingPageDoctorsSyncTests() {
  console.log('🧪 Starting Landing Page Doctors Carousel & Book Appointment Sync Verification Test Suite...\n');

  // Test 1: Fetch active doctors from GET /api/doctors (the shared database API)
  console.log('Test 1: Fetching active doctors from shared API (GET /api/doctors)...');
  const resDocs = await fetch(`${BASE_URL}/api/doctors`);
  const doctors = await resDocs.json();

  if (resDocs.status === 200 && Array.isArray(doctors) && doctors.length > 0) {
    console.log(`✅ Test 1 Passed: Retrieved ${doctors.length} active doctors from shared MongoDB Atlas API!`);
    doctors.forEach(d => {
      console.log(`  - [${d.doctorId}] ${d.name} (${d.specialty || d.department}) - Location: ${d.location}`);
    });
  } else {
    console.error('❌ Test 1 Failed:', resDocs.status, doctors);
    process.exit(1);
  }

  // Test 2: Verify public/index.html includes loadLandingDoctorsCarousel calling /api/doctors
  console.log('\nTest 2: Verifying Landing Page (public/index.html) fetches from /api/doctors...');
  const resIndex = await fetch(`${BASE_URL}/index.html`);
  const htmlText = await resIndex.text();

  if (htmlText.includes('loadLandingDoctorsCarousel') && htmlText.includes("fetch('/api/doctors')")) {
    console.log('✅ Test 2 Passed: Landing page includes dynamic carousel script calling GET /api/doctors!');
  } else {
    console.error('❌ Test 2 Failed: Landing page does not include dynamic doctor carousel fetch script!');
    process.exit(1);
  }

  // Test 3: Verify side arrows and carousel elements exist in public/index.html
  console.log('\nTest 3: Verifying side arrows and carousel container structure in index.html...');
  if (htmlText.includes('scrollDoctorsCarousel(-1)') && htmlText.includes('scrollDoctorsCarousel(1)') && htmlText.includes('id="doctors-carousel-track"')) {
    console.log('✅ Test 3 Passed: Side arrows (← / →) and #doctors-carousel-track container verified!');
  } else {
    console.error('❌ Test 3 Failed: Carousel structure or arrows missing!');
    process.exit(1);
  }

  console.log('\n✨ All Landing Page & Book Appointment Doctor Sync Tests Passed Cleanly!');
}

runLandingPageDoctorsSyncTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
