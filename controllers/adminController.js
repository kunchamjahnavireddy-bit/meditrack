// MediTrack - Admin Controller for System Overview, Account Statuses, Account Deletion, Appointments Catalog, Hospitals & Audit Logs

const Patient = require('../models/Patient');
const PatientProfile = require('../models/PatientProfile');
const Doctor = require('../models/Doctor');
const Receptionist = require('../models/Receptionist');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');
const AdminAuditLog = require('../models/AdminAuditLog');
const { hashPassword } = require('../utils/hash');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// Helper to log administrative audit action
async function createAdminAuditEntry(adminId, action, targetId, targetRole, previousStatus, newStatus, reason) {
  const logRecord = {
    logId: 'ADM-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    adminId: adminId || 'ADM001',
    action,
    targetId: targetId || 'N/A',
    targetRole: targetRole || 'N/A',
    previousStatus: previousStatus || 'N/A',
    newStatus: newStatus || 'N/A',
    reason: reason || 'Administrative action',
    timestamp: new Date()
  };

  try {
    if (getIsConnectedToMongo()) {
      await AdminAuditLog.create(logRecord);
    } else {
      if (!memoryStore.adminAuditLogs) memoryStore.adminAuditLogs = [];
      memoryStore.adminAuditLogs.unshift(logRecord);
    }
  } catch (err) {
    console.error("Error writing admin audit log:", err.message);
  }
}

// 1. GET /api/admin/overview (Dynamic Real-Time System Statistics)
exports.getSystemOverview = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    let totalPatients = 0, activePatients = 0, inactivePatients = 0, deceasedPatients = 0, deletedPatients = 0;
    let totalDoctors = 0, activeDoctors = 0, suspendedDoctors = 0, inactiveDoctors = 0, deletedDoctors = 0;
    let totalReceptionists = 0, activeReceptionists = 0, inactiveReceptionists = 0, deletedReceptionists = 0;
    let totalHospitals = 0, activeHospitals = 0;
    let todaysAppointments = 0;

    if (getIsConnectedToMongo()) {
      totalPatients = await Patient.countDocuments();
      activePatients = await Patient.countDocuments({ accountStatus: { $in: ['active', null] }, isDeleted: { $ne: true } });
      inactivePatients = await Patient.countDocuments({ accountStatus: 'inactive', isDeleted: { $ne: true } });
      deceasedPatients = await Patient.countDocuments({ accountStatus: 'deceased', isDeleted: { $ne: true } });
      deletedPatients = await Patient.countDocuments({ $or: [{ accountStatus: 'deleted' }, { isDeleted: true }] });

      totalDoctors = await Doctor.countDocuments();
      activeDoctors = await Doctor.countDocuments({ accountStatus: { $in: ['active', null] }, isDeleted: { $ne: true } });
      suspendedDoctors = await Doctor.countDocuments({ accountStatus: 'suspended', isDeleted: { $ne: true } });
      inactiveDoctors = await Doctor.countDocuments({ accountStatus: 'inactive', isDeleted: { $ne: true } });
      deletedDoctors = await Doctor.countDocuments({ $or: [{ accountStatus: 'deleted' }, { isDeleted: true }] });

      totalReceptionists = await Receptionist.countDocuments();
      activeReceptionists = await Receptionist.countDocuments({ accountStatus: { $in: ['active', null] }, isDeleted: { $ne: true } });
      inactiveReceptionists = await Receptionist.countDocuments({ accountStatus: 'inactive', isDeleted: { $ne: true } });
      deletedReceptionists = await Receptionist.countDocuments({ $or: [{ accountStatus: 'deleted' }, { isDeleted: true }] });

      totalHospitals = await Hospital.countDocuments();
      activeHospitals = await Hospital.countDocuments({ status: { $in: ['active', null] } });

      todaysAppointments = await Appointment.countDocuments({ appointmentDate: todayStr });

    } else {
      const pats = memoryStore.patients || [];
      totalPatients = pats.length;
      activePatients = pats.filter(p => (!p.accountStatus || p.accountStatus === 'active') && !p.isDeleted).length;
      inactivePatients = pats.filter(p => p.accountStatus === 'inactive' && !p.isDeleted).length;
      deceasedPatients = pats.filter(p => p.accountStatus === 'deceased' && !p.isDeleted).length;
      deletedPatients = pats.filter(p => p.accountStatus === 'deleted' || p.isDeleted).length;

      const docs = memoryStore.doctors || [];
      totalDoctors = docs.length;
      activeDoctors = docs.filter(d => (!d.accountStatus || d.accountStatus === 'active') && !d.isDeleted).length;
      suspendedDoctors = docs.filter(d => d.accountStatus === 'suspended' && !d.isDeleted).length;
      inactiveDoctors = docs.filter(d => d.accountStatus === 'inactive' && !d.isDeleted).length;
      deletedDoctors = docs.filter(d => d.accountStatus === 'deleted' || d.isDeleted).length;

      const recs = memoryStore.receptionists || [];
      totalReceptionists = recs.length;
      activeReceptionists = recs.filter(r => (!r.accountStatus || r.accountStatus === 'active') && !r.isDeleted).length;
      inactiveReceptionists = recs.filter(r => r.accountStatus === 'inactive' && !r.isDeleted).length;
      deletedReceptionists = recs.filter(r => r.accountStatus === 'deleted' || r.isDeleted).length;

      const hosps = memoryStore.hospitals || [];
      totalHospitals = hosps.length;
      activeHospitals = hosps.filter(h => !h.status || h.status === 'active').length;

      todaysAppointments = (memoryStore.appointments || []).filter(a => a.appointmentDate === todayStr).length;
    }

    return res.json({
      patients: { total: totalPatients, active: activePatients, inactive: inactivePatients, deceased: deceasedPatients, deleted: deletedPatients },
      doctors: { total: totalDoctors, active: activeDoctors, suspended: suspendedDoctors, inactive: inactiveDoctors, deleted: deletedDoctors },
      receptionists: { total: totalReceptionists, active: activeReceptionists, inactive: inactiveReceptionists, deleted: deletedReceptionists },
      hospitals: { total: totalHospitals, active: activeHospitals },
      todaysAppointments
    });

  } catch (err) {
    console.error("Error fetching admin system overview:", err);
    res.status(500).json({ error: "Failed to generate system overview." });
  }
};

