const mongoose = require('mongoose');

const EmergencyAccessLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'EMG-' + Date.now()
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  accessType: {
    type: String,
    default: 'EMERGENCY'
  },
  reason: {
    type: String,
    default: 'Emergency treatment'
  },
  accessedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EmergencyAccessLog', EmergencyAccessLogSchema);
