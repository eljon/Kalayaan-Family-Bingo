/* ------------------------------------------------------------------------
 * Kalayaan Ward Family Bingo — Firebase configuration
 * ------------------------------------------------------------------------
 * These web keys are NOT secret — they identify the project; security is
 * enforced by the Firestore/Storage rules (see SETUP-FIREBASE.md), not by
 * hiding these values. cloud.js reads window.FIREBASE_CONFIG and initializes
 * Firebase itself, so only the config object below is needed here.
 *
 * Cloud sync turns ON once the console setup in SETUP-FIREBASE.md is done:
 *   • Authentication → Sign-in method → Anonymous = Enabled
 *   • Firestore Database created + rules published
 *   • Storage bucket created (Blaze plan) + rules published
 * Until then the app quietly runs local-only.
 * ---------------------------------------------------------------------- */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDLylMlj57Ogl72FwqJg91TuhF1QWiSuDw",
  authDomain: "kalayaan-bingo.firebaseapp.com",
  projectId: "kalayaan-bingo",
  storageBucket: "kalayaan-bingo.firebasestorage.app",
  messagingSenderId: "169963575543",
  appId: "1:169963575543:web:eca30b3900411aa1a3dbf2",
  measurementId: "G-PCR9ZFKGGL"
};