// 2. GET /api/admin/patients (List Patients with Administrative Information)
exports.getAdminPatients = async (req, res) => {
  try {
    const { status } = req.query;
    let patients = [];
    if (getIsConnectedToMongo()) {
      let filter = {};
      if (status) filter.accountStatus = status.toLowerCase();
      patients = await Patient.find(filter).select('-password').sort({ createdAt: -1 });
    } else {
      patients = memoryStore.patients || [];
      if (status) patients = patients.filter(p => (p.accountStatus || 'active').toLowerCase() === status.toLowerCase());
    }
    return res.json(patients);
  } catch (err) {
    console.error("Error listing admin patients:", err);
    res.status(500).json({ error: "Failed to retrieve patients list." });
  }
};

// 3. POST /api/admin/patients (Admin Creates New Patient Account)
exports.createPatient = async (req, res) => {
  try {
    const { fullName, age, gender, dateOfBirth, phone, email, address, patientLocation, password } = req.body;

    if (!fullName || !age || !gender || !dateOfBirth || !phone || !email || !address) {
      return res.status(400).json({ error: "All required patient fields must be provided." });
    }

    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    // Auto-generate Unique Patient ID
    let count = 1;
    if (getIsConnectedToMongo()) {
      count = await Patient.countDocuments() + 1;
    } else {
      count = (memoryStore.patients || []).length + 1;
    }
    const patientId = 'PAT' + String(count).padStart(3, '0');
    const patPassword = password ? password.trim() : 'med12345';
    const hashedPassword = hashPassword(patPassword);

    const newPatient = {
      patientId,
      password: hashedPassword,
      fullName: fullName.trim(),
      age: parseInt(age, 10),
      gender,
      dateOfBirth,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      patientLocation: patientLocation ? patientLocation.trim() : 'Kurnool',
      accountStatus: 'active',
      createdAt: new Date()
    };

    const newProfile = {
      patientId,
      bloodGroup: 'Not provided',
      allergies: 'Not provided',
      existingDiseases: 'Not provided',
      currentMedications: 'Not provided',
      previousSurgeries: 'Not provided',
      emergencyContact: phone.trim(),
      createdAt: new Date()
    };

    const newUser = {
      loginId: patientId,
      passwordHash: hashedPassword,
      role: 'patient',
      fullName: fullName.trim(),
      patientId,
      accountStatus: 'active',
      verificationStatus: 'verified'
    };

    if (getIsConnectedToMongo()) {
      await Patient.create(newPatient);
      await PatientProfile.create(newProfile);
      await User.create(newUser);
    } else {
      if (!memoryStore.patients) memoryStore.patients = [];
      memoryStore.patients.push(newPatient);
      if (!memoryStore.profiles) memoryStore.profiles = [];
      memoryStore.profiles.push(newProfile);
      if (!memoryStore.users) memoryStore.users = [];
      memoryStore.users.push(newUser);
    }

    await createAdminAuditEntry(adminId, 'PATIENT_CREATED', patientId, 'patient', 'N/A', 'active', `Created patient account for ${fullName}`);

    return res.status(201).json({
      message: `Patient account created successfully with ID: ${patientId}`,
      patient: newPatient
    });

  } catch (err) {
    console.error("Error creating patient account:", err);
    res.status(500).json({ error: "Failed to create patient account." });
  }
};

