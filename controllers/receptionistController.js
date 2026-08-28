// MediTrack - Receptionist Controller with Strict Data Isolation, Schedule Views & Appointment Control

const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const { hashPassword } = require('../utils/hash');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// Helper: Generate next unique Patient ID
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
    (memoryStore.patients || []).forEach(p => {
      if (p.patientId && p.patientId.toUpperCase().startsWith('PAT')) {
        const num = parseInt(p.patientId.toUpperCase().replace('PAT', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    let nextNum = maxNum + 1;
    let candidate = `PAT${String(nextNum).padStart(3, '0')}`;
    while ((memoryStore.patients || []).some(p => (p.patientId || '').toUpperCase() === candidate)) {
      nextNum++;
      candidate = `PAT${String(nextNum).padStart(3, '0')}`;
    }
    return candidate;
  }
};

// GET /api/receptionist/stats (Live KPI Metrics from MongoDB)
exports.getReceptionistStats = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    let totalPatients = 0;
    let totalAppointments = 0;
    let availableToday = 35;
    let bookedToday = 0;

    if (getIsConnectedToMongo()) {
      totalPatients = await Patient.countDocuments();
      totalAppointments = await Appointment.countDocuments();
      bookedToday = await Appointment.countDocuments({ appointmentDate: todayStr, status: { $ne: 'Cancelled' } });
    } else {
      totalPatients = (memoryStore.patients || []).length;
      totalAppointments = (memoryStore.appointments || []).length;
      bookedToday = (memoryStore.appointments || []).filter(a => a.appointmentDate === todayStr && a.status !== 'Cancelled').length;
    }

    return res.json({
      totalPatients,
      totalAppointments,
      availableToday: Math.max(0, availableToday - bookedToday),
      bookedToday
    });
  } catch (err) {
    console.error("Error fetching receptionist stats:", err);
    res.status(500).json({ error: "Failed to load receptionist stats." });
  }
};

// GET /api/receptionist/patients/basic (STRICT BACKEND RBAC - Returns ONLY basic non-medical fields)
exports.getBasicPatients = async (req, res) => {
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
      const patients = await Patient.find(filter)
        .select('patientId fullName age gender dateOfBirth phone email address patientLocation accountStatus createdAt -_id')
        .sort({ createdAt: -1 });

      return res.json(patients);
    } else {
      let patients = memoryStore.patients || [];
      if (query) {
        patients = patients.filter(p =>
          (p.patientId || '').toUpperCase().includes(query) ||
          (p.fullName || '').toUpperCase().includes(query) ||
          (p.phone || '').includes(query)
        );
      }

      const basicPatients = patients.map(p => ({
        patientId: p.patientId,
        fullName: p.fullName,
        age: p.age,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        phone: p.phone,
        email: p.email,
        address: p.address,
        patientLocation: p.patientLocation || 'Kurnool',
        accountStatus: p.accountStatus,
        createdAt: p.createdAt
      }));

      return res.json(basicPatients);
    }
  } catch (err) {
    console.error("Error searching basic patients:", err);
    res.status(500).json({ error: "Failed to search patient catalog." });
  }
};

// GET /api/receptionist/patients/:patientId/basic (STRICT BACKEND RBAC - Returns ONLY basic non-medical fields for single patient)
exports.getBasicPatientById = async (req, res) => {
  try {
    const pid = req.params.patientId.toUpperCase();

    if (getIsConnectedToMongo()) {
      const patient = await Patient.findOne({ patientId: { $regex: new RegExp(`^${pid}$`, 'i') } })
        .select('patientId fullName age gender dateOfBirth phone email address patientLocation accountStatus createdAt -_id');

      if (!patient) {
        return res.status(404).json({ error: `Patient ID ${pid} not found.` });
      }
      return res.json(patient);
    } else {
      const p = (memoryStore.patients || []).find(p => (p.patientId || '').toUpperCase() === pid);
      if (!p) {
        return res.status(404).json({ error: `Patient ID ${pid} not found.` });
      }

      const basicPatient = {
        patientId: p.patientId,
        fullName: p.fullName,
        age: p.age,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        phone: p.phone,
        email: p.email,
        address: p.address,
        patientLocation: p.patientLocation || 'Kurnool',
        accountStatus: p.accountStatus,
        createdAt: p.createdAt
      };

      return res.json(basicPatient);
    }
  } catch (err) {
    console.error("Error retrieving basic patient info:", err);
    res.status(500).json({ error: "Failed to retrieve patient basic details." });
  }
};

