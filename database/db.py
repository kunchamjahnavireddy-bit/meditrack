import sqlite3
import os
from datetime import datetime, date

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "meditrack.db")
SCHEMA_PATH = os.path.join(DB_DIR, "schema.sql")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = get_db()
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    seed_sample_data()

def seed_sample_data():
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if doctors exist
    cursor.execute("SELECT COUNT(*) FROM doctors;")
    if cursor.fetchone()[0] == 0:
        sample_doctors = [
            ("DOC001", "Dr. Priya Sharma", "Cardiology", "priya.sharma@meditrack.org", "+91 98765 43210", "Cardiology"),
            ("DOC002", "Dr. Rajesh Kumar", "General Medicine", "rajesh.kumar@meditrack.org", "+91 98765 43211", "General Health"),
            ("DOC003", "Dr. Ananya Roy", "Pediatrics", "ananya.roy@meditrack.org", "+91 98765 43212", "Pediatrics"),
            ("DOC004", "Dr. Vikram Sethi", "Orthopedics", "vikram.sethi@meditrack.org", "+91 98765 43213", "Orthopedics")
        ]
        cursor.executemany(
            "INSERT INTO doctors (doctor_id, name, specialty, email, phone, department) VALUES (?, ?, ?, ?, ?, ?)",
            sample_doctors
        )
    
    # Check if users exist
    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] == 0:
        sample_users = [
            ("staff", "staff123", "staff", "Hospital Admin Staff", None),
            ("drpriya", "doc123", "doctor", "Dr. Priya Sharma", "DOC001"),
            ("drrajesh", "doc123", "doctor", "Dr. Rajesh Kumar", "DOC002"),
            ("rahul", "patient123", "patient", "Rahul Sharma", "PAT001"),
            ("priya", "patient123", "patient", "Priya Verma", "PAT002")
        ]
        cursor.executemany(
            "INSERT INTO users (username, password, role, full_name, associated_id) VALUES (?, ?, ?, ?, ?)",
            sample_users
        )
        
    # Check if sample patients exist
    cursor.execute("SELECT COUNT(*) FROM patients;")
    if cursor.fetchone()[0] == 0:
        sample_patients = [
            ("PAT001", "Rahul Sharma", 28, "Male", "1998-05-15", "+91 98123 45678", "rahul.sharma@example.com", "12, Park Street, New Delhi"),
            ("PAT002", "Priya Verma", 34, "Female", "1992-09-20", "+91 98234 56789", "priya.verma@example.com", "45, M.G. Road, Bengaluru")
        ]
        cursor.executemany(
            "INSERT INTO patients (patient_id, full_name, age, gender, date_of_birth, phone, email, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            sample_patients
        )
        
        sample_profiles = [
            ("PAT001", "O+", "Dust, Penicillin", "Hypertension", "Appendectomy in 2019", "Amlodipine 5mg", "Suresh Sharma (Father)", "+91 98123 00000", "Star Health Policy #109283"),
            ("PAT002", "B+", "Latex, Peanuts", "Asthma", "Mild Bronchitis (2021)", "Inhaler (Salbutamol)", "Amit Verma (Spouse)", "+91 98234 00000", "HDFC ERGO Policy #992812")
        ]
        cursor.executemany(
            "INSERT INTO patient_profiles (patient_id, blood_group, allergies, existing_diseases, medical_history, current_medications, emergency_name, emergency_phone, insurance_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            sample_profiles
        )
        
        # Sample appointments
        today_str = date.today().strftime("%Y-%m-%d")
        sample_appointments = [
            ("PAT001", "DOC001", "Dr. Priya Sharma", today_str, "10:00 AM", "Routine Cardiac Checkup", "Scheduled"),
            ("PAT002", "DOC002", "Dr. Rajesh Kumar", today_str, "11:00 AM", "Asthma Followup", "Scheduled")
        ]
        cursor.executemany(
            "INSERT INTO appointments (patient_id, doctor_id, doctor_name, appointment_date, appointment_time, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            sample_appointments
        )
        
    conn.commit()
    conn.close()

def generate_next_patient_id():
    """Generates the next unique PAT ID in format PAT001, PAT002, etc."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT patient_id FROM patients WHERE patient_id LIKE 'PAT%'")
    rows = cursor.fetchall()
    conn.close()
    
    max_num = 0
    for row in rows:
        pid = row["patient_id"]
        digits = pid[3:]
        if digits.isdigit():
            val = int(digits)
            if val > max_num:
                max_num = val
                
    next_num = max_num + 1
    return f"PAT{next_num:03d}"

def is_duplicate_patient(full_name, phone, email):
    """Checks if a patient with the exact same phone or email already exists."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT patient_id FROM patients WHERE LOWER(email) = LOWER(?) OR phone = ?", 
        (email.strip(), phone.strip())
    )
    existing = cursor.fetchone()
    conn.close()
    return existing["patient_id"] if existing else None

def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM patients;")
    total_patients = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM appointments;")
    total_appointments = cursor.fetchone()[0]
    
    today_str = date.today().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) FROM appointments WHERE appointment_date = ? AND status = 'Scheduled';", (today_str,))
    booked_today = cursor.fetchone()[0]
    
    # 4 doctors * 4 slots = 16 available total per day
    cursor.execute("SELECT COUNT(*) FROM doctors;")
    doctor_count = cursor.fetchone()[0]
    total_slots_per_day = doctor_count * 4
    available_today = max(0, total_slots_per_day - booked_today)
    
    conn.close()
    return {
        "total_patients": total_patients,
        "total_appointments": total_appointments,
        "booked_today": booked_today,
        "available_today": available_today
    }