// 4. PUT /api/admin/patients/:patientId/status (Update Patient Account Status: Active, Inactive, Deceased)
exports.updatePatientStatus = async (req, res) => {
  try {
    const pid = req.params.patientId.toUpperCase();
    const { status, reason } = req.body;

    const allowed = ['active', 'inactive', 'deceased'];
    if (!status || !allowed.includes(status.toLowerCase())) {
      return res.status(400).json({ error: "Invalid status value. Allowed: 'active', 'inactive', 'deceased'." });
    }

    const newStatus = status.toLowerCase();
    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    let patient = null;
    let prevStatus = 'active';

    if (getIsConnectedToMongo()) {
      patient = await Patient.findOne({ patientId: pid });
      if (!patient) return res.status(404).json({ error: `Patient ID ${pid} not found.` });

      prevStatus = patient.accountStatus || 'active';

      const updateData = {
        accountStatus: newStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: adminId
      };
      if (newStatus === 'deceased') {
        updateData.deceasedAt = new Date();
      }

      await Patient.findOneAndUpdate({ patientId: pid }, { $set: updateData }, { new: true });
      await User.findOneAndUpdate({ loginId: pid }, { $set: { accountStatus: newStatus } }, { new: true });

    } else {
      patient = (memoryStore.patients || []).find(p => p.patientId.toUpperCase() === pid);
      if (!patient) return res.status(404).json({ error: `Patient ID ${pid} not found.` });

      prevStatus = patient.accountStatus || 'active';
      patient.accountStatus = newStatus;
      patient.statusUpdatedAt = new Date();
      patient.statusUpdatedBy = adminId;
      if (newStatus === 'deceased') patient.deceasedAt = new Date();

      const userRec = (memoryStore.users || []).find(u => u.loginId.toUpperCase() === pid);
      if (userRec) userRec.accountStatus = newStatus;
    }

    const actionType = newStatus === 'inactive' ? 'PATIENT_DEACTIVATED' :
                       newStatus === 'deceased' ? 'PATIENT_MARKED_DECEASED' : 'PATIENT_REACTIVATED';

    await createAdminAuditEntry(adminId, actionType, pid, 'patient', prevStatus, newStatus, reason || `Patient status updated to ${newStatus}`);

    return res.json({
      message: `Patient ${pid} status updated to '${newStatus}' successfully! Historical records preserved.`,
      patientId: pid,
      accountStatus: newStatus
    });

  } catch (err) {
    console.error("Error updating patient status:", err);
    res.status(500).json({ error: "Failed to update patient account status." });
  }
};

// 5. GET /api/admin/doctors (List Doctors with License & Account Statuses)
exports.getAdminDoctors = async (req, res) => {
  try {
    const { status } = req.query;
    let doctors = [];
    if (getIsConnectedToMongo()) {
      let filter = {};
      if (status) filter.accountStatus = status.toLowerCase();
      doctors = await Doctor.find(filter).select('-password').sort({ createdAt: -1 });
    } else {
      doctors = memoryStore.doctors || [];
      if (status) doctors = doctors.filter(d => (d.accountStatus || 'active').toLowerCase() === status.toLowerCase());
    }
    return res.json(doctors);
  } catch (err) {
    console.error("Error listing admin doctors:", err);
    res.status(500).json({ error: "Failed to retrieve doctors list." });
  }
};

// 6. POST /api/admin/doctors (Admin Creates New Doctor Account)
exports.createDoctor = async (req, res) => {
  try {
    const { name, specialty, department, medicalLicenseNumber, phone, email, location, password } = req.body;

    if (!name || !specialty || !medicalLicenseNumber || !phone || !email) {
      return res.status(400).json({ error: "Name, Specialty, License Number, Phone, and Email are required." });
    }

    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    // Auto-generate Unique Doctor ID
    let count = 1;
    if (getIsConnectedToMongo()) {
      count = await Doctor.countDocuments() + 1;
    } else {
      count = (memoryStore.doctors || []).length + 1;
    }
    const doctorId = 'DOC' + String(count).padStart(3, '0');
    const docPassword = password ? password.trim() : 'doc123';
    const hashedPassword = hashPassword(docPassword);

    const newDoctor = {
      doctorId,
      password: hashedPassword,
      name: name.trim(),
      specialty: specialty.trim(),
      department: department ? department.trim() : 'General Medicine',
      medicalLicenseNumber: medicalLicenseNumber.trim(),
      licenseStatus: 'active',
      verificationStatus: 'verified',
      accountStatus: 'active',
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      location: location ? location.trim() : 'Kurnool',
      createdAt: new Date()
    };

    const newUser = {
      loginId: doctorId,
      passwordHash: hashedPassword,
      role: 'doctor',
      fullName: name.trim(),
      doctorId,
      accountStatus: 'active',
      verificationStatus: 'verified'
    };

    if (getIsConnectedToMongo()) {
      await Doctor.create(newDoctor);
      await User.create(newUser);
    } else {
      if (!memoryStore.doctors) memoryStore.doctors = [];
      memoryStore.doctors.push(newDoctor);
      if (!memoryStore.users) memoryStore.users = [];
      memoryStore.users.push(newUser);
    }

    await createAdminAuditEntry(adminId, 'DOCTOR_CREATED', doctorId, 'doctor', 'N/A', 'active', `Registered doctor ${name} (${medicalLicenseNumber})`);

    return res.status(201).json({
      message: `Doctor account registered successfully with ID: ${doctorId}`,
      doctor: newDoctor
    });

  } catch (err) {
    console.error("Error creating doctor account:", err);
    res.status(500).json({ error: "Failed to register doctor account." });
  }
};

