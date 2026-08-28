// MediTrack - Patient Notification Controller

const Notification = require('../models/Notification');
const { getIsConnectedToMongo, memoryStore } = require('../config/db');

// GET /api/notifications/patient/:patientId or /api/patient/notifications
exports.getPatientNotifications = async (req, res) => {
  try {
    const patientId = (req.params.patientId || (req.user && req.user.patientId) || '').toUpperCase();

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required." });
    }

    if (getIsConnectedToMongo()) {
      const notifications = await Notification.find({ patientId }).sort({ createdAt: -1 });
      return res.json(notifications);
    } else {
      const notifications = memoryStore.notifications
        .filter(n => n.patientId.toUpperCase() === patientId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(notifications);
    }
  } catch (err) {
    console.error("Error fetching patient notifications:", err);
    res.status(500).json({ error: "Failed to load notifications." });
  }
};

// PUT /api/notifications/:notificationId/read
exports.markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (getIsConnectedToMongo()) {
      const notif = await Notification.findOneAndUpdate(
        { notificationId },
        { $set: { status: 'read', readAt: new Date() } },
        { new: true }
      );
      if (!notif) return res.status(404).json({ error: "Notification not found." });
      return res.json({ message: "Notification marked as read.", notification: notif });
    } else {
      const notif = memoryStore.notifications.find(n => n.notificationId === notificationId);
      if (!notif) return res.status(404).json({ error: "Notification not found." });
      notif.status = 'read';
      notif.readAt = new Date();
      return res.json({ message: "Notification marked as read.", notification: notif });
    }
  } catch (err) {
    console.error("Error marking notification read:", err);
    res.status(500).json({ error: "Failed to update notification." });
  }
};
