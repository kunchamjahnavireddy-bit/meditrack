const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    default: 'med12345'
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 1,
    max: 130
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  dateOfBirth: {
    type: String,
    required: true
  },
  phone: {
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
  address: {
    type: String,
    required: true,
    trim: true
  },
  patientLocation: {
    type: String,
    default: 'Kurnool',
    trim: true
  },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'deceased', 'deleted'],
    default: 'active'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  statusUpdatedAt: {
    type: Date,
    default: null
  },
  statusUpdatedBy: {
    type: String,
    default: null
  },
  deceasedAt: {
    type: Date,
    default: null
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Patient', PatientSchema);