// 7. PUT /api/admin/doctors/:doctorId/status (Suspend / Reactivate / License Update for Doctor)
exports.updateDoctorStatus = async (req, res) => {
  try {
    const docId = req.params.doctorId.toUpperCase();
    const { status, licenseStatus, reason } = req.body;

    const allowedStatus = ['active', 'suspended', 'inactive'];
    const newStatus = status ? status.toLowerCase() : null;

    if (newStatus && !allowedStatus.includes(newStatus)) {
      return res.status(400).json({ error: "Invalid status value. Allowed: 'active', 'suspended', 'inactive'." });
    }

    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    let doctor = null;
    let prevStatus = 'active';

    if (getIsConnectedToMongo()) {
      doctor = await Doctor.findOne({ doctorId: docId });
      if (!doctor) return res.status(404).json({ error: `Doctor ID ${docId} not found.` });

      prevStatus = doctor.accountStatus || 'active';
      const updateData = {
        statusUpdatedAt: new Date(),
        statusUpdatedBy: adminId
      };

      if (newStatus) updateData.accountStatus = newStatus;
      if (licenseStatus) updateData.licenseStatus = licenseStatus;
      if (reason) updateData.suspensionReason = reason;

      await Doctor.findOneAndUpdate({ doctorId: docId }, { $set: updateData }, { new: true });
      if (newStatus) {
        await User.findOneAndUpdate({ loginId: docId }, { $set: { accountStatus: newStatus } }, { new: true });
      }

    } else {
      doctor = (memoryStore.doctors || []).find(d => d.doctorId && d.doctorId.toUpperCase() === docId);
      if (!doctor) return res.status(404).json({ error: `Doctor ID ${docId} not found.` });

      prevStatus = doctor.accountStatus || 'active';
      if (newStatus) doctor.accountStatus = newStatus;
      if (licenseStatus) doctor.licenseStatus = licenseStatus;
      if (reason) doctor.suspensionReason = reason;

      doctor.statusUpdatedAt = new Date();
      doctor.statusUpdatedBy = adminId;

      const userRec = (memoryStore.users || []).find(u => u.loginId.toUpperCase() === docId);
      if (userRec && newStatus) userRec.accountStatus = newStatus;
    }

    const actionType = newStatus === 'suspended' ? 'DOCTOR_ACCOUNT_SUSPENDED' :
                       newStatus === 'active' ? 'DOCTOR_ACCOUNT_REACTIVATED' : 'DOCTOR_LICENSE_STATUS_UPDATED';

    await createAdminAuditEntry(adminId, actionType, docId, 'doctor', prevStatus, newStatus || doctor.accountStatus, reason || `Doctor account status set to ${newStatus || doctor.accountStatus}`);

    return res.json({
      message: `Doctor ${docId} status updated successfully! Historical records preserved.`,
      doctorId: docId,
      accountStatus: newStatus || doctor.accountStatus
    });

  } catch (err) {
    console.error("Error updating doctor status:", err);
    res.status(500).json({ error: "Failed to update doctor account status." });
  }
};

// 8. GET /api/admin/appointments (System-wide Doctor Appointments Catalog)
exports.getAdminAppointments = async (req, res) => {
  try {
    const { status, doctorId, patientId } = req.query;
    let appointments = [];

    if (getIsConnectedToMongo()) {
      let filter = {};
      if (status) filter.status = status;
      if (doctorId) filter.doctorId = doctorId.toUpperCase();
      if (patientId) filter.patientId = patientId.toUpperCase();

      const appts = await Appointment.find(filter).sort({ appointmentDate: -1, createdAt: -1 }).lean();

      // Populate doctor and patient names
      const docs = await Doctor.find({});
      const pats = await Patient.find({});
      const docMap = new Map(docs.map(d => [d.doctorId, d]));
      const patMap = new Map(pats.map(p => [p.patientId, p]));

      appointments = appts.map(a => {
        const doc = docMap.get(a.doctorId) || {};
        const pat = patMap.get(a.patientId) || {};
        return {
          ...a,
          patientName: pat.fullName || 'Patient',
          doctorName: doc.name || 'Doctor',
          specialty: doc.specialty || 'General',
          department: doc.department || 'Medicine'
        };
      });

    } else {
      let appts = memoryStore.appointments || [];
      if (status) appts = appts.filter(a => a.status === status);
      if (doctorId) appts = appts.filter(a => a.doctorId.toUpperCase() === doctorId.toUpperCase());
      if (patientId) appts = appts.filter(a => a.patientId.toUpperCase() === patientId.toUpperCase());

      const docs = memoryStore.doctors || [];
      const pats = memoryStore.patients || [];

      appointments = appts.map(a => {
        const doc = docs.find(d => d.doctorId === a.doctorId) || {};
        const pat = pats.find(p => p.patientId === a.patientId) || {};
        return {
          ...a,
          patientName: pat.fullName || 'Patient',
          doctorName: doc.name || 'Doctor',
          specialty: doc.specialty || 'General',
          department: doc.department || 'Medicine'
        };
      });
    }

    return res.json(appointments);

  } catch (err) {
    console.error("Error fetching system doctor appointments catalog:", err);
    res.status(500).json({ error: "Failed to retrieve doctor appointments catalog." });
  }
};

