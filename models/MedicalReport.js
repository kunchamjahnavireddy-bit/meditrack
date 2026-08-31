const mongoose = require('mongoose');

const MedicalReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  reportType: {
    type: String,
    enum: ['CT Scan', 'MRI Scan', 'Blood Test Report', 'Lab Report', 'X-Ray', 'Scan', 'Prescription', 'Discharge Summary', 'Other Medical Report'],
    default: 'Other Medical Report'
  },
  fileUrl: {
    type: String,
    default: '#'
  },
  fileName: {
    type: String,
    default: 'Document'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MedicalReport', MedicalReportSchema);
