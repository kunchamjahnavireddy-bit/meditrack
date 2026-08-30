// MediTrack - Doctor Controller with Emergency Access Audit Logging, Clinical Notes & Patient Record Inspector

const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const PatientProfile = require('../models/PatientProfile');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const ConsultationNote = require('../models/ConsultationNote');
const MedicalReport = require('../models/MedicalReport');
const EmergencyAccessLog = require('../models/EmergencyAccessLog');
const User = require('../models/User');
const { hashPassword } = require('../utils/hash');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// Helper: Sanitize missing values to "Not provided" (never undefined or null)
const sanitize = (val) => (val && String(val).trim() !== '' && val !== 'null' && val !== 'undefined') ? String(val).trim() : 'Not provided';

// Helper: Generate next Doctor ID
const generateNextDoctorId = async () => {
  if (getIsConnectedToMongo()) {
    const allDoctors = await Doctor.find({}, { doctorId: 1 });
    let maxNum = 0;
    allDoctors.forEach(d => {
      if (d.doctorId && d.doctorId.toUpperCase().startsWith('DOC')) {
        const num = parseInt(d.doctorId.toUpperCase().replace('DOC', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    let nextNum = maxNum + 1;
    let candidate = `DOC${String(nextNum).padStart(3, '0')}`;
    while (await Doctor.findOne({ doctorId: candidate })) {
      nextNum++;
      candidate = `DOC${String(nextNum).padStart(3, '0')}`;
    }
    return candidate;
  } else {
    let maxNum = 0;
    (memoryStore.doctors || []).forEach(d => {
      if (d.doctorId && d.doctorId.toUpperCase().startsWith('DOC')) {
        const num = parseInt(d.doctorId.toUpperCase().replace('DOC', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    let nextNum = maxNum + 1;
    let candidate = `DOC${String(nextNum).padStart(3, '0')}`;
    while ((memoryStore.doctors || []).some(d => d.doctorId && d.doctorId.toUpperCase() === candidate)) {
      nextNum++;
      candidate = `DOC${String(nextNum).padStart(3, '0')}`;
    }
    return candidate;
  }
};

// GET /api/doctors/me (Returns authenticated doctor's professional profile)
exports.getDoctorProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor' || !req.user.doctorId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated doctors can view their profile." });
    }

    const doctorId = req.user.doctorId.toUpperCase();
    let doc = null;

    if (getIsConnectedToMongo()) {
      doc = await Doctor.findOne({ doctorId: { $regex: new RegExp(`^${doctorId}$`, 'i') } }).select('-password');
    } else {
      doc = (memoryStore.doctors || []).find(d => (d.doctorId || '').toUpperCase() === doctorId);
    }

    if (!doc) {
      return res.status(404).json({ error: "Doctor profile not found." });
    }

    return res.json(doc);
  } catch (err) {
    console.error("Error fetching doctor profile:", err);
    res.status(500).json({ error: "Failed to retrieve doctor profile." });
  }
};

// PUT /api/doctors/me (Doctor updates professional details)
exports.updateDoctorProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor' || !req.user.doctorId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated doctors can update their profile." });
    }

    const doctorId = req.user.doctorId.toUpperCase();
    const { name, specialty, department, phone, email, location } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (specialty) updateData.specialty = specialty.trim();
    if (department) updateData.department = department.trim();
    if (phone) updateData.phone = phone.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (location) updateData.location = location.trim();

    let updatedDoc = null;
    if (getIsConnectedToMongo()) {
      updatedDoc = await Doctor.findOneAndUpdate(
        { doctorId: { $regex: new RegExp(`^${doctorId}$`, 'i') } },
        { $set: updateData },
        { new: true }
      ).select('-password');
    } else {
      updatedDoc = (memoryStore.doctors || []).find(d => (d.doctorId || '').toUpperCase() === doctorId);
      if (updatedDoc) {
        Object.assign(updatedDoc, updateData);
      }
    }

    if (!updatedDoc) {
      return res.status(404).json({ error: "Doctor record not found." });
    }

    return res.json({
      message: "Doctor profile updated successfully!",
      doctor: updatedDoc
    });

  } catch (err) {
    console.error("Error updating doctor profile:", err);
    res.status(500).json({ error: "Failed to update doctor profile." });
  }
};

// GET /api/doctors/me/appointments (Returns ONLY appointments assigned to logged-in doctor)
exports.getMyDoctorAppointments = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor' || !req.user.doctorId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated doctors can view their assigned appointments." });
    }

    const doctorId = req.user.doctorId.toUpperCase();

    if (getIsConnectedToMongo()) {
      const appointments = await Appointment.find({
        doctorId: { $regex: new RegExp(`^${doctorId}$`, 'i') }
      }).sort({ appointmentDate: -1, appointmentTime: 1 }).lean();

      const patients = await Patient.find({}).lean();
      const patMap = new Map(patients.map(p => [(p.patientId || '').toUpperCase(), p]));

      const enriched = appointments.map(a => {
        const pat = patMap.get((a.patientId || '').toUpperCase()) || {};
        return {
          ...a,
          patientName: a.patientName || pat.fullName || 'Patient'
        };
      });

      return res.json(enriched);
    } else {
      const appts = (memoryStore.appointments || []).filter(a => (a.doctorId || '').toUpperCase() === doctorId);
      const pats = memoryStore.patients || [];
      const enriched = appts.map(a => {
        const pat = pats.find(p => (p.patientId || '').toUpperCase() === (a.patientId || '').toUpperCase()) || {};
        return {
          ...a,
          patientName: a.patientName || pat.fullName || 'Patient'
        };
      });
      return res.json(enriched);
    }
  } catch (err) {
    console.error("Error fetching doctor appointments:", err);
    res.status(500).json({ error: "Failed to retrieve doctor appointments." });
  }
};

// GET /api/doctors/patients/:patientId (Normal Doctor-Patient Record Lookup with Relationship Audit)
exports.getDoctorPatientRecord = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor' || !req.user.doctorId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated doctors have access to clinical patient records." });
    }

    const doctorId = req.user.doctorId.toUpperCase();
    const patientId = req.params.patientId.toUpperCase();

    // Verify Doctor -> Appointment -> Patient relationship for normal lookup
    let hasRelationship = false;
    if (getIsConnectedToMongo()) {
      const appt = await Appointment.findOne({
        doctorId: { $regex: new RegExp(`^${doctorId}$`, 'i') },
        patientId: { $regex: new RegExp(`^${patientId}$`, 'i') }
      });
      if (appt) hasRelationship = true;
    } else {
      hasRelationship = (memoryStore.appointments || []).some(
        a => (a.doctorId || '').toUpperCase() === doctorId && (a.patientId || '').toUpperCase() === patientId
      );
    }

    if (!hasRelationship) {
      return res.status(403).json({
        error: `Access Denied: You do not have an active or scheduled appointment with Patient ${patientId}. Use Emergency Search if immediate emergency access is required.`
      });
    }

    // Fetch Patient Demographics & Profile
    let patient = null;
    let profile = null;
    let prescriptions = [];
    let notes = [];
    let reports = [];
    let appointments = [];

    if (getIsConnectedToMongo()) {
      patient = await Patient.findOne({ patientId: { $regex: new RegExp(`^${patientId}$`, 'i') } }).select('-password');
      profile = await PatientProfile.findOne({ patientId: { $regex: new RegExp(`^${patientId}$`, 'i') } });
      prescriptions = await Prescription.find({ patientId: { $regex: new RegExp(`^${patientId}$`, 'i') } }).sort({ createdAt: -1 });
      notes = await ConsultationNote.find({ patientId: { $regex: new RegExp(`^${patientId}$`, 'i') } }).sort({ createdAt: -1 });
      reports = await MedicalReport.find({ patientId: { $regex: new RegExp(`^${patientId}$`, 'i') } }).sort({ uploadedAt: -1 });
      appointments = await Appointment.find({ patientId: { $regex: new RegExp(`^${patientId}$`, 'i') } }).sort({ appointmentDate: -1 });
    } else {
      patient = (memoryStore.patients || []).find(p => (p.patientId || '').toUpperCase() === patientId);
      profile = (memoryStore.profiles || []).find(p => (p.patientId || '').toUpperCase() === patientId);
      prescriptions = (memoryStore.prescriptions || []).filter(p => (p.patientId || '').toUpperCase() === patientId);
      notes = (memoryStore.consultationNotes || []).filter(n => (n.patientId || '').toUpperCase() === patientId);
      reports = (memoryStore.medicalReports || []).filter(r => (r.patientId || '').toUpperCase() === patientId);
      appointments = (memoryStore.appointments || []).filter(a => (a.patientId || '').toUpperCase() === patientId);
    }

    if (!patient) {
      return res.status(404).json({ error: `Patient ID ${patientId} not found.` });
    }

    const formattedPatient = {
      patientId: patient.patientId,
      fullName: sanitize(patient.fullName),
      age: patient.age ? String(patient.age) : 'Not provided',
      gender: sanitize(patient.gender),
      dateOfBirth: sanitize(patient.dateOfBirth),
      phone: sanitize(patient.phone),
      email: sanitize(patient.email),
      address: sanitize(patient.address),
      patientLocation: sanitize(patient.patientLocation)
    };

    const formattedProfile = {
      bloodGroup: sanitize(profile ? profile.bloodGroup : 'Not Specified'),
      allergies: sanitize(profile ? profile.allergies : 'None'),
      existingDiseases: sanitize(profile ? profile.existingDiseases : 'None'),
      medicalHistory: sanitize(profile ? profile.medicalHistory : 'None'),
      currentMedications: sanitize(profile ? profile.currentMedications : 'None'),
      surgeries: sanitize(profile ? profile.surgeries : 'None'),
      accidentHistory: sanitize(profile ? profile.accidentHistory : 'None'),
      emergencyName: sanitize(profile ? profile.emergencyName : 'N/A'),
      emergencyPhone: sanitize(profile ? profile.emergencyPhone : 'N/A'),
      insuranceDetails: sanitize(profile ? profile.insuranceDetails : 'None'),
      aadhaarNumber: sanitize((profile && profile.aadhaarNumber) ? profile.aadhaarNumber : (patient && patient.aadhaarNumber ? patient.aadhaarNumber : 'N/A'))
    };

    return res.json({
      accessType: 'NORMAL',
      patient: formattedPatient,
      profile: formattedProfile,
      prescriptions,
      consultationNotes: notes,
      medicalReports: reports,
      appointments
    });

  } catch (err) {
    console.error("Error retrieving patient clinical record:", err);
    res.status(500).json({ error: "Failed to retrieve patient medical file." });
  }
};