// 9. GET /api/admin/receptionists (List Receptionists)
exports.getAdminReceptionists = async (req, res) => {
  try {
    const { status } = req.query;
    let recs = [];
    if (getIsConnectedToMongo()) {
      let filter = {};
      if (status) filter.accountStatus = status.toLowerCase();
      recs = await Receptionist.find(filter).select('-password').sort({ createdAt: -1 });
    } else {
      recs = memoryStore.receptionists || [];
      if (status) recs = recs.filter(r => (r.accountStatus || 'active').toLowerCase() === status.toLowerCase());
    }
    return res.json(recs);
  } catch (err) {
    console.error("Error listing receptionists:", err);
    res.status(500).json({ error: "Failed to retrieve receptionists list." });
  }
};

// 10. POST /api/admin/receptionists (Admin Creates Receptionist Account)
exports.createReceptionist = async (req, res) => {
  try {
    const { fullName, password, email, phone } = req.body;
    if (!fullName || !password) {
      return res.status(400).json({ error: "Full Name and Password are required." });
    }

    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    let count = 1;
    if (getIsConnectedToMongo()) {
      count = await Receptionist.countDocuments() + 1;
    } else {
      count = (memoryStore.receptionists || []).length + 1;
    }
    const receptionistId = 'REC' + String(count).padStart(3, '0');
    const hashedPassword = hashPassword(password.trim());

    const newRec = {
      receptionistId,
      fullName: fullName.trim(),
      password: hashedPassword,
      email: email ? email.trim().toLowerCase() : null,
      phone: phone ? phone.trim() : null,
      accountStatus: 'active',
      createdAt: new Date()
    };

    const newUser = {
      loginId: receptionistId,
      passwordHash: hashedPassword,
      role: 'receptionist',
      fullName: fullName.trim(),
      receptionistId,
      accountStatus: 'active',
      verificationStatus: 'verified'
    };

    if (getIsConnectedToMongo()) {
      await Receptionist.create(newRec);
      await User.create(newUser);
    } else {
      if (!memoryStore.receptionists) memoryStore.receptionists = [];
      memoryStore.receptionists.push(newRec);
      if (!memoryStore.users) memoryStore.users = [];
      memoryStore.users.push(newUser);
    }

    await createAdminAuditEntry(adminId, 'RECEPTIONIST_CREATED', receptionistId, 'receptionist', 'N/A', 'active', `Created receptionist account for ${fullName}`);

    return res.status(201).json({
      message: `Receptionist account created successfully with ID: ${receptionistId}`,
      receptionist: newRec
    });

  } catch (err) {
    console.error("Error creating receptionist:", err);
    res.status(500).json({ error: "Failed to create receptionist account." });
  }
};

// 11. PUT /api/admin/receptionists/:receptionistId/status (Toggle Receptionist Account Status)
exports.updateReceptionistStatus = async (req, res) => {
  try {
    const recId = req.params.receptionistId.toUpperCase();
    const { status, reason } = req.body;

    const allowed = ['active', 'inactive'];
    if (!status || !allowed.includes(status.toLowerCase())) {
      return res.status(400).json({ error: "Invalid status value. Allowed: 'active', 'inactive'." });
    }

    const newStatus = status.toLowerCase();
    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    let rec = null;
    let prevStatus = 'active';

    if (getIsConnectedToMongo()) {
      rec = await Receptionist.findOne({ receptionistId: recId });
      if (!rec) return res.status(404).json({ error: `Receptionist ID ${recId} not found.` });

      prevStatus = rec.accountStatus || 'active';
      await Receptionist.findOneAndUpdate({ receptionistId: recId }, { $set: { accountStatus: newStatus, statusUpdatedAt: new Date(), statusUpdatedBy: adminId } });
      await User.findOneAndUpdate({ loginId: recId }, { $set: { accountStatus: newStatus } });
    } else {
      rec = (memoryStore.receptionists || []).find(r => r.receptionistId.toUpperCase() === recId);
      if (!rec) return res.status(404).json({ error: `Receptionist ID ${recId} not found.` });

      prevStatus = rec.accountStatus || 'active';
      rec.accountStatus = newStatus;
      rec.statusUpdatedAt = new Date();
      rec.statusUpdatedBy = adminId;

      const userRec = (memoryStore.users || []).find(u => u.loginId.toUpperCase() === recId);
      if (userRec) userRec.accountStatus = newStatus;
    }

    const actionType = newStatus === 'inactive' ? 'RECEPTIONIST_DEACTIVATED' : 'RECEPTIONIST_REACTIVATED';
    await createAdminAuditEntry(adminId, actionType, recId, 'receptionist', prevStatus, newStatus, reason || `Receptionist status set to ${newStatus}`);

    return res.json({
      message: `Receptionist ${recId} status updated to '${newStatus}' successfully!`,
      receptionistId: recId,
      accountStatus: newStatus
    });

  } catch (err) {
    console.error("Error updating receptionist status:", err);
    res.status(500).json({ error: "Failed to update receptionist status." });
  }
};

