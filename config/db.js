const mongoose = require('mongoose');
const { hashPassword } = require('../utils/hash');

// In-Memory store fallback if MongoDB instance is offline or unreachable locally
let memoryStore = {
  patients: [
    {
      patientId: "PAT001",
      password: hashPassword("passPAT001"),
      fullName: "Rahul Sharma",
      age: 28,
      gender: "Male",
      dateOfBirth: "1998-05-15",
      phone: "+91 98123 45678",
      email: "rahul.sharma@example.com",
      address: "12, Park Street, Kurnool",
      patientLocation: "Kurnool",
      accountStatus: "active",
      location: { latitude: 15.8281, longitude: 78.0373 },
      createdAt: new Date()
    },
    {
      patientId: "PAT002",
      password: hashPassword("passPAT002"),
      fullName: "Priya Verma",
      age: 34,
      gender: "Female",
      dateOfBirth: "1992-09-20",
      phone: "+91 98234 56789",
      email: "priya.verma@example.com",
      address: "45, M.G. Road, Bengaluru",
      patientLocation: "Bengaluru",
      accountStatus: "active",
      location: { latitude: 12.9716, longitude: 77.5946 },
      createdAt: new Date()
    }
  ],
  profiles: [
    {
      patientId: "PAT001",
      bloodGroup: "O+",
      allergies: "Dust, Penicillin",
      existingDiseases: "Hypertension",
      medicalHistory: "Appendectomy in 2019",
      currentMedications: "Amlodipine 5mg",
      emergencyName: "Suresh Sharma (Father)",
      emergencyPhone: "+91 98123 00000",
      insuranceDetails: "Star Health Policy #109283",
      aadhaarNumber: "987654321098",
      updatedAt: new Date()
    },
    {
      patientId: "PAT002",
      bloodGroup: "B+",
      allergies: "Latex, Peanuts",
      existingDiseases: "Asthma",
      medicalHistory: "Mild Bronchitis (2021)",
      currentMedications: "Inhaler (Salbutamol)",
      emergencyName: "Amit Verma (Spouse)",
      emergencyPhone: "+91 98234 00000",
      insuranceDetails: "HDFC ERGO Policy #992812",
      aadhaarNumber: "987654321099",
      updatedAt: new Date()
    }
  ],
  appointments: [
    {
      appointmentId: 1,
      patientId: "PAT001",
      patientName: "Rahul Sharma",
      patientLocation: "Kurnool",
      doctorId: "DOC001",
      doctorName: "Dr. Priya Sharma",
      doctorSpecialization: "Cardiology",
      doctorLocation: "Kurnool",
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: "10:00 AM",
      reason: "Routine Cardiac Checkup",
      status: "Confirmed",
      createdAt: new Date()
    },
    {
      appointmentId: 2,
      patientId: "PAT002",
      patientName: "Priya Verma",
      patientLocation: "Bengaluru",
      doctorId: "DOC002",
      doctorName: "Dr. Rajesh Kumar",
      doctorSpecialization: "General Medicine",
      doctorLocation: "Bengaluru",
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: "11:00 AM",
      reason: "Asthma Followup",
      status: "Confirmed",
      createdAt: new Date()
    }
  ],
  doctors: [
    {
      doctorId: "DOC001",
      password: hashPassword("doc123"),
      name: "Dr. Priya Sharma",
      specialty: "Cardiology",
      email: "priya.sharma@meditrack.org",
      phone: "+91 98765 43210",
      department: "Cardiology",
      location: "Kurnool",
      medicalLicenseNumber: "LIC-CARDIO-99881",
      verificationStatus: "verified",
      accountStatus: "active",
      createdAt: new Date()
    },
    {
      doctorId: "DOC002",
      password: hashPassword("doc123"),
      name: "Dr. Rajesh Kumar",
      specialty: "General Medicine",
      email: "rajesh.kumar@meditrack.org",
      phone: "+91 98765 43211",
      department: "General Health",
      location: "Bengaluru",
      medicalLicenseNumber: "LIC-GEN-88221",
      verificationStatus: "verified",
      accountStatus: "active",
      createdAt: new Date()
    }
  ],
  receptionists: [
    { receptionistId: "REC001", password: hashPassword("rec123"), fullName: "Front Desk Receptionist", accountStatus: "active", createdAt: new Date() }
  ],
  prescriptions: [
    {
      prescriptionId: "RX001",
      patientId: "PAT001",
      patientName: "Rahul Sharma",
      doctorId: "DOC001",
      doctorName: "Dr. Priya Sharma",
      prescriptionDate: new Date().toISOString().split('T')[0],
      medicines: [
        {
          medicineName: "Paracetamol",
          dosage: "500 mg",
          frequency: "Twice a day",
          duration: "5 days",
          instructions: "Take after food"
        },
        {
          medicineName: "Amlodipine",
          dosage: "5 mg",
          frequency: "Once daily (Morning)",
          duration: "30 days",
          instructions: "Take with water before breakfast"
        }
      ],
      createdAt: new Date()
    }
  ],
  consultationNotes: [
    {
      noteId: "NOTE-001",
      patientId: "PAT001",
      doctorId: "DOC001",
      appointmentId: 1,
      diagnosis: "Mild Hypertension & Routine Followup",
      treatmentNotes: "Patient advised to reduce sodium intake, maintain regular exercise, and continue Amlodipine 5mg.",
      createdAt: new Date()
    }
  ],
  medicalReports: [
    {
      reportId: "REP-001",
      patientId: "PAT001",
      title: "Lipid Profile & Complete Blood Count",
      reportType: "Blood Test Report",
      fileUrl: "#",
      uploadedAt: new Date()
    },
    {
      reportId: "REP-002",
      patientId: "PAT001",
      title: "Chest X-Ray (PA View)",
      reportType: "X-Ray",
      fileUrl: "#",
      uploadedAt: new Date()
    }
  ],
  emergencyAccessLogs: [],
  notifications: [],
  hospitals: [
    {
      hospitalId: "HOSP001",
      name: "City General Hospital",
      address: "12 Hospital Road, Civil Lines",
      location: "Kurnool",
      phone: "+91 8518 220011",
      email: "contact@cityhospital.org",
      status: "active",
      createdAt: new Date()
    }
  ],
  adminAuditLogs: [],
  users: [
    { loginId: "ADM001", passwordHash: hashPassword("admin123"), role: "admin", fullName: "System Administrator", adminId: "ADM001", accountStatus: "active", verificationStatus: "verified" },
    { loginId: "PAT001", passwordHash: hashPassword("passPAT001"), role: "patient", fullName: "Rahul Sharma", patientId: "PAT001", accountStatus: "active", verificationStatus: "verified" },
    { loginId: "PAT002", passwordHash: hashPassword("passPAT002"), role: "patient", fullName: "Priya Verma", patientId: "PAT002", accountStatus: "active", verificationStatus: "verified" },
    { loginId: "DOC001", passwordHash: hashPassword("doc123"), role: "doctor", fullName: "Dr. Priya Sharma", doctorId: "DOC001", accountStatus: "active", verificationStatus: "verified" },
    { loginId: "REC001", passwordHash: hashPassword("rec123"), role: "receptionist", fullName: "Front Desk Receptionist", receptionistId: "REC001", accountStatus: "active", verificationStatus: "verified" }
  ]
};

