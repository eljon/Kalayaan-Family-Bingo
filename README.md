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
| `/v32`   | Version 32 snapshot (dimensional glossy candy-style photo button) |
| `/v33`   | Version 33 snapshot (hand-drawn crayon photo button) |
| `/v34`   | Version 34 snapshot (filled accent crayon button, white text) |
| `/v35`   | Version 35 snapshot (Add Photo opens the picker directly) |
| `/v36`   | Version 36 snapshot (robust mobile uploads: HEIC / large photos) |
| `/v37`   | Version 37 snapshot (uploads never fail: keep original photo) |
| `/v38`   | Version 38 snapshot (completed photo shown as an orientation-aware Polaroid) |
| `/v39`   | Version 39 snapshot (localStorage fallback when IndexedDB is blocked) |
| `/v40`   | Version 40 snapshot (board scrolls when photos make it taller than the screen) |
| `/v41`   | Version 41 snapshot (fit one screen w/ Polaroids; scrollable version picker) |
| `/v42`   | Version 42 snapshot (tap a photo → 3D coverflow gallery of all photos) |
| `/v43`   | Version 43 snapshot (coverflow slides are the full bingo item, all elements) |
| `/v44`   | Version 44 snapshot (coverflow cell rendered at board size, scaled — exact match) |
| `/v45`   | Version 45 snapshot (coverflow: paper filled inside the outline, no overshoot) |
| `/v46`   | Version 46 snapshot (festive multi-color title, bigger header, hand-drawn heart) |
| `/v47`   | Version 47 snapshot (photos fly from the board into the coverflow, then bg fades) |
| `/v48`   | Version 48 snapshot (bottom margin so the card clears the screen edge) |
| `/v49`   | Version 49 snapshot (cells leave the card & fly both ways; fade during flight) |
| `/v50`   | Version 50 snapshot (off-screen coverflow cards fade in & fly, not pop) |
| `/v51`   | Version 51 snapshot (remove coverflow's rectangular card shadow halo) |
| `/v52`   | Version 52 snapshot (no clipping in flight; shadow fades with distance) |
| `/v53`   | Version 53 snapshot (coverflow can't scroll the page; reset scroll on close) |
| `/v54`   | Version 54 snapshot (pinch to zoom/rotate/pan the centered photo, spring back) |
| `/v55`   | Version 55 snapshot (fix v53: no side clipping/snap; lock document not overlay) |
| `/v56`   | Version 56 snapshot (overlay clips at exact viewport, no doc-overflow reflow) |
| `/v57`   | Version 57 snapshot (drop backdrop blur so the card shadow doesn't morph) |
| `/v58`   | Version 58 snapshot (tap the centred coverflow photo → full-screen full-res view) |
| `/v59`   | Version 59 snapshot (swipe down on the coverflow to dismiss it) |
| `/v60`   | Version 60 snapshot (darken the browser toolbars while the coverflow is open) |
| `/v61`   | Version 61 snapshot (revert v60: dynamic theme-color shifted the board / didn't help) |
| `/v62`   | Version 62 snapshot (version menu lists newest first) |
| `/v63`   | Version 63 snapshot (keep the top status-bar area light during the coverflow) |
| `/v64`   | Version 64 snapshot (edge-to-edge; status-bar strip stays light through the coverflow) |
| `/v65`   | Version 65 snapshot (revert v63/v64 status-bar experiments; restore working top/layout) |
| `/v66`   | Version 66 snapshot (fix tap-twice-to-reopen: gate cell hover behind hover-capable pointers) |
| `/v67`   | Version 67 snapshot (cache-bust CSS/JS by version so updates actually load) |
| `/v68`   | Version 68 snapshot (pad top by the status-bar safe area so the app clears it) |
| `/v69`   | Version 69 snapshot (revert v68 viewport-fit; restore hover; add ?debug diagnostic) |
| `/v70`   | Version 70 snapshot (diagnostic v2: live layout numbers, box pinned to the bottom) |
| `/v71`   | Version 71 snapshot (fix top cut-off: drop the 100vh min-height floor so the board = dvh, no scroll) |
| `/v72`   | Version 72 snapshot (diagnostic: live tap logger under ?debug for the reopen bug) |
| `/v73`   | Version 73 snapshot (multi-user cloud sync via Firebase: name + secret code login) |
| `/v74`   | Version 74 snapshot (rename to family password + confirm password on new cards) |
| `/v75`   | Version 75 snapshot (add live Firebase config — cloud sync enabled) |
| `/v76`   | Version 76 snapshot (photos in Firestore — no Cloud Storage, no credit card) |
| `/v77`   | Version 77 snapshot (Ward View: wall of everyone's cards, default screen, Join button) |
| `/v78`   | Version 78 snapshot (save each card's seed; Ward View renders the real mini cards) |
| `/v79`   | Version 79 snapshot (Ward View mini cards are the whole card — no box or badges) |
| `/v80`   | Version 80 snapshot (Ward View is a realistic cork bulletin board; cards pinned with push pins) |
| `/v81`   | Version 81 snapshot (smaller pinned cards — 3 fit across the cork board) |
| `/v82`   | Version 82 snapshot (force exactly 3 columns so 3 cards always fit, even on narrow phones) |
| `/v83`   | Version 83 snapshot (declutter: motto under the title, steel paper pins, count on a taped note) |
| `/v84`   | Version 84 snapshot (align the pin head to its shaft; lift cards off the cork with layered 3D shadows) |
| `/v85`   | Version 85 snapshot (pin welded to card top; hover shadow with a real z-gap; bottom cell padding) |
| `/v86`   | Version 86 snapshot (cards cast a crisp box-shadow like real paper on the board, via a shadow caster behind the fray) |
| `/v87`   | Version 87 snapshot (fixed-height name block so every card and every cell is the same size) |
| `/v88`   | Version 88 snapshot (real fix: absolutely-position photos so they cannot grow cells; softer card shadow) |
| `/v89`   | Version 89 snapshot (glossy plastic push-pins coloured from the festival banner palette) |
| `/v90`   | Version 90 snapshot (flat-topped push-pins — disc + neck + flange — in banner colors) |
| `/v91`   | Version 91 snapshot (cards held by a strip of tape instead of pins; random size, rotation, placement) |
| `/v92`   | Version 92 snapshot (scale the tape strips down to fit the mini cards) |
| `/v93`   | Version 93 snapshot (scale ALL tape strips incl. the count note; keep card tape on the edge) |
| `/v94`   | Version 94 snapshot (tape placement, rotation, length re-randomised on every load) |
| `/v95`   | Version 95 snapshot (keep card tape near centre — offset capped to ±30% of its width) |
| `/v96`   | Version 96 snapshot (card view: red-sharpie X/Y stat top-right, name left, switch removed; save per-task completion time) |
| `/v97`   | Version 97 snapshot (tap any wall card → full card view; read-only unless signed in to it; Back-to-wall) |
| `/v98`   | Version 98 snapshot (after a task completes: featured, branded share card + Web Share button) |
| `/v99`   | Version 99 snapshot (share: upload timestamp, uncropped adaptive orientation, Share in coverflow, share the whole card) |
| `/v100`  | Version 100 snapshot (share image timestamp uses the hand-drawn marker font) |
| `/v101`  | Version 101 snapshot (shared card is the real card design — hand-drawn borders, polaroids, stickers — with banner + title above) |
| `/v102`  | Version 102 snapshot (coverflow Replace/Remove restored; Share (photo + card) is owner-only) |
| `/v103`  | Version 103 snapshot (share the whole card as an actual html2canvas screenshot, not a redraw) |
| `/v104`  | Version 104 snapshot (all action buttons get the hand-drawn crayon-pill festive style) |
| `/v105`  | Version 105 snapshot (share is literally the card screenshot — no added header) |
| `/v106`  | Version 106 snapshot (card screenshot keeps the frayed paper edge and true aspect ratio) |
| `/v107`  | Version 107 snapshot (stickers keep their aspect ratio in the shared image; taller, responsive action buttons) |
| `/v108`  | Version 108 snapshot (bolder, even fraying on the shared card so the torn-paper edge stays visible) |
| `/v109`  | Version 109 snapshot (Facebook-friendly shares: landscape/square layout with a festive brand column beside the photo/card) |
| `/v110`  | Version 110 snapshot (shared photo/card get a wall-style tape strip and a randomised tilt) |

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