// POST /api/receptionist/patients (Receptionist Registers Patient on their behalf)
exports.registerPatientByReceptionist = async (req, res) => {
  try {
    const { fullName, age, gender, dateOfBirth, phone, email, address, patientLocation, password } = req.body;

    if (!fullName || !age || !gender || !dateOfBirth || !phone || !email || !address) {
      return res.status(400).json({ error: "All patient demographic fields are required." });
    }

    const patientId = await generateNextPatientId();
    const patPassword = (password && password.trim()) ? password.trim() : 'med12345';
    const hashedPassword = hashPassword(patPassword);
    const locationStr = (patientLocation && patientLocation.trim()) ? patientLocation.trim() : (address ? address.split(',')[0].trim() : 'Kurnool');

    const newPatient = {
      patientId,
      password: hashedPassword,
      fullName: fullName.trim(),
      age: Number(age),
      gender,
      dateOfBirth,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      patientLocation: locationStr,
      accountStatus: 'active',
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await Patient.create(newPatient);

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
        message: "Patient registered successfully.",
        patientId: patientId,
        patient: {
          patientId: newPatient.patientId,
          fullName: newPatient.fullName,
          age: newPatient.age,
          gender: newPatient.gender,
          phone: newPatient.phone,
          email: newPatient.email,
          address: newPatient.address,
          patientLocation: newPatient.patientLocation
        }
      });
    } else {
      if (!memoryStore.patients) memoryStore.patients = [];
      memoryStore.patients.push(newPatient);

      if (!memoryStore.users) memoryStore.users = [];
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
        message: "Patient registered successfully.",
        patientId: patientId,
        patient: {
          patientId: newPatient.patientId,
          fullName: newPatient.fullName,
          age: newPatient.age,
          gender: newPatient.gender,
          phone: newPatient.phone,
          email: newPatient.email,
          address: newPatient.address,
          patientLocation: newPatient.patientLocation
        }
      });
    }
  } catch (err) {
    console.error("Error registering patient by receptionist:", err);
    res.status(500).json({ error: "Failed to register patient." });
  }
};

// GET /api/receptionist/appointments/today (Show only appointments scheduled for current date)
exports.getTodayAppointments = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    if (getIsConnectedToMongo()) {
      const appointments = await Appointment.find({ appointmentDate: todayStr }).sort({ appointmentTime: 1 });
      return res.json(appointments);
    } else {
      const appointments = (memoryStore.appointments || [])
        .filter(a => a.appointmentDate === todayStr)
        .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
      return res.json(appointments);
    }
  } catch (err) {
    console.error("Error fetching today's appointments:", err);
    res.status(500).json({ error: "Failed to load today's appointments." });
  }
};

// GET /api/receptionist/appointments/upcoming (Show future appointments after today sorted by Date -> Time)
exports.getUpcomingAppointments = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    if (getIsConnectedToMongo()) {
      const appointments = await Appointment.find({ appointmentDate: { $gt: todayStr } })
        .sort({ appointmentDate: 1, appointmentTime: 1 });
      return res.json(appointments);
    } else {
      const appointments = (memoryStore.appointments || [])
        .filter(a => a.appointmentDate > todayStr)
        .sort((a, b) => {
          if (a.appointmentDate === b.appointmentDate) {
            return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
          }
          return (a.appointmentDate || '').localeCompare(b.appointmentDate || '');
        });
      return res.json(appointments);
    }
  } catch (err) {
    console.error("Error fetching upcoming appointments:", err);
    res.status(500).json({ error: "Failed to load upcoming appointments." });
  }
};

// GET /api/receptionist/doctors/schedules (View doctors' complete appointment schedules)
exports.getDoctorsSchedules = async (req, res) => {
  try {
    if (getIsConnectedToMongo()) {
      const doctors = await Doctor.find({ verificationStatus: 'verified' }).select('-password');
      const appointments = await Appointment.find({}).sort({ appointmentDate: 1, appointmentTime: 1 });

      const schedules = appointments.map(a => {
        const doc = doctors.find(d => (d.doctorId || '').toUpperCase() === (a.doctorId || '').toUpperCase());
        return {
          appointmentId: a.appointmentId,
          doctorId: a.doctorId,
          doctorName: a.doctorName || (doc ? doc.name : 'Doctor'),
          specialization: a.doctorSpecialization || (doc ? doc.specialty : 'General Physician'),
          location: a.doctorLocation || (doc ? doc.location : 'Kurnool'),
          patientId: a.patientId,
          patientName: a.patientName,
          appointmentDate: a.appointmentDate,
          appointmentTime: a.appointmentTime,
          status: a.status
        };
      });

      return res.json(schedules);
    } else {
      const schedules = (memoryStore.appointments || []).map(a => {
        const doc = (memoryStore.doctors || []).find(d => (d.doctorId || '').toUpperCase() === (a.doctorId || '').toUpperCase());
        return {
          appointmentId: a.appointmentId,
          doctorId: a.doctorId,
          doctorName: a.doctorName || (doc ? doc.name : 'Doctor'),
          specialization: a.doctorSpecialization || (doc ? doc.specialty : 'General Physician'),
          location: a.doctorLocation || (doc ? doc.location : 'Kurnool'),
          patientId: a.patientId,
          patientName: a.patientName,
          appointmentDate: a.appointmentDate,
          appointmentTime: a.appointmentTime,
          status: a.status
        };
      }).sort((a, b) => (a.appointmentDate || '').localeCompare(b.appointmentDate || ''));

      return res.json(schedules);
    }
  } catch (err) {
    console.error("Error fetching doctor schedules:", err);
    res.status(500).json({ error: "Failed to load doctor schedules." });
  }
};

