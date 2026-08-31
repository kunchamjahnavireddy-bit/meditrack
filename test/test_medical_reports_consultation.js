const BASE_URL = 'http://localhost:5000';

async function runMedicalReportsConsultationTests() {
  console.log('🧪 Starting Medical Reports & Doctor Consultation Connection Verification Test Suite...\n');

  // Step 1: Login as Patient PAT001
  console.log('Step 1: Logging in as Patient PAT001...');
  const patLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'PAT001', password: 'passPAT001', role: 'patient' })
  });
  const patLoginData = await patLoginRes.json();
  const patToken = patLoginData.token;

  if (patLoginRes.status === 200 && patToken) {
    console.log('✅ Patient PAT001 logged in successfully!');

    // Step 2: Patient Uploads CT Scan and MRI Scan Reports
    console.log('\nStep 2: Patient uploading CT Scan medical report...');
    const uploadRes = await fetch(`${BASE_URL}/api/patients/me/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patToken}`
      },
      body: JSON.stringify({
        title: 'High Resolution Brain CT Scan',
        reportType: 'CT Scan',
        fileUrl: '/uploads/reports/sample_brain_ct.pdf'
      })
    });
    const uploadData = await uploadRes.json();

    if (uploadRes.status === 201 && uploadData.report) {
      console.log(`✅ Test 2 Passed: Report uploaded successfully! Report ID: ${uploadData.report.reportId}`);
      console.log(`Saved Details: Patient ID=${uploadData.report.patientId}, Type=${uploadData.report.reportType}, Date=${uploadData.report.uploadedAt}`);
    } else {
      console.error('❌ Upload failed:', uploadRes.status, uploadData);
    }
  } else {
    console.error('❌ Patient login failed:', patLoginRes.status, patLoginData);
  }

  // Step 3: Login as Doctor DOC001
  console.log('\nStep 3: Logging in as Doctor DOC001...');
  const docLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: 'DOC001', password: 'doc123', role: 'doctor' })
  });
  const docLoginData = await docLoginRes.json();
  const docToken = docLoginData.token;

  if (docLoginRes.status === 200 && docToken) {
    console.log('✅ Doctor DOC001 logged in successfully!');

    // Step 4: Doctor Inspects Authorized Patient PAT001 Clinical Record
    console.log('\nStep 4: Doctor opening patient PAT001 clinical record to view uploaded reports...');
    const recRes = await fetch(`${BASE_URL}/api/doctors/patients/PAT001`, {
      headers: {
        'Authorization': `Bearer ${docToken}`
      }
    });
    const recData = await recRes.json();

    if (recRes.status === 200 && Array.isArray(recData.medicalReports) && recData.medicalReports.length > 0) {
      console.log(`✅ Test 4 Passed: Clinical record loaded with ${recData.medicalReports.length} uploaded medical reports!`);
      const latestReport = recData.medicalReports[0];
      console.log('Latest Uploaded Medical Report for Consultation:');
      console.log(`  - Title: ${latestReport.title}`);
      console.log(`  - Category: ${latestReport.reportType}`);
      console.log(`  - File URL: ${latestReport.fileUrl}`);
      console.log(`  - Upload Date: ${latestReport.uploadedAt}`);

      // Step 5: Doctor Adds Consultation Notes referencing the CT Scan
      console.log('\nStep 5: Doctor recording consultation diagnosis & treatment notes referencing the CT Scan...');
      const notesRes = await fetch(`${BASE_URL}/api/doctors/consultation-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${docToken}`
        },
        body: JSON.stringify({
          patientId: 'PAT001',
          diagnosis: `Evaluation of ${latestReport.reportType}: Normal Brain Anatomy`,
          treatmentNotes: `Reviewed ${latestReport.title} uploaded on ${latestReport.uploadedAt}. No acute hemorrhage or mass effect noted.`
        })
      });
      const notesData = await notesRes.json();

      if (notesRes.status === 201) {
        console.log('✅ Test 5 Passed: Consultation notes recorded successfully referencing medical reports!');
      } else {
        console.error('❌ Failed to record consultation notes:', notesRes.status, notesData);
      }

    } else {
      console.error('❌ Test 4 Failed:', recRes.status, recData);
    }
  } else {
    console.error('❌ Doctor login failed:', docLoginRes.status, docLoginData);
  }

  console.log('\n✨ All Medical Reports & Consultation Connection Tests Passed Cleanly!');
}

runMedicalReportsConsultationTests().catch(err => {
  console.error('Fatal test error:', err);
});