let isConnectedToMongo = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('127.0.0.1') || uri.includes('localhost')) {
    try {
      mongoose.set('strictQuery', false);
      await mongoose.connect(uri || 'mongodb://127.0.0.1:27017/meditrack', {
        serverSelectionTimeoutMS: 500
      });
      isConnectedToMongo = true;
      console.log(`🍃 Connected to MongoDB: ${mongoose.connection.host}`);
      await seedInitialData();
      return;
    } catch (e) {
      isConnectedToMongo = false;
      console.log(`ℹ️ MongoDB connection not active locally. Operating in seamless In-Memory Data Mode.`);
      return;
    }
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    isConnectedToMongo = true;
    console.log(`🍃 Connected to MongoDB Atlas: ${mongoose.connection.host}`);
    await seedInitialData();
  } catch (err) {
    isConnectedToMongo = false;
    console.warn(`⚠️ MongoDB Atlas connection warning: ${err.message}. Operating in seamless In-Memory Data Mode.`);
  }
};

async function seedInitialData() {
  if (!isConnectedToMongo) return;
  try {
    const Doctor = mongoose.model('Doctor');
    const Patient = mongoose.model('Patient');
    const PatientProfile = mongoose.model('PatientProfile');
    const Appointment = mongoose.model('Appointment');
    const Prescription = mongoose.model('Prescription');
    const Receptionist = mongoose.model('Receptionist');
    const User = mongoose.model('User');
    const Notification = mongoose.model('Notification');
    const Hospital = mongoose.model('Hospital');

    const doctorCount = await Doctor.countDocuments();
    if (doctorCount === 0) {
      await Doctor.insertMany(memoryStore.doctors);
    }

    const recCount = await Receptionist.countDocuments();
    if (recCount === 0) {
      await Receptionist.insertMany(memoryStore.receptionists);
    }

    const patientCount = await Patient.countDocuments();
    if (patientCount === 0) {
      await Patient.insertMany(memoryStore.patients);
      await PatientProfile.insertMany(memoryStore.profiles);
      await Appointment.insertMany(memoryStore.appointments);
      await Prescription.insertMany(memoryStore.prescriptions);
      await User.insertMany(memoryStore.users);
    }

    const hospitalCount = await Hospital.countDocuments();
    if (hospitalCount === 0) {
      await Hospital.insertMany(memoryStore.hospitals);
    }

    // Ensure initial Admin ADM001 exists in User collection
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      const defaultAdmin = memoryStore.users.find(u => u.role === 'admin');
      if (defaultAdmin) {
        await User.create(defaultAdmin);
      }
    }

    // Auto-repair / sync User collection records to ensure no user authentication details are missing
    const allPatients = await Patient.find({});
    for (const p of allPatients) {
      await User.findOneAndUpdate(
        { loginId: p.patientId },
        {
          $set: {
            loginId: p.patientId,
            passwordHash: p.password,
            role: 'patient',
            fullName: p.fullName,
            patientId: p.patientId,
            accountStatus: p.accountStatus || 'active',
            verificationStatus: 'verified'
          }
        },
        { upsert: true, new: true }
      );
    }

    const allVerifiedDoctors = await Doctor.find({ verificationStatus: 'verified' });
    for (const d of allVerifiedDoctors) {
      if (d.doctorId) {
        await User.findOneAndUpdate(
          { loginId: d.doctorId },
          {
            $set: {
              loginId: d.doctorId,
              passwordHash: d.password,
              role: 'doctor',
              fullName: d.name,
              doctorId: d.doctorId,
              accountStatus: d.accountStatus || 'active',
              verificationStatus: 'verified'
            }
          },
          { upsert: true, new: true }
        );
      }
    }
  } catch (err) {
    console.error("Error seeding or repairing MongoDB data:", err.message);
  }
}

module.exports = {
  connectDB,
  getIsConnectedToMongo: () => isConnectedToMongo,
  memoryStore
};