// PUT /api/receptionist/appointments/:appointmentId/reschedule (Reschedule existing appointment with double booking check)
exports.rescheduleAppointment = async (req, res) => {
  try {
    const apptId = Number(req.params.appointmentId);
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({ error: "New Date and Time are required for rescheduling." });
    }

    let appt = null;
    if (getIsConnectedToMongo()) {
      appt = await Appointment.findOne({ appointmentId: apptId });
    } else {
      appt = (memoryStore.appointments || []).find(a => Number(a.appointmentId) === apptId);
    }

    if (!appt) {
      return res.status(404).json({ error: `Appointment #${apptId} not found.` });
    }

    if (getIsConnectedToMongo()) {
      const collision = await Appointment.findOne({
        appointmentId: { $ne: apptId },
        doctorId: appt.doctorId,
        appointmentDate: newDate,
        appointmentTime: newTime,
        status: { $in: ['Pending', 'Confirmed', 'Scheduled'] }
      });

      if (collision) {
        return res.status(400).json({ error: `Doctor ${appt.doctorName} already has an appointment scheduled at ${newTime} on ${newDate}. Please choose a different time slot.` });
      }

      appt.appointmentDate = newDate;
      appt.appointmentTime = newTime;
      await appt.save();

      return res.json({ message: "Appointment rescheduled successfully.", appointment: appt });
    } else {
      const collision = (memoryStore.appointments || []).find(
        a => Number(a.appointmentId) !== apptId &&
             a.doctorId === appt.doctorId &&
             a.appointmentDate === newDate &&
             a.appointmentTime === newTime &&
             (a.status === 'Pending' || a.status === 'Confirmed' || a.status === 'Scheduled')
      );

      if (collision) {
        return res.status(400).json({ error: `Doctor ${appt.doctorName} already has an appointment scheduled at ${newTime} on ${newDate}. Please choose a different time slot.` });
      }

      appt.appointmentDate = newDate;
      appt.appointmentTime = newTime;

      return res.json({ message: "Appointment rescheduled successfully.", appointment: appt });
    }
  } catch (err) {
    console.error("Error rescheduling appointment:", err);
    res.status(500).json({ error: "Failed to reschedule appointment." });
  }
};

// PUT /api/receptionist/appointments/:appointmentId/cancel (Cancel appointment preserving record in MongoDB with status: Cancelled)
exports.cancelAppointment = async (req, res) => {
  try {
    const apptId = Number(req.params.appointmentId);

    if (getIsConnectedToMongo()) {
      const appt = await Appointment.findOneAndUpdate(
        { appointmentId: apptId },
        { $set: { status: 'Cancelled' } },
        { new: true }
      );

      if (!appt) return res.status(404).json({ error: `Appointment #${apptId} not found.` });
      return res.json({ message: "Appointment cancelled successfully.", appointment: appt });
    } else {
      const appt = (memoryStore.appointments || []).find(a => Number(a.appointmentId) === apptId);
      if (!appt) return res.status(404).json({ error: `Appointment #${apptId} not found.` });
      appt.status = 'Cancelled';
      return res.json({ message: "Appointment cancelled successfully.", appointment: appt });
    }
  } catch (err) {
    console.error("Error cancelling appointment:", err);
    res.status(500).json({ error: "Failed to cancel appointment." });
  }
};

// GET /api/receptionist/prescriptions (Receptionist Views Prescriptions & Medicines without Medical History)
exports.getReceptionistPrescriptions = async (req, res) => {
  try {
    const patientId = req.query.patientId ? req.query.patientId.trim().toUpperCase() : (req.params.patientId ? req.params.patientId.trim().toUpperCase() : '');

    if (getIsConnectedToMongo()) {
      let filter = {};
      if (patientId) {
        filter.patientId = { $regex: new RegExp(`^${patientId}$`, 'i') };
      }
      const prescriptions = await Prescription.find(filter)
        .select('prescriptionId patientId patientName doctorName prescriptionDate medicines createdAt -_id')
        .sort({ createdAt: -1 });

      return res.json(prescriptions);
    } else {
      let prescriptions = memoryStore.prescriptions || [];
      if (patientId) {
        prescriptions = prescriptions.filter(p => (p.patientId || '').toUpperCase() === patientId);
      }

      const recPrescriptions = prescriptions.map(p => ({
        prescriptionId: p.prescriptionId,
        patientId: p.patientId,
        patientName: p.patientName,
        doctorName: p.doctorName,
        prescriptionDate: p.prescriptionDate,
        medicines: p.medicines,
        createdAt: p.createdAt
      }));

      return res.json(recPrescriptions);
    }
  } catch (err) {
    console.error("Error fetching receptionist prescriptions:", err);
    res.status(500).json({ error: "Failed to load prescriptions." });
  }
};
