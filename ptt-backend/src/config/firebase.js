const admin = require('firebase-admin');

function initializeFirebase() {
  // We parse the JSON string from the .env file
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  if (!serviceAccount) {
    throw new Error('Firebase service account credentials are not set in .env file.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });


}

// We initialize it once and export the auth module
initializeFirebase();

// We initialize it once and export the auth module
const firebaseAuth = admin.auth();

module.exports = firebaseAuth;