// GET /api/doctors/emergency/patients/:patientId (Emergency Patient Search & Emergency Medical Profile with Audit Log)
exports.emergencyPatientSearch = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor' || !req.user.doctorId) {
      return res.status(403).json({ error: "403 Forbidden: Only authorized doctors can use Emergency Patient Search." });
    }

    const doctorId = req.user.doctorId.toUpperCase();
    const patientId = req.params.patientId.toUpperCase();
    const reason = req.query.reason || req.body.reason || 'Emergency treatment required';

    // 1. Verify Patient ID existence BEFORE creating audit log (case-insensitive MongoDB query)
    let patient = null;
    let profile = null;
    let prescriptions = [];
    let notes = [];
    let reports = [];

    if (getIsConnectedToMongo()) {
      patient = await Patient.findOne({ patientId: { $regex: new RegExp(`^${patientId}$`, 'i') } }).select('-password');
      if (patient) {
        profile = await PatientProfile.findOne({ patientId: { $regex: new RegExp(`^${patient.patientId}$`, 'i') } });
        prescriptions = await Prescription.find({ patientId: { $regex: new RegExp(`^${patient.patientId}$`, 'i') } }).sort({ createdAt: -1 });
        notes = await ConsultationNote.find({ patientId: { $regex: new RegExp(`^${patient.patientId}$`, 'i') } }).sort({ createdAt: -1 });
        reports = await MedicalReport.find({ patientId: { $regex: new RegExp(`^${patient.patientId}$`, 'i') } }).sort({ uploadedAt: -1 });
      }
    } else {
      patient = (memoryStore.patients || []).find(p => (p.patientId || '').toUpperCase() === patientId);
      if (patient) {
        profile = (memoryStore.profiles || []).find(p => (p.patientId || '').toUpperCase() === patientId);
        prescriptions = (memoryStore.prescriptions || []).filter(p => (p.patientId || '').toUpperCase() === patientId);
        notes = (memoryStore.consultationNotes || []).filter(n => (n.patientId || '').toUpperCase() === patientId);
        reports = (memoryStore.medicalReports || []).filter(r => (r.patientId || '').toUpperCase() === patientId);
      }
    }

    // Patient Not Found -> Do NOT create an audit log
    if (!patient) {
      return res.status(404).json({ error: `No patient was found with Patient ID ${patientId}.` });
    }

    // 2. Patient Verified -> NOW Create Audit Log
    const auditRecord = {
      logId: 'EMG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      doctorId,
      patientId: patient.patientId,
      accessType: 'EMERGENCY',
      reason,
      accessedAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await EmergencyAccessLog.create(auditRecord);
    } else {
      if (!memoryStore.emergencyAccessLogs) memoryStore.emergencyAccessLogs = [];
      memoryStore.emergencyAccessLogs.push(auditRecord);
    }

    console.log(`🚨 EMERGENCY ACCESS AUDIT RECORD CREATED: Doctor ${doctorId} accessed Patient ${patient.patientId} (Reason: ${reason})`);

    const valOrNotProvided = (val) => {
      if (val === undefined || val === null) return 'Not provided';
      const str = String(val).trim();
      return (str === '' || str === 'N/A' || str === 'null' || str === 'undefined') ? 'Not provided' : str;
    };

    const formattedPatient = {
      patientId: patient.patientId,
      name: valOrNotProvided(patient.fullName),
      fullName: valOrNotProvided(patient.fullName),
      age: valOrNotProvided(patient.age),
      gender: valOrNotProvided(patient.gender),
      dateOfBirth: valOrNotProvided(patient.dateOfBirth),
      phone: valOrNotProvided(patient.phone),
      email: valOrNotProvided(patient.email),
      address: valOrNotProvided(patient.address),
      patientLocation: valOrNotProvided(patient.patientLocation)
    };

    const emergencyContactStr = (profile && (profile.emergencyName || profile.emergencyPhone))
      ? `${profile.emergencyName || ''} (${profile.emergencyPhone || ''})`.trim()
      : 'Not provided';

    const formattedProfile = {
      bloodGroup: valOrNotProvided(profile ? profile.bloodGroup : null),
      allergies: valOrNotProvided(profile ? profile.allergies : null),
      existingDiseases: valOrNotProvided(profile ? profile.existingDiseases : null),
      medicalHistory: valOrNotProvided(profile ? profile.medicalHistory : null),
      currentMedications: valOrNotProvided(profile ? profile.currentMedications : null),
      surgeries: valOrNotProvided(profile ? profile.surgeries : null),
      accidentHistory: valOrNotProvided(profile ? profile.accidentHistory : null),
      emergencyContact: emergencyContactStr,
      emergencyName: valOrNotProvided(profile ? profile.emergencyName : null),
      emergencyPhone: valOrNotProvided(profile ? profile.emergencyPhone : null),
      insuranceDetails: valOrNotProvided(profile ? profile.insuranceDetails : null)
    };

    return res.json({
      success: true,
      accessType: 'EMERGENCY',
      auditLogId: auditRecord.logId,
      auditLog: auditRecord,
      patient: formattedPatient,
      profile: formattedProfile,
      prescriptions,
      consultationNotes: notes,
      medicalReports: reports
    });

  } catch (err) {
    console.error("Error executing emergency patient search:", err);
    res.status(500).json({ error: "Failed to execute emergency patient lookup." });
  }
};

