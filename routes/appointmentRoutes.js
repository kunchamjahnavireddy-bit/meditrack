const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateUser, requireRole, enforcePatientDataIsolation } = require('../middleware/auth');

// GET available slots
router.get('/available-slots', appointmentController.getAvailableSlots);

// GET authenticated patient's own appointments (Patient Only)
router.get(
  '/me',
  authenticateUser,
  requireRole(['patient']),
  appointmentController.getMyAppointments
);

// GET authenticated doctor's assigned appointments (Doctor Only)
router.get(
  '/doctor/me',
  authenticateUser,
  requireRole(['doctor']),
  appointmentController.getMyDoctorAppointments
);

// PUT confirm appointment (Doctor, Receptionist)
router.put(
  '/:appointmentId/confirm',
  authenticateUser,
  requireRole(['doctor', 'receptionist']),
  appointmentController.confirmAppointment
);

// PUT cancel appointment (Patient, Doctor, Receptionist)
router.put(
  '/:appointmentId/cancel',
  authenticateUser,
  requireRole(['patient', 'doctor', 'receptionist']),
  appointmentController.cancelAppointment
);

// GET appointments for a specific patient (Patient own only, Doctor)
router.get(
  '/:patientId',
  authenticateUser,
  requireRole(['patient', 'doctor']),
  enforcePatientDataIsolation,
  appointmentController.getAppointmentsByPatient
);

// GET all appointments agenda (Doctor, Receptionist)
router.get(
  '/',
  authenticateUser,
  requireRole(['doctor', 'receptionist']),
  appointmentController.getAppointments
);

// POST book appointment (Patient, Doctor, Receptionist)
router.post(
  '/',
  authenticateUser,
  requireRole(['patient', 'doctor', 'receptionist']),
  appointmentController.createAppointment
);

module.exports = router;
