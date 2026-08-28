import os
import re
from datetime import date
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import sqlite3

from database.db import (
    init_db, 
    get_db, 
    generate_next_patient_id, 
    is_duplicate_patient, 
    get_dashboard_stats
)

app = Flask(__name__)
app.secret_key = "meditrack_milestone1_secure_key_2026"

# Initialize DB on startup
with app.app_context():
    init_db()

@app.context_processor
def inject_global_vars():
    """Injects current date for header display across all templates."""
    today = date.today()
    return {
        'current_date_display': today.strftime('%A, %B %d, %Y'),
        'today_str': today.strftime('%Y-%m-%d')
    }

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            flash("Please log in to access MediTrack.", "info")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ==================== 1. LOGIN & AUTHENTICATION ====================

@app.route('/')
def index():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        role = request.form.get('role', 'staff').strip()
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE username = ? AND password = ? AND role = ?",
            (username, password, role)
        )
        user = cursor.fetchone()
        conn.close()
        
        if user:
            session['user'] = {
                'id': user['id'],
                'username': user['username'],
                'role': user['role'],
                'full_name': user['full_name'],
                'associated_id': user['associated_id']
            }
            flash(f"Welcome back, {user['full_name']}!", "success")
            return redirect(url_for('dashboard'))
        else:
            flash("Invalid credentials or role selected. Please check and try again.", "error")
            
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("You have been logged out successfully.", "info")
    return redirect(url_for('login'))


# ==================== 2. DASHBOARD MODULE ====================

@app.route('/dashboard')
@login_required
def dashboard():
    stats = get_dashboard_stats()
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.appointment_id, a.patient_id, p.full_name as patient_name, 
               a.doctor_name, a.appointment_date, a.appointment_time, a.status
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        ORDER BY a.appointment_date DESC, a.appointment_time ASC
        LIMIT 6;
    """)
    recent_appointments = cursor.fetchall()
    conn.close()
    
    return render_template(
        'dashboard.html', 
        stats=stats, 
        recent_appointments=recent_appointments,
        active_page='dashboard'
    )


# ==================== 3. PATIENT REGISTRATION MODULE ====================

@app.route('/register', methods=['GET', 'POST'])
@login_required
def register():
    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        age_str = request.form.get('age', '').strip()
        gender = request.form.get('gender', '').strip()
        date_of_birth = request.form.get('date_of_birth', '').strip()
        phone = request.form.get('phone', '').strip()
        email = request.form.get('email', '').strip()
        address = request.form.get('address', '').strip()
        
        # Validation 1: Required fields
        if not all([full_name, age_str, gender, date_of_birth, phone, email, address]):
            flash("Validation Error: All required registration fields must be provided.", "error")
            return redirect(url_for('register'))
            
        # Validation 2: Age range
        try:
            age = int(age_str)
            if age <= 0 or age > 130:
                raise ValueError()
        except ValueError:
            flash("Validation Error: Please enter a valid age between 1 and 130.", "error")
            return redirect(url_for('register'))
            
        # Validation 3: Email format
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            flash("Validation Error: Invalid email address format.", "error")
            return redirect(url_for('register'))

        # Backend Duplicate Patient Prevention
        existing_pid = is_duplicate_patient(full_name, phone, email)
        if existing_pid:
            flash(f"Duplicate Patient Notice: A patient record with this phone/email already exists ({existing_pid}).", "error")
            return redirect(url_for('search', q=existing_pid))
            
        # Generate Unique Patient ID
        patient_id = generate_next_patient_id()
        
        conn = get_db()
        cursor = conn.cursor()
        try:
            # Insert Patient
            cursor.execute("""
                INSERT INTO patients (patient_id, full_name, age, gender, date_of_birth, phone, email, address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (patient_id, full_name, age, gender, date_of_birth, phone, email, address))
            
            # Initialize empty Medical Profile connected via patient_id
            cursor.execute("""
                INSERT INTO patient_profiles (patient_id, blood_group, allergies, existing_diseases, medical_history, current_medications, emergency_name, emergency_phone, insurance_details)
                VALUES (?, 'Not Specified', 'None', 'None', 'None', 'None', 'N/A', 'N/A', 'None')
            """, (patient_id,))
            
            conn.commit()
            flash(f"Patient registered successfully. Patient ID generated: {patient_id}", "success")
            return redirect(url_for('patient_profile', patient_id=patient_id))
            
        except sqlite3.IntegrityError as e:
            conn.rollback()
            flash(f"Database Error: Duplicate record or constraint violation. {str(e)}", "error")
            return redirect(url_for('register'))
        finally:
            conn.close()

    # GET request: Generate preview PAT ID
    next_patient_id = generate_next_patient_id()
    return render_template('register.html', next_patient_id=next_patient_id, active_page='register')