// POST /api/doctors/consultation-notes (Add Diagnosis & Treatment Notes - Preserves Previous History)
exports.addDiagnosisAndTreatmentNotes = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor' || !req.user.doctorId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated doctors can record clinical diagnoses." });
    }

    const doctorId = req.user.doctorId.toUpperCase();
    const { patientId, appointmentId, diagnosis, treatmentNotes } = req.body;

    if (!patientId || !diagnosis) {
      return res.status(400).json({ error: "Patient ID and Clinical Diagnosis are required." });
    }

    const cleanPatId = patientId.trim().toUpperCase();

    // Verify Patient existence
    let patient = null;
    if (getIsConnectedToMongo()) {
      patient = await Patient.findOne({ patientId: { $regex: new RegExp(`^${cleanPatId}$`, 'i') } });
    } else {
      patient = (memoryStore.patients || []).find(p => (p.patientId || '').toUpperCase() === cleanPatId);
    }

    if (!patient) {
      return res.status(404).json({ error: `Patient ID ${cleanPatId} not found.` });
    }

    const noteRecord = {
      noteId: 'NOTE-' + Date.now(),
      patientId: cleanPatId,
      doctorId,
      appointmentId: appointmentId ? Number(appointmentId) : null,
      diagnosis: diagnosis.trim(),
      treatmentNotes: treatmentNotes ? treatmentNotes.trim() : 'Consultation conducted.',
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await ConsultationNote.create(noteRecord);
    } else {
      if (!memoryStore.consultationNotes) memoryStore.consultationNotes = [];
      memoryStore.consultationNotes.unshift(noteRecord);
    }

    return res.status(201).json({
      message: "Diagnosis and treatment notes recorded successfully!",
      consultationNote: noteRecord
    });

  } catch (err) {
    console.error("Error saving consultation notes:", err);
    res.status(500).json({ error: "Failed to record consultation notes." });
  }
};

