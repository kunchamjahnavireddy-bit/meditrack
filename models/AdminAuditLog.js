const mongoose = require('mongoose');

const AdminAuditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  adminId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'ADMIN_LOGIN',
      'PATIENT_CREATED',
      'PATIENT_DEACTIVATED',
      'PATIENT_MARKED_DECEASED',
      'PATIENT_REACTIVATED',
      'DOCTOR_CREATED',
      'DOCTOR_ACCOUNT_SUSPENDED',
      'DOCTOR_ACCOUNT_REACTIVATED',
      'DOCTOR_LICENSE_STATUS_UPDATED',
      'RECEPTIONIST_CREATED',
      'RECEPTIONIST_DEACTIVATED',
      'RECEPTIONIST_REACTIVATED',
      'HOSPITAL_CREATED',
      'HOSPITAL_UPDATED',
      'HOSPITAL_STATUS_TOGGLED',
      'PERMISSION_UPDATED',
      'ACCOUNT_STATUS_CHANGED',
      'ACCOUNT_DELETED',
      'PATIENT_ACCOUNT_DELETED',
      'DOCTOR_ACCOUNT_DELETED',
      'RECEPTIONIST_ACCOUNT_DELETED'
    ]
  },
  targetId: {
    type: String,
    default: null
  },
  targetRole: {
    type: String,
    default: null
  },
  reason: {
    type: String,
    default: 'Administrative action'
  },
  previousStatus: {
    type: String,
    default: null
  },
  newStatus: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AdminAuditLog', AdminAuditLogSchema);
