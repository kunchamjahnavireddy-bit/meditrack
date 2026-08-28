const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: Number,
    required: true
  },
  patientId: {
    type: String,
    required: true,
    index: true,
    ref: 'Patient'
  },
  patientName: {
    type: String,
    default: ''
  },
  patientLocation: {
    type: String,
    default: 'Kurnool',
    trim: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true,
    ref: 'Doctor'
  },
  doctorName: {
    type: String,
    required: true
  },
  doctorSpecialization: {
    type: String,
    default: 'General Physician'
  },
  doctorLocation: {
    type: String,
    default: 'Kurnool',
    trim: true
  },
  appointmentDate: {
    type: String,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: 'General Checkup'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Scheduled', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound Unique Index to prevent duplicate bookings for the same Doctor + Date + Time slot
AppointmentSchema.index({ doctorId: 1, appointmentDate: 1, appointmentTime: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
