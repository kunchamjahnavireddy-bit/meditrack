// MediTrack - Patient Registration & Management Controller

const Patient = require('../models/Patient');
const PatientProfile = require('../models/PatientProfile');
const MedicalReport = require('../models/MedicalReport');
const User = require('../models/User');
const { hashPassword } = require('../utils/hash');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// Helper: Generate next unique Patient ID (PAT001, PAT002...) safely based on max existing ID
const generateNextPatientId = async () => {
  if (getIsConnectedToMongo()) {
    const allPatients = await Patient.find({}, { patientId: 1 });
    let maxNum = 0;
    allPatients.forEach(p => {
      if (p.patientId && p.patientId.toUpperCase().startsWith('PAT')) {
        const num = parseInt(p.patientId.toUpperCase().replace('PAT', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    let nextNum = maxNum + 1;
    let candidate = `PAT${String(nextNum).padStart(3, '0')}`;
    while (await Patient.findOne({ patientId: candidate })) {
      nextNum++;
      candidate = `PAT${String(nextNum).padStart(3, '0')}`;
    }
    return candidate;
  } else {
    let maxNum = 0;
    memoryStore.patients.forEach(p => {
      if (p.patientId && p.patientId.toUpperCase().startsWith('PAT')) {
        const num = parseInt(p.patientId.toUpperCase().replace('PAT', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    let nextNum = maxNum + 1;
    let candidate = `PAT${String(nextNum).padStart(3, '0')}`;
    while (memoryStore.patients.some(p => p.patientId.toUpperCase() === candidate)) {
      nextNum++;
      candidate = `PAT${String(nextNum).padStart(3, '0')}`;
    }
    return candidate;
  }
};

// GET /api/patients/next-id
exports.getNextPatientId = async (req, res) => {
  try {
    const nextId = await generateNextPatientId();
    res.json({ nextPatientId: nextId });
  } catch (err) {
    console.error("Error generating next patient ID:", err);
    res.status(500).json({ error: "Failed to generate patient ID" });
  }
};

// POST /api/patients (Public Self-Registration for Patients)
exports.registerPatient = async (req, res) => {
  try {
    const { fullName, age, gender, dateOfBirth, phone, email, address, patientLocation, password, latitude, longitude, aadhaarNumber, insuranceDetails } = req.body;

    if (!fullName || !phone || !email || !password) {
      return res.status(400).json({ error: "Full Name, Phone Number, Email Address, and Password are required for registration." });
    }

    const cleanAadhaar = aadhaarNumber ? String(aadhaarNumber).trim().replace(/\s+/g, '') : '';
    if (!cleanAadhaar || !/^\d{12}$/.test(cleanAadhaar)) {
      return res.status(400).json({ error: "Aadhaar Number is required and must be exactly 12 numeric digits." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate account by email
    if (getIsConnectedToMongo()) {
      const existing = await Patient.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({ error: "An account with this email address already exists. Please login." });
      }
    } else {
      const existing = memoryStore.patients.find(p => p.email && p.email.toLowerCase() === cleanEmail);
      if (existing) {
        return res.status(400).json({ error: "An account with this email address already exists. Please login." });
      }
    }

    const patientId = await generateNextPatientId();
    const hashedPassword = hashPassword(password.trim());
    const locationStr = (patientLocation && patientLocation.trim()) ? patientLocation.trim() : (address ? address.split(',')[0].trim() : 'Kurnool');
    const insuranceStr = (insuranceDetails && insuranceDetails.trim()) ? insuranceDetails.trim() : 'None';

    const newPatient = {
      patientId,
      password: hashedPassword,
      fullName: fullName.trim(),
      age: age ? Number(age) : 30,
      gender: gender || 'Other',
      dateOfBirth: dateOfBirth || '1995-01-01',
      phone: phone.trim(),
      email: cleanEmail,
      address: (address && address.trim()) ? address.trim() : 'Kurnool',
      patientLocation: locationStr,
      aadhaarNumber: cleanAadhaar,
      accountStatus: 'active',
      location: {
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null
      },
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      const createdPatient = await Patient.create(newPatient);

      // Seed medical profile with Aadhaar & Insurance details
      await PatientProfile.create({
        patientId,
        bloodGroup: 'Not Specified',
        allergies: 'None',
        existingDiseases: 'None',
        medicalHistory: 'None',
        currentMedications: 'None',
        emergencyName: '',
        emergencyPhone: '',
        insuranceDetails: insuranceStr,
        aadhaarNumber: cleanAadhaar
      });

      // Seed User authentication record
      await User.create({
        loginId: patientId,
        passwordHash: hashedPassword,
        role: 'patient',
        fullName: fullName.trim(),
        patientId: patientId,
        accountStatus: 'active',
        verificationStatus: 'verified'
      });

      return res.status(201).json({
        message: "Registration Successful!",
        patientId: createdPatient.patientId,
        patient: createdPatient
      });
    } else {
      memoryStore.patients.push(newPatient);

      memoryStore.profiles.push({
        patientId,
        bloodGroup: 'Not Specified',
        allergies: 'None',
        existingDiseases: 'None',
        medicalHistory: 'None',
        currentMedications: 'None',
        emergencyName: '',
        emergencyPhone: '',
        insuranceDetails: insuranceStr,
        aadhaarNumber: cleanAadhaar,
        updatedAt: new Date()
      });

      memoryStore.users.push({
        loginId: patientId,
        passwordHash: hashedPassword,
        role: 'patient',
        fullName: fullName.trim(),
        patientId: patientId,
        accountStatus: 'active',
        verificationStatus: 'verified'
      });

      return res.status(201).json({
        message: "Registration Successful!",
        patientId,
        patient: newPatient
      });
    }
  } catch (err) {
    console.error("Error registering patient:", err);
    res.status(500).json({ error: "Failed to register patient." });
  }
};

// PUT or POST /api/patients/:patientId (Safe Partial Demographic Update preserving authentication)
exports.updatePatient = async (req, res) => {
  try {
    const pid = req.params.patientId.toUpperCase();
    const { fullName, age, gender, dateOfBirth, phone, email, address, patientLocation, latitude, longitude } = req.body;

    const updateData = {};
    if (fullName !== undefined && String(fullName).trim() !== '') updateData.fullName = String(fullName).trim();
    if (age !== undefined && age !== '') updateData.age = Number(age);
    if (gender !== undefined && gender !== '') updateData.gender = gender;
    if (dateOfBirth !== undefined && dateOfBirth !== '') updateData.dateOfBirth = dateOfBirth;
    if (phone !== undefined && String(phone).trim() !== '') updateData.phone = String(phone).trim();
    if (email !== undefined && String(email).trim() !== '') updateData.email = String(email).trim().toLowerCase();
    if (address !== undefined && String(address).trim() !== '') updateData.address = String(address).trim();
    if (patientLocation !== undefined && String(patientLocation).trim() !== '') updateData.patientLocation = String(patientLocation).trim();

    if (latitude !== undefined || longitude !== undefined) {
      updateData.location = {
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null
      };
    }

    if (getIsConnectedToMongo()) {
      const existingPatient = await Patient.findOne({ patientId: pid });
      if (!existingPatient) {
        return res.status(404).json({ error: `Patient ID ${pid} not found.` });
      }

      const updatedPatient = await Patient.findOneAndUpdate(
        { patientId: pid },
        { $set: updateData },
        { new: true }
      );

      if (updateData.fullName) {
        await User.findOneAndUpdate(
          { loginId: pid },
          { $set: { fullName: updateData.fullName } },
          { new: true }
        );
      }

      return res.json({ message: "Patient information updated successfully.", patient: updatedPatient });
    } else {
      const patient = memoryStore.patients.find(p => p.patientId.toUpperCase() === pid);
      if (!patient) {
        return res.status(404).json({ error: `Patient ID ${pid} not found.` });
      }

      Object.assign(patient, updateData);

      const userRecord = memoryStore.users.find(u => u.loginId.toUpperCase() === pid);
      if (userRecord && updateData.fullName) {
        userRecord.fullName = updateData.fullName;
      }

      return res.json({ message: "Patient information updated successfully.", patient });
    }
  } catch (err) {
    console.error("Error updating patient:", err);
    res.status(500).json({ error: "Failed to update patient details." });
  }
};

// POST /api/patients/me/reports (Patient Medical Document Upload)
exports.uploadMedicalReport = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'patient' || !req.user.patientId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated patients can upload medical reports." });
    }

    const patientId = req.user.patientId.toUpperCase();
    const { title, reportType } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Report Title is required." });
    }

    let fileUrl = req.body.fileUrl || '#';
    if (req.file) {
      fileUrl = `/uploads/reports/${req.file.filename}`;
    }

    const reportId = 'REP-' + Date.now();
    const newReport = {
      reportId,
      patientId,
      title: title.trim(),
      reportType: reportType || 'Other Medical Report',
      fileUrl: fileUrl,
      fileName: req.file ? req.file.originalname : 'Document',
      uploadedAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await MedicalReport.create(newReport);
    } else {
      if (!memoryStore.medicalReports) memoryStore.medicalReports = [];
      memoryStore.medicalReports.unshift(newReport);
    }

    return res.status(201).json({
      message: "Medical report uploaded successfully!",
      report: newReport
    });
  } catch (err) {
    console.error("Error uploading medical report:", err);
    res.status(500).json({ error: err.message || "Failed to upload medical report." });
  }
};

// GET /api/patients/me/reports (Get Authenticated Patient's Reports)
exports.getPatientMedicalReports = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'patient' || !req.user.patientId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated patients can access their reports." });
    }

    const patientId = req.user.patientId.toUpperCase();

    if (getIsConnectedToMongo()) {
      const reports = await MedicalReport.find({ patientId }).sort({ uploadedAt: -1 });
      return res.json(reports);
    } else {
      const reports = (memoryStore.medicalReports || []).filter(r => r.patientId.toUpperCase() === patientId);
      return res.json(reports);
    }
  } catch (err) {
    console.error("Error fetching patient medical reports:", err);
    res.status(500).json({ error: "Failed to retrieve medical reports." });
  }
};

// GET /api/patients
exports.getPatients = async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim().toUpperCase() : '';

    if (getIsConnectedToMongo()) {
      let filter = {};
      if (query) {
        filter = {
          $or: [
            { patientId: new RegExp(query, 'i') },
            { fullName: new RegExp(query, 'i') },
            { phone: new RegExp(query, 'i') }
          ]
        };
      }
      const patients = await Patient.find(filter).select('-password').sort({ createdAt: -1 });
      return res.json(patients);
    } else {
      let patients = memoryStore.patients;
      if (query) {
        patients = patients.filter(p =>
          p.patientId.toUpperCase().includes(query) ||
          p.fullName.toUpperCase().includes(query) ||
          p.phone.includes(query)
        );
      }
      return res.json(patients);
    }
  } catch (err) {
    console.error("Error searching patients:", err);
    res.status(500).json({ error: "Failed to search patients." });
  }
};

// GET /api/patients/:patientId
exports.getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (getIsConnectedToMongo()) {
      const patient = await Patient.findOne({ patientId: patientId.toUpperCase() }).select('-password');
      if (!patient) {
        return res.status(404).json({ error: `Patient ID ${patientId} not found.` });
      }
      return res.json(patient);
    } else {
      const patient = memoryStore.patients.find(p => p.patientId.toUpperCase() === patientId.toUpperCase());
      if (!patient) {
        return res.status(404).json({ error: `Patient ID ${patientId} not found.` });
      }
      return res.json(patient);
    }
  } catch (err) {
    console.error("Error getting patient by ID:", err);
    res.status(500).json({ error: "Failed to retrieve patient details." });
  }
};