// 12. DELETE /api/admin/users/:targetId (Admin-Only Safe Soft Account Deletion with Zero Data Loss)
exports.deleteUserAccount = async (req, res) => {
  try {
    const targetId = req.params.targetId.trim().toUpperCase();
    const { confirmId, reason } = req.body;
    const currentAdminId = ((req.user && (req.user.adminId || req.user.loginId)) || 'ADM001').toUpperCase();

    // 1. Check self-deletion prevention
    if (targetId === currentAdminId) {
      return res.status(400).json({ error: "Admin cannot delete their own active account." });
    }

    // 2. Check typed confirmation match
    if (!confirmId || confirmId.trim().toUpperCase() !== targetId) {
      return res.status(400).json({ error: `Confirmation ID does not match target user ID '${targetId}'.` });
    }

    let targetRole = null;
    let prevStatus = 'active';
    let userFound = false;

    if (getIsConnectedToMongo()) {
      // Check Patient
      let patient = await Patient.findOne({ patientId: targetId });
      if (patient) {
        targetRole = 'patient';
        prevStatus = patient.accountStatus || 'active';
        userFound = true;
        await Patient.findOneAndUpdate(
          { patientId: targetId },
          { $set: { accountStatus: 'deleted', isDeleted: true, statusUpdatedAt: new Date(), statusUpdatedBy: currentAdminId } }
        );
      }

      // Check Doctor if not patient
      if (!userFound) {
        let doctor = await Doctor.findOne({ doctorId: targetId });
        if (doctor) {
          targetRole = 'doctor';
          prevStatus = doctor.accountStatus || 'active';
          userFound = true;
          await Doctor.findOneAndUpdate(
            { doctorId: targetId },
            { $set: { accountStatus: 'deleted', isDeleted: true, statusUpdatedAt: new Date(), statusUpdatedBy: currentAdminId } }
          );
        }
      }

      // Check Receptionist if not doctor
      if (!userFound) {
        let rec = await Receptionist.findOne({ receptionistId: targetId });
        if (rec) {
          targetRole = 'receptionist';
          prevStatus = rec.accountStatus || 'active';
          userFound = true;
          await Receptionist.findOneAndUpdate(
            { receptionistId: targetId },
            { $set: { accountStatus: 'deleted', isDeleted: true, statusUpdatedAt: new Date(), statusUpdatedBy: currentAdminId } }
          );
        }
      }

      // Update User collection record
      if (userFound) {
        await User.findOneAndUpdate(
          { loginId: targetId },
          { $set: { accountStatus: 'deleted', isDeleted: true } }
        );
      }

    } else {
      // Memory Store fallback
      let patient = (memoryStore.patients || []).find(p => p.patientId.toUpperCase() === targetId);
      if (patient) {
        targetRole = 'patient';
        prevStatus = patient.accountStatus || 'active';
        patient.accountStatus = 'deleted';
        patient.isDeleted = true;
        patient.statusUpdatedAt = new Date();
        patient.statusUpdatedBy = currentAdminId;
        userFound = true;
      }

      if (!userFound) {
        let doctor = (memoryStore.doctors || []).find(d => d.doctorId && d.doctorId.toUpperCase() === targetId);
        if (doctor) {
          targetRole = 'doctor';
          prevStatus = doctor.accountStatus || 'active';
          doctor.accountStatus = 'deleted';
          doctor.isDeleted = true;
          doctor.statusUpdatedAt = new Date();
          doctor.statusUpdatedBy = currentAdminId;
          userFound = true;
        }
      }

      if (!userFound) {
        let rec = (memoryStore.receptionists || []).find(r => r.receptionistId.toUpperCase() === targetId);
        if (rec) {
          targetRole = 'receptionist';
          prevStatus = rec.accountStatus || 'active';
          rec.accountStatus = 'deleted';
          rec.isDeleted = true;
          rec.statusUpdatedAt = new Date();
          rec.statusUpdatedBy = currentAdminId;
          userFound = true;
        }
      }

      if (userFound) {
        const u = (memoryStore.users || []).find(usr => usr.loginId.toUpperCase() === targetId);
        if (u) {
          u.accountStatus = 'deleted';
          u.isDeleted = true;
        }
      }
    }

    if (!userFound) {
      return res.status(404).json({ error: `User account '${targetId}' was not found in the system.` });
    }

    // Write immutable security audit log
    await createAdminAuditEntry(
      currentAdminId,
      'ACCOUNT_DELETED',
      targetId,
      targetRole,
      prevStatus,
      'deleted',
      reason || 'Account permanently removed by administrator'
    );

    return res.json({
      message: `Account '${targetId}' (${targetRole}) login disabled successfully. Medical & historical records remain preserved.`,
      targetId,
      targetRole,
      accountStatus: 'deleted',
      isDeleted: true
    });

  } catch (err) {
    console.error("Error deleting user account:", err);
    res.status(500).json({ error: "Failed to delete user account." });
  }
};

