// MediTrack - Appointment Controller with Location Sync, Doctor Confirmation & Instant Patient Notifications

const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Notification = require('../models/Notification');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// Helper: Generate next unique Notification ID (NOTIF001, NOTIF002...)
const generateNotificationId = async () => {
  if (getIsConnectedToMongo()) {
    const count = await Notification.countDocuments();
    return `NOTIF${String(count + 1).padStart(3, '0')}`;
  } else {
    return `NOTIF${String((memoryStore.notifications || []).length + 1).padStart(3, '0')}`;
  }
};

// GET /api/patients/me/appointments OR /api/appointments/me
exports.getMyAppointments = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'patient' || !req.user.patientId) {
      return res.status(403).json({ error: "Access Denied: Only authenticated patients can view their own appointments." });
    }

    const patientId = req.user.patientId.toUpperCase();

    if (getIsConnectedToMongo()) {
      const appointments = await Appointment.find({
        patientId: { $regex: new RegExp(`^${patientId}$`, 'i') }
      }).sort({ appointmentDate: -1, createdAt: -1 }).lean();

      const doctors = await Doctor.find({});
      const docMap = new Map(doctors.map(d => [(d.doctorId || '').toUpperCase(), d]));

      const enriched = appointments.map(a => {
        const doc = docMap.get((a.doctorId || '').toUpperCase()) || {};
        return {
          ...a,
          doctorName: a.doctorName || doc.name || 'Doctor',
          doctorSpecialization: a.doctorSpecialization || doc.specialty || doc.department || 'General Physician',
          doctorLocation: a.doctorLocation || doc.location || 'Kurnool'
        };
      });

      return res.json(enriched);
    } else {
      const appts = (memoryStore.appointments || []).filter(a => (a.patientId || '').toUpperCase() === patientId);
      const docs = memoryStore.doctors || [];
      const enriched = appts.map(a => {
        const doc = docs.find(d => (d.doctorId || '').toUpperCase() === (a.doctorId || '').toUpperCase()) || {};
        return {
          ...a,
          doctorName: a.doctorName || doc.name || 'Doctor',
          doctorSpecialization: a.doctorSpecialization || doc.specialty || doc.department || 'General Physician',
          doctorLocation: a.doctorLocation || doc.location || 'Kurnool'
        };
      });
      return res.json(enriched);
    }
  } catch (err) {
    console.error("Error fetching patient appointments:", err);
    res.status(500).json({ error: "Failed to retrieve appointments." });
  }
};

// GET /api/doctors/me/appointments OR /api/appointments/doctor/me
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

      const patients = await Patient.find({});
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

