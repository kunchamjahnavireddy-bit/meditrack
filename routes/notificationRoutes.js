const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateUser, requireRole } = require('../middleware/auth');

// GET patient notifications
router.get(
  '/patient/:patientId',
  authenticateUser,
  requireRole(['patient', 'doctor', 'receptionist']),
  notificationController.getPatientNotifications
);

router.get(
  '/',
  authenticateUser,
  requireRole(['patient']),
  notificationController.getPatientNotifications
);

// PUT mark notification as read
router.put(
  '/:notificationId/read',
  authenticateUser,
  requireRole(['patient']),
  notificationController.markNotificationRead
);

module.exports = router;
