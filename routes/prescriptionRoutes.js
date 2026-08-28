// MediTrack - Prescription API Routes with RBAC Security

const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticateUser, requireRole, enforcePatientDataIsolation } = require('../middleware/auth');

// GET /api/prescriptions/patient/:patientId
// Patient (own only), Doctor, Receptionist
router.get(
  '/patient/:patientId',
  authenticateUser,
  requireRole(['patient', 'doctor', 'receptionist']),
  enforcePatientDataIsolation,
  prescriptionController.getPrescriptionsByPatient
);

// GET /api/prescriptions
// Doctor, Receptionist
router.get(
  '/',
  authenticateUser,
  requireRole(['doctor', 'receptionist']),
  prescriptionController.getAllPrescriptions
);

// POST /api/prescriptions
// Doctor ONLY
router.post(
  '/',
  authenticateUser,
  requireRole(['doctor']),
  prescriptionController.createPrescription
);

module.exports = router;
