const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  loginId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['patient', 'doctor', 'receptionist', 'admin']
  },
  fullName: {
    type: String,
    required: true
  },
  patientId: { type: String, default: null },
  doctorId: { type: String, default: null },
  receptionistId: { type: String, default: null },
  adminId: { type: String, default: null },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended', 'deceased', 'deleted'],
    default: 'active'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'not_applicable'],
    default: 'verified'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
