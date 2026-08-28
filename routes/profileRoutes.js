const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateUser, requireRole, enforcePatientDataIsolation, enforceDoctorPatientRelationship } = require('../middleware/auth');

// GET patient medical profile (Patient own only, Doctor with appointment relationship)
router.get(
  '/:patientId',
  authenticateUser,
  requireRole(['patient', 'doctor']),
  enforcePatientDataIsolation,
  enforceDoctorPatientRelationship,
  profileController.getProfile
);

// POST/PUT update medical profile (Patient own only, Doctor with appointment relationship)
router.post(
  '/:patientId',
  authenticateUser,
  requireRole(['patient', 'doctor']),
  enforcePatientDataIsolation,
  enforceDoctorPatientRelationship,
  profileController.upsertProfile
);

module.exports = router;
