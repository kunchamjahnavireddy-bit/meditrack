const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  medicineName: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true },
  frequency: { type: String, required: true, trim: true },
  duration: { type: String, required: true, trim: true },
  instructions: { type: String, default: '', trim: true }
}, { _id: false });

const PrescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  patientId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  doctorId: {
    type: String,
    required: true,
    trim: true
  },
  doctorName: {
    type: String,
    required: true,
    trim: true
  },
  prescriptionDate: {
    type: String,
    required: true
  },
  medicines: [MedicineSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Prescription', PrescriptionSchema);