// POST /api/doctors/followup (Schedule Follow-Up Appointment)
exports.scheduleFollowupAppointment = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'doctor' || !req.user.doctorId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated doctors can schedule follow-up consultations." });
    }

    const doctorId = req.user.doctorId.toUpperCase();
    const { patientId, appointmentDate, appointmentTime, reason } = req.body;

    if (!patientId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: "Patient ID, Follow-Up Date, and Time Slot are required." });
    }

    const cleanPatId = patientId.trim().toUpperCase();

    // Lookup Patient Details
    let patientName = 'Patient ' + cleanPatId;
    let patientLocation = 'Kurnool';

    if (getIsConnectedToMongo()) {
      const pat = await Patient.findOne({ patientId: { $regex: new RegExp(`^${cleanPatId}$`, 'i') } });
      if (pat) {
        patientName = pat.fullName;
        patientLocation = pat.patientLocation || 'Kurnool';
      }
    } else {
      const pat = (memoryStore.patients || []).find(p => (p.patientId || '').toUpperCase() === cleanPatId);
      if (pat) {
        patientName = pat.fullName;
        patientLocation = pat.patientLocation || 'Kurnool';
      }
    }

    // Lookup Doctor Details
    let doctorName = req.user.fullName || 'Doctor';
    let doctorSpecialization = 'General Physician';
    let doctorLocation = 'Kurnool';

    if (getIsConnectedToMongo()) {
      const doc = await Doctor.findOne({ doctorId });
      if (doc) {
        doctorName = doc.name;
        doctorSpecialization = doc.specialty || doc.department || 'General Physician';
        doctorLocation = doc.location || 'Kurnool';
      }
    } else {
      const doc = (memoryStore.doctors || []).find(d => (d.doctorId || '').toUpperCase() === doctorId);
      if (doc) {
        doctorName = doc.name;
        doctorSpecialization = doc.specialty || doc.department || 'General Physician';
        doctorLocation = doc.location || 'Kurnool';
      }
    }

    let nextId = 1;
    if (getIsConnectedToMongo()) {
      const count = await Appointment.countDocuments();
      nextId = count + 1;
    } else {
      nextId = (memoryStore.appointments || []).length + 1;
    }

    const followupAppt = {
      appointmentId: nextId,
      patientId: cleanPatId,
      patientName,
      patientLocation,
      doctorId,
      doctorName,
      doctorSpecialization,
      doctorLocation,
      appointmentDate,
      appointmentTime,
      reason: reason ? reason.trim() : 'Follow-Up Consultation',
      status: 'Confirmed',
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await Appointment.create(followupAppt);
    } else {
      if (!memoryStore.appointments) memoryStore.appointments = [];
      memoryStore.appointments.push(followupAppt);
    }

    return res.status(201).json({
      message: `Follow-up appointment #APT${nextId} scheduled for ${appointmentDate} at ${appointmentTime}!`,
      appointment: followupAppt
    });

  } catch (err) {
    console.error("Error scheduling follow-up appointment:", err);
    res.status(500).json({ error: "Failed to schedule follow-up appointment." });
  }
};

