/* ------------------------------------------------------------------------
 * cloud.js — Firebase-backed sync for Kalayaan Ward Family Bingo.
 *
 * All Firebase access lives behind window.Cloud. When Firebase isn't
 * configured (firebase-config.js still has PASTE_* placeholders) or the SDK
 * failed to load, Cloud.enabled stays false and the app runs fully local.
 *
 * Data model
 *   Firestore  players/{docId}  = {
 *       name, nameKey, password, done:{taskId:ms}, photos:{taskId:url},
 *       preferences:{}, createdAt, updatedAt }
 *   Storage    photos/{docId}/{taskId}.jpg
 *   Auth       anonymous (gives request.auth so the rules can require it)
 *
 * Login is name + family password: docId is derived from the name; the
 * password is compared directly. It is stored in PLAINTEXT on purpose so a
 * ward admin can look it up in the Firestore console for members who forget
 * (there is no reset flow). A light gate for low-stakes sharing only — see
 * SETUP-FIREBASE.md.
 * ---------------------------------------------------------------------- */
(function () {
  "use strict";

  var Cloud = (window.Cloud = {
    enabled: false,   // true once Firebase is configured AND anon sign-in ok
    ready: null,      // Promise that resolves when sign-in settles (or nulls)
    uid: null
  });

  var cfg = window.FIREBASE_CONFIG || {};
  function looksConfigured() {
    return typeof firebase !== "undefined" && firebase.initializeApp &&
      cfg.apiKey && cfg.apiKey.indexOf("PASTE_") !== 0 &&
      cfg.projectId && cfg.projectId.indexOf("PASTE_") !== 0;
  }

  // ---- helpers that don't need Firebase -----------------------------------
  function nameKey(name) {
    return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function docId(name) {
    return nameKey(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "player";
  }
  Cloud.nameKey = nameKey;
  Cloud.docId = docId;

  // ---- init ---------------------------------------------------------------
  var db = null, storage = null, auth = null;
  if (looksConfigured()) {
    try {
      firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.firestore();
      storage = firebase.storage();
      Cloud.enabled = true;
      Cloud.ready = auth.signInAnonymously()
        .then(function (cred) { Cloud.uid = cred.user && cred.user.uid; })
        .catch(function (e) {
          Cloud.enabled = false;
          console.warn("[Cloud] anonymous sign-in failed — running local only.", e);
        });
    } catch (e) {
      Cloud.enabled = false;
      console.warn("[Cloud] init failed — running local only.", e);
    }
  }
  if (!Cloud.ready) Cloud.ready = Promise.resolve();

  // ---- players ------------------------------------------------------------
  // Returns the stored player object, or null if that name isn't taken yet.
  Cloud.getPlayer = function (name) {
    if (!Cloud.enabled) return Promise.resolve(null);
    return db.collection("players").doc(docId(name)).get()
      .then(function (snap) { return snap.exists ? snap.data() : null; });
  };
  // Create or merge-update a player document.
  // NOTE: `password` is stored in PLAINTEXT on purpose, so a ward admin can look
  // it up in the Firestore console for members who forget it. This is a
  // deliberate low-stakes trade-off — see SETUP-FIREBASE.md.
  Cloud.savePlayer = function (player) {
    if (!Cloud.enabled) return Promise.resolve();
    var data = {
      name: player.name,
      nameKey: player.nameKey || nameKey(player.name),
      password: player.password || "",
      done: player.done || {},
      photos: player.photos || {},
      preferences: player.preferences || {},
      updatedAt: Date.now()
    };
    if (player.createdAt) data.createdAt = player.createdAt;
    return db.collection("players").doc(docId(player.name)).set(data, { merge: true });
  };

  // ---- photos (Storage) ---------------------------------------------------
  Cloud.uploadPhoto = function (name, taskId, blob) {
    if (!Cloud.enabled) return Promise.reject(new Error("cloud off"));
    var ref = storage.ref("photos/" + docId(name) + "/" + taskId + ".jpg");
    return ref.put(blob, { contentType: blob.type || "image/jpeg" })
      .then(function () { return ref.getDownloadURL(); });
  };
  Cloud.deletePhoto = function (name, taskId) {
    if (!Cloud.enabled) return Promise.resolve();
    var ref = storage.ref("photos/" + docId(name) + "/" + taskId + ".jpg");
    return ref.delete().catch(function () { /* already gone — fine */ });
  };
})();
