const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  doctorId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  specialty: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    default: 'General Medicine'
  },
  location: {
    type: String,
    default: 'Kurnool',
    trim: true
  },
  medicalLicenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  licenseStatus: {
    type: String,
    enum: ['active', 'suspended', 'invalid', 'expired', 'revoked'],
    default: 'active'
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended', 'deleted'],
    default: 'active'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  suspensionReason: {
    type: String,
    default: null
  },
  statusUpdatedAt: {
    type: Date,
    default: null
  },
  statusUpdatedBy: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Doctor', DoctorSchema);
