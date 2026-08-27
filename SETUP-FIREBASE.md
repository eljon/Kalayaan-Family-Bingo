# Turning on cloud sync (Firebase)

By default the app runs **local-only** — each device keeps its own cards and
photos. Do the steps below once to switch on **cloud sync**, so anyone can sign
in with their family name + family password and see their card on **any device**.

This setup is **completely free — no credit card**. Photos are stored **in
Firestore** (as compressed images), so you do **not** need Cloud Storage or the
Blaze plan. Everything runs on the free **Spark** plan.

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

## 3. Enable the two products (current console layout)

The console is organized into **product categories** on the left, plus a
**"Search for products"** box at the very top — the search box is the most
reliable way to jump to any product if the menus look different.

- **Authentication** — search "Authentication" (or under the **Security**
  category) → **Get started** → **Sign-in method** tab → **Anonymous** →
  Enable → Save.
- **Firestore** — **Databases & Storage → Firestore** → **Create database** →
  pick a location → start in **Production mode** → Enable.

That's it — **no Storage, no Blaze, no card**. Photos live in Firestore (each
one compressed to fit Firestore's 1 MB/document limit).

## 4. Paste the security rules

**Firestore** (Firestore Database → **Rules** tab) — replace all, then Publish.
This covers both the player docs and their `photos` sub-collection (Firestore
rules don't cascade, so the sub-collection needs its own line):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{playerId} {
      allow read, write: if request.auth != null;
      match /photos/{taskId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

(No Storage rules — this build doesn't use Cloud Storage.)

## 5. Deploy

Commit `firebase-config.js` (with your real values) and push. Reload the app —
the login screen's status line should now read **“☁️ Cloud sync is on.”**

---

## How accounts work

- A player is identified by their **family name** (the document id is a slug of
  the name, so “The Serrano Family” and “the serrano family” are the same
  account).
- A new name creates the account (typed twice to confirm); an existing name
  needs the matching **family password**.

## Admin: looking up a forgotten password

There is intentionally **no "forgot password"** flow. Instead, the password is
stored in **plaintext** on each account so you (the admin) can read it:

> Firebase console → **Firestore Database** → **players** collection → open the
> family's document → the **`password`** field is their password. Read it back
> to them, or edit it to reset it.

## Security note (please read)

This is a **light gate for low-stakes sharing**, not real per-user security:

- Anyone using the app signs in **anonymously**, which lets the rules require
  `request.auth != null`. That stops random internet traffic, but **any app
  user can technically read/write any player's data** (and read the plaintext
  passwords) — the rules can't check the app-level password.
- So: use it for fun ward participation, not for anything sensitive. Don't have
  people reuse important passwords as their “family password,” and assume photos
  uploaded here are visible to anyone who uses the app.

If you later want true per-account protection, switch the “name + password” login
for real Firebase Authentication (Google or email/password) and tighten the
rules to `request.auth.uid == playerId`.
