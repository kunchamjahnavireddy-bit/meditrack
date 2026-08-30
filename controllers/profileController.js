const PatientProfile = require('../models/PatientProfile');
const Patient = require('../models/Patient');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// GET /api/profiles/:patientId
exports.getProfile = async (req, res) => {
  try {
    const pid = req.params.patientId.toUpperCase();
    if (getIsConnectedToMongo()) {
      const profile = await PatientProfile.findOne({ patientId: pid });
      if (!profile) return res.status(404).json({ error: "Medical profile not found." });
      res.json(profile);
    } else {
      const profile = memoryStore.profiles.find(p => p.patientId.toUpperCase() === pid);
      if (!profile) return res.status(404).json({ error: "Medical profile not found." });
      res.json(profile);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST or PUT /api/profiles/:patientId (Safe Partial Medical Profile Update)
exports.upsertProfile = async (req, res) => {
  try {
    const pid = req.params.patientId.toUpperCase();
    const {
      bloodGroup, allergies, existingDiseases,
      medicalHistory, currentMedications,
      emergencyName, emergencyPhone, insuranceDetails, aadhaarNumber
    } = req.body;

    const profileData = { updatedAt: new Date() };
    if (bloodGroup !== undefined) profileData.bloodGroup = bloodGroup || 'Not Specified';
    if (allergies !== undefined) profileData.allergies = allergies || 'None';
    if (existingDiseases !== undefined) profileData.existingDiseases = existingDiseases || 'None';
    if (medicalHistory !== undefined) profileData.medicalHistory = medicalHistory || 'None';
    if (currentMedications !== undefined) profileData.currentMedications = currentMedications || 'None';
    if (emergencyName !== undefined) profileData.emergencyName = emergencyName || 'N/A';
    if (emergencyPhone !== undefined) profileData.emergencyPhone = emergencyPhone || 'N/A';
    if (insuranceDetails !== undefined) profileData.insuranceDetails = insuranceDetails || 'None';

    if (aadhaarNumber !== undefined && aadhaarNumber !== null && aadhaarNumber !== '') {
      const cleanAadhaar = String(aadhaarNumber).trim().replace(/\s+/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        return res.status(400).json({ error: "Aadhaar Number must be exactly 12 numeric digits." });
      }
      profileData.aadhaarNumber = cleanAadhaar;
    }

    if (getIsConnectedToMongo()) {
      const patient = await Patient.findOne({ patientId: pid });
      if (!patient) return res.status(404).json({ error: "Patient ID does not exist." });

      if (profileData.aadhaarNumber) {
        await Patient.updateOne({ patientId: pid }, { $set: { aadhaarNumber: profileData.aadhaarNumber } });
      }

      const profile = await PatientProfile.findOneAndUpdate(
        { patientId: pid },
        { $set: profileData },
        { new: true, upsert: true }
      );
      res.json({ message: "Medical Profile updated successfully.", profile });
    } else {
      const patient = memoryStore.patients.find(p => p.patientId.toUpperCase() === pid);
      if (!patient) return res.status(404).json({ error: "Patient ID does not exist." });

      if (profileData.aadhaarNumber && patient) {
        patient.aadhaarNumber = profileData.aadhaarNumber;
      }

      let profile = memoryStore.profiles.find(p => p.patientId.toUpperCase() === pid);
      if (profile) {
        Object.assign(profile, profileData);
      } else {
        profile = {
          patientId: pid,
          bloodGroup: bloodGroup || 'Not Specified',
          allergies: allergies || 'None',
          existingDiseases: existingDiseases || 'None',
          medicalHistory: medicalHistory || 'None',
          currentMedications: currentMedications || 'None',
          emergencyName: emergencyName || 'N/A',
          emergencyPhone: emergencyPhone || 'N/A',
          insuranceDetails: insuranceDetails || 'None',
          aadhaarNumber: profileData.aadhaarNumber || 'N/A',
          updatedAt: new Date()
        };
        memoryStore.profiles.push(profile);
      }
      res.json({ message: "Medical Profile updated successfully.", profile });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
