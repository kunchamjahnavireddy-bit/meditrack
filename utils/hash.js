const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Secure password hashing using bcryptjs
const hashPassword = (password) => {
  if (!password) return '';
  return bcrypt.hashSync(password, 10);
};

// Verify password using bcryptjs with fallback for legacy HMAC / plain text
const verifyPassword = (password, hashedPassword) => {
  if (!password || !hashedPassword) return false;

  // bcrypt hash format check
  if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(password, hashedPassword);
    } catch (e) {
      return false;
    }
  }

  // Legacy HMAC SHA-256 fallback for seeded data
  const legacyHmac = crypto.createHmac('sha256', 'meditrack_secure_salt_2026').update(password).digest('hex');
  return legacyHmac === hashedPassword || password === hashedPassword;
};

module.exports = {
  hashPassword,
  verifyPassword
};