# ==================== 4. PATIENT PROFILE MANAGEMENT MODULE ====================

@app.route('/profile/<patient_id>', methods=['GET', 'POST'])
@login_required
def patient_profile(patient_id):
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        blood_group = request.form.get('blood_group', 'Not Specified').strip()
        allergies = request.form.get('allergies', 'None').strip()
        existing_diseases = request.form.get('existing_diseases', 'None').strip()
        medical_history = request.form.get('medical_history', 'None').strip()
        current_medications = request.form.get('current_medications', 'None').strip()
        emergency_name = request.form.get('emergency_name', 'N/A').strip()
        emergency_phone = request.form.get('emergency_phone', 'N/A').strip()
        insurance_details = request.form.get('insurance_details', 'None').strip()
        
        cursor.execute("""
            INSERT INTO patient_profiles (patient_id, blood_group, allergies, existing_diseases, medical_history, current_medications, emergency_name, emergency_phone, insurance_details, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(patient_id) DO UPDATE SET
                blood_group=excluded.blood_group,
                allergies=excluded.allergies,
                existing_diseases=excluded.existing_diseases,
                medical_history=excluded.medical_history,
                current_medications=excluded.current_medications,
                emergency_name=excluded.emergency_name,
                emergency_phone=excluded.emergency_phone,
                insurance_details=excluded.insurance_details,
                updated_at=CURRENT_TIMESTAMP;
        """, (patient_id, blood_group, allergies, existing_diseases, medical_history, current_medications, emergency_name, emergency_phone, insurance_details))
        
        conn.commit()
        flash("Profile updated successfully.", "success")
        
    # Fetch patient details
    cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    patient = cursor.fetchone()
    
    if not patient:
        conn.close()
        flash(f"Error: Patient ID {patient_id} not found.", "error")
        return redirect(url_for('search'))
        
    cursor.execute("SELECT * FROM patient_profiles WHERE patient_id = ?", (patient_id,))
    profile = cursor.fetchone()
    conn.close()
    
    return render_template(
        'profile.html', 
        patient=patient, 
        profile=profile,
        active_page='search'
    )


# ==================== 5. APPOINTMENT SCHEDULING MODULE ====================

@app.route('/appointments', methods=['GET', 'POST'])
@login_required
def appointments():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        patient_id = request.form.get('patient_id', '').strip()
        doctor_id = request.form.get('doctor_id', '').strip()
        appointment_date = request.form.get('appointment_date', '').strip()
        appointment_time = request.form.get('appointment_time', '').strip()
        reason = request.form.get('reason', 'General Checkup').strip()
        
        if not all([patient_id, doctor_id, appointment_date, appointment_time]):
            flash("Validation Error: Please select a Patient, Doctor, Date, and Time slot.", "error")
            conn.close()
            return redirect(url_for('appointments'))
            
        # Get doctor name
        cursor.execute("SELECT name FROM doctors WHERE doctor_id = ?", (doctor_id,))
        doc = cursor.fetchone()
        doctor_name = doc['name'] if doc else 'Doctor'
        
        # Check backend duplicate slot prevention rule
        cursor.execute("""
            SELECT appointment_id FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status = 'Scheduled'
        """, (doctor_id, appointment_date, appointment_time))
        
        existing_slot = cursor.fetchone()
        if existing_slot:
            flash("This appointment slot is already booked. Please choose a different time slot.", "error")
            conn.close()
            return redirect(url_for('appointments', patient_id=patient_id))
            
        try:
            cursor.execute("""
                INSERT INTO appointments (patient_id, doctor_id, doctor_name, appointment_date, appointment_time, reason, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Scheduled')
            """, (patient_id, doctor_id, doctor_name, appointment_date, appointment_time, reason))
            
            conn.commit()
            flash("Appointment booked successfully.", "success")
        except sqlite3.IntegrityError:
            conn.rollback()
            flash("This appointment slot is already booked.", "error")
        finally:
            conn.close()
            
        return redirect(url_for('appointments'))
        
    # GET: Load patients, doctors, scheduled appointments
    cursor.execute("SELECT patient_id, full_name, phone FROM patients ORDER BY patient_id DESC;")
    patients_list = cursor.fetchall()
    
    cursor.execute("SELECT * FROM doctors ORDER BY name ASC;")
    doctors_list = cursor.fetchall()
    
    cursor.execute("""
        SELECT a.*, p.full_name as patient_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        ORDER BY a.appointment_date DESC, a.appointment_time ASC;
    """)
    appointments_list = cursor.fetchall()
    
    conn.close()
    
    selected_patient_id = request.args.get('patient_id', '')
    
    return render_template(
        'appointments.html',
        patients=patients_list,
        doctors=doctors_list,
        appointments_list=appointments_list,
        selected_patient_id=selected_patient_id,
        active_page='appointments'
    )