// 13. GET /api/admin/hospitals (List Hospitals / Clinics)
exports.getHospitals = async (req, res) => {
  try {
    let list = [];
    if (getIsConnectedToMongo()) {
      list = await Hospital.find({}).sort({ createdAt: -1 });
    } else {
      list = memoryStore.hospitals || [];
    }
    return res.json(list);
  } catch (err) {
    console.error("Error listing hospitals:", err);
    res.status(500).json({ error: "Failed to retrieve hospitals list." });
  }
};

// 14. POST /api/admin/hospitals (Add Hospital / Clinic)
exports.createHospital = async (req, res) => {
  try {
    const { name, address, location, phone, email } = req.body;
    if (!name || !address || !phone || !email) {
      return res.status(400).json({ error: "Hospital Name, Address, Phone, and Email are required." });
    }

    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    let count = 1;
    if (getIsConnectedToMongo()) {
      count = await Hospital.countDocuments() + 1;
    } else {
      count = (memoryStore.hospitals || []).length + 1;
    }
    const hospitalId = 'HOSP' + String(count).padStart(3, '0');

    const newHosp = {
      hospitalId,
      name: name.trim(),
      address: address.trim(),
      location: (location && location.trim()) ? location.trim() : 'Kurnool',
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      status: 'active',
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await Hospital.create(newHosp);
    } else {
      if (!memoryStore.hospitals) memoryStore.hospitals = [];
      memoryStore.hospitals.push(newHosp);
    }

    await createAdminAuditEntry(adminId, 'HOSPITAL_CREATED', hospitalId, 'hospital', 'N/A', 'active', `Registered hospital ${name}`);

    return res.status(201).json({
      message: `Hospital ${name} registered successfully with ID: ${hospitalId}`,
      hospital: newHosp
    });

  } catch (err) {
    console.error("Error creating hospital:", err);
    res.status(500).json({ error: "Failed to register hospital." });
  }
};

// 15. PUT /api/admin/hospitals/:hospitalId (Update Hospital Details / Status)
exports.updateHospital = async (req, res) => {
  try {
    const hospId = req.params.hospitalId.toUpperCase();
    const { name, address, location, phone, email, status } = req.body;

    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (address) updateData.address = address.trim();
    if (location) updateData.location = location.trim();
    if (phone) updateData.phone = phone.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (status) updateData.status = status.toLowerCase();

    let hosp = null;
    let prevStatus = 'active';

    if (getIsConnectedToMongo()) {
      hosp = await Hospital.findOne({ hospitalId: hospId });
      if (!hosp) return res.status(404).json({ error: `Hospital ID ${hospId} not found.` });

      prevStatus = hosp.status;
      await Hospital.findOneAndUpdate({ hospitalId: hospId }, { $set: updateData }, { new: true });
    } else {
      hosp = (memoryStore.hospitals || []).find(h => h.hospitalId.toUpperCase() === hospId);
      if (!hosp) return res.status(404).json({ error: `Hospital ID ${hospId} not found.` });

      prevStatus = hosp.status;
      Object.assign(hosp, updateData);
    }

    await createAdminAuditEntry(adminId, 'HOSPITAL_UPDATED', hospId, 'hospital', prevStatus, updateData.status || prevStatus, `Updated hospital information for ${hospId}`);

    return res.json({
      message: `Hospital ${hospId} updated successfully!`,
      hospitalId: hospId
    });

  } catch (err) {
    console.error("Error updating hospital:", err);
    res.status(500).json({ error: "Failed to update hospital details." });
  }
};