// POST /api/appointments (Book Appointment with Location & Pending Status)
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, reason } = req.body;

    const patientId = req.user && req.user.patientId ? req.user.patientId.toUpperCase() : (req.body.patientId ? req.body.patientId.toUpperCase() : null);

    if (!patientId) {
      return res.status(401).json({ error: "Authentication Required: Please select a valid patient to book an appointment." });
    }

    if (!doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: "Validation Error: Please select a Doctor, Date, and Time Slot." });
    }

    const cleanDocId = doctorId.trim().toUpperCase();

    // Lookup Patient Info
    let patientName = 'Patient ' + patientId;
    let patientLocation = 'Kurnool';

    if (getIsConnectedToMongo()) {
      const pat = await Patient.findOne({ patientId });
      if (pat) {
        patientName = pat.fullName;
        patientLocation = pat.patientLocation || (pat.address ? pat.address.split(',')[0].trim() : 'Kurnool');
      }
    } else {
      const pat = (memoryStore.patients || []).find(p => p.patientId.toUpperCase() === patientId);
      if (pat) {
        patientName = pat.fullName;
        patientLocation = pat.patientLocation || (pat.address ? pat.address.split(',')[0].trim() : 'Kurnool');
      }
    }

    // Lookup Doctor Info
    let doctorName = 'Doctor';
    let doctorSpecialization = 'General Physician';
    let doctorLocation = 'Kurnool';

    if (getIsConnectedToMongo()) {
      const doc = await Doctor.findOne({ doctorId: cleanDocId });
      if (doc) {
        doctorName = doc.name;
        doctorSpecialization = doc.specialty || doc.department || 'General Physician';
        doctorLocation = doc.location || 'Kurnool';
      }
    } else {
      const doc = (memoryStore.doctors || []).find(d => d.doctorId === cleanDocId);
      if (doc) {
        doctorName = doc.name;
        doctorSpecialization = doc.specialty || doc.department || 'General Physician';
        doctorLocation = doc.location || 'Kurnool';
      }
    }

    // Check duplicate slot booking
    let isExistingSlot = false;
    if (getIsConnectedToMongo()) {
      const existing = await Appointment.findOne({
        doctorId: cleanDocId,
        appointmentDate,
        appointmentTime,
        status: { $in: ['Pending', 'Confirmed', 'Scheduled'] }
      });
      if (existing) isExistingSlot = true;
    } else {
      const existing = (memoryStore.appointments || []).find(
        a => a.doctorId === cleanDocId &&
             a.appointmentDate === appointmentDate &&
             a.appointmentTime === appointmentTime &&
             ['Pending', 'Confirmed', 'Scheduled'].includes(a.status)
      );
      if (existing) isExistingSlot = true;
    }

    if (isExistingSlot) {
      return res.status(400).json({ error: "This appointment slot is already booked for this doctor on the selected date." });
    }

    // Generate unique numeric Appointment ID
    let nextId = 1;
    if (getIsConnectedToMongo()) {
      const count = await Appointment.countDocuments();
      nextId = count + 1;
    } else {
      nextId = (memoryStore.appointments || []).length + 1;
    }

    const newAppointment = {
      appointmentId: nextId,
      patientId,
      patientName,
      patientLocation,
      doctorId: cleanDocId,
      doctorName,
      doctorSpecialization,
      doctorLocation,
      appointmentDate,
      appointmentTime,
      reason: reason ? reason.trim() : 'General Consultation',
      status: 'Pending',
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await Appointment.create(newAppointment);
    } else {
      if (!memoryStore.appointments) memoryStore.appointments = [];
      memoryStore.appointments.push(newAppointment);
    }

    return res.status(201).json({
      message: `Appointment #APT${nextId} booked successfully! Status: Pending Doctor Confirmation.`,
      appointment: newAppointment
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "This appointment slot is already booked for this doctor." });
    }
    console.error("Error creating appointment:", err);
    res.status(500).json({ error: err.message || "Failed to book appointment." });
  }
};

// PUT /api/appointments/:appointmentId/confirm (Doctor Confirms Appointment & Sends Notification)
exports.confirmAppointment = async (req, res) => {
  try {
    const apptId = Number(req.params.appointmentId);

    let updatedAppt = null;

    if (getIsConnectedToMongo()) {
      updatedAppt = await Appointment.findOneAndUpdate(
        { appointmentId: apptId },
        { $set: { status: 'Confirmed' } },
        { new: true }
      );
    } else {
      updatedAppt = (memoryStore.appointments || []).find(a => Number(a.appointmentId) === apptId);
      if (updatedAppt) {
        updatedAppt.status = 'Confirmed';
      }
    }

    if (!updatedAppt) {
      return res.status(404).json({ error: "Appointment ID not found." });
    }

    // Create Instant Notification for Patient
    const notifId = await generateNotificationId();
    const notifObj = {
      notificationId: notifId,
      patientId: updatedAppt.patientId,
      appointmentId: updatedAppt.appointmentId,
      type: 'appointment',
      title: 'Appointment Confirmed',
      message: `Your appointment (#APT${updatedAppt.appointmentId}) with ${updatedAppt.doctorName} on ${updatedAppt.appointmentDate} at ${updatedAppt.appointmentTime} has been CONFIRMED by the doctor.`,
      status: 'unread',
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await Notification.create(notifObj);
    } else {
      if (!memoryStore.notifications) memoryStore.notifications = [];
      memoryStore.notifications.push(notifObj);
    }

    return res.json({
      message: `Appointment #APT${apptId} confirmed successfully! Notification sent to patient.`,
      appointment: updatedAppt,
      notification: notifObj
    });

  } catch (err) {
    console.error("Error confirming appointment:", err);
    res.status(500).json({ error: "Failed to confirm appointment." });
  }
};

