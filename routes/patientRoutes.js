const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const appointmentController = require('../controllers/appointmentController');
const upload = require('../middleware/upload');
const { authenticateUser, requireRole, enforcePatientDataIsolation, enforceDoctorPatientRelationship } = require('../middleware/auth');

// GET next patient ID (Public for Registration preview)
router.get('/next-id', patientController.getNextPatientId);

// GET authenticated patient's own profile details
router.get(
  '/me',
  authenticateUser,
  requireRole(['patient']),
  patientController.getPatientById
);

// GET authenticated patient's own appointments
router.get(
  '/me/appointments',
  authenticateUser,
  requireRole(['patient']),
  appointmentController.getMyAppointments
);

// POST Medical Report Upload with Multer File Storage & Validation
router.post(
  '/me/reports',
  authenticateUser,
  requireRole(['patient']),
  (req, res, next) => {
    upload.single('report_file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File size exceeds the maximum limit of 10MB." });
        }
        return res.status(400).json({ error: err.message || "File upload failed." });
      }
      next();
    });
  },
  patientController.uploadMedicalReport
);

// GET Medical Reports for Authenticated Patient
router.get(
  '/me/reports',
  authenticateUser,
  requireRole(['patient']),
  patientController.getPatientMedicalReports
);

// POST public patient registration endpoints (100% PUBLIC ROUTES - NO AUTH MIDDLEWARE)
router.post('/register', patientController.registerPatient);
router.post('/', patientController.registerPatient);

// PUT or POST update demographic information (Patient own only, Doctor with relationship)
router.put(
  '/:patientId',
  authenticateUser,
  requireRole(['patient', 'doctor']),
  enforcePatientDataIsolation,
  patientController.updatePatient
);

router.post(
  '/:patientId/update',
  authenticateUser,
  requireRole(['patient', 'doctor']),
  enforcePatientDataIsolation,
  patientController.updatePatient
);

// GET search patients catalog (Doctor, Receptionist, Admin)
router.get(
  '/',
  authenticateUser,
  requireRole(['doctor', 'receptionist', 'admin']),
  patientController.getPatients
);

// GET single patient info by ID (Patient own only, Doctor, Receptionist, Admin)
router.get(
  '/:patientId',
  authenticateUser,
  requireRole(['patient', 'doctor', 'receptionist', 'admin']),
  enforcePatientDataIsolation,
  patientController.getPatientById
);

module.exports = router;