// 16. GET /api/admin/audit-logs (View & Filter System Security Audit Logs)
exports.getAdminAuditLogs = async (req, res) => {
  try {
    const { q, action, targetId, role } = req.query;

    let logs = [];
    if (getIsConnectedToMongo()) {
      let filter = {};
      if (action) filter.action = action;
      if (targetId) filter.targetId = targetId.toUpperCase();
      if (role) filter.targetRole = role.toLowerCase();

      logs = await AdminAuditLog.find(filter).sort({ timestamp: -1 });
    } else {
      logs = memoryStore.adminAuditLogs || [];
      if (action) logs = logs.filter(l => l.action === action);
      if (targetId) logs = logs.filter(l => l.targetId && l.targetId.toUpperCase() === targetId.toUpperCase());
      if (role) logs = logs.filter(l => l.targetRole && l.targetRole.toLowerCase() === role.toLowerCase());
    }

    if (q) {
      const search = q.trim().toUpperCase();
      logs = logs.filter(l =>
        (l.logId && l.logId.toUpperCase().includes(search)) ||
        (l.adminId && l.adminId.toUpperCase().includes(search)) ||
        (l.targetId && l.targetId.toUpperCase().includes(search)) ||
        (l.action && l.action.toUpperCase().includes(search)) ||
        (l.reason && l.reason.toUpperCase().includes(search))
      );
    }

    return res.json(logs);

  } catch (err) {
    console.error("Error listing admin audit logs:", err);
    res.status(500).json({ error: "Failed to retrieve audit logs." });
  }
};

// 17. DELETE /api/admin/users/:targetId/permanent (Admin-Only Permanent Deletion from MongoDB)
exports.permanentlyDeleteUserAccount = async (req, res) => {
  try {
    const targetId = req.params.targetId.toUpperCase();
    const adminId = (req.user && req.user.adminId) || (req.user && req.user.loginId) || 'ADM001';

    if (targetId === adminId) {
      return res.status(400).json({ error: "Admin cannot permanently delete their own active account." });
    }

    let targetRole = null;
    let userFound = false;

    if (getIsConnectedToMongo()) {
      // 1. Check Patient
      const patient = await Patient.findOne({ patientId: targetId });
      if (patient) {
        targetRole = 'patient';
        userFound = true;

        await Patient.deleteOne({ patientId: targetId });
        await PatientProfile.deleteOne({ patientId: targetId });
        await User.deleteOne({ $or: [{ loginId: targetId }, { patientId: targetId }] });
        await Appointment.deleteMany({ patientId: targetId });
        await Prescription.deleteMany({ patientId: targetId });
        await MedicalReport.deleteMany({ patientId: targetId });
        await Notification.deleteMany({ recipientId: targetId });
      }

      // 2. Check Doctor if not patient
      if (!userFound) {
        const doctor = await Doctor.findOne({ doctorId: targetId });
        if (doctor) {
          targetRole = 'doctor';
          userFound = true;

          await Doctor.deleteOne({ doctorId: targetId });
          await User.deleteOne({ $or: [{ loginId: targetId }, { doctorId: targetId }] });
          await Appointment.deleteMany({ doctorId: targetId });
          await Prescription.deleteMany({ doctorId: targetId });
        }
      }

    } else {
      // Memory store fallback
      const patIndex = (memoryStore.patients || []).findIndex(p => p.patientId.toUpperCase() === targetId);
      if (patIndex !== -1) {
        targetRole = 'patient';
        userFound = true;
        memoryStore.patients.splice(patIndex, 1);
        memoryStore.profiles = (memoryStore.profiles || []).filter(p => p.patientId.toUpperCase() !== targetId);
        memoryStore.users = (memoryStore.users || []).filter(u => (u.loginId || '').toUpperCase() !== targetId);
        memoryStore.appointments = (memoryStore.appointments || []).filter(a => (a.patientId || '').toUpperCase() !== targetId);
        memoryStore.prescriptions = (memoryStore.prescriptions || []).filter(pr => (pr.patientId || '').toUpperCase() !== targetId);
      }

      if (!userFound) {
        const docIndex = (memoryStore.doctors || []).findIndex(d => (d.doctorId || '').toUpperCase() === targetId);
        if (docIndex !== -1) {
          targetRole = 'doctor';
          userFound = true;
          memoryStore.doctors.splice(docIndex, 1);
          memoryStore.users = (memoryStore.users || []).filter(u => (u.loginId || '').toUpperCase() !== targetId);
          memoryStore.appointments = (memoryStore.appointments || []).filter(a => (a.doctorId || '').toUpperCase() !== targetId);
        }
      }
    }

    if (!userFound) {
      return res.status(404).json({ error: `User ID '${targetId}' not found in system database.` });
    }

    await createAdminAuditEntry(
      adminId,
      'PERMANENT_ACCOUNT_DELETION',
      targetId,
      targetRole,
      'active',
      'permanently_deleted',
      `Permanently deleted ${targetRole} account ${targetId} and all associated records`
    );

    return res.json({
      message: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} account ${targetId} permanently deleted successfully.`,
      targetId,
      role: targetRole
    });

  } catch (err) {
    console.error("Error permanently deleting user account:", err);
    res.status(500).json({ error: "Failed to permanently delete user account." });
  }
};