// PUT /api/appointments/:appointmentId/cancel (Patient/Doctor/Receptionist Cancels Appointment)
exports.cancelAppointment = async (req, res) => {
  try {
    const apptId = Number(req.params.appointmentId);

    let updatedAppt = null;

    if (getIsConnectedToMongo()) {
      updatedAppt = await Appointment.findOneAndUpdate(
        { appointmentId: apptId },
        { $set: { status: 'Cancelled' } },
        { new: true }
      );
    } else {
      updatedAppt = (memoryStore.appointments || []).find(a => Number(a.appointmentId) === apptId);
      if (updatedAppt) {
        updatedAppt.status = 'Cancelled';
      }
    }

    if (!updatedAppt) {
      return res.status(404).json({ error: "Appointment ID not found." });
    }

    // Create Instant Notification for Patient
    const notifId = await generateNotificationId();
    const notifObj = {
      notificationId: notifId,
      patientId: updatedAppt.patientId,
      appointmentId: updatedAppt.appointmentId,
      type: 'appointment',
      title: 'Appointment Cancelled',
      message: `Appointment (#APT${updatedAppt.appointmentId}) with ${updatedAppt.doctorName} on ${updatedAppt.appointmentDate} has been CANCELLED.`,
      status: 'unread',
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      await Notification.create(notifObj);
    } else {
      if (!memoryStore.notifications) memoryStore.notifications = [];
      memoryStore.notifications.push(notifObj);
    }

    return res.json({
      message: `Appointment #APT${apptId} cancelled successfully!`,
      appointment: updatedAppt,
      notification: notifObj
    });

  } catch (err) {
    console.error("Error cancelling appointment:", err);
    res.status(500).json({ error: "Failed to cancel appointment." });
  }
};

// GET /api/appointments (List for Doctor / Receptionist)
exports.getAppointments = async (req, res) => {
  try {
    let filter = {};

    if (req.user && req.user.role === 'doctor' && req.user.doctorId) {
      filter.doctorId = req.user.doctorId.toUpperCase();
    }

    if (getIsConnectedToMongo()) {
      const appointments = await Appointment.find(filter).sort({ appointmentDate: -1, appointmentTime: 1 });
      res.json(appointments);
    } else {
      let results = memoryStore.appointments || [];
      if (filter.doctorId) {
        results = results.filter(a => a.doctorId.toUpperCase() === filter.doctorId);
      }
      res.json(results.slice().reverse());
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/appointments/available-slots?doctorId=...&date=...
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.json({ bookedSlots: [] });
    }

    const cleanDocId = doctorId.trim().toUpperCase();

    if (getIsConnectedToMongo()) {
      const booked = await Appointment.find({
        doctorId: cleanDocId,
        appointmentDate: date,
        status: { $in: ['Pending', 'Confirmed', 'Scheduled'] }
      }, { appointmentTime: 1 });

      res.json({ bookedSlots: booked.map(b => b.appointmentTime) });
    } else {
      const booked = (memoryStore.appointments || [])
        .filter(a => a.doctorId === cleanDocId && a.appointmentDate === date && ['Pending', 'Confirmed', 'Scheduled'].includes(a.status))
        .map(a => a.appointmentTime);
      res.json({ bookedSlots: booked });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/appointments/:patientId
exports.getAppointmentsByPatient = async (req, res) => {
  try {
    const pid = req.params.patientId.toUpperCase();
    if (getIsConnectedToMongo()) {
      const appointments = await Appointment.find({
        patientId: { $regex: new RegExp(`^${pid}$`, 'i') }
      }).sort({ appointmentDate: -1 });
      res.json(appointments);
    } else {
      const appts = (memoryStore.appointments || []).filter(a => a.patientId.toUpperCase() === pid);
      res.json(appts);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
