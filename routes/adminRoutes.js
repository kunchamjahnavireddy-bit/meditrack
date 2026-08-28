const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateUser, requireRole } = require('../middleware/auth');

// Protect all /api/admin routes: Require Authentication + Role = Admin
router.use(authenticateUser);
router.use(requireRole(['admin']));

// System Overview Statistics
router.get('/overview', adminController.getSystemOverview);

// User Account Deletion (Admin-Only Safe Soft Deletion & Permanent Deletion)
router.delete('/users/:targetId', adminController.deleteUserAccount);
router.delete('/users/:targetId/permanent', adminController.permanentlyDeleteUserAccount);

// Doctor Appointments Catalog (System-wide Doctor Appointments View)
router.get('/appointments', adminController.getAdminAppointments);

// Patient Account Management
router.get('/patients', adminController.getAdminPatients);
router.post('/patients', adminController.createPatient);
router.put('/patients/:patientId/status', adminController.updatePatientStatus);

// Doctor Account & License Management
router.get('/doctors', adminController.getAdminDoctors);
router.post('/doctors', adminController.createDoctor);
router.put('/doctors/:doctorId/status', adminController.updateDoctorStatus);

// Receptionist Management
router.get('/receptionists', adminController.getAdminReceptionists);
router.post('/receptionists', adminController.createReceptionist);
router.put('/receptionists/:receptionistId/status', adminController.updateReceptionistStatus);

// Hospital / Clinic Management
router.get('/hospitals', adminController.getHospitals);
router.post('/hospitals', adminController.createHospital);
router.put('/hospitals/:hospitalId', adminController.updateHospital);

// Audit Logs & System Activity Logs
router.get('/audit-logs', adminController.getAdminAuditLogs);

module.exports = router;
