// In-memory session store 
const sessions = new Map();

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// Get or create a session for a phone number
exports.getSession = (phone) => {
  const session = sessions.get(phone);

  if (session && Date.now() - session.lastUpdate < SESSION_TIMEOUT) {
    return session;
  }

  // Create new session
  const newSession = {
    phone,
    step: 'awaiting_photo', // awaiting_photo, awaiting_description, awaiting_location, complete
    data: {
      imageUrl: null,
      description: null,
      location: null,
      address: null,
    },
    lastUpdate: Date.now(),
  };

  sessions.set(phone, newSession);
  return newSession;
};

// Update session data
exports.updateSession = (phone, updates) => {
  const session = exports.getSession(phone);
  Object.assign(session, updates, { lastUpdate: Date.now() });
  sessions.set(phone, session);
  return session;
};

// Reset session (after complaint registered or timeout)
exports.clearSession = (phone) => {
  sessions.delete(phone);
};

// Get all active sessions (for debugging)
exports.getAllSessions = () => {
  return Array.from(sessions.values());
};