# MediTrack – Integrated Patient Care Management System

MediTrack is an integrated healthcare management application built using **Node.js, Express.js, MongoDB Atlas, HTML5, CSS3, Vanilla JavaScript, GPS Geolocation, and Google Maps API**.

It replaces paper records with a digital workflow strictly focused on **Milestone 1 Requirements**:
1. Patient Registration (Auto-generated unique Patient IDs: `PAT001`, `PAT002`..., GPS Location capture, Google Maps pin).
2. Patient Profile Management (Medical history, allergies, emergency contacts, insurance).
3. MongoDB Atlas Database Storage (`patients`, `patientProfiles`, `appointments`, `doctors`).
4. Appointment Scheduling with Slot Availability & Duplicate Booking Prevention.
5. Unified Patient Search & Data Retrieval.
6. Doctor Record View & Agenda Dashboard.

---

## 🛠️ Required Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (`mongoose`)
- **APIs & Services**: GPS (`navigator.geolocation`), Google Maps JavaScript API
- **Deployment**: Vercel (`vercel.json`)
- **Version Control**: GitHub (`.gitignore`, `.env.example`)

---

## 📁 Folder & Project Structure

```text
meditrack/
│
├── server.js                   # Express server entry point & static middleware
├── package.json                # Dependencies & scripts
├── vercel.json                 # Vercel deployment routing config
├── .env                        # Environment variables (Ignored by Git)
├── .env.example                # Placeholder template for environment variables
├── .gitignore                  # Excludes node_modules, .env, etc.
├── README.md                   # Setup documentation
│
├── config/
│   └── db.js                   # Mongoose MongoDB Atlas connection & fallback
│
├── models/
│   ├── Patient.js              # Patient schema with unique patientId index
│   ├── PatientProfile.js       # Medical profile schema linked via patientId
│   ├── Appointment.js          # Appointment schema with compound slot index
│   └── Doctor.js               # Doctor schema
│
├── controllers/
│   ├── patientController.js    # Auto PAT ID sequence, registration & search
│   ├── profileController.js    # Medical profile create/read/update
│   ├── appointmentController.js# Slot check & duplicate booking block
│   └── doctorController.js     # Clinical agenda & stats
│
├── routes/
│   ├── patientRoutes.js        # REST endpoints /api/patients
│   ├── profileRoutes.js        # REST endpoints /api/profiles
│   ├── appointmentRoutes.js    # REST endpoints /api/appointments
│   └── doctorRoutes.js         # REST endpoints /api/doctors
│
├── public/
│   ├── index.html              # Entry redirect
│   ├── login.html              # Multi-role login screen
│   ├── dashboard.html          # Overview dashboard with live KPIs
│   ├── register.html           # Patient registration with GPS & Google Maps
│   ├── profile.html            # Medical profile viewer & editor
│   ├── search.html             # Unified patient lookup & record drawer
│   ├── appointments.html       # Appointment slot picker & double-booking block
│   ├── doctor.html             # Doctor clinical dashboard & inspector
│   │
│   ├── css/
│   │   └── style.css           # Modern healthcare visual design system
│   │
│   └── js/
│       ├── app.js              # Shared user session & UI helpers
│       ├── register.js         # GPS Geolocation & Google Maps handler
│       ├── profile.js          # Medical profile REST API fetcher
│       ├── search.js           # Directory search API handler
│       ├── appointments.js     # Slot picker & booking handler
│       └── doctor.js           # Doctor workspace inspector
│
└── test/
    └── test_api.js             # Automated API test suite
```

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GOOGLE_MAPS_API_KEY=your_google_maps_javascript_api_key
```

---

## 🚀 Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated API Test Suite
```bash
npm test
```

### 3. Launch Development Server
```bash
npm start
```
Open your browser and navigate to: **`http://127.0.0.1:5000`**

---

## 🌐 Vercel Deployment

1. Push your code to GitHub (ensure `.env` and `node_modules/` are in `.gitignore`).
2. Import your GitHub repository on [Vercel](https://vercel.com).
3. Set Environment Variables on Vercel Dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas Connection String
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API Key
4. Deploy! Vercel will automatically route `/api/*` to `server.js` using `@vercel/node`.
