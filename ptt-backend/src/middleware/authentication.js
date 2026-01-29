
const firebaseAuth = require('../config/firebase');

async function verifyClientToken(token) {

  if (!token) {
    console.error("[ERROR] [Auth] Error: No token provided in URL.");
    throw new Error('No authentication token provided.');
  }

  try {
    // Verify with Firebase
    const decodedToken = await firebaseAuth.verifyIdToken(token);

    const user = {
      uid: decodedToken.uid,
      name: decodedToken.name || 'Unnamed User',
      email: decodedToken.email,
      picture: decodedToken.picture || null,
    };

    // Check Email Domain
    const allowedDomains = ['@siswa.um.edu.my', '@siswa-old.um.edu.my', '@um.edu.my'];
    const isAllowed = allowedDomains.some(domain => user.email.endsWith(domain));

    if (!user.email || !isAllowed) {
      console.error(`[ERROR] [Auth] BLOCKED: Domain not allowed for ${user.email}`);
      throw new Error('Access denied. Domain not authorized.');
    }

    return user;

  } catch (error) {
    console.error('[ERROR] [Auth] FAILED:', error.message);
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

module.exports = { verifyClientToken };