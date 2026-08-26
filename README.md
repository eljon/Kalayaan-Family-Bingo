# Kalayaan Ward Family Bingo 🏠❤️

A simple, mobile-friendly web app for the Kalayaan Ward **Family Week** Bingo.
Create a Bingo card for your family, then complete each activity by uploading a
photo. **Love. Share. Serve. Together.**

## How it works

1. **Create a card** — enter your family/player name and tap **+ New Bingo Card**.
   (This is the lightweight "account" for now — no sign-in required.)
2. **Complete activities** — tap any square, then upload a photo of your family
   doing that activity. The square flips to your photo with a ✓.
3. **Get BINGO** — finish all 12 squares to trigger the celebration! 🎉

You can keep several cards on one device and switch between them with the
**Switch card** button.

### The 12 activities

Write appreciation letters · Read the scriptures together · Pray together ·
Have a family dinner · Family game night · Hold a family home evening · Spend
quality time, no gadgets · Submit a name on FamilySearch · Give donations ·
Learn a recipe · Do something kind · Attend the Family Week activity (Sept 26!).

## Privacy

This is a **fully client-side** app — there is no server. Card names live in
`localStorage` and photos live in `IndexedDB`, both **on your own device**.
Nothing is uploaded anywhere. Clearing your browser data removes your cards.

## Tech

Plain HTML, CSS, and vanilla JavaScript — no build step, no dependencies.
Photos are compressed in-browser (via `<canvas>`) before being stored so they
stay small.

## Local preview

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deployment (GitHub Pages)

Deployment is automated with GitHub Actions (`.github/workflows/deploy.yml`).
On every push to `main`, the site is published to GitHub Pages.

**One-time setup:** in the repository, go to **Settings → Pages → Build and
deployment → Source** and choose **GitHub Actions**. After the next push to
`main`, the app is live at:

```
https://<owner>.github.io/<repo>/
```
