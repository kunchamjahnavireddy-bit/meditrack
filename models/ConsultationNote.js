const mongoose = require('mongoose');

const ConsultationNoteSchema = new mongoose.Schema({
  noteId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  appointmentId: {
    type: Number,
    required: false
  },
  diagnosis: {
    type: String,
    required: true
  },
  treatmentNotes: {
    type: String,
    default: 'Patient advised rest and prescribed medication.'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ConsultationNote', ConsultationNoteSchema);
