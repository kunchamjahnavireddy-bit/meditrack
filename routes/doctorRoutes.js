const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const appointmentController = require('../controllers/appointmentController');
const { authenticateUser, requireRole } = require('../middleware/auth');

// Public Doctor Registration (submits license for verification)
router.post('/register', doctorController.registerDoctor);

// Hospital Admin Verification Endpoint
router.post('/verify', doctorController.verifyDoctorLicense);

// Hospital Admin Pending List
router.get('/pending', doctorController.getPendingDoctors);

// GET Hospital Stats
router.get('/stats', doctorController.getStats);

// GET Verified Doctors Listing
router.get('/', doctorController.getDoctors);

// ============================================================
// PROTECTED DOCTOR WORKSPACE ROUTES (Requires Role: doctor)
// ============================================================

// GET Authenticated Doctor's Professional Profile
router.get(
  '/me',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.getDoctorProfile
);

// PUT Authenticated Doctor's Professional Profile
router.put(
  '/me',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.updateDoctorProfile
);

// GET Authenticated Doctor's Assigned Appointments
router.get(
  '/me/appointments',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.getMyDoctorAppointments
);

// GET Normal Doctor-Patient Clinical Record (Validates Doctor -> Appointment -> Patient relationship)
router.get(
  '/patients/:patientId',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.getDoctorPatientRecord
);

// EMERGENCY PATIENT SEARCH & AUDIT LOGGING (Authorized Emergency Lookup)
router.post(
  '/emergency-access',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.emergencyPatientSearch
);

router.get(
  '/emergency/patients/:patientId',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.emergencyPatientSearch
);

// POST Add Diagnosis & Treatment Notes
router.post(
  '/consultation-notes',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.addDiagnosisAndTreatmentNotes
);

// POST Schedule Follow-up Appointment
router.post(
  '/followup',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.scheduleFollowupAppointment
);

// PUT Mark Appointment as Completed
router.put(
  '/appointments/:appointmentId/complete',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.completeAppointment
);

// PUT or POST update doctor professional details
router.put(
  '/:doctorId',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.updateDoctor
);

router.post(
  '/:doctorId/update',
  authenticateUser,
  requireRole(['doctor']),
  doctorController.updateDoctor
);

module.exports = router;