// PUT /api/doctors/appointments/:appointmentId/complete (Doctor Completes Appointment)
exports.completeAppointment = async (req, res) => {
  try {
    const apptId = Number(req.params.appointmentId);
    let updatedAppt = null;

    if (getIsConnectedToMongo()) {
      updatedAppt = await Appointment.findOneAndUpdate(
        { appointmentId: apptId },
        { $set: { status: 'Completed' } },
        { new: true }
      );
    } else {
      updatedAppt = (memoryStore.appointments || []).find(a => Number(a.appointmentId) === apptId);
      if (updatedAppt) {
        updatedAppt.status = 'Completed';
      }
    }

    if (!updatedAppt) {
      return res.status(404).json({ error: "Appointment ID not found." });
    }

    return res.json({
      message: `Appointment #APT${apptId} marked as Completed!`,
      appointment: updatedAppt
    });
  } catch (err) {
    console.error("Error completing appointment:", err);
    res.status(500).json({ error: "Failed to complete appointment." });
  }
};

// Public & Admin Endpoints
exports.registerDoctor = async (req, res) => {
  try {
    const { name, specialty, email, phone, department, location, medicalLicenseNumber, password } = req.body;
    if (!name || !specialty || !email || !medicalLicenseNumber || !password) {
      return res.status(400).json({ error: "Name, Specialty, Email, License Number, and Password are required." });
    }

    const doctorId = await generateNextDoctorId();
    const hashedPassword = hashPassword(password.trim());

    const newDoctor = {
      doctorId,
      password: hashedPassword,
      name: name.trim(),
      specialty: specialty.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      department: department ? department.trim() : 'General Medicine',
      location: location ? location.trim() : 'Kurnool',
      medicalLicenseNumber: medicalLicenseNumber.trim(),
      licenseStatus: 'active',
      verificationStatus: 'pending',
      accountStatus: 'active',
      createdAt: new Date()
    };

    const newUser = {
      loginId: doctorId,
      passwordHash: hashedPassword,
      role: 'doctor',
      fullName: name.trim(),
      doctorId,
      accountStatus: 'active',
      verificationStatus: 'pending'
    };

    if (getIsConnectedToMongo()) {
      await Doctor.create(newDoctor);
      await User.create(newUser);
    } else {
      memoryStore.doctors.push(newDoctor);
      memoryStore.users.push(newUser);
    }

    return res.status(201).json({
      message: `Doctor registration submitted! Your Doctor ID is ${doctorId}. Awaiting license verification.`,
      doctorId,
      verificationStatus: 'pending'
    });

  } catch (err) {
    console.error("Error registering doctor:", err);
    res.status(500).json({ error: "Failed to register doctor license." });
  }
};

