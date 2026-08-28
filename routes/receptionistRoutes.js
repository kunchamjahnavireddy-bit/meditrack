const express = require('express');
const router = express.Router();
const receptionistController = require('../controllers/receptionistController');
const appointmentController = require('../controllers/appointmentController');
const { authenticateUser, requireRole } = require('../middleware/auth');

// All receptionist routes require authentication and role = receptionist
router.use(authenticateUser);
router.use(requireRole(['receptionist']));

// GET live receptionist KPI stats from MongoDB
router.get('/stats', receptionistController.getReceptionistStats);

// GET basic patient catalog lookup (Strict Backend RBAC)
router.get('/patients/basic', receptionistController.getBasicPatients);

// GET basic patient details for specific Patient ID
router.get('/patients/:patientId/basic', receptionistController.getBasicPatientById);

// POST register new patient on behalf of patient
router.post('/patients', receptionistController.registerPatientByReceptionist);

// GET doctors' complete appointment schedules
router.get('/appointments/schedules', receptionistController.getDoctorsSchedules);

// GET today's appointments (filtered by current date)
router.get('/appointments/today', receptionistController.getTodayAppointments);

// GET upcoming appointments (future date sorted Date -> Time)
router.get('/appointments/upcoming', receptionistController.getUpcomingAppointments);

// PUT confirm appointment
router.put('/appointments/:appointmentId/confirm', appointmentController.confirmAppointment);

// PUT reschedule appointment (with slot collision check)
router.put('/appointments/:appointmentId/reschedule', receptionistController.rescheduleAppointment);

// PUT cancel appointment (status = Cancelled)
router.put('/appointments/:appointmentId/cancel', receptionistController.cancelAppointment);

// GET receptionist prescription view (read-only dispensing & medicine instructions)
router.get('/prescriptions', receptionistController.getReceptionistPrescriptions);
router.get('/prescriptions/:patientId', receptionistController.getReceptionistPrescriptions);

module.exports = router;
