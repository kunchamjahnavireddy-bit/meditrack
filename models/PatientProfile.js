const mongoose = require('mongoose');

const PatientProfileSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true,
    ref: 'Patient',
    index: true
  },
  bloodGroup: {
    type: String,
    default: 'Not Specified'
  },
  allergies: {
    type: String,
    default: 'None'
  },
  existingDiseases: {
    type: String,
    default: 'None'
  },
  medicalHistory: {
    type: String,
    default: 'None'
  },
  currentMedications: {
    type: String,
    default: 'None'
  },
  emergencyName: {
    type: String,
    default: 'N/A'
  },
  emergencyPhone: {
    type: String,
    default: 'N/A'
  },
  insuranceDetails: {
    type: String,
    default: 'None'
  },
  aadhaarNumber: {
    type: String,
    default: 'N/A',
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PatientProfile', PatientProfileSchema);
