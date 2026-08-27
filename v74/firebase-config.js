/* ------------------------------------------------------------------------
 * Kalayaan Ward Family Bingo — Firebase configuration
 * ------------------------------------------------------------------------
 * PASTE YOUR OWN Firebase web-app config below to turn ON cloud sync
 * (multiple users, across devices). Until you replace the PASTE_* values,
 * the app runs in LOCAL-ONLY mode — everything still works, but data stays
 * on this one device.
 *
 * WHERE TO GET THESE VALUES
 *   1. Go to https://console.firebase.google.com/ and create a project
 *      (free "Spark" plan is fine).
 *   2. In the project, add a Web app (</> icon). Firebase shows a config
 *      object — copy its values into the fields below.
 *   3. In the console, enable these three products:
 *        • Build → Authentication → Sign-in method → enable "Anonymous"
 *        • Build → Firestore Database → Create database (Production mode)
 *        • Build → Storage → Get started
 *   4. Paste the security rules from SETUP-FIREBASE.md into Firestore and
 *      Storage (Rules tabs), and Publish.
 *   5. Commit this file with your real values. (These web keys are NOT
 *      secret — security is enforced by the rules, not by hiding the keys.)
 * ---------------------------------------------------------------------- */
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};
