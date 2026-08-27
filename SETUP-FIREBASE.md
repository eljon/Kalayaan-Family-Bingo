# Turning on cloud sync (Firebase)

By default the app runs **local-only** — each device keeps its own cards and
photos. Do the steps below once to switch on **cloud sync**, so anyone can sign
in with their family name + secret code and see their card on **any device**.

Everything is on Firebase's free **Spark** plan (no card required for a ward-sized
group).

---

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com/> → **Add project**.
2. Name it (e.g. `kalayaan-family-bingo`). Google Analytics is optional — you
   can turn it off.

## 2. Add a Web app and copy the config

1. In the project, click the **`</>` (Web)** icon → register an app (any
   nickname; you do **not** need Firebase Hosting).
2. Firebase shows a `firebaseConfig = { … }` object. Copy those values into
   **`firebase-config.js`** in this repo, replacing the `PASTE_*` placeholders.
   Copy `storageBucket` **exactly** as shown (newer projects look like
   `your-project.firebasestorage.app`; older ones `your-project.appspot.com`).
3. These web keys are **not secrets** — they ship in every web app. Security is
   enforced by the rules in step 4, not by hiding the keys. Commit the file.

## 3. Enable the three products

In the Firebase console left menu → **Build**:

- **Authentication** → Get started → **Sign-in method** → enable **Anonymous**.
- **Firestore Database** → Create database → **Production mode** → pick a region.
- **Storage** → Get started → accept the default bucket.

## 4. Paste the security rules

**Firestore** (Firestore Database → **Rules** tab) — replace all, then Publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{playerId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage** (Storage → **Rules** tab) — replace all, then Publish:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{playerId}/{fileName} {
      allow read:   if request.auth != null;
      allow delete: if request.auth != null;
      allow write:  if request.auth != null
                    && request.resource.size < 8 * 1024 * 1024
                    && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 5. Deploy

Commit `firebase-config.js` (with your real values) and push. Reload the app —
the login screen's status line should now read **“☁️ Cloud sync is on.”**

---

## How accounts work

- A player is identified by their **family name** (the document id is a slug of
  the name, so “The Serrano Family” and “the serrano family” are the same
  account).
- The **secret code** is verified against a SHA-256 hash stored on the account.
  A new name creates the account; an existing name needs the matching code.

## Security note (please read)

This is a **light gate for low-stakes sharing**, not real per-user security:

- Anyone using the app signs in **anonymously**, which lets the rules require
  `request.auth != null`. That stops random internet traffic, but **any app
  user can technically read/write any player's data** — the rules can't check
  the app-level secret code.
- So: use it for fun ward participation, not for anything sensitive. Don't have
  people reuse important passwords as their “secret code,” and assume photos
  uploaded here are visible to anyone who uses the app.

If you later want true per-account protection, switch the “name + code” login
for real Firebase Authentication (Google or email/password) and tighten the
rules to `request.auth.uid == playerId`.