@app.route('/api/available-slots')
def available_slots_api():
    doctor_id = request.args.get('doctor_id', '').strip()
    appt_date = request.args.get('date', '').strip()
    
    if not doctor_id or not appt_date:
        return jsonify({'booked_slots': []})
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT appointment_time FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ? AND status = 'Scheduled';
    """, (doctor_id, appt_date))
    
    rows = cursor.fetchall()
    conn.close()
    
    booked = [r['appointment_time'] for r in rows]
    return jsonify({'booked_slots': booked})


# ==================== 6. PATIENT SEARCH & DATA RETRIEVAL ====================

@app.route('/search')
@login_required
def search():
    query = request.args.get('q', '').strip()
    
    conn = get_db()
    cursor = conn.cursor()
    
    if query:
        # Search by Patient ID, Name, or Phone
        sql = """
            SELECT * FROM patients 
            WHERE LOWER(patient_id) LIKE ? OR LOWER(full_name) LIKE ? OR phone LIKE ?
            ORDER BY patient_id ASC;
        """
        search_pattern = f"%{query.lower()}%"
        cursor.execute(sql, (search_pattern, search_pattern, f"%{query}%"))
        patients = cursor.fetchall()
    else:
        cursor.execute("SELECT * FROM patients ORDER BY patient_id ASC;")
        patients = cursor.fetchall()
        
    selected_patient = None
    medical_profile = None
    patient_appointments = []
    
    # If single search hit or query matches exact patient ID
    if patients:
        if len(patients) == 1 or (query and query.upper().startswith('PAT')):
            selected_patient = patients[0]
            for p in patients:
                if p['patient_id'].lower() == query.lower():
                    selected_patient = p
                    break
                    
            pid = selected_patient['patient_id']
            cursor.execute("SELECT * FROM patient_profiles WHERE patient_id = ?", (pid,))
            medical_profile = cursor.fetchone()
            
            cursor.execute("""
                SELECT a.*, d.specialty
                FROM appointments a
                LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
                WHERE a.patient_id = ?
                ORDER BY a.appointment_date DESC, a.appointment_time ASC;
            """, (pid,))
            patient_appointments = cursor.fetchall()
            
    conn.close()
    
    return render_template(
        'search.html',
        query=query,
        patients=patients,
        selected_patient=selected_patient,
        medical_profile=medical_profile,
        patient_appointments=patient_appointments,
        active_page='search'
    )


# ==================== 7. DOCTOR RECORD VIEW MODULE ====================

@app.route('/doctor')
@login_required
def doctor_view():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM doctors ORDER BY name ASC;")
    all_doctors = cursor.fetchall()
    
    selected_doc_id = request.args.get('doctor_id')
    if not selected_doc_id:
        # Default to logged in doctor or Dr. Priya Sharma
        if session.get('user') and session['user']['role'] == 'doctor' and session['user']['associated_id']:
            selected_doc_id = session['user']['associated_id']
        elif all_doctors:
            selected_doc_id = all_doctors[0]['doctor_id']
            
    cursor.execute("SELECT * FROM doctors WHERE doctor_id = ?", (selected_doc_id,))
    current_doctor = cursor.fetchone()
    
    # Doctor's appointments
    cursor.execute("""
        SELECT a.*, p.full_name as patient_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        WHERE a.doctor_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time ASC;
    """, (selected_doc_id,))
    doctor_appointments = cursor.fetchall()
    
    selected_patient = None
    patient_medical_profile = None
    
    selected_pat_id = request.args.get('patient_id')
    if not selected_pat_id and doctor_appointments:
        selected_pat_id = doctor_appointments[0]['patient_id']
        
    if selected_pat_id:
        cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (selected_pat_id,))
        selected_patient = cursor.fetchone()
        
        cursor.execute("SELECT * FROM patient_profiles WHERE patient_id = ?", (selected_pat_id,))
        patient_medical_profile = cursor.fetchone()
        
    conn.close()
    
    return render_template(
        'doctor.html',
        all_doctors=all_doctors,
        current_doctor=current_doctor,
        selected_doc_id=selected_doc_id,
        doctor_appointments=doctor_appointments,
        selected_patient=selected_patient,
        patient_medical_profile=patient_medical_profile,
        active_page='doctor'
    )


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def page_not_found(e):
    return render_template('base.html', content="<div class='card'><h2>Page Not Found</h2><p>The requested page does not exist.</p></div>"), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('base.html', content=f"<div class='card'><h2>Server Error</h2><p>An internal server error occurred: {str(e)}</p></div>"), 500


if __name__ == '__main__':
    print("Starting MediTrack - Integrated Patient Care Management System...")
    app.run(host='127.0.0.1', port=5000, debug=False)
