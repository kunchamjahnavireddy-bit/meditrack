const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  patientId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  appointmentId: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    default: 'appointment'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
