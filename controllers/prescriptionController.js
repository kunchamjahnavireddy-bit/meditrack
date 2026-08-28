// MediTrack - Prescription Controller with RBAC

const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// Helper: Generate next Prescription ID (RX001, RX002...)
const generateNextPrescriptionId = async () => {
  if (getIsConnectedToMongo()) {
    const count = await Prescription.countDocuments();
    return `RX${String(count + 1).padStart(3, '0')}`;
  } else {
    const count = memoryStore.prescriptions.length;
    return `RX${String(count + 1).padStart(3, '0')}`;
  }
};

// GET /api/prescriptions/patient/:patientId
// Roles allowed: Patient (own only), Doctor, Receptionist
exports.getPrescriptionsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (getIsConnectedToMongo()) {
      const prescriptions = await Prescription.find({ patientId: patientId.toUpperCase() }).sort({ createdAt: -1 });
      return res.json(prescriptions);
    } else {
      const prescriptions = memoryStore.prescriptions.filter(
        p => p.patientId.toUpperCase() === patientId.toUpperCase()
      );
      return res.json(prescriptions);
    }
  } catch (err) {
    console.error("Error fetching prescriptions:", err);
    res.status(500).json({ error: "Failed to retrieve prescriptions." });
  }
};

// GET /api/prescriptions
// Roles allowed: Doctor, Receptionist
exports.getAllPrescriptions = async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim().toUpperCase() : '';

    if (getIsConnectedToMongo()) {
      let filter = {};
      if (query) {
        filter = {
          $or: [
            { patientId: new RegExp(query, 'i') },
            { patientName: new RegExp(query, 'i') }
          ]
        };
      }
      const prescriptions = await Prescription.find(filter).sort({ createdAt: -1 });
      return res.json(prescriptions);
    } else {
      let prescriptions = memoryStore.prescriptions;
      if (query) {
        prescriptions = prescriptions.filter(
          p => p.patientId.toUpperCase().includes(query) || p.patientName.toUpperCase().includes(query)
        );
      }
      return res.json(prescriptions);
    }
  } catch (err) {
    console.error("Error fetching all prescriptions:", err);
    res.status(500).json({ error: "Failed to retrieve prescriptions catalog." });
  }
};

// POST /api/prescriptions
// Roles allowed: Doctor ONLY
exports.createPrescription = async (req, res) => {
  try {
    const { patientId, doctorId, medicines } = req.body;

    if (!patientId || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: "Patient ID and at least one medicine entry are required." });
    }

    // Lookup Patient Name
    let patientName = "Patient " + patientId;
    if (getIsConnectedToMongo()) {
      const patient = await Patient.findOne({ patientId: patientId.toUpperCase() });
      if (patient) patientName = patient.fullName;
    } else {
      const patient = memoryStore.patients.find(p => p.patientId.toUpperCase() === patientId.toUpperCase());
      if (patient) patientName = patient.fullName;
    }

    // Lookup Doctor Name
    let docId = doctorId || (req.user ? req.user.doctorId : 'DOC001') || 'DOC001';
    let doctorName = req.user ? req.user.fullName : 'Dr. Priya Sharma';

    if (getIsConnectedToMongo()) {
      const doc = await Doctor.findOne({ doctorId: docId });
      if (doc) doctorName = doc.name;
    } else {
      const doc = memoryStore.doctors.find(d => d.doctorId === docId);
      if (doc) doctorName = doc.name;
    }

    const prescriptionId = await generateNextPrescriptionId();
    const prescriptionDate = new Date().toISOString().split('T')[0];

    const newPrescription = {
      prescriptionId,
      patientId: patientId.toUpperCase(),
      patientName,
      doctorId: docId,
      doctorName,
      prescriptionDate,
      medicines,
      createdAt: new Date()
    };

    if (getIsConnectedToMongo()) {
      const created = await Prescription.create(newPrescription);
      return res.status(201).json(created);
    } else {
      memoryStore.prescriptions.unshift(newPrescription);
      return res.status(201).json(newPrescription);
    }
  } catch (err) {
    console.error("Error creating prescription:", err);
    res.status(500).json({ error: "Failed to create prescription." });
  }
};
