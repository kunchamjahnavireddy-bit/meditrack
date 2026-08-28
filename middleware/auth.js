// MediTrack - Role-Based Access Control (RBAC) & Doctor-Patient Security Middleware

const Appointment = require('../models/Appointment');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

const authenticateUser = (req, res, next) => {
  try {
    let authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    let roleHeader = req.headers['x-user-role'];
    let userHeader = req.headers['x-username'];
    let patientIdHeader = req.headers['x-patient-id'];
    let doctorIdHeader = req.headers['x-doctor-id'];

    let user = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          user = decoded;
        }
      } catch (e) {
        // Fallback token format parsing
      }
    }

    if (!user && roleHeader) {
      user = {
        username: userHeader || 'guest',
        role: roleHeader,
        patientId: patientIdHeader || (roleHeader === 'patient' ? userHeader : null),
        doctorId: doctorIdHeader || (roleHeader === 'doctor' ? userHeader : null),
        fullName: req.headers['x-full-name'] || 'Authenticated User'
      };
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    req.user = null;
    next();
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Authentication Required: Please log in to continue.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access Denied: You do not have permission to access this resource.` });
    }

    next();
  };
};

const enforcePatientDataIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication Required.' });
  }

  // Patients can only access their own patientId
  if (req.user.role === 'patient') {
    const targetPatientId = (req.params.patientId || req.query.patientId || req.body.patientId || '').toUpperCase();
    if (targetPatientId && req.user.patientId && targetPatientId !== req.user.patientId.toUpperCase()) {
      return res.status(403).json({ error: 'Access Denied: Patients are only allowed to view their own medical dashboard and records.' });
    }
  }

  // Receptionists are forbidden from viewing full patient medical profiles/dashboards
  if (req.user.role === 'receptionist') {
    const isPrescriptionRoute = req.originalUrl.includes('/prescriptions');
    const isAppointmentRoute = req.originalUrl.includes('/appointments');
    if (!isPrescriptionRoute && !isAppointmentRoute) {
      return res.status(403).json({ error: 'Access Denied: Receptionists do not have permission to view complete medical profiles.' });
    }
  }

  next();
};

const enforceDoctorPatientRelationship = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication Required.' });
  }

  // If user is a Doctor, verify legitimate clinical appointment relationship with target patientId
  if (req.user.role === 'doctor') {
    const targetPatientId = (req.params.patientId || req.query.patientId || req.body.patientId || '').toUpperCase();
    const doctorId = (req.user.doctorId || '').toUpperCase();

    if (targetPatientId && doctorId) {
      let hasRelationship = false;

      if (getIsConnectedToMongo()) {
        const appt = await Appointment.findOne({ doctorId, patientId: targetPatientId });
        if (appt) hasRelationship = true;
      } else {
        hasRelationship = memoryStore.appointments.some(
          a => a.doctorId.toUpperCase() === doctorId && a.patientId.toUpperCase() === targetPatientId
        );
      }

      if (!hasRelationship) {
        return res.status(403).json({ error: "Access Denied: You are not authorized to view this patient's information without an appointment." });
      }
    }
  }

  next();
};

module.exports = {
  authenticateUser,
  requireRole,
  enforcePatientDataIsolation,
  enforceDoctorPatientRelationship
};
