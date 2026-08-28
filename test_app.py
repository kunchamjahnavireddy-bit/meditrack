import unittest
import os
import json
import sqlite3
from app import app
from database.db import init_db, get_db, DB_PATH

class MediTrackMilestone1TestCase(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()
        
        # Clean DB tables for test isolation
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("DROP TABLE IF EXISTS appointments;")
            cursor.execute("DROP TABLE IF EXISTS patient_profiles;")
            cursor.execute("DROP TABLE IF EXISTS patients;")
            cursor.execute("DROP TABLE IF EXISTS doctors;")
            cursor.execute("DROP TABLE IF EXISTS users;")
            conn.commit()
            conn.close()
            
        init_db()
        
        # Log in as Staff
        with self.client.session_transaction() as sess:
            sess['user'] = {
                'id': 1,
                'username': 'staff',
                'role': 'staff',
                'full_name': 'Hospital Admin Staff',
                'associated_id': None
            }

    def test_1_dashboard_access(self):
        response = self.client.get('/dashboard')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Total Patients", response.data)
        self.assertIn(b"Total Appointments", response.data)

    def test_2_patient_registration_and_auto_pat_id(self):
        # GET registration page -> verify preview PAT ID is PAT003
        res_get = self.client.get('/register')
        self.assertEqual(res_get.status_code, 200)
        self.assertIn(b"PAT003", res_get.data)

        # POST registration -> register Anish Gupta
        payload = {
            'full_name': 'Anish Gupta',
            'age': '31',
            'gender': 'Male',
            'date_of_birth': '1995-02-10',
            'phone': '+91 98345 67890',
            'email': 'anish.gupta@example.com',
            'address': '78, Bandra West, Mumbai'
        }
        res_post = self.client.post('/register', data=payload, follow_redirects=True)
        self.assertEqual(res_post.status_code, 200)
        self.assertIn(b"Patient registered successfully. Patient ID generated: PAT003", res_post.data)

        # Verify DB entry
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients WHERE patient_id = 'PAT003'")
        patient = cursor.fetchone()
        self.assertIsNotNone(patient)
        self.assertEqual(patient['full_name'], 'Anish Gupta')

        # Verify profile initialization
        cursor.execute("SELECT * FROM patient_profiles WHERE patient_id = 'PAT003'")
        profile = cursor.fetchone()
        self.assertIsNotNone(profile)
        conn.close()

    def test_3_patient_profile_update(self):
        # First register PAT003
        self.client.post('/register', data={
            'full_name': 'Anish Gupta', 'age': '31', 'gender': 'Male',
            'date_of_birth': '1995-02-10', 'phone': '+91 98345 67890',
            'email': 'anish.gupta@example.com', 'address': 'Mumbai'
        })
        
        # Update profile for PAT003
        payload = {
            'blood_group': 'A+',
            'allergies': 'Dust, Pollen',
            'existing_diseases': 'Type 2 Diabetes',
            'medical_history': 'Fractured Radius (2020)',
            'current_medications': 'Metformin 500mg',
            'emergency_name': 'Ramesh Gupta',
            'emergency_phone': '+91 98345 00000',
            'insurance_details': 'Care Health Policy #881273'
        }
        res = self.client.post('/profile/PAT003', data=payload, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Profile updated successfully.", res.data)

        # Check DB
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patient_profiles WHERE patient_id = 'PAT003'")
        profile = cursor.fetchone()
        self.assertEqual(profile['blood_group'], 'A+')
        self.assertEqual(profile['allergies'], 'Dust, Pollen')
        conn.close()

    def test_4_appointment_booking_and_duplicate_slot_prevention(self):
        # Register PAT003 first
        self.client.post('/register', data={
            'full_name': 'Anish Gupta', 'age': '31', 'gender': 'Male',
            'date_of_birth': '1995-02-10', 'phone': '+91 98345 67890',
            'email': 'anish.gupta@example.com', 'address': 'Mumbai'
        })

        # Book 1st appointment: Dr. Priya Sharma (DOC001), 2026-08-25 at 10:00 AM for PAT003
        payload1 = {
            'patient_id': 'PAT003',
            'doctor_id': 'DOC001',
            'appointment_date': '2026-08-25',
            'appointment_time': '10:00 AM',
            'reason': 'Diabetic Consultation'
        }
        res1 = self.client.post('/appointments', data=payload1, follow_redirects=True)
        self.assertEqual(res1.status_code, 200)
        self.assertIn(b"Appointment booked successfully.", res1.data)

        # Call live slots API -> verify 10:00 AM is booked
        res_api = self.client.get('/api/available-slots?doctor_id=DOC001&date=2026-08-25')
        self.assertEqual(res_api.status_code, 200)
        data = json.loads(res_api.data.decode('utf-8'))
        self.assertIn('10:00 AM', data['booked_slots'])

        # Attempt duplicate booking: Dr. Priya Sharma (DOC001), 2026-08-25 at 10:00 AM for PAT001
        payload2 = {
            'patient_id': 'PAT001',
            'doctor_id': 'DOC001',
            'appointment_date': '2026-08-25',
            'appointment_time': '10:00 AM',
            'reason': 'Second Consultation Attempt'
        }
        res2 = self.client.post('/appointments', data=payload2, follow_redirects=True)
        self.assertEqual(res2.status_code, 200)
        self.assertIn(b"This appointment slot is already booked.", res2.data)

    def test_5_search_and_retrieval(self):
        # Register PAT003 first
        self.client.post('/register', data={
            'full_name': 'Anish Gupta', 'age': '31', 'gender': 'Male',
            'date_of_birth': '1995-02-10', 'phone': '+91 98345 67890',
            'email': 'anish.gupta@example.com', 'address': 'Mumbai'
        })
        
        # Search by PAT003
        res = self.client.get('/search?q=PAT003')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Anish Gupta", res.data)

    def test_6_doctor_view(self):
        res = self.client.get('/doctor?doctor_id=DOC001&patient_id=PAT001')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Dr. Priya Sharma", res.data)
        self.assertIn(b"Rahul Sharma", res.data)

if __name__ == '__main__':
    unittest.main()
