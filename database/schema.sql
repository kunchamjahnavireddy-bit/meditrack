-- MediTrack Database Schema
PRAGMA foreign_keys = ON;

-- Users table for role-based authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('staff', 'doctor', 'patient')),
    full_name TEXT NOT NULL,
    associated_id TEXT -- doctor_id or patient_id if applicable
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    patient_id TEXT PRIMARY KEY, -- e.g. PAT001, PAT002
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK(age > 0 AND age < 130),
    gender TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient Profiles table (connected to patients via patient_id)
CREATE TABLE IF NOT EXISTS patient_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT UNIQUE NOT NULL,
    blood_group TEXT DEFAULT 'Not Specified',
    allergies TEXT DEFAULT 'None',
    existing_diseases TEXT DEFAULT 'None',
    medical_history TEXT DEFAULT 'None',
    current_medications TEXT DEFAULT 'None',
    emergency_name TEXT DEFAULT 'N/A',
    emergency_phone TEXT DEFAULT 'N/A',
    insurance_details TEXT DEFAULT 'None',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id TEXT PRIMARY KEY, -- e.g. DOC001
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    department TEXT NOT NULL
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    appointment_date TEXT NOT NULL, -- YYYY-MM-DD
    appointment_time TEXT NOT NULL, -- e.g. '09:00 AM'
    reason TEXT DEFAULT 'General Checkup',
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'Completed', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- Prevent duplicate bookings for same doctor, date, and time slot
    UNIQUE (doctor_id, appointment_date, appointment_time)
);