exports.verifyDoctorLicense = async (req, res) => {
  try {
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ error: "Doctor ID is required." });

    const docId = doctorId.toUpperCase();
    let doctor = null;

    if (getIsConnectedToMongo()) {
      doctor = await Doctor.findOneAndUpdate(
        { doctorId: docId },
        { $set: { verificationStatus: 'verified', licenseStatus: 'active' } },
        { new: true }
      );
      await User.findOneAndUpdate(
        { loginId: docId },
        { $set: { verificationStatus: 'verified' } }
      );
    } else {
      doctor = memoryStore.doctors.find(d => d.doctorId === docId);
      if (doctor) {
        doctor.verificationStatus = 'verified';
        doctor.licenseStatus = 'active';
        const userRec = memoryStore.users.find(u => u.loginId === docId);
        if (userRec) userRec.verificationStatus = 'verified';
      }
    }

    if (!doctor) return res.status(404).json({ error: `Doctor ID ${docId} not found.` });

    return res.json({
      message: `Doctor ${docId} medical license verified successfully!`,
      verificationStatus: 'verified'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingDoctors = async (req, res) => {
  try {
    if (getIsConnectedToMongo()) {
      const pending = await Doctor.find({ verificationStatus: 'pending' }).select('-password');
      return res.json(pending);
    } else {
      const pending = memoryStore.doctors.filter(d => d.verificationStatus === 'pending');
      return res.json(pending);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const docId = doctorId.toUpperCase();
    const updateData = req.body;

    let updatedDoc = null;
    if (getIsConnectedToMongo()) {
      updatedDoc = await Doctor.findOneAndUpdate({ doctorId: docId }, { $set: updateData }, { new: true }).select('-password');
    } else {
      updatedDoc = memoryStore.doctors.find(d => d.doctorId === docId);
      if (updatedDoc) Object.assign(updatedDoc, updateData);
    }

    return res.json({ message: "Doctor profile updated successfully!", doctor: updatedDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDoctors = async (req, res) => {
  try {
    const patientLoc = (req.query.location || req.query.patientLocation || '').trim().toUpperCase();

    if (getIsConnectedToMongo()) {
      let doctors = await Doctor.find({ verificationStatus: 'verified' }).select('-password');
      if (patientLoc) {
        doctors.sort((a, b) => {
          const locA = (a.location || '').toUpperCase();
          const locB = (b.location || '').toUpperCase();
          const matchA = locA.includes(patientLoc) || patientLoc.includes(locA);
          const matchB = locB.includes(patientLoc) || patientLoc.includes(locB);
          if (matchA && !matchB) return -1;
          if (!matchA && matchB) return 1;
          return 0;
        });
      }
      return res.json(doctors);
    } else {
      let doctors = (memoryStore.doctors || []).filter(d => d.verificationStatus === 'verified');
      if (patientLoc) {
        doctors = [...doctors].sort((a, b) => {
          const locA = (a.location || '').toUpperCase();
          const locB = (b.location || '').toUpperCase();
          const matchA = locA.includes(patientLoc) || patientLoc.includes(locA);
          const matchB = locB.includes(patientLoc) || patientLoc.includes(locB);
          if (matchA && !matchB) return -1;
          if (!matchA && matchB) return 1;
          return 0;
        });
      }
      return res.json(doctors);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    let totalPatients = 0;
    let totalAppointments = 0;
    let availableToday = 35;
    let bookedToday = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    if (getIsConnectedToMongo()) {
      totalPatients = await Patient.countDocuments();
      totalAppointments = await Appointment.countDocuments();
      bookedToday = await Appointment.countDocuments({ appointmentDate: todayStr, status: 'Confirmed' });
    } else {
      totalPatients = (memoryStore.patients || []).length;
      totalAppointments = (memoryStore.appointments || []).length;
      bookedToday = (memoryStore.appointments || []).filter(a => a.appointmentDate === todayStr && a.status === 'Confirmed').length;
    }

    res.json({
      totalPatients,
      totalAppointments,
      availableToday: Math.max(0, availableToday - bookedToday),
      bookedToday
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
