// MediTrack - Unified Authentication Controller with bcryptjs Verification & Status Enforcement

const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Receptionist = require('../models/Receptionist');
const User = require('../models/User');
const { verifyPassword } = require('../utils/hash');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { loginId, password, role } = req.body;
    const rawInput = (loginId || req.body.username || req.body.email || '').trim();
    const inputId = rawInput.toUpperCase();
    const inputPass = (password || '').trim();
    const inputRole = (role || '').trim().toLowerCase();

    if (!rawInput || !inputPass) {
      return res.status(400).json({ error: "Please enter your Login ID or Email and password." });
    }

    const isEmail = rawInput.includes('@');

    // 1. ADMIN AUTHENTICATION (ADM001... OR Admin Email)
    if (inputId.startsWith('ADM') || inputRole === 'admin' || (isEmail && rawInput.toLowerCase().includes('admin'))) {
      let adminUser = null;

      if (getIsConnectedToMongo()) {
        adminUser = await User.findOne({
          role: 'admin',
          $or: [
            { loginId: inputId },
            { adminId: inputId },
            { loginId: rawInput.toLowerCase() }
          ]
        });
      } else {
        adminUser = memoryStore.users.find(
          u => u.role === 'admin' && (u.loginId.toUpperCase() === inputId || (u.adminId && u.adminId.toUpperCase() === inputId))
        );
      }

      if (adminUser) {
        const accStatus = adminUser.accountStatus || 'active';
        if (accStatus === 'deleted' || adminUser.isDeleted) {
          return res.status(403).json({ error: "Account deleted. Please contact the administrator." });
        }
        if (accStatus === 'inactive' || accStatus === 'suspended') {
          return res.status(403).json({ error: "Admin account is inactive. Please contact system support." });
        }

        const isMatch = verifyPassword(inputPass, adminUser.passwordHash);
        if (isMatch) {
          const userObj = {
            loginId: adminUser.loginId,
            role: 'admin',
            fullName: adminUser.fullName || 'System Administrator',
            adminId: adminUser.adminId || adminUser.loginId
          };

          const token = Buffer.from(JSON.stringify(userObj)).toString('base64');
          return res.json({ token, user: userObj });
        }
      }
    }

    // 2. PATIENT AUTHENTICATION (PAT001, PAT002... OR Email)
    if (inputId.startsWith('PAT') || inputRole === 'patient' || isEmail) {
      let patient = null;
      let userRecord = null;

      if (getIsConnectedToMongo()) {
        patient = await Patient.findOne({
          $or: [
            { patientId: inputId },
            { email: rawInput.toLowerCase() }
          ]
        });
        if (patient) {
          userRecord = await User.findOne({ loginId: patient.patientId });
        }
      } else {
        patient = memoryStore.patients.find(
          p => p.patientId.toUpperCase() === inputId || (p.email && p.email.toLowerCase() === rawInput.toLowerCase())
        );
        if (patient) {
          userRecord = memoryStore.users.find(u => u.loginId.toUpperCase() === patient.patientId && u.role === 'patient');
        }
      }

      if (patient || userRecord) {
        // Check Patient Account Status
        const accStatus = (patient && patient.accountStatus) || (userRecord && userRecord.accountStatus) || 'active';
        const isDel = (patient && patient.isDeleted) || (userRecord && userRecord.isDeleted);
        if (accStatus === 'deleted' || isDel) {
          return res.status(403).json({ error: "Account deleted. Please contact the administrator." });
        }
        if (accStatus === 'deceased') {
          return res.status(403).json({ error: "This patient account is marked as Deceased." });
        }
        if (accStatus === 'inactive') {
          return res.status(403).json({ error: "Account is inactive. Please contact the hospital administrator." });
        }

        const targetHash = (patient && patient.password) || (userRecord && userRecord.passwordHash);
        const isMatch = verifyPassword(inputPass, targetHash);

        if (isMatch) {
          const patId = (patient && patient.patientId) || (userRecord && userRecord.patientId) || inputId;
          const fullName = (patient && patient.fullName) || (userRecord && userRecord.fullName) || 'Patient';

          const userObj = {
            loginId: patId,
            role: 'patient',
            fullName: fullName,
            patientId: patId
          };

          const token = Buffer.from(JSON.stringify(userObj)).toString('base64');
          return res.json({ token, user: userObj });
        }
      }
    }

    // 3. DOCTOR AUTHENTICATION (DOC001, DOC002... OR Email)
    if (inputId.startsWith('DOC') || inputRole === 'doctor' || isEmail) {
      let doctor = null;
      let userRecord = null;

      if (getIsConnectedToMongo()) {
        doctor = await Doctor.findOne({
          $or: [
            { doctorId: inputId },
            { medicalLicenseNumber: inputId },
            { email: rawInput.toLowerCase() }
          ]
        });
        if (doctor && doctor.doctorId) {
          userRecord = await User.findOne({ loginId: doctor.doctorId, role: 'doctor' });
        }
      } else {
        doctor = memoryStore.doctors.find(
          d => (d.doctorId && d.doctorId.toUpperCase() === inputId) ||
               (d.medicalLicenseNumber && d.medicalLicenseNumber.toUpperCase() === inputId) ||
               (d.email && d.email.toLowerCase() === rawInput.toLowerCase())
        );
        if (doctor && doctor.doctorId) {
          userRecord = memoryStore.users.find(u => u.loginId.toUpperCase() === doctor.doctorId && u.role === 'doctor');
        }
      }

      if (doctor || userRecord) {
        const verStatus = (doctor && doctor.verificationStatus) || (userRecord && userRecord.verificationStatus) || 'pending';
        if (verStatus === 'pending') {
          return res.status(403).json({ error: "Doctor account is awaiting verification." });
        }
        if (verStatus === 'rejected') {
          return res.status(403).json({ error: "Doctor registration was rejected by hospital administration." });
        }

        const accStatus = (doctor && doctor.accountStatus) || (userRecord && userRecord.accountStatus) || 'active';
        const isDel = (doctor && doctor.isDeleted) || (userRecord && userRecord.isDeleted);
        if (accStatus === 'deleted' || isDel) {
          return res.status(403).json({ error: "Account deleted. Please contact the administrator." });
        }
        if (accStatus === 'suspended') {
          return res.status(403).json({ error: "Your doctor account has been suspended. Please contact the administrator." });
        }
        if (accStatus === 'inactive') {
          return res.status(403).json({ error: "Account is inactive. Please contact the hospital administrator." });
        }

        const targetHash = (doctor && doctor.password) || (userRecord && userRecord.passwordHash);
        const isMatch = verifyPassword(inputPass, targetHash);

        if (isMatch) {
          const docId = (doctor && doctor.doctorId) || (userRecord && userRecord.doctorId) || inputId;
          const fullName = (doctor && doctor.name) || (userRecord && userRecord.fullName) || 'Doctor';

          const userObj = {
            loginId: docId,
            role: 'doctor',
            fullName: fullName,
            doctorId: docId,
            verificationStatus: verStatus
          };

          const token = Buffer.from(JSON.stringify(userObj)).toString('base64');
          return res.json({ token, user: userObj });
        }
      }
    }

    // 4. RECEPTIONIST AUTHENTICATION (REC001, REC002...)
    if (inputId.startsWith('REC') || inputRole === 'receptionist') {
      let rec = null;
      let userRecord = null;

      if (getIsConnectedToMongo()) {
        rec = await Receptionist.findOne({ receptionistId: inputId });
        userRecord = await User.findOne({ loginId: inputId, role: 'receptionist' });
      } else {
        rec = memoryStore.receptionists.find(r => r.receptionistId.toUpperCase() === inputId);
        userRecord = memoryStore.users.find(u => u.loginId.toUpperCase() === inputId && u.role === 'receptionist');
      }

      if (rec || userRecord) {
        const accStatus = (rec && rec.accountStatus) || (userRecord && userRecord.accountStatus) || 'active';
        const isDel = (rec && rec.isDeleted) || (userRecord && userRecord.isDeleted);
        if (accStatus === 'deleted' || isDel) {
          return res.status(403).json({ error: "Account deleted. Please contact the administrator." });
        }
        if (accStatus === 'inactive') {
          return res.status(403).json({ error: "Your receptionist account is inactive. Please contact the administrator." });
        }

        const targetHash = (rec && rec.password) || (userRecord && userRecord.passwordHash);
        const isMatch = verifyPassword(inputPass, targetHash);

        if (isMatch) {
          const recId = (rec && rec.receptionistId) || (userRecord && userRecord.receptionistId) || inputId;
          const fullName = (rec && rec.fullName) || (userRecord && userRecord.fullName) || 'Receptionist';

          const userObj = {
            loginId: recId,
            role: 'receptionist',
            fullName: fullName,
            receptionistId: recId
          };

          const token = Buffer.from(JSON.stringify(userObj)).toString('base64');
          return res.json({ token, user: userObj });
        }
      }
    }

    // Default 401 response if authentication failed
    const defaultErr = inputRole === 'admin' ? "Invalid Admin ID or Password." :
                       inputRole === 'doctor' ? "Invalid Doctor ID/Email or Password." :
                       inputRole === 'receptionist' ? "Invalid Receptionist ID or Password." :
                       "Invalid Patient ID/Email or Password.";
    return res.status(401).json({ error: defaultErr });

  } catch (err) {
    console.error("Auth login error:", err);
    res.status(500).json({ error: "Authentication server error." });
  }
};
