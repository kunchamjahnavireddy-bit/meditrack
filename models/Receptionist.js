const mongoose = require('mongoose');

const ReceptionistSchema = new mongoose.Schema({
  receptionistId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    default: null,
    trim: true
  },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Receptionist', ReceptionistSchema);
