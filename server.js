const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas / Local DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/profiles', require('./routes/profileRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/receptionist', require('./routes/receptionistRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Google Maps API Key config endpoint
app.get('/api/config/maps-key', (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
});

// HTML page routing fallbacks
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/doctor-register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'doctor-register.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/appointments', (req, res) => res.sendFile(path.join(__dirname, 'public', 'appointments.html')));
app.get('/search', (req, res) => res.sendFile(path.join(__dirname, 'public', 'search.html')));
app.get('/doctor', (req, res) => res.sendFile(path.join(__dirname, 'public', 'doctor.html')));
app.get('/prescriptions', (req, res) => res.sendFile(path.join(__dirname, 'public', 'prescriptions.html')));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏥 MediTrack Node.js Express server running at: http://127.0.0.1:${PORT} and http://localhost:${PORT}`);
  });
}

module.exports = app;
