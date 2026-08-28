const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads/reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const patId = req.user && req.user.patientId ? req.user.patientId.toUpperCase() : 'PAT';
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `report_${patId}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
    cb(null, uniqueName);
  }
});

// File Type & Mime Validation Filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const isExtAllowed = allowedExtensions.includes(ext);
  const isMimeAllowed = allowedMimeTypes.includes(file.mimetype);

  if (isExtAllowed && isMimeAllowed) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, JPG, JPEG, and PNG medical files are allowed."));
  }
};

// 10MB Max File Size Limit
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Megabytes
  }
});

module.exports = upload;
