# Kalayaan Ward Family Bingo 🏠❤️

A simple, mobile-friendly web app for the Kalayaan Ward **Family Week** Bingo.
Create a Bingo card for your family, then complete each activity by uploading a
photo. **Love. Share. Serve. Together.**

## How it works

1. **Create a card** — enter your family/player name and tap **+ New Bingo Card**.
   (This is the lightweight "account" for now — no sign-in required.)
2. **Complete activities** — tap any square, then upload a photo of your family
   doing that activity. Your photo develops right inside the square's little
   instant-photo (Polaroid).
3. **Get BINGO** — finish all 12 squares to trigger the celebration! 🎉

You can keep several cards on one device and switch between them with the
**Switch card** button.

### The 12 activities

Write appreciation letters · Read the scriptures together · Pray together ·
Have a family dinner · Family game night · Hold a family home evening · Spend
quality time, no gadgets · Submit a name on FamilySearch · Give donations ·
Learn a recipe · Do something kind · Attend the Family Week activity (Sept 26!).

## Versions & reverting

The current version is shown in a small badge in the **bottom-left corner** of
the page (e.g. `v2`). Tap it to see all versions and switch between them.

Every release is also frozen as a snapshot folder, so you can **revert to an
older version by URL slug**:

| URL | What loads |
|-----|------------|
| `/`      | Always the **latest** version |
| `/v1`    | Version 1 snapshot |
| `/v2`    | Version 2 snapshot |
| `/v3`    | Version 3 snapshot (poster-style card) |
| `/v4`    | Version 4 snapshot (physical card + poster icons) |
| `/v5`    | Version 5 snapshot (fits phone screen, skeuomorphic) |
| `/v6`    | Version 6 snapshot (distinct page background) |
| `/v7`    | Version 7 snapshot (paper texture, wear, lived-in) |
| `/v8`    | Version 8 snapshot (no banner pill) |
| `/v9`    | Version 9 snapshot (lighter, worn cardboard edges) |
| `/v10`   | Version 10 snapshot (subtle worn edge, unique each load) |
| `/v11`   | Version 11 snapshot (soft bent/swollen edge) |
| `/v12`   | Version 12 snapshot (crisp warped edge + cupping) |
| `/v13`   | Version 13 snapshot (aged, warped, peeling like a vintage card) |
| `/v14`   | Version 14 snapshot (CSS 3D perspective lean) |
| `/v15`   | Version 15 snapshot (gentler lean, edge margin, fraying) |
| `/v16`   | Version 16 snapshot (flat, minimal warp, full titles) |
| `/v17`   | Version 17 snapshot (hand-drawn outlines/font, sticker icons) |
| `/v18`   | Version 18 snapshot (transparent cells, shared paper) |
| `/v19`   | Version 19 snapshot (family name on card, no leaves) |
| `/v20`   | Version 20 snapshot (3x4 grid, "Family" appended, roomier padding) |
| `/v21`   | Version 21 snapshot (no progress bar, no switch) |
| `/v22`   | Version 22 snapshot (black Polaroid photo in each cell) |
| `/v23`   | Version 23 snapshot (wide landscape Polaroid, full-width) |
| `/v24`   | Version 24 snapshot (Polaroid at 90% width, lifted off bottom) |
| `/v25`   | Version 25 snapshot (thin uniform border, softer shadow) |
| `/v26`   | Version 26 snapshot (random unique Polaroid tilt each load) |
| `/v27`   | Version 27 snapshot (broad-Sharpie marker card name font) |
| `/v28`   | Version 28 snapshot (wider cell padding so titles clear borders) |
| `/v29`   | Version 29 snapshot (camera button replaces Polaroid, bigger titles) |
| `/v30`   | Version 30 snapshot (borderless camera icon button, larger stickers) |
| `/v31`   | Version 31 snapshot (labeled "Add Photo" action button) |

For example, `https://<owner>.github.io/<repo>/v1` loads version 1. A badge
turns orange (`v1 · old`) when you're viewing an older version, with a one-tap
link back to the latest. Your photos and cards are shared across versions (same
browser storage), so switching versions never loses your progress.

**To cut a new version** (e.g. `v3`): copy the current root files into a new
`v3/` folder, bump `window.APP_VERSION` in the root `index.html`, and add the
new version to the `VERSIONS`/`LATEST` list in `version.js`.

## Privacy

This is a **fully client-side** app — there is no server. Card names live in
`localStorage` and photos live in `IndexedDB`, both **on your own device**.
Nothing is uploaded anywhere. Clearing your browser data removes your cards.

## Tech

Plain HTML, CSS, and vanilla JavaScript — no build step, no dependencies.
Photos are compressed in-browser (via `<canvas>`) before being stored so they
stay small. The 12 activity illustrations in `assets/icons/` are the artwork
from the original Family Week poster (extracted as transparent PNGs) so the
board matches the printed card.

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
