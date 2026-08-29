/* Kalayaan Ward Family Bingo — client-side app (GitHub Pages friendly)
 * Accounts + per-item photo uploads. Everything is stored locally in the
 * browser: card metadata in localStorage, photos in IndexedDB.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Bingo activities (from the Family Week card)                        */
  /* ------------------------------------------------------------------ */
  var TASKS = [
    { id: "letters",     emoji: "💌", title: "Write Appreciation Letters to Family Members", accent: "red" },
    { id: "scriptures",  emoji: "📖", title: "Read the Scriptures Together", accent: "green" },
    { id: "pray",        emoji: "🙏", title: "Pray Together", accent: "teal" },
    { id: "dinner",      emoji: "🍽️", title: "Have a Family Dinner", accent: "navy" },
    { id: "gamenight",   emoji: "🎲", title: "Family Game Night", accent: "purple" },
    { id: "fhe",         emoji: "🏠", title: "Hold a Family Home Evening", accent: "orange" },
    { id: "nogadgets",   emoji: "⏰", title: "Spend Quality Time Together, No Gadgets!", accent: "red" },
    { id: "familysearch",emoji: "🌳", title: "Submit at Least 1 Family Name on FamilySearch", sub: "Ask the Family History Consultants for help!", accent: "green" },
    { id: "donations",   emoji: "💝", title: "Give Donations", accent: "teal" },
    { id: "recipe",      emoji: "👨‍🍳", title: "Learn a Recipe as a Family", accent: "orange" },
    { id: "kind",        emoji: "🤝", title: "Do Something Nice or Kind Together", accent: "navy" },
    { id: "activity",    emoji: "📅", title: "Attend Kalayaan Ward Family Week Activity on September 26!", accent: "red" }
  ];

  var LS_KEY = "kwfb.accounts.v1";
  var LS_CURRENT = "kwfb.current.v1";

  // Glossy sticker versions of the poster illustrations.
  var ICON_BASE = "../assets/stickers/";

  // Inline camera / check icons for the per-cell photo button — sketchy,
  // hand-drawn strokes in the cell's accent colour (currentColor).
  var CAM_ICON = '<svg class="cam-ic" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 9a2 2 0 0 1 2-2h1.8l.9-1.6a1 1 0 0 1 .87-.5h5.06a1 1 0 0 1 .87.5' +
    'l.9 1.6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>' +
    '<circle cx="12" cy="12.6" r="3.1"/></svg>';
  var CHECK_ICON = '<svg class="cam-ic" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 6.5"/></svg>';

  // A wobbly, hand-drawn pill outline for the photo button — same crayon look
  // as the cell borders, regenerated (unique) for every button on every load.
  /* Deterministic per-card visuals ---------------------------------------
     Each card carries a saved `seed`, so its fray / wobble / tilts stay the
     same on every load and across devices — and the Ward View can render each
     real card faithfully. All the "random" generators below take that seed. */
  var activeSeed = "kwfb";           // set before rendering a given card
  function hashStr(str) {
    var h = 2166136261 >>> 0; str = String(str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mkRng(seed) {              // mulberry32 PRNG → function returning [0,1)
    var s = (typeof seed === "number") ? (seed >>> 0) : hashStr(seed);
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedOf(acct) { return (acct && (acct.seed || acct.id)) || "kwfb"; }
  function cellSeed(taskId) { return activeSeed + "|" + taskId; }
  function seededTilt(taskId) { return (mkRng(cellSeed(taskId) + "|tilt")() * 6 - 3); }
  function genSeed() {               // one-time random seed, deterministic after
    return "s" + Math.floor(Math.random() * 1e9).toString(36) + Date.now().toString(36);
  }

  function handDrawnButton(color, seed) {
    var rng = (seed != null) ? mkRng(seed) : Math.random;
    var W = 150, H = 52, pad = 5, R = 22;
    var x0 = pad, y0 = pad, x1 = W - pad, y1 = H - pad;
    function build(jit) {
      var pts = [];
      function edge(ax, ay, bx, by, n) {
        for (var i = 0; i < n; i++) { var t = i / n; pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]); }
      }
      function arc(cx, cy, a0, a1, n) {
        for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * (i / n); pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
      }
      var S = 11, C = 7;
      edge(x0 + R, y0, x1 - R, y0, S); arc(x1 - R, y0 + R, -Math.PI / 2, 0, C);
      edge(x1, y0 + R, x1, y1 - R, 2); arc(x1 - R, y1 - R, 0, Math.PI / 2, C);
      edge(x1 - R, y1, x0 + R, y1, S); arc(x0 + R, y1 - R, Math.PI / 2, Math.PI, C);
      edge(x0, y1 - R, x0, y0 + R, 2); arc(x0 + R, y0 + R, Math.PI, Math.PI * 1.5, C);
      var d = "";
      for (var i = 0; i < pts.length; i++) {
        var jx = pts[i][0] + (rng() - 0.5) * jit;
        var jy = pts[i][1] + (rng() - 0.5) * jit;
        d += (i === 0 ? "M" : "L") + jx.toFixed(1) + " " + jy.toFixed(1) + " ";
      }
      return d + "Z";
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      // filled, hand-cut crayon pill in the accent colour...
      '<path d="' + build(1.6) + '" fill="' + color + '" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      // ...with a soft darker hand-drawn rim for definition
      '<path d="' + build(2.4) + '" fill="none" stroke="rgba(0,0,0,0.16)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  // Accent colour per cell (matches the CSS data-accent palette).
  var ACCENTS = {
    red: "#e8543f", orange: "#f2a03d", green: "#6fae4a",
    teal: "#2fa3a0", navy: "#1f3a5f", purple: "#8f6fb0"
  };

  // A wobbly, hand-drawn rounded-rectangle outline as an SVG data URI.
  // Regenerated (randomised) for every cell on every load, so no two boxes —
  // and no two page loads — are outlined the same way.
  function handDrawnBorder(color, fill, seed) {
    var rng = (seed != null) ? mkRng(seed) : Math.random;
    var W = 100, H = 134, pad = 4, R = 14;
    var x0 = pad, y0 = pad, x1 = W - pad, y1 = H - pad;
    function build(jit, seedShift) {
      var pts = [];
      function edge(ax, ay, bx, by, n) {
        for (var i = 0; i < n; i++) { var t = i / n; pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]); }
      }
      function arc(cx, cy, a0, a1, n) {
        for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * (i / n); pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
      }
      var S = 7, C = 4;
      edge(x0 + R, y0, x1 - R, y0, S); arc(x1 - R, y0 + R, -Math.PI / 2, 0, C);
      edge(x1, y0 + R, x1, y1 - R, S); arc(x1 - R, y1 - R, 0, Math.PI / 2, C);
      edge(x1 - R, y1, x0 + R, y1, S); arc(x0 + R, y1 - R, Math.PI / 2, Math.PI, C);
      edge(x0, y1 - R, x0, y0 + R, S); arc(x0 + R, y0 + R, Math.PI, Math.PI * 1.5, C);
      var d = "";
      for (var i = 0; i < pts.length; i++) {
        var jx = pts[i][0] + (rng() - 0.5) * jit;
        var jy = pts[i][1] + (rng() - 0.5) * jit;
        d += (i === 0 ? "M" : "L") + jx.toFixed(1) + " " + jy.toFixed(1) + " ";
      }
      return d + "Z";
    }
    // The main path can be FILLED (e.g. paper colour) so the interior is
    // bounded exactly by the outline — nothing shows outside the boundary.
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<path d="' + build(2.4) + '" fill="' + (fill || 'none') + '" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke-opacity="0.95"/>' +
      '<path d="' + build(3.2) + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke-opacity="0.45"/>' +
      '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  // A solid white fill of the SAME wobbly outline handDrawnBorder draws for a
  // given seed — used as a mask so a completed cell's photo fills the cell and
  // follows the exact hand-drawn outline shape. Reproduces build(2.4) with a
  // fresh rng(seed), matching the border's first (main) path point-for-point.
  function handDrawnMask(seed) {
    var rng = (seed != null) ? mkRng(seed) : Math.random;
    var W = 100, H = 134, pad = 4, R = 14;
    var x0 = pad, y0 = pad, x1 = W - pad, y1 = H - pad, pts = [];
    function edge(ax, ay, bx, by, n) { for (var i = 0; i < n; i++) { var t = i / n; pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]); } }
    function arc(cx, cy, a0, a1, n) { for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * (i / n); pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } }
    var S = 7, C = 4;
    edge(x0 + R, y0, x1 - R, y0, S); arc(x1 - R, y0 + R, -Math.PI / 2, 0, C);
    edge(x1, y0 + R, x1, y1 - R, S); arc(x1 - R, y1 - R, 0, Math.PI / 2, C);
    edge(x1 - R, y1, x0 + R, y1, S); arc(x0 + R, y1 - R, Math.PI / 2, Math.PI, C);
    edge(x0, y1 - R, x0, y0 + R, S); arc(x0 + R, y0 + R, Math.PI, Math.PI * 1.5, C);
    var jit = 2.4, d = "";
    for (var i = 0; i < pts.length; i++) {
      var jx = pts[i][0] + (rng() - 0.5) * jit, jy = pts[i][1] + (rng() - 0.5) * jit;
      d += (i === 0 ? "M" : "L") + jx.toFixed(1) + " " + jy.toFixed(1) + " ";
    }
    d += "Z";
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><path d="' + d + '" fill="#fff"/></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  /* ------------------------------------------------------------------ */
  /* Worn cardboard edge — drawn on a canvas so it is subtle and unique */
  /* on every page load, and reliably rendered as a mask on mobile.     */
  /* ------------------------------------------------------------------ */
  // Shrink each title's font just enough that its FULL text fits its cell —
  // no ellipsis, no cropping — on any screen size.
  function fitTitles() {
    if (!current) return;
    var titles = el.grid.querySelectorAll(".cell:not(.done) .cell-title");
    for (var i = 0; i < titles.length; i++) {
      var t = titles[i];
      t.style.fontSize = "";                 // reset to the CSS-driven size
      var size = parseFloat(getComputedStyle(t).fontSize) || 12;
      var min = 7, max = 30, guard = 0;
      // grow the font to fill the available space...
      while (size < max && guard < 90 &&
             t.scrollHeight <= t.clientHeight + 1 && t.scrollWidth <= t.clientWidth + 1) {
        size += 0.5; t.style.fontSize = size + "px"; guard++;
      }
      // ...then shrink until the FULL text fits (no ellipsis, no clipping).
      while (size > min && guard < 220 &&
             (t.scrollHeight > t.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1)) {
        size -= 0.5; t.style.fontSize = size + "px"; guard++;
      }
    }
  }
  var _fitPending = false;
  function scheduleFit() {
    if (_fitPending) return;
    _fitPending = true;
    requestAnimationFrame(function () {
      _fitPending = false;
      fitTitles();
    });
  }
  window.addEventListener("resize", scheduleFit);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleFit).catch(function () {});
  }

  // Build the frayed-shape mask canvas (opaque white blob on transparent bg).
  // Shared by applyWornEdge (as a CSS mask) and the card screenshot (to clip
  // the capture to the same worn silhouette so the fray survives).
  function wornEdgeCanvas(seed, cw, ch, strength) {
    var rng = (seed != null) ? mkRng(String(seed) + "|edge") : Math.random;
    var W = cw || 660, H = ch || 840;
    var k = strength || 1;   // 1 = the subtle on-screen wear; >1 = bolder tears
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var g = cv.getContext ? cv.getContext("2d") : null;
    if (!g) return null;
    function rnd(a, b) { return a + rng() * (b - a); }

    // A smooth, seamless, low-frequency wobble around the whole perimeter —
    // reads as a gently bent / moisture-swollen edge, never torn. Integer
    // frequencies keep it seamless where t wraps 0->1.
    function makeWave() {
      // low frequencies dominate -> long gentle bulges (a warp), not ripples
      var freqs = [1, 2, 3, 4], weights = [1.0, 0.6, 0.32, 0.18];
      var terms = [], norm = 0;
      for (var i = 0; i < freqs.length; i++) {
        var a = weights[i] * rnd(0.75, 1.15);
        terms.push({ f: freqs[i], p: rnd(0, Math.PI * 2), a: a });
        norm += a;
      }
      return function (t) {
        var v = 0;
        for (var j = 0; j < terms.length; j++) {
          v += terms[j].a * Math.sin(t * terms[j].f * 2 * Math.PI + terms[j].p);
        }
        return v / norm; // roughly [-1, 1]
      };
    }
    var wave = makeWave();

    var pad = 16, base = 0.5, amp = 2.2 * k; // amp = warp along the edge
    var x0 = pad, y0 = pad, x1 = W - pad, y1 = H - pad;
    // each corner worn to a different, modest radius
    function cr() { return rnd(18, 32); }
    var rTL = cr(), rTR = cr(), rBR = cr(), rBL = cr();
    var pts = [];
    function edge(ax, ay, bx, by, nx, ny, n) {
      for (var i = 0; i < n; i++) {
        var t = i / n;
        pts.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, nx: nx, ny: ny });
      }
    }
    function arc(cx, cy, r, a0, a1, n) {
      for (var i = 0; i < n; i++) {
        var a = a0 + (a1 - a0) * (i / n);
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
      }
    }
    var SIDE = 44, CORN = 18;
    edge(x0 + rTL, y0, x1 - rTR, y0, 0, -1, SIDE);                 // top
    arc(x1 - rTR, y0 + rTR, rTR, -Math.PI / 2, 0, CORN);           // TR
    edge(x1, y0 + rTR, x1, y1 - rBR, 1, 0, SIDE);                  // right
    arc(x1 - rBR, y1 - rBR, rBR, 0, Math.PI / 2, CORN);            // BR
    edge(x1 - rBR, y1, x0 + rBL, y1, 0, 1, SIDE);                  // bottom
    arc(x0 + rBL, y1 - rBL, rBL, Math.PI / 2, Math.PI, CORN);      // BL
    edge(x0, y1 - rBL, x0, y0 + rTL, -1, 0, SIDE);                 // left
    arc(x0 + rTL, y0 + rTL, rTL, Math.PI, Math.PI * 1.5, CORN);    // TL

    // a hair of softening; the shape is already smooth
    try { g.filter = "blur(0.6px)"; } catch (e) {}
    g.fillStyle = "#fff";
    g.beginPath();
    var total = pts.length, op = [];
    for (var i = 0; i <= total; i++) {
      var pt = pts[i % total];
      var d = base + amp * wave(i / total);         // signed swell around base
      var px = pt.x - pt.nx * d, py = pt.y - pt.ny * d;
      op.push([px, py]);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();

    // subtle fraying + wear along the (warped) edge — v10 style
    try { g.filter = "none"; } catch (e) {}
    g.globalCompositeOperation = "destination-out";
    for (var i = 0; i < op.length; i++) {
      if (rng() < 0.26 * Math.min(1.6, k)) {
        g.beginPath(); g.arc(op[i][0], op[i][1], rnd(0.5, 2.1) * k, 0, Math.PI * 2); g.fill();
      }
    }
    // Spread the chips evenly around the perimeter (stratified, with jitter)
    // so the wear reads as all-over fraying rather than a few clustered bites.
    var chips = Math.round(rnd(8, 14) * k);
    for (var c = 0; c < chips; c++) {
      var ci = Math.floor(((c + rnd(0, 1)) / chips) * op.length) % op.length;
      g.beginPath(); g.arc(op[ci][0], op[ci][1], rnd(1.6, 4.2) * k, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = "source-over";
    return cv;
  }

  function applyWornEdge(paper, seed, cw, ch) {
    if (!paper) paper = document.querySelector(".card-paper");
    if (!paper) return;
    var cv = wornEdgeCanvas(seed, cw, ch);
    if (!cv) return;
    var url;
    try { url = cv.toDataURL("image/png"); } catch (e) { return; }
    var s = "url(" + url + ")";
    paper.style.webkitMaskImage = s;
    paper.style.maskImage = s;
    paper.style.webkitMaskSize = "100% 100%";
    paper.style.maskSize = "100% 100%";
    paper.style.webkitMaskRepeat = "no-repeat";
    paper.style.maskRepeat = "no-repeat";
    paper.style.webkitMaskPosition = "center";
    paper.style.maskPosition = "center";
    paper.style.borderRadius = "0";
  }

  /* ------------------------------------------------------------------ */
  /* IndexedDB — photo blobs keyed by "<accountId>::<taskId>"            */
  /* ------------------------------------------------------------------ */
  var DB_NAME = "kwfb-photos";
  var STORE = "photos";
  var _dbPromise = null;

  function openDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function (resolve, reject) {
      // indexedDB may be undefined or throw synchronously (Safari Private
      // Browsing, some in-app browsers) — reject so we fall back to localStorage.
      if (!window.indexedDB) { reject(new Error("no indexedDB")); return; }
      var req;
      try { req = indexedDB.open(DB_NAME, 1); }
      catch (e) { reject(e); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error("indexedDB blocked")); };
    });
    return _dbPromise;
  }

  // ---- localStorage photo fallback (when IndexedDB is unavailable) --------
  var LS_PHOTO = "kwfb.photo::";
  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error("read failed")); };
      fr.readAsDataURL(blob);
    });
  }
  function lsSet(key, blob) {
    return blobToDataURL(blob).then(function (dataURL) {
      localStorage.setItem(LS_PHOTO + key, dataURL);  // may throw QuotaExceeded
    });
  }
  function lsGet(key) {
    var d = null;
    try { d = localStorage.getItem(LS_PHOTO + key); } catch (e) {}
    return Promise.resolve(d ? dataURLtoBlob(d) : null);
  }
  function lsDelete(key) {
    try { localStorage.removeItem(LS_PHOTO + key); } catch (e) {}
    return Promise.resolve();
  }

  var idbBroken = false;

  function idbSet(key, value) {
    if (idbBroken) return lsSet(key, value);
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error("tx abort")); };
      });
    }).catch(function () {
      idbBroken = true;            // IndexedDB unusable — use localStorage
      return lsSet(key, value);
    });
  }

  function idbGet(key) {
    if (idbBroken) return lsGet(key);
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return lsGet(key); });
  }

  function idbDelete(key) {
    if (idbBroken) return lsDelete(key);
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () { return lsDelete(key); });
  }

  function photoKey(accountId, taskId) { return accountId + "::" + taskId; }

  /* ------------------------------------------------------------------ */
  /* Cloud (Firebase) — supplied by cloud.js; stub if it didn't load.    */
  /* When Cloud.enabled is false the whole app works locally as before.  */
  /* ------------------------------------------------------------------ */
  var Cloud = window.Cloud || {
    enabled: false,
    ready: Promise.resolve(),
    nameKey: function (n) { return String(n || "").trim().toLowerCase().replace(/\s+/g, " "); },
    docId: function (n) {
      return String(n || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "player";
    },
    getPlayer: function () { return Promise.resolve(null); },
    savePlayer: function () { return Promise.resolve(); },
    uploadPhoto: function () { return Promise.reject(new Error("cloud off")); },
    deletePhoto: function () { return Promise.resolve(); }
  };

  /* ------------------------------------------------------------------ */
  /* Local account cache (localStorage). In cloud mode this mirrors the  */
  /* Firestore player docs so this device stays instant & offline-ready. */
  /* ------------------------------------------------------------------ */
  function loadAccounts() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveAccounts(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function getAccount(id) {
    return loadAccounts().filter(function (a) { return a.id === id; })[0] || null;
  }
  function putAccount(acct) {
    var found = false;
    var list = loadAccounts().map(function (a) {
      if (a.id === acct.id) { found = true; return acct; } return a;
    });
    if (!found) list.push(acct);
    saveAccounts(list);
  }
  // Save locally AND push to the cloud (fire-and-forget) so other devices see it.
  function updateAccount(acct) {
    acct.updatedAt = Date.now();
    putAccount(acct);
    if (Cloud.enabled && !acct.local) {
      Cloud.savePlayer(acct).catch(function (e) { console.warn("[Cloud] save failed", e); });
    }
  }
  // "Forget on this device" — drops the local cache + local photos, keeps cloud.
  function forgetLocal(id) {
    saveAccounts(loadAccounts().filter(function (a) { return a.id !== id; }));
    TASKS.forEach(function (t) { idbDelete(photoKey(id, t.id)); });
  }

  /* ------------------------------------------------------------------ */
  /* Unified photo access: local IndexedDB cache first (fast/offline),   */
  /* then the cloud download URL if this device hasn't got the blob.     */
  /* ------------------------------------------------------------------ */
  function getPhotoSrc(acct, taskId, urls) {
    return idbGet(photoKey(acct.id, taskId)).then(function (blob) {
      if (blob) {
        var u = URL.createObjectURL(blob);
        (urls || objectUrls).push(u);
        return u;
      }
      // Not cached on this device: pull the photo doc from Firestore, then
      // cache it locally so later renders/coverflow are instant & offline.
      if (Cloud.enabled && acct && !acct.local) {
        return Cloud.getPhoto(acct.name, taskId).then(function (dataURL) {
          if (!dataURL) return null;
          try { idbSet(photoKey(acct.id, taskId), dataURLtoBlob(dataURL)); } catch (e) {}
          return dataURL;   // a data: URL works directly as an <img> src
        }).catch(function () { return null; });
      }
      return null;
    });
  }
  // Cache the photo locally, then store it in Firestore (compressed to fit the
  // 1 MiB/document limit — no Cloud Storage / no credit card required).
  function putPhoto(acct, taskId, blob) {
    return idbSet(photoKey(acct.id, taskId), blob).then(function () {
      if (Cloud.enabled && !acct.local) {
        return blobToBudgetDataURL(blob, 650 * 1024).then(function (dataURL) {
          return Cloud.savePhoto(acct.name, taskId, dataURL);
        }).catch(function (e) { console.warn("[Cloud] photo save failed", e); });
      }
    });
  }
  function delPhoto(acct, taskId) {
    return idbDelete(photoKey(acct.id, taskId)).then(function () {
      if (Cloud.enabled && !acct.local) return Cloud.deletePhoto(acct.name, taskId);
    });
  }
  // Re-encode a photo blob to a JPEG data URL under `maxBytes` (base64 grows
  // it ~4/3, so 650 KB → ~866 KB, safely under Firestore's ~1 MB doc cap).
  function blobToBudgetDataURL(blob, maxBytes) {
    var steps = [[1280, 0.82], [1080, 0.72], [900, 0.66], [760, 0.58], [640, 0.5]];
    function attempt(i) {
      return compressImage(blob, steps[i][0], steps[i][1]).then(function (b) {
        if (b.size <= maxBytes || i === steps.length - 1) return b;
        return attempt(i + 1);
      });
    }
    return attempt(0).then(blobToDataURL);
  }

  /* ------------------------------------------------------------------ */
  /* Image compression (keeps IndexedDB small)                          */
  /* Robust across phones: iPhone HEIC and very large captures can't be */
  /* decoded by <img>, so try createImageBitmap first, then <img>, and  */
  /* if all decoding fails keep the original file so nothing is lost.    */
  /* ------------------------------------------------------------------ */
  function dataURLtoBlob(dataURL) {
    var parts = dataURL.split(",");
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/jpeg";
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function canvasToBlob(canvas, quality) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("toBlob failed"));
        }, "image/jpeg", quality);
      } else {
        try { resolve(dataURLtoBlob(canvas.toDataURL("image/jpeg", quality))); }
        catch (e) { reject(e); }
      }
    });
  }

  function drawScaled(src, w, h, maxDim, quality) {
    var scale = Math.min(1, maxDim / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext("2d");
    if (!ctx) return Promise.reject(new Error("no 2d context"));
    ctx.drawImage(src, 0, 0, cw, ch);
    return canvasToBlob(canvas, quality);
  }

  function decodeWithBitmap(file, maxDim, quality) {
    if (typeof createImageBitmap !== "function") {
      return Promise.reject(new Error("no createImageBitmap"));
    }
    var p;
    try { p = createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) { p = createImageBitmap(file); }   // older single-arg signature
    return Promise.resolve(p).then(function (bmp) {
      return drawScaled(bmp, bmp.width, bmp.height, maxDim, quality).then(function (blob) {
        if (bmp.close) bmp.close();
        return blob;
      });
    });
  }

  function decodeWithImage(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        drawScaled(img, img.naturalWidth, img.naturalHeight, maxDim, quality)
          .then(function (blob) { URL.revokeObjectURL(url); resolve(blob); })
          .catch(function (e) { URL.revokeObjectURL(url); reject(e); });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
      img.src = url;
    });
  }

  function compressImage(file, maxDim, quality) {
    return decodeWithBitmap(file, maxDim, quality)
      .catch(function () { return decodeWithImage(file, maxDim, quality); })
      .catch(function () { return file; });   // couldn't shrink it? keep the original
  }

  /* ------------------------------------------------------------------ */
  /* DOM refs                                                            */
  /* ------------------------------------------------------------------ */
  var el = {
    accountBar: document.getElementById("accountBar"),
    accountName: document.getElementById("accountName"),
    switchBtn: document.getElementById("switchBtn"),
    cardName: document.getElementById("cardName"),
    cardStat: document.getElementById("cardStat"),
    boardBack: document.getElementById("boardBack"),
    boardShare: document.getElementById("boardShare"),
    share: document.getElementById("share"),
    shareImg: document.getElementById("shareImg"),
    shareBtn: document.getElementById("shareBtn"),
    shareHint: document.getElementById("shareHint"),
    welcome: document.getElementById("welcome"),
    existingCards: document.getElementById("existingCards"),
    cardList: document.getElementById("cardList"),
    newCardForm: document.getElementById("newCardForm"),
    familyName: document.getElementById("familyName"),
    familyPass: document.getElementById("familyPass"),
    familyPass2: document.getElementById("familyPass2"),
    loginBtn: document.getElementById("loginBtn"),
    loginHint: document.getElementById("loginHint"),
    cloudStatus: document.getElementById("cloudStatus"),
    signOutBtn: document.getElementById("signOutBtn"),
    ward: document.getElementById("ward"),
    wardGrid: document.getElementById("wardGrid"),
    corkNote: document.getElementById("corkNote"),
    wardCount: document.getElementById("wardCount"),
    wardEmpty: document.getElementById("wardEmpty"),
    joinBar: document.getElementById("joinBar"),
    wardJoin: document.getElementById("wardJoin"),
    wardDetail: document.getElementById("wardDetail"),
    wdName: document.getElementById("wdName"),
    wdGrid: document.getElementById("wdGrid"),
    board: document.getElementById("board"),
    grid: document.getElementById("grid"),
    progressText: document.getElementById("progressText"),
    progressPct: document.getElementById("progressPct"),
    progressBar: document.getElementById("progressBar"),
    celebrate: document.getElementById("celebrate"),
    modal: document.getElementById("modal"),
    modalIcon: document.getElementById("modalIcon"),
    modalTitle: document.getElementById("modalTitle"),
    modalHint: document.getElementById("modalHint"),
    modalPhotoWrap: document.getElementById("modalPhotoWrap"),
    modalPhoto: document.getElementById("modalPhoto"),
    modalFile: document.getElementById("modalFile"),
    modalUploadLabel: document.getElementById("modalUploadLabel"),
    modalRemove: document.getElementById("modalRemove"),
    toast: document.getElementById("toast")
  };

  var current = null;      // current account object
  var boardAcct = null;    // the account whose board is on screen (may be someone else's)
  var boardReadOnly = false; // true when viewing a card you aren't signed in to
  var activeTaskId = null; // task open in modal
  var objectUrls = [];     // track for cleanup

  /* ------------------------------------------------------------------ */
  /* Rendering                                                          */
  /* ------------------------------------------------------------------ */
  function revokeUrls() {
    objectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    objectUrls = [];
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    requestAnimationFrame(function () { el.toast.classList.add("show"); });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.toast.classList.remove("show");
      setTimeout(function () { el.toast.hidden = true; }, 260);
    }, 2200);
  }

  function updateCloudStatus() {
    if (!el.cloudStatus) return;
    Cloud.ready.then(function () {
      el.cloudStatus.textContent = Cloud.enabled
        ? "☁️ Cloud sync is on — your card follows you to any device."
        : "📱 This device only. (Add a Firebase config to sync across devices.)";
      el.cloudStatus.classList.toggle("cloud-on", !!Cloud.enabled);
    });
  }

  // Family name as shown on the card ("… Family" appended unless already there).
  function displayName(name) {
    var nm = (name || "").trim();
    return /family\s*$/i.test(nm) ? nm : (nm + " Family");
  }

  // Which primary view is on screen: "ward" (everyone) or "board" (your card).
  function showView(which) {
    el.ward.hidden = which !== "ward";
    el.board.hidden = which !== "board";
    if (el.joinBar) el.joinBar.hidden = which !== "ward";
    el.accountBar.hidden = true;
    document.body.classList.toggle("board-active", which === "board");
  }

  /* ---- Join / sign-up modal (opened from the Ward View) ---- */
  function populateJoin() {
    if (el.loginHint) el.loginHint.textContent = "";
    updateCloudStatus();
    if (el.signOutBtn) el.signOutBtn.hidden = !current;

    // "Recently on this device" — quick prefill (you still type the password).
    var accounts = loadAccounts();
    if (accounts.length) {
      el.existingCards.hidden = false;
      el.cardList.innerHTML = "";
      accounts.slice().reverse().forEach(function (a) {
        var doneCount = Object.keys(a.done || {}).length;
        var li = document.createElement("li");
        var open = document.createElement("button");
        open.className = "card-open"; open.type = "button"; open.textContent = a.name;
        open.addEventListener("click", function () {
          if (el.familyName) el.familyName.value = a.name;
          if (el.familyPass2) el.familyPass2.value = "";
          if (el.familyPass) { el.familyPass.value = ""; el.familyPass.focus(); }
        });
        var meta = document.createElement("span");
        meta.className = "card-meta"; meta.textContent = doneCount + "/" + TASKS.length;
        var del = document.createElement("button");
        del.className = "card-del"; del.type = "button";
        del.setAttribute("aria-label", "Remove " + a.name + " from this device");
        del.innerHTML = "🗑";
        del.addEventListener("click", function () {
          var msg = Cloud.enabled
            ? "Remove \"" + a.name + "\" from this device? Your cloud card stays — sign back in with the password to restore it."
            : "Delete the Bingo card for \"" + a.name + "\"? This removes its photos too.";
          if (confirm(msg)) { forgetLocal(a.id); populateJoin(); }
        });
        li.appendChild(open); li.appendChild(meta); li.appendChild(del);
        el.cardList.appendChild(li);
      });
    } else {
      el.existingCards.hidden = true;
    }
  }
  function openJoin() {
    populateJoin();
    el.welcome.hidden = false;
    setTimeout(function () { try { if (el.familyName && !el.familyName.value) el.familyName.focus(); } catch (e) {} }, 40);
  }
  function closeJoin() {
    el.welcome.hidden = true;
    if (el.loginHint) el.loginHint.textContent = "";
  }

  /* ---- Ward View: the wall of everyone's cards ---- */
  function fetchPlayers() {
    if (Cloud.enabled) {
      return Cloud.ready.then(function () { return Cloud.listPlayers(); })
        .then(function (list) { return Array.isArray(list) ? list : loadAccounts(); })
        .catch(function () { return loadAccounts(); });
    }
    return Promise.resolve(loadAccounts());
  }
  // Lazy-load a mini-card photo only when it scrolls near the viewport, so the
  // wall of many families stays light.
  var wardObserver = null, wardUrls = [];
  function revokeWardUrls() { wardUrls.forEach(function (u) { URL.revokeObjectURL(u); }); wardUrls = []; }
  function lazyPhoto(img, acct, taskId) {
    var load = function () { getPhotoSrc(acct, taskId, wardUrls).then(function (src) { if (src) img.src = src; }); };
    if (!("IntersectionObserver" in window)) { load(); return; }
    if (!wardObserver) {
      wardObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { var fn = e.target.__load; wardObserver.unobserve(e.target); if (fn) fn(); }
        });
      }, { rootMargin: "250px" });
    }
    img.__load = load;
    wardObserver.observe(img);
  }

  // A faithful MINI bingo card — the whole card, shrunk: cream paper with the
  // family's saved seed driving the same fray + hand-drawn cell wobble + photo
  // tilts as their real card, the family name at the top, and the motto below.
  // No wrapper box, labels, or badges — just the card itself.
  function buildMiniCard(p) {
    var pid = p.id || Cloud.docId(p.name);
    var isYou = !!(current && current.id === pid);
    var seed = p.seed || pid;

    var card = document.createElement("button");
    card.className = "ward-mini" + (isYou ? " you" : "");
    card.type = "button"; card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", displayName(p.name));

    // Pinned-to-cork look: a small seeded tilt (and a seeded lean on the steel
    // paper pin), so each card sits at a consistent angle every render.
    var pr = mkRng(String(seed) + "|pin");
    card.style.setProperty("--rot", (pr() * 6 - 3).toFixed(2) + "deg");
    // The tape is procedurally re-generated on EVERY load (Math.random, not the
    // per-family seed) — length, horizontal offset, rotation all fresh each time.
    var tapeW = Math.round(Math.random() * 12 + 15);           // 15–27px long
    // Offset from the card's centre by at most ±30% of the tape's own width, so
    // the card's centre line always sits within the middle 60% of the tape —
    // i.e. at least 20% of the tape's width stays over the centre of the card.
    var tapeDx = ((Math.random() * 2 - 1) * 0.3 * tapeW).toFixed(1);
    card.style.setProperty("--tape-w", tapeW + "px");
    card.style.setProperty("--tape-dx", tapeDx + "px");
    card.style.setProperty("--tape-rot", (Math.random() * 70 - 35).toFixed(1) + "deg");
    // Seat the tape (9px tall) so its centre sits on the card side of the top
    // edge — its centre lands 1.5–4px below the edge, so well over half of the
    // tape (always ≥40%) touches the card while it still peeks into the cork.
    card.style.setProperty("--tape-top", (Math.random() * 2.5 - 3).toFixed(1) + "px");

    var paper = document.createElement("div"); paper.className = "wm-paper";

    var name = document.createElement("strong"); name.className = "wm-name";
    name.textContent = displayName(p.name);

    var board = document.createElement("div"); board.className = "wm-board";

    var prevSeed = activeSeed; activeSeed = seed;   // seed this card's visuals
    TASKS.forEach(function (t) {
      var mc = document.createElement("div"); mc.className = "wm-mcell";
      mc.style.backgroundImage = handDrawnBorder(ACCENTS[t.accent] || "#1f3a5f", "#efe6d0", cellSeed(t.id));
      if (p.done && p.done[t.id]) {
        var img = document.createElement("img"); img.className = "wm-photo"; img.alt = "";
        img.style.setProperty("--tilt", seededTilt(t.id).toFixed(2) + "deg");
        mc.appendChild(img);
        lazyPhoto(img, p, t.id);
      } else {
        var ill = document.createElement("img"); ill.className = "wm-sticker"; ill.alt = "";
        ill.loading = "lazy"; ill.src = ICON_BASE + t.id + ".png";
        mc.appendChild(ill);
      }
      board.appendChild(mc);
    });
    activeSeed = prevSeed;

    paper.appendChild(name); paper.appendChild(board);
    applyWornEdge(paper, seed, 240, 336);           // the saved fray / wear

    // A clean rounded-rect shadow caster behind the frayed paper. The mask on
    // .wm-paper would clip a box-shadow, so this unmasked layer casts the crisp
    // "real paper lifted off the board" shadow (same trick as the taped note).
    var shadow = document.createElement("div"); shadow.className = "wm-shadow";
    card.appendChild(shadow);
    card.appendChild(paper);
    // A strip of tape holding the card to the board (randomised per card).
    var tapeEl = document.createElement("div"); tapeEl.className = "wm-tape";
    tapeEl.setAttribute("aria-hidden", "true");
    card.appendChild(tapeEl);
    card.addEventListener("click", function () {
      // Tapping any card opens its full card view — editable if it's the card
      // you're signed in to, otherwise read-only.
      renderBoard(p);
    });
    return card;
  }
  function renderWardGrid(players) {
    players = (players || []).slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
    el.wardGrid.innerHTML = "";
    if (!players.length) {
      el.wardEmpty.hidden = false;
      if (el.corkNote) el.corkNote.hidden = true;
      return;
    }
    el.wardEmpty.hidden = true;
    var finished = 0;
    players.forEach(function (p) {
      if (Object.keys(p.done || {}).length === TASKS.length) finished++;
      el.wardGrid.appendChild(buildMiniCard(p));
    });
    if (el.corkNote) el.corkNote.hidden = false;
    if (el.wardCount) {
      el.wardCount.textContent = players.length + (players.length === 1 ? " family" : " families") +
        (finished ? " · " + finished + " done 🏆" : "");
    }
  }
  function renderWard() {
    revokeUrls();
    revokeWardUrls();
    if (wardObserver) { wardObserver.disconnect(); wardObserver = null; }
    closeJoin();
    closeWardDetail();
    showView("ward");
    fetchPlayers().then(renderWardGrid);
  }

  /* ---- Read-only detail: one family's completed photos ---- */
  var wdUrls = [];
  function revokeWdUrls() { wdUrls.forEach(function (u) { URL.revokeObjectURL(u); }); wdUrls = []; }
  function closeWardDetail() {
    if (el.wardDetail) el.wardDetail.hidden = true;
    revokeWdUrls();
  }
  function openWardDetail(acct) {
    revokeWdUrls();
    el.wdName.textContent = displayName(acct.name);
    el.wdGrid.innerHTML = "";
    var doneTasks = TASKS.filter(function (t) { return acct.done && acct.done[t.id]; });

    var count = document.createElement("span");
    count.className = "wd-count"; count.style.gridColumn = "1 / -1";
    count.textContent = doneTasks.length + " of " + TASKS.length + " complete";
    el.wdGrid.appendChild(count);

    if (!doneTasks.length) {
      var e = document.createElement("p");
      e.className = "wd-empty"; e.style.gridColumn = "1 / -1";
      e.textContent = "No photos yet — cheer them on!";
      el.wdGrid.appendChild(e);
    } else {
      doneTasks.forEach(function (t) {
        var fig = document.createElement("figure"); fig.className = "wd-photo";
        var img = document.createElement("img"); img.alt = t.title; img.loading = "lazy";
        var cap = document.createElement("figcaption"); cap.className = "cap"; cap.textContent = t.title;
        fig.appendChild(img); fig.appendChild(cap);
        el.wdGrid.appendChild(fig);
        getPhotoSrc(acct, t.id, wdUrls).then(function (src) { if (src) img.src = src; });
      });
    }
    el.wardDetail.hidden = false;
  }

  // Render a family's board. With no argument (or your own account) the board
  // is editable; tapping another family's card from the wall passes that
  // account and the board is read-only (no camera buttons, view photos only).
  function renderBoard(acct) {
    var a = acct || current;
    var editable = !!(current && a && current.id === a.id);
    boardAcct = editable ? current : a;  // freshest data for your own card
    boardReadOnly = !editable;

    revokeUrls();
    closeJoin();
    closeWardDetail();
    showView("board");
    document.body.classList.toggle("board-readonly", boardReadOnly);
    if (el.boardShare) el.boardShare.hidden = boardReadOnly;   // sharing is owner-only
    activeSeed = seedOf(boardAcct);
    el.accountName.textContent = boardAcct.name;
    if (el.cardName) el.cardName.textContent = displayName(boardAcct.name);
    if (el.cardStat) el.cardStat.textContent = Object.keys(boardAcct.done || {}).length + "/" + TASKS.length;
    applyWornEdge(document.querySelector(".card-paper"), activeSeed);
    scheduleFit();

    el.grid.innerHTML = "";
    TASKS.forEach(function (task) {
      var done = !!(boardAcct.done && boardAcct.done[task.id]);
      if (done) {
        el.grid.appendChild(buildDoneCell(task, objectUrls,
          function () { openCoverflow(task.id); }, boardAcct));
      } else {
        el.grid.appendChild(buildTodoCell(task, boardReadOnly));
      }
    });

    updateProgress();
  }

  // The empty cell shell (hand-drawn accent border) shared by both states.
  function makeCellShell(task, done) {
    var cell = document.createElement("div");
    cell.className = "cell" + (done ? " done" : "");
    cell.setAttribute("role", "listitem");
    cell.setAttribute("data-accent", task.accent);
    cell.setAttribute("data-task", task.id);
    cell.style.backgroundImage = handDrawnBorder(ACCENTS[task.accent] || "#1f3a5f", null, cellSeed(task.id));
    return cell;
  }

  // A completed cell EXACTLY as it appears on the board: accent border,
  // small title on top, and the photo as a Polaroid. Reused by the coverflow
  // so each slide is the real bingo item with every element present.
  function buildDoneCell(task, urls, onPhotoClick, acct) {
    acct = acct || current;
    var cell = makeCellShell(task, true);

    var title = document.createElement("span");
    title.className = "cell-title";
    title.textContent = task.title;
    cell.appendChild(title);

    var photoBtn = document.createElement("button");
    photoBtn.type = "button";
    photoBtn.className = "cell-photo-btn";
    photoBtn.setAttribute("aria-label", task.title + " — photo added");
    photoBtn.style.setProperty("--tilt", seededTilt(task.id).toFixed(2) + "deg");
    // Clip the photo to the SAME wobbly outline as the cell's border so it
    // fills the cell right up to the hand-drawn shape.
    var mask = handDrawnMask(cellSeed(task.id));
    photoBtn.style.webkitMaskImage = mask;
    photoBtn.style.maskImage = mask;

    var pimg = document.createElement("img");
    pimg.className = "cell-photo";
    pimg.alt = task.title;
    photoBtn.appendChild(pimg);
    if (onPhotoClick) photoBtn.addEventListener("click", onPhotoClick);
    cell.appendChild(photoBtn);

    // The hand-drawn outline, repeated ON TOP of the photo (same seed/colour as
    // the cell's border) so the coloured outline still frames the picture —
    // and survives the share screenshot, where the CSS photo-mask does not.
    var outline = document.createElement("div");
    outline.className = "cell-outline";
    outline.setAttribute("aria-hidden", "true");
    outline.style.backgroundImage = handDrawnBorder(ACCENTS[task.accent] || "#1f3a5f", null, cellSeed(task.id));
    cell.appendChild(outline);

    getPhotoSrc(acct, task.id, urls).then(function (src) {
      if (src) pimg.src = src;
    });
    return cell;
  }

  // A not-yet-done cell: poster sticker, title, and the "Add Photo" button.
  // In read-only mode (viewing someone else's card) the Add Photo button is
  // omitted, so the card can be seen but not edited.
  function buildTodoCell(task, readOnly) {
    var cell = makeCellShell(task, false);

    var iconWrap = document.createElement("div");
    iconWrap.className = "cell-icon";
    var ill = document.createElement("img");
    ill.className = "cell-ill";
    ill.src = ICON_BASE + task.id + ".png";
    ill.alt = "";
    ill.loading = "lazy";
    ill.decoding = "async";
    iconWrap.appendChild(ill);
    cell.appendChild(iconWrap);

    var title = document.createElement("span");
    title.className = "cell-title";
    title.textContent = task.title;
    cell.appendChild(title);

    if (task.sub) {
      var sub = document.createElement("span");
      sub.className = "cell-sub";
      sub.textContent = task.sub;
      cell.appendChild(sub);
    }

    if (!readOnly) {
      var cam = document.createElement("button");
      cam.className = "cell-cam";
      cam.type = "button";
      cam.style.backgroundImage = handDrawnButton(ACCENTS[task.accent] || "#1f3a5f", cellSeed(task.id) + "|cam");
      cam.innerHTML = CAM_ICON + '<span class="cam-tx">Add Photo</span>';
      cam.setAttribute("aria-label", task.title + " — add a photo");
      cam.addEventListener("click", function () { openPicker(task.id); });
      cell.appendChild(cam);
    }
    return cell;
  }

  function updateProgress() {
    var acct = boardAcct || current || {};
    var doneCount = Object.keys(acct.done || {}).length;
    var total = TASKS.length;
    var pct = Math.round((doneCount / total) * 100);
    el.progressText.textContent = doneCount + " of " + total + " complete";
    el.progressPct.textContent = pct + "%";
    el.progressBar.style.width = pct + "%";
    // Don't show the "You did it!" banner when viewing someone else's card.
    el.celebrate.hidden = boardReadOnly || doneCount < total;
  }

  /* ------------------------------------------------------------------ */
  /* Featured-photo share card — a branded, social-media-ready image     */
  /* ------------------------------------------------------------------ */
  var SHARE_COLORS = ["#e8543f", "#f2a03d", "#6fae4a", "#2fa3a0", "#1f3a5f"];
  var shareBlobUrl = null;   // last generated PNG object URL (for cleanup)
  var shareFile = null;      // last generated File (for Web Share)

  function loadImage(src) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = rej;
      img.src = src;
    });
  }
  function sRoundRect(g, x, y, w, h, r) {
    if (g.roundRect) { g.beginPath(); g.roundRect(x, y, w, h, r); return; }
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function sDrawCover(g, img, x, y, w, h) {
    var ir = img.width / img.height, rr = w / h, sw, sh, sx, sy;
    if (ir > rr) { sh = img.height; sw = sh * rr; sx = (img.width - sw) / 2; sy = 0; }
    else { sw = img.width; sh = sw / rr; sx = 0; sy = (img.height - sh) / 2; }
    g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  // Centre a string but colour each glyph from the palette (the app's rainbow title).
  function sRainbow(g, text, cx, y, colors) {
    var widths = [], total = 0, i;
    for (i = 0; i < text.length; i++) { var wc = g.measureText(text[i]).width; widths.push(wc); total += wc; }
    var x = cx - total / 2, ci = 0;
    g.textAlign = "left";
    for (i = 0; i < text.length; i++) {
      if (text[i] !== " ") { g.fillStyle = colors[ci % colors.length]; g.fillText(text[i], x, y); ci++; }
      x += widths[i];
    }
    g.textAlign = "center";
  }
  function sWrap(g, text, cx, y, maxW, lh, maxLines) {
    maxLines = maxLines || 2;
    var words = String(text).split(" "), line = "", lines = [], i;
    for (i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…"; }
    for (var j = 0; j < lines.length; j++) g.fillText(lines[j], cx, y + j * lh);
  }

  function formatTs(ts) {
    var d = ts ? new Date(ts) : new Date();
    try {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
        " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) { return d.toDateString(); }
  }
  // Paper background + border + bunting + KALAYAAN WARD / FAMILY BINGO title.
  function drawShareChrome(g, W, H) {
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#f7efda"); bg.addColorStop(1, "#efe3c8");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(31,58,95,.12)"; g.lineWidth = 6; g.strokeRect(24, 24, W - 48, H - 48);
    var n = 10, bw = W / n, bh = 72;
    for (var i = 0; i < n; i++) {
      g.fillStyle = SHARE_COLORS[i % SHARE_COLORS.length];
      g.beginPath(); g.moveTo(i * bw, 0); g.lineTo((i + 1) * bw, 0); g.lineTo(i * bw + bw / 2, bh); g.closePath(); g.fill();
    }
    g.textAlign = "center";
    g.fillStyle = "#1f3a5f"; g.font = '800 34px "Nunito", system-ui, sans-serif';
    g.fillText("K A L A Y A A N   W A R D", W / 2, 150);
    g.font = '104px "Permanent Marker", "Patrick Hand", cursive';
    sRainbow(g, "FAMILY BINGO", W / 2, 252, SHARE_COLORS);
  }
  function drawMotto(g, W, y) {
    g.font = '800 44px "Baloo 2", "Nunito", sans-serif';
    var words = [["Love.", "#e8543f"], ["Share.", "#2fa3a0"], ["Serve.", "#6fae4a"], ["Together.", "#1f3a5f"]];
    var gap = 18, mtotal = 0;
    words.forEach(function (w, idx) { mtotal += g.measureText(w[0]).width; if (idx < words.length - 1) mtotal += gap; });
    var mx = W / 2 - mtotal / 2; g.textAlign = "left";
    words.forEach(function (w) { g.fillStyle = w[1]; g.fillText(w[0], mx, y); mx += g.measureText(w[0]).width + gap; });
    g.textAlign = "center";
  }

  /* ---- Shared-image side-panel helpers (Facebook-friendly layouts) ------ *
   * Both shareable images are landscape/near-square (fill a mobile feed):
   * the hero (photo or card) sits on the left, a festive brand column on the
   * right. These helpers draw the festive ground and the branding stack.     */
  function drawFestiveBg(g, W, H) {
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#f7efda"); bg.addColorStop(1, "#efe3c8");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(31,58,95,.12)"; g.lineWidth = 6; g.strokeRect(20, 20, W - 40, H - 40);
    var bw = 100, n = Math.ceil(W / bw), bh = 60;
    for (var i = 0; i < n; i++) {
      g.fillStyle = SHARE_COLORS[i % SHARE_COLORS.length];
      g.beginPath(); g.moveTo(i * bw, 0); g.lineTo((i + 1) * bw, 0); g.lineTo(i * bw + bw / 2, bh); g.closePath(); g.fill();
    }
  }
  // Shrink `size` until `text` fits `maxW` in the font built by mkFont(size).
  function fitSize(g, text, mkFont, maxW, size) {
    g.font = mkFont(size);
    var w = g.measureText(text).width;
    if (w > maxW) size = Math.max(9, Math.floor(size * maxW / w));
    return size;
  }
  function wrapLines(g, text, maxW, maxLines) {
    var words = String(text).split(" "), line = "", lines = [], i;
    for (i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…"; }
    return lines;
  }
  // "Love. Share. Serve. Together." coloured, centred at (cx, cy), fit to maxW.
  function drawMottoAt(g, cx, cy, maxW) {
    var words = [["Love.", "#e8543f"], ["Share.", "#2fa3a0"], ["Serve.", "#6fae4a"], ["Together.", "#1f3a5f"]];
    var size = 42, gap = 13;
    function total(sz) { g.font = '800 ' + sz + 'px "Baloo 2","Nunito",sans-serif'; var t = 0; words.forEach(function (w, i) { t += g.measureText(w[0]).width; if (i < 3) t += gap; }); return t; }
    var tw = total(size);
    if (tw > maxW) { size = Math.floor(size * maxW / tw); tw = total(size); }
    g.font = '800 ' + size + 'px "Baloo 2","Nunito",sans-serif';
    var x = cx - tw / 2, prev = g.textAlign; g.textAlign = "left";
    words.forEach(function (w) { g.fillStyle = w[1]; g.fillText(w[0], x, cy); x += g.measureText(w[0]).width + gap; });
    g.textAlign = prev;
  }
  // Render a centred vertical stack of bands ({h, draw(cx, cy)}) inside the
  // region [top, top+availH], vertically centred, using middle text baseline.
  function drawBands(g, cx, top, availH, bands) {
    var total = 0; bands.forEach(function (b) { total += b.h; });
    var y = top + Math.max(0, (availH - total) / 2);
    var prev = g.textBaseline; g.textBaseline = "middle";
    bands.forEach(function (b) { if (b.draw) b.draw(cx, y + b.h / 2); y += b.h; });
    g.textBaseline = prev;
  }
  // The KALAYAAN WARD / FAMILY / BINGO title as three stacked bands.
  function brandTitleBands(g, sMaxW) {
    var kw = "K A L A Y A A N   W A R D";
    var s1 = fitSize(g, kw, function (z) { return '800 ' + z + 'px "Nunito",system-ui,sans-serif'; }, sMaxW, 32);
    var mk = function (z) { return z + 'px "Permanent Marker","Patrick Hand",cursive'; };
    var s2 = Math.min(fitSize(g, "FAMILY", mk, sMaxW, 108), fitSize(g, "BINGO", mk, sMaxW, 108));
    return [
      { h: s1 + 26, draw: function (cx, cy) { g.font = '800 ' + s1 + 'px "Nunito",system-ui,sans-serif'; g.fillStyle = "#1f3a5f"; g.textAlign = "center"; g.fillText(kw, cx, cy); } },
      { h: s2 + 12, draw: function (cx, cy) { g.font = mk(s2); sRainbow(g, "FAMILY", cx, cy, SHARE_COLORS); } },
      { h: s2 + 12, draw: function (cx, cy) { g.font = mk(s2); sRainbow(g, "BINGO", cx, cy, SHARE_COLORS); } },
      { h: 46, draw: function (cx, cy) { g.font = '30px "Permanent Marker","Patrick Hand",cursive'; g.fillStyle = "#e8543f"; g.textAlign = "center"; g.fillText("♥ ♥ ♥", cx, cy); } }
    ];
  }

  // A strip of translucent GREEN tape (like the wall's .wm-tape) stuck over a
  // hero, drawn inside the hero's already-rotated frame so it sits on the paper.
  // Length is at least 30% of the hero width (freshly randomised each render).
  //   opts.baseDeg  – base angle the strip lies along (default 0 = horizontal)
  //   opts.spreadDeg– random wobble around baseDeg (default ±35°)
  //   opts.corner   – true = centre on (cx,cy) with tiny jitter (corner mount);
  //                   false = straddle the top edge, offset ±30% of its length
  function drawTape(g, cx, cy, heroW, opts) {
    opts = opts || {};
    var len = heroW * (0.30 + Math.random() * 0.08);       // 30–38% of hero width
    var thick = len * 0.22;                                 // keep a strip-like aspect
    var spread = (opts.spreadDeg != null ? opts.spreadDeg : 18);   // gentle tilt for a long strip
    var rot = ((opts.baseDeg || 0) + (Math.random() * 2 - 1) * spread) * Math.PI / 180;
    var offX, offY;
    if (opts.corner) {                                      // sit on the corner
      offX = (Math.random() * 2 - 1) * 0.06 * len;
      offY = (Math.random() * 2 - 1) * 0.06 * len;
    } else {                                                // straddle the top edge
      offX = (Math.random() * 2 - 1) * 0.3 * len;
      offY = (Math.random() * 0.2 - 0.05) * thick;
    }
    g.save();
    g.translate(cx + offX, cy + offY);
    g.rotate(rot);
    var x = -len / 2, y = -thick / 2, edge = Math.max(1.4, len * 0.02);
    // Translucent tape in a random banner colour, freshly picked each render.
    var hex = SHARE_COLORS[Math.floor(Math.random() * SHARE_COLORS.length)].replace("#", "");
    var cr = parseInt(hex.substr(0, 2), 16), cg = parseInt(hex.substr(2, 2), 16), cb = parseInt(hex.substr(4, 2), 16);
    function tapeRGBA(mul, al) { return "rgba(" + Math.round(cr * mul) + "," + Math.round(cg * mul) + "," + Math.round(cb * mul) + "," + al + ")"; }
    g.save();
    g.shadowColor = "rgba(0,0,0,0.20)"; g.shadowBlur = thick * 0.55; g.shadowOffsetY = thick * 0.14;
    var grad = g.createLinearGradient(x, y, x + len, y + thick);   // 135° gradient
    grad.addColorStop(0, tapeRGBA(1, 0.74)); grad.addColorStop(1, tapeRGBA(0.82, 0.62));
    g.fillStyle = grad; g.fillRect(x, y, len, thick);
    g.restore();
    var p = Math.max(5, len * 0.13);                        // machine-direction sheen
    g.fillStyle = "rgba(255,255,255,0.12)";
    for (var sx = x; sx < x + len; sx += p * 2) g.fillRect(sx, y, p, thick);
    g.fillStyle = "rgba(255,255,255,0.28)";                 // bright cut edges
    g.fillRect(x, y, edge, thick); g.fillRect(x + len - edge, y, edge, thick);
    g.restore();
  }

  // Featured single-photo card, laid out LANDSCAPE / near-square for a mobile
  // social feed: the photo (CONTAINED, never cropped) sits in a tilted polaroid
  // on the left; a festive brand column (KALAYAAN WARD / FAMILY BINGO, the
  // activity, family, progress, date, motto) runs down the right.
  function composeFeaturedImage(photoImg, taskTitle, familyName, doneCount, ts) {
    var H = 1180, M = 76, contentTop = 116, bottomM = 76, gap = 56;
    var availH = H - contentTop - bottomM;
    var a = (photoImg.width && photoImg.height) ? photoImg.width / photoImg.height : 1;
    var fp = 22;                                        // polaroid white border
    var photoDrawH = availH - 2 * fp;
    var photoDrawW = Math.round(photoDrawH * a);
    var maxPW = 1120;                                   // cap very wide photos
    if (photoDrawW > maxPW) { photoDrawW = maxPW; photoDrawH = Math.round(maxPW / a); }
    var frameW = photoDrawW + 2 * fp, frameH = photoDrawH + 2 * fp;
    var sidebarW = 540;
    var W = M + frameW + gap + sidebarW + M;

    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var g = cv.getContext("2d");
    drawFestiveBg(g, W, H);

    // Polaroid on the left (vertically centred in the content band), tilted a
    // fresh random angle each render and held by a strip of tape at the top.
    var frameX = M, frameY = contentTop + Math.round((availH - frameH) / 2);
    var fcx = frameX + frameW / 2, fcy = frameY + frameH / 2;
    var tilt = (Math.random() * 2 - 1) * 4 * Math.PI / 180;
    g.save();
    g.translate(fcx, fcy); g.rotate(tilt); g.translate(-fcx, -fcy);
    g.shadowColor = "rgba(20,12,4,.30)"; g.shadowBlur = 38; g.shadowOffsetY = 18;
    g.fillStyle = "#fff"; sRoundRect(g, frameX, frameY, frameW, frameH, 10); g.fill();
    g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0;
    var px = frameX + fp, py = frameY + fp;
    g.save(); sRoundRect(g, px, py, photoDrawW, photoDrawH, 4); g.clip();
    g.drawImage(photoImg, px, py, photoDrawW, photoDrawH); g.restore();
    drawTape(g, fcx, frameY, frameW);
    g.restore();

    // Brand + caption column on the right.
    var scx = M + frameW + gap + sidebarW / 2, sMaxW = sidebarW - 16;
    // Measure with the title's own font (loaded before compose) so it wraps
    // correctly instead of overflowing the column.
    g.font = '40px "Permanent Marker","Patrick Hand",cursive';
    var titleLines = wrapLines(g, taskTitle, sMaxW, 3);
    var tlh = 48;
    var bands = brandTitleBands(g, sMaxW).concat([
      { h: titleLines.length * tlh + 8, draw: function (cx, cy) {
          g.font = '40px "Permanent Marker","Patrick Hand",cursive'; g.fillStyle = "#1f3a5f"; g.textAlign = "center";
          var y0 = cy - (titleLines.length - 1) * tlh / 2;
          titleLines.forEach(function (ln, i) { g.fillText(ln, cx, y0 + i * tlh); });
        } },
      { h: 74, draw: function (cx, cy) { g.font = '58px "Permanent Marker","Patrick Hand",cursive'; g.fillStyle = "#1f3a5f"; g.textAlign = "center"; g.fillText(familyName, cx, cy); } },
      { h: 52, draw: function (cx, cy) { g.font = '800 34px "Nunito",system-ui,sans-serif'; g.fillStyle = "#e8543f"; g.textAlign = "center"; g.fillText("✓ " + doneCount + " of " + TASKS.length + " complete", cx, cy); } },
      { h: 46, draw: function (cx, cy) { g.font = '30px "Permanent Marker","Patrick Hand",cursive'; g.fillStyle = "#8a7a5c"; g.textAlign = "center"; g.fillText(formatTs(ts), cx, cy); } },
      { h: 60, draw: function (cx, cy) { drawMottoAt(g, cx, cy, sMaxW); } }
    ]);
    drawBands(g, scx, contentTop, availH, bands);
    return cv;
  }

  function sFit(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    var t = String(text);
    while (t.length > 1 && g.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  }
  function borderDataURI(uri) {
    var m = String(uri).match(/url\(["']?([\s\S]*?)["']?\)\s*$/);
    return m ? m[1] : uri;
  }

  // The WHOLE bingo card as a shareable image — the card AS DESIGNED (same
  // hand-drawn cell borders, seeded Polaroid tilts, marker fonts, name/stat
  // head, motto), with the bunting + FAMILY BINGO title added above it.
  function composeCardImage(acct) {
    var W = 1080, tmpUrls = [];
    var prevSeed = activeSeed; activeSeed = seedOf(acct);   // same seed the board uses
    var tilts = {};
    var loaders = TASKS.map(function (t) {
      var done = !!(acct.done && acct.done[t.id]);
      tilts[t.id] = seededTilt(t.id);
      var borderP = loadImage(borderDataURI(handDrawnBorder(ACCENTS[t.accent] || "#1f3a5f", null, cellSeed(t.id))))
        .then(function (b) { return b; }, function () { return null; });
      var contentP = done
        ? getPhotoSrc(acct, t.id, tmpUrls).then(function (src) { return src ? loadImage(src) : null; }).catch(function () { return null; })
        : loadImage(ICON_BASE + t.id + ".png").then(function (im) { return im; }, function () { return null; });
      return Promise.all([borderP, contentP]).then(function (r) { return { t: t, done: done, border: r[0], img: r[1] }; });
    });
    activeSeed = prevSeed;   // borders/tilts already captured synchronously above
    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();

    return Promise.all([Promise.all(loaders), ready]).then(function (res) {
      var items = res[0];
      var cardMargin = 40, cardX = cardMargin, cardW = W - 2 * cardMargin, pad = 34;
      var gap = 16, cols = 3, rows = 4;
      var gridX = cardX + pad, gridW = cardW - 2 * pad;
      var cellW = (gridW - (cols - 1) * gap) / cols, cellH = cellW * 1.22;
      var headerH = 300, cardTop = headerH + 6;
      var headBandH = 86, mottoBandH = 92;
      var gridTop = cardTop + pad + headBandH;
      var gridH = rows * cellH + (rows - 1) * gap;
      var cardH = pad + headBandH + gridH + mottoBandH + pad;
      var H = Math.round(cardTop + cardH + cardMargin);

      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var g = cv.getContext("2d");
      drawShareChrome(g, W, H);

      // The card paper itself (cream, faint lines, soft lift).
      g.save();
      g.shadowColor = "rgba(20,12,4,.28)"; g.shadowBlur = 34; g.shadowOffsetY = 14;
      g.fillStyle = "#f4ead0"; sRoundRect(g, cardX, cardTop, cardW, cardH, 22); g.fill();
      g.restore();
      g.save(); sRoundRect(g, cardX, cardTop, cardW, cardH, 22); g.clip();
      g.strokeStyle = "rgba(0,0,0,.028)"; g.lineWidth = 1;
      for (var ly = cardTop + 10; ly < cardTop + cardH; ly += 6) { g.beginPath(); g.moveTo(cardX, ly); g.lineTo(cardX + cardW, ly); g.stroke(); }
      g.restore();

      // Card head: family name (left, navy marker) + X/Y stat (right, red marker).
      var familyName = displayName(acct.name || "Family");
      var doneCount = Object.keys(acct.done || {}).length;
      var headY = cardTop + pad + 52;
      g.fillStyle = "#e8543f"; g.textAlign = "right"; g.font = '52px "Permanent Marker", "Patrick Hand", cursive';
      var stat = doneCount + "/" + TASKS.length;
      g.fillText(stat, cardX + cardW - pad, headY);
      var statW = g.measureText(stat).width;
      g.fillStyle = "#1f3a5f"; g.textAlign = "left"; g.font = '52px "Permanent Marker", "Patrick Hand", cursive';
      g.fillText(sFit(g, familyName, gridW - statW - 30), gridX, headY);

      // Cells — exactly the board's design.
      items.forEach(function (it, idx) {
        var r = Math.floor(idx / cols), c = idx % cols;
        var x = gridX + c * (cellW + gap), y = gridTop + r * (cellH + gap);
        if (it.border) g.drawImage(it.border, x, y, cellW, cellH);
        else { g.strokeStyle = ACCENTS[it.t.accent] || "#1f3a5f"; g.lineWidth = 3; sRoundRect(g, x + 3, y + 3, cellW - 6, cellH - 6, 12); g.stroke(); }

        g.fillStyle = "#1f3a5f"; g.textAlign = "center"; g.font = '700 20px "Patrick Hand", "Nunito", cursive';
        sWrap(g, it.t.title.toUpperCase(), x + cellW / 2, y + 28, cellW - 26, 21, 3);

        var cTop = y + 82, area = { x: x + 12, y: cTop, w: cellW - 24, h: y + cellH - cTop - 12 };
        if (it.done) {
          var ia = it.img ? it.img.width / it.img.height : 1;
          var maxW = area.w * 0.9, maxH = area.h * 0.92, dw, dh;
          if (ia > maxW / maxH) { dw = maxW; dh = dw / ia; } else { dh = maxH; dw = dh * ia; }
          var bs = 8, bb = 18, pw = dw + 2 * bs, ph = dh + bs + bb;
          g.save();
          g.translate(area.x + area.w / 2, area.y + area.h / 2);
          g.rotate((tilts[it.t.id] || 0) * Math.PI / 180);
          g.shadowColor = "rgba(31,45,70,.28)"; g.shadowBlur = 12; g.shadowOffsetY = 4;
          g.fillStyle = "#fff"; sRoundRect(g, -pw / 2, -ph / 2, pw, ph, 3); g.fill();
          g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetY = 0;
          if (it.img) { g.save(); sRoundRect(g, -pw / 2 + bs, -ph / 2 + bs, dw, dh, 1); g.clip(); g.drawImage(it.img, -pw / 2 + bs, -ph / 2 + bs, dw, dh); g.restore(); }
          g.restore();
        } else if (it.img) {
          var sa = it.img.width / it.img.height, sw = area.w * 0.62, sh = sw / sa;
          if (sh > area.h * 0.86) { sh = area.h * 0.86; sw = sh * sa; }
          g.drawImage(it.img, area.x + (area.w - sw) / 2, area.y + (area.h - sh) / 2, sw, sh);
        }
      });

      drawMotto(g, W, cardTop + cardH - 30);
      tmpUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
      return cv;
    });
  }

  function closeShare() {
    if (el.share) el.share.hidden = true;
    if (el.shareHint) el.shareHint.textContent = "";
    if (shareBlobUrl) { URL.revokeObjectURL(shareBlobUrl); shareBlobUrl = null; }
  }

  // Turn a finished canvas into the shared PNG and open the share sheet.
  function showShareCanvas(canvas) {
    if (!el.share || !canvas) return;
    canvas.toBlob(function (png) {
      if (!png) return;
      if (shareBlobUrl) URL.revokeObjectURL(shareBlobUrl);
      shareBlobUrl = URL.createObjectURL(png);
      try { shareFile = new File([png], "kalayaan-family-bingo.png", { type: "image/png" }); }
      catch (e) { shareFile = png; }
      el.shareImg.src = shareBlobUrl;
      el.shareHint.textContent = "";
      el.share.hidden = false;
    }, "image/png", 0.92);
  }

  // Feature one photo (from a fresh upload blob, or by taskId/account) and share.
  function featurePhoto(taskId, acct, ts, blob) {
    if (!el.share) return;
    var task = TASKS.filter(function (t) { return t.id === taskId; })[0];
    if (!task) return;
    acct = acct || current || {};
    var familyName = displayName(acct.name || "Family");
    var doneCount = Object.keys(acct.done || {}).length;
    var own = !blob, srcP = blob ? Promise.resolve(URL.createObjectURL(blob)) : getPhotoSrc(acct, taskId, []);
    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    Promise.all([srcP, ready]).then(function (r) {
      var src = r[0]; if (!src) return;
      return loadImage(src).then(function (img) {
        showShareCanvas(composeFeaturedImage(img, task.title, familyName, doneCount, ts));
        if (blob) URL.revokeObjectURL(src);
      });
    }).catch(function () {});
  }

  function openShareCard(taskId, blob) {
    var ts = (current && current.done && current.done[taskId]) || Date.now();
    featurePhoto(taskId, current, ts, blob);
  }

  // Lazily load html2canvas (only when the user first shares a card).
  var H2C_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  var h2cPromise = null;
  function ensureHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (h2cPromise) return h2cPromise;
    h2cPromise = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = H2C_URL; s.async = true;
      s.onload = function () { window.html2canvas ? res(window.html2canvas) : rej(new Error("no h2c")); };
      s.onerror = function () { rej(new Error("h2c load failed")); };
      document.head.appendChild(s);
    });
    return h2cPromise;
  }
  // Share the whole bingo card: literally a SCREENSHOT of the rendered card
  // (html2canvas), used as-is — same aspect ratio as it sits on screen. Because
  // html2canvas can't render the CSS worn-edge mask, we re-clip the capture to
  // the very same frayed silhouette afterwards, then drop it on the board-blue
  // page with a soft shadow. Falls back to the canvas redraw only if the
  // screenshot library can't load.
  function shareWholeCard() {
    var acct = boardAcct || current;
    if (!acct || !el.share) return;
    showToast("Building your card…");
    ensureHtml2Canvas().then(function (h2c) {
      var target = document.querySelector(".bingo-card");
      if (!target) throw new Error("no card on screen");
      // Target ~1000px-wide output: crisp enough for sharing, but capped so
      // the capture stays quick (scale 3 on a tall card is painfully slow).
      var scale = Math.max(1.5, Math.min(2.5, 1000 / (target.offsetWidth || 360)));
      // Transparent background so the real paper (frayed) is all we keep;
      // capture exactly the on-screen proportions (no layout onclone).
      return h2c(target, {
        backgroundColor: null, scale: scale, useCORS: true, logging: false,
        onclone: function (doc) {
          // html2canvas ignores `object-fit: contain`, so it stretches the
          // square sticker PNGs to fill their wide icon boxes. The art is
          // square, so pinning height:100% / width:auto makes the browser lay
          // each one out square (centred by the flex icon box) — undistorted
          // whether or not the capture honours object-fit.
          Array.prototype.forEach.call(doc.querySelectorAll(".cell-ill"), function (im) {
            im.style.height = "100%";
            im.style.width = "auto";
            im.style.objectFit = "contain";
          });
        }
      });
    }).then(function (shot) {
      showShareCanvas(frameCardShot(shot, seedOf(boardAcct || current)));
    }).catch(function () {
      composeCardImage(acct).then(showShareCanvas).catch(function () {
        showToast("Couldn't build the card image.");
      });
    });
  }

  // Take a raw html2canvas capture of the card (a plain rectangle, since the
  // CSS mask is lost), clip it to the same worn-edge silhouette used on screen,
  // then lay it out LANDSCAPE / near-square for a mobile social feed: the frayed
  // card on the left, a festive brand column (bunting, KALAYAAN WARD, FAMILY
  // BINGO, motto) down the right.
  function frameCardShot(shot, seed) {
    var w = shot.width, h = shot.height;
    // Re-clip to the frayed shape. On screen the paper's cast shadow follows
    // the masked alpha and makes the wear read; a flat exported image has no
    // such shadow, so use a bolder fray strength here to keep the torn-paper
    // edge clearly visible.
    var mask = wornEdgeCanvas(seed, null, null, 2.6);
    if (mask) {
      var mg = shot.getContext && shot.getContext("2d");
      if (mg) {
        mg.globalCompositeOperation = "destination-in";
        mg.drawImage(mask, 0, 0, w, h);
        mg.globalCompositeOperation = "source-over";
      }
    }
    var m = Math.round(h * 0.05), gap = Math.round(h * 0.045);
    var topPad = m + Math.round(h * 0.05);          // extra room for tilt + long tape
    var sidebarW = Math.round(w * 0.56);
    var out = document.createElement("canvas");
    out.width = m + w + gap + sidebarW + m;
    out.height = topPad + h + m;
    var g = out.getContext("2d");
    drawFestiveBg(g, out.width, out.height);

    // Frayed card on the left: tilted a fresh random angle each render, held by
    // a strip of tape at the top, over a soft cast shadow.
    var cardX = m, cardY = topPad;
    var ccx = cardX + w / 2, ccy = cardY + h / 2;
    var tilt = (Math.random() * 2 - 1) * 3.2 * Math.PI / 180;
    g.save();
    g.translate(ccx, ccy); g.rotate(tilt); g.translate(-ccx, -ccy);
    g.save();
    g.shadowColor = "rgba(31,45,70,0.30)";
    g.shadowBlur = Math.round(w * 0.04);
    g.shadowOffsetY = Math.round(w * 0.018);
    g.drawImage(shot, cardX, cardY, w, h);
    g.restore();
    drawTape(g, ccx, cardY, w);
    g.restore();

    // Brand column on the right (the card already carries the family name,
    // stat and motto, so the column stays pure branding).
    var scx = cardX + w + gap + sidebarW / 2, sMaxW = sidebarW - 20;
    var bands = brandTitleBands(g, sMaxW).concat([
      { h: 66, draw: function (cx, cy) { drawMottoAt(g, cx, cy, sMaxW); } }
    ]);
    drawBands(g, scx, topPad, h, bands);
    return out;
  }

  function doShare() {
    var text = "We're playing Kalayaan Ward Family Bingo! ❤️";
    if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
      navigator.share({ files: [shareFile], title: "Family Bingo", text: text })
        .catch(function () {});
    } else if (navigator.share) {
      navigator.share({ title: "Family Bingo", text: text, url: location.href }).catch(function () {});
      if (el.shareHint) el.shareHint.textContent = "Tip: long-press the photo above to save it, too.";
    } else if (el.shareHint) {
      el.shareHint.textContent = "Long-press (or right-click) the photo above to save or share it.";
    }
  }

  /* ------------------------------------------------------------------ */
  /* Modal                                                              */
  /* ------------------------------------------------------------------ */
  function openModal(taskId) {
    var task = TASKS.filter(function (t) { return t.id === taskId; })[0];
    if (!task) return;
    activeTaskId = taskId;
    var done = !!(current.done && current.done[taskId]);

    el.modalIcon.textContent = task.emoji;
    el.modalTitle.textContent = task.title;
    el.modalHint.textContent = done
      ? "Nice work! You can replace the photo or remove it."
      : (task.sub ? task.sub + " " : "") + "Upload a photo of your family doing this activity to mark it complete.";
    el.modalUploadLabel.textContent = done ? "🔄 Replace photo" : "📷 Upload photo";
    el.modalRemove.hidden = !done;
    el.modalPhotoWrap.hidden = true;
    el.modalPhoto.removeAttribute("src");

    if (done) {
      getPhotoSrc(current, taskId).then(function (src) {
        if (src && activeTaskId === taskId) {
          el.modalPhoto.src = src;
          el.modalPhotoWrap.hidden = false;
        }
      });
    }

    el.modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    el.modal.hidden = true;
    activeTaskId = null;
    el.modalFile.value = "";
    document.body.style.overflow = "";
  }

  function handleFile(file) {
    if (!file || !activeTaskId) return;
    if (!/^image\//.test(file.type)) { showToast("Please choose an image file."); return; }
    var taskId = activeTaskId;
    el.modalUploadLabel.textContent = "Processing…";

    compressImage(file, 1280, 0.82).then(function (blob) {
      return putPhoto(current, taskId, blob).then(function () { return blob; });
    }).then(function (blob) {
      var wasDone = !!(current.done && current.done[taskId]);
      current.done = current.done || {};
      // Record the completion time/date per task; keep the FIRST completion time
      // (don't overwrite it when the photo is later replaced).
      if (!current.done[taskId]) current.done[taskId] = Date.now();
      updateAccount(current);

      var u = URL.createObjectURL(blob);
      objectUrls.push(u);
      if (activeTaskId === taskId) {
        el.modalPhoto.src = u;
        el.modalPhotoWrap.hidden = false;
        el.modalUploadLabel.textContent = "🔄 Replace photo";
        el.modalRemove.hidden = false;
      }

      renderBoard();
      showToast("Activity complete! 🎉");
      if (!wasDone) { closeModal(); openShareCard(taskId, blob); }  // feature the photo

      if (Object.keys(current.done).length === TASKS.length) {
        setTimeout(confetti, 200);
      }
    }).catch(function () {
      el.modalUploadLabel.textContent = "📷 Upload photo";
      showToast("Couldn't save the photo — your browser may be blocking storage (try turning off Private Browsing).");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Direct photo picker (no interstitial modal for adding a photo)      */
  /* ------------------------------------------------------------------ */
  var picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.style.display = "none";
  document.body.appendChild(picker);
  var pendingTaskId = null;

  function openPicker(taskId) {
    pendingTaskId = taskId;
    picker.value = "";
    picker.click();
  }

  picker.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    var taskId = pendingTaskId;
    picker.value = "";
    pendingTaskId = null;
    if (!file || !taskId || !current) return;
    if (!/^image\//.test(file.type)) { showToast("Please choose an image file."); return; }

    showToast(Cloud.enabled && !(current && current.local) ? "Uploading photo…" : "Adding photo…");
    compressImage(file, 1280, 0.82).then(function (blob) {
      return putPhoto(current, taskId, blob).then(function () { return blob; });
    }).then(function (blob) {
      var wasDone = !!(current.done && current.done[taskId]);
      current.done = current.done || {};
      // Record the completion time/date per task; keep the FIRST completion time
      // (don't overwrite it when the photo is later replaced).
      if (!current.done[taskId]) current.done[taskId] = Date.now();
      updateAccount(current);
      renderBoard();
      showToast("Activity complete! 🎉");
      if (!wasDone) openShareCard(taskId, blob);   // feature the photo for sharing
      if (Object.keys(current.done).length === TASKS.length) setTimeout(confetti, 200);
    }).catch(function () {
      showToast("Couldn't save the photo — your browser may be blocking storage (try turning off Private Browsing).");
    });
  });

  function removePhoto() {
    if (!activeTaskId) return;
    var taskId = activeTaskId;
    delPhoto(current, taskId).then(function () {
      if (current.done) delete current.done[taskId];
      updateAccount(current);
      renderBoard();
      closeModal();
      showToast("Photo removed.");
    });
  }

  function removePhotoFor(taskId) {
    return delPhoto(current, taskId).then(function () {
      if (current.done) delete current.done[taskId];
      updateAccount(current);
      renderBoard();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Coverflow gallery — tap an uploaded photo to flip through them all  */
  /* ------------------------------------------------------------------ */
  var cf = { instance: null, urls: [], tasks: [], current: 0, dom: null, sources: [], animating: false, pinch: null };
  // Full-screen, full-resolution photo viewer (tap the centred card to open).
  var cfFull = { dom: null, url: null, open: false };
  // Card shadow at rest in the coverflow vs. back home on the board — animated
  // together with the flight so the shadow grows/shrinks with the distance.
  var CF_SHADOW_FAR = "drop-shadow(0 16px 26px rgba(0,0,0,0.55))";
  var CF_SHADOW_HOME = "drop-shadow(0 4px 8px rgba(31,58,95,0.22))";

  // Two-finger pinch / zoom / rotate / pan on the CENTRED card, springing back
  // on release (technique from the pinch-peek kit). It listens on the same flow
  // element as the coverflow and blocks the deck's 1-finger drag while pinching
  // (stopImmediatePropagation), transforming a dedicated .cf-peek wrapper so it
  // never fights the coverflow's own card transform.
  function setupPinch(dom) {
    var pointers = new Map();
    var base = null, live = null, raf = null, target = null;
    var MIN = 0.6, MAX = 4, SPRING = 320;
    function clampv(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function frame() {
      var pts = []; pointers.forEach(function (e) { pts.push(e); });
      var a = pts[0], b = pts[1];
      return {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
        ang: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX),
        midX: (a.clientX + b.clientX) / 2, midY: (a.clientY + b.clientY) / 2
      };
    }
    function shadow(scale) {
      var lift = clampv((scale - 1) / 3, 0, 1);
      if (lift <= 0.001) return "";
      var t = Math.sqrt(lift);
      return "drop-shadow(0 " + (t * 40) / scale + "px " + (t * 30) / scale + "px rgba(0,0,0," + t + ")) " +
        "drop-shadow(0 " + (t * 110) / scale + "px " + (t * 130) / scale + "px rgba(0,0,0," + (t * 0.6) + "))";
    }
    function applyT(t) {
      live = t;
      if (!target) return;
      target.style.transform = "translate(" + t.tx + "px," + t.ty + "px) rotate(" + t.rot + "deg) scale(" + t.scale + ")";
      target.style.filter = shadow(t.scale);
    }
    function begin() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      var cards = dom.flow.querySelectorAll(".cf-card");
      var c = cards[cf.current];
      target = c ? c.querySelector(".cf-peek") : null;
      if (!target) return false;
      target.style.zIndex = "6";
      base = frame(); live = { scale: 1, rot: 0, tx: 0, ty: 0 };
      return true;
    }
    function update() {
      if (!base) return;
      var f = frame();
      applyT({
        scale: clampv(f.dist / base.dist, MIN, MAX),
        rot: ((f.ang - base.ang) * 180) / Math.PI,
        tx: f.midX - base.midX, ty: f.midY - base.midY
      });
    }
    function reset() {
      if (target) { target.style.transform = ""; target.style.filter = ""; target.style.zIndex = ""; }
      base = null; live = null; raf = null; target = null;
    }
    function spring() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      var from = live; if (!from) { reset(); return; }
      var start = null;
      function stepf(ts) {
        if (start === null) start = ts;
        var e = easeOut(Math.min(1, (ts - start) / SPRING));
        applyT({ scale: from.scale + (1 - from.scale) * e, rot: from.rot * (1 - e), tx: from.tx * (1 - e), ty: from.ty * (1 - e) });
        if (e < 1) { raf = requestAnimationFrame(stepf); return; }
        reset();
      }
      raf = requestAnimationFrame(stepf);
    }
    function onDown(e) {
      if (e.pointerType === "mouse") return;         // pinch is touch/pen only
      pointers.set(e.pointerId, e);
      if (pointers.size === 2 && !cf.animating) {
        if (begin()) {
          pointers.forEach(function (ev, id) { try { dom.flow.setPointerCapture(id); } catch (err) {} });
          e.stopImmediatePropagation();              // keep the deck from also grabbing this finger
        }
      }
    }
    function onMove(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, e);
      if (base && pointers.size >= 2) { update(); e.stopImmediatePropagation(); }  // freeze the deck while pinching
    }
    function onUp(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (base && pointers.size < 2) spring();
    }
    dom.flow.addEventListener("pointerdown", onDown);
    dom.flow.addEventListener("pointermove", onMove);
    dom.flow.addEventListener("pointerup", onUp);
    dom.flow.addEventListener("pointercancel", onUp);
    return { reset: reset };
  }

  function buildCoverflowDom() {
    if (cf.dom) return cf.dom;
    var overlay = document.createElement("div");
    overlay.className = "cf-overlay";
    overlay.hidden = true;

    var backdrop = document.createElement("div");
    backdrop.className = "cf-overlay-backdrop";
    backdrop.addEventListener("click", closeCoverflow);

    var close = document.createElement("button");
    close.type = "button";
    close.className = "cf-overlay-close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";
    close.addEventListener("click", closeCoverflow);

    var flow = document.createElement("div");
    flow.className = "cf-flow";

    var bar = document.createElement("div");
    bar.className = "cf-overlay-bar";
    var replace = document.createElement("button");
    replace.type = "button";
    replace.className = "cf-overlay-btn";
    replace.textContent = "Replace";
    replace.addEventListener("click", function () {
      var t = cf.tasks[cf.current];
      if (!t) return;
      closeCoverflow();
      openPicker(t.id);
    });
    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cf-overlay-btn danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", function () {
      var t = cf.tasks[cf.current];
      if (!t) return;
      var idx = cf.current;
      removePhotoFor(t.id).then(function () {
        var remaining = TASKS.filter(function (x) { return current.done && current.done[x.id]; });
        if (!remaining.length) { closeCoverflow(); return; }
        openCoverflowList(remaining, Math.min(idx, remaining.length - 1), false);
      });
      showToast("Photo removed.");
    });
    var share = document.createElement("button");
    share.type = "button";
    share.className = "cf-overlay-btn";
    share.textContent = "Share";
    share.addEventListener("click", function () {
      var t = cf.tasks[cf.current];
      if (!t) return;
      var acct = boardAcct || current;
      var ts = acct && acct.done && acct.done[t.id];
      featurePhoto(t.id, acct, ts);   // share the centred photo as a featured card
    });
    styleHD(share, "#2fa3a0");
    styleHD(replace, "#1f3a5f");
    styleHD(remove, "#c94a37");
    // Share sits on its own row just below the image; Replace + Remove below it.
    bar.appendChild(share);
    var subRow = document.createElement("div");
    subRow.className = "cf-overlay-row";
    subRow.appendChild(replace);
    subRow.appendChild(remove);
    bar.appendChild(subRow);

    overlay.appendChild(backdrop);
    overlay.appendChild(close);
    overlay.appendChild(flow);
    overlay.appendChild(bar);
    document.body.appendChild(overlay);

    cf.dom = { overlay: overlay, flow: flow, replaceBtn: replace, removeBtn: remove, shareBtn: share };
    cf.pinch = setupPinch(cf.dom);   // listens on the flow, before the coverflow does
    setupTap(cf.dom);                // tap the centred card → full-screen photo
    return cf.dom;
  }

  function teardownCoverflow() {
    if (cf.instance) { try { cf.instance.destroy(); } catch (e) {} cf.instance = null; }
    cf.urls.forEach(function (u) { URL.revokeObjectURL(u); });
    cf.urls = [];
    cf.tasks = [];
    if (cf.dom) cf.dom.flow.innerHTML = "";
  }

  // Single-finger gestures on the deck, both distinct from the coverflow's own
  // horizontal browse and the 2-finger pinch:
  //   • a clean tap on the CENTRED card → full-screen, full-resolution photo;
  //   • a downward swipe → dismiss the coverflow (cells fly back to the board).
  // Our listeners are attached before the coverflow's, so once we recognise a
  // dismiss we stopImmediatePropagation to keep the deck from browsing/settling
  // the same drag and fighting the fly-back.
  var CF_SWIPE_CLOSE = 55;  // px of downward travel that commits to a dismiss
  function setupTap(dom) {
    var active = new Map();
    var cand = null;     // { id, x, y, t } single-pointer gesture in progress
    var closing = false; // a downward dismiss swipe has been recognised
    dom.flow.addEventListener("pointerdown", function (e) {
      active.set(e.pointerId, e);
      closing = false;
      cand = active.size === 1
        ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }
        : null;                                  // a 2nd finger → pinch, not tap/swipe
    });
    dom.flow.addEventListener("pointermove", function (e) {
      if (!active.has(e.pointerId)) return;
      active.set(e.pointerId, e);
      if (!cand || e.pointerId !== cand.id || cf.animating) return;
      var dx = e.clientX - cand.x, dy = e.clientY - cand.y;
      if (closing) { e.stopImmediatePropagation(); return; }  // freeze the deck
      var verticalDown = dy > 0 && dy > Math.abs(dx) * 1.3;
      if (verticalDown && dy > CF_SWIPE_CLOSE) {              // committed downward swipe
        closing = true;
        e.stopImmediatePropagation();
      } else if (Math.hypot(dx, dy) > 8 && !verticalDown) {
        cand = null;   // horizontal/upward drag → not tap/dismiss; let the deck browse
      }
      // A downward-vertical drag still under the threshold keeps the candidate
      // alive (we don't null it), so it can grow into a dismiss.
    });
    function end(e) {
      if (!active.has(e.pointerId)) return;
      active.delete(e.pointerId);
      if (cand && e.pointerId === cand.id) {
        var c = cand, wasClosing = closing;
        cand = null; closing = false;
        if (wasClosing) {
          e.stopImmediatePropagation();          // block the deck's onUp; fly back unopposed
          if (cf.dom && !cf.dom.overlay.hidden && !cf.animating) closeCoverflow();
        } else if (e.type === "pointerup" && (e.timeStamp - c.t) < 500 && !cf.animating) {
          var cards = dom.flow.querySelectorAll(".cf-card");
          var card = cards[cf.current];
          if (card) {
            var r = card.getBoundingClientRect();
            if (c.x >= r.left && c.x <= r.right && c.y >= r.top && c.y <= r.bottom) {
              var task = cf.tasks[cf.current];
              if (task) openFullPhoto(task.id);
            }
          }
        }
      }
      if (active.size === 0) { cand = null; closing = false; }
    }
    dom.flow.addEventListener("pointerup", end);
    dom.flow.addEventListener("pointercancel", end);
  }

  function buildFullDom() {
    if (cfFull.dom) return cfFull.dom;
    var overlay = document.createElement("div");
    overlay.className = "cf-full";
    overlay.hidden = true;

    var img = document.createElement("img");
    img.className = "cf-full-img";
    img.alt = "";
    img.decoding = "async";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "cf-full-close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";
    close.addEventListener("click", function (e) { e.stopPropagation(); closeFullPhoto(true); });

    overlay.appendChild(img);
    overlay.appendChild(close);
    overlay.addEventListener("click", function () { closeFullPhoto(); }); // tap anywhere to dismiss
    document.body.appendChild(overlay);

    cfFull.dom = { overlay: overlay, img: img };
    return cfFull.dom;
  }

  function openFullPhoto(taskId) {
    if (!current) return;
    var dom = buildFullDom();
    if (cfFull.url) { URL.revokeObjectURL(cfFull.url); cfFull.url = null; }
    dom.img.classList.remove("ready");
    dom.overlay.hidden = false;
    cfFull.open = true;
    // The opening tap also fires a synthesized click that would land on the
    // now-visible overlay and close it instantly — ignore closes until armed.
    cfFull.armed = false;
    setTimeout(function () { cfFull.armed = true; }, 350);
    // rAF so the removed [hidden] paints before we add the enter transition.
    requestAnimationFrame(function () { dom.overlay.classList.add("in"); });
    getPhotoSrc(current, taskId, []).then(function (src) {
      if (!src || !cfFull.open) return;
      // revoke only object URLs we minted; leave remote cloud URLs alone
      cfFull.url = (String(src).indexOf("blob:") === 0) ? src : null;
      dom.img.onload = function () { dom.img.classList.add("ready"); };
      dom.img.src = src;
    });
  }

  function closeFullPhoto(force) {
    if (!cfFull.dom || !cfFull.open) return;
    if (!force && !cfFull.armed) return;   // swallow the opening tap's stray click
    cfFull.open = false;
    var dom = cfFull.dom;
    dom.overlay.classList.remove("in");
    dom.overlay.classList.add("out");
    setTimeout(function () {
      dom.overlay.hidden = true;
      dom.overlay.classList.remove("out");
      dom.img.classList.remove("ready");
      dom.img.removeAttribute("src");
      if (cfFull.url) { URL.revokeObjectURL(cfFull.url); cfFull.url = null; }
    }, 200);
  }

  // The transform that places a coverflow card exactly over its board cell.
  function cardBoardTransform(card, taskId, vcx, vcy) {
    var cw = card.offsetWidth || 1;
    var src = taskId ? el.grid.querySelector('.cell[data-task="' + taskId + '"]') : null;
    var br = src ? src.getBoundingClientRect() : card.getBoundingClientRect();
    var dx = (br.left + br.width / 2) - vcx;
    var dy = (br.top + br.height / 2) - vcy;
    var sc = br.width / cw;
    return "translate(-50%,-50%) translateX(" + dx.toFixed(1) + "px) translateY(" +
      dy.toFixed(1) + "px) scale(" + sc.toFixed(4) + ")";
  }

  // Hide the on-board cells now represented in the coverflow (they "leave" the
  // card while their copies fly); restore them when it closes.
  function hideSources(doneTasks) {
    restoreSources();
    cf.sources = [];
    doneTasks.forEach(function (t) {
      var src = el.grid.querySelector('.cell[data-task="' + t.id + '"]');
      if (src) { src.style.visibility = "hidden"; cf.sources.push(src); }
    });
  }
  function restoreSources() {
    if (cf.sources) cf.sources.forEach(function (c) { c.style.visibility = ""; });
    cf.sources = [];
  }

  function finishClose() {
    cf.animating = false;
    teardownCoverflow();
    if (cf.dom) { cf.dom.overlay.hidden = true; cf.dom.overlay.classList.remove("cf-intro"); cf.dom.flow.style.overflow = ""; }
    restoreSources();
  }

  function closeCoverflow() {
    var dom = cf.dom;
    if (!dom || dom.overlay.hidden) { finishClose(); return; }
    var cards = dom.flow.querySelectorAll(".cf-card");
    if (!cards.length) { finishClose(); return; }
    try {
      var vp = dom.flow.getBoundingClientRect();
      var vcx = vp.left + vp.width / 2, vcy = vp.top + vp.height / 2;
      // stop the coverflow driving transforms so our fly-back is unopposed
      if (cf.instance) { try { cf.instance.destroy(); } catch (e) {} cf.instance = null; }
      cf.animating = true;
      if (cf.pinch) cf.pinch.reset();                  // drop any live pinch before flying back
      dom.flow.style.overflow = "visible";             // don't clip cards heading to the edges
      dom.overlay.classList.add("cf-intro");           // fade the backdrop OUT as they fly back
      Array.prototype.forEach.call(cards, function (card, i) {
        var t = cf.tasks[i];
        var backT = cardBoardTransform(card, t ? t.id : null, vcx, vcy);
        card.style.transition = "transform 0.5s cubic-bezier(.4,0,.2,1), opacity 0.5s ease, filter 0.5s ease";
        card.style.transform = backT;
        card.style.opacity = "1";       // far/culled cards fade in & fly from off-screen
        card.style.filter = CF_SHADOW_HOME;  // shadow shrinks to the board's as it returns
      });
      setTimeout(finishClose, 520);
    } catch (e) { finishClose(); }
  }

  function openCoverflow(taskId) {
    var acct = boardAcct || current;
    if (!acct) return;
    // The modal fallback edits your own card, so only use it when editable.
    if (typeof window.createCoverflow !== "function") { if (!boardReadOnly) openModal(taskId); return; }
    var doneTasks = TASKS.filter(function (t) { return acct.done && acct.done[t.id]; });
    if (!doneTasks.length) { if (!boardReadOnly) openModal(taskId); return; }
    var start = 0;
    for (var i = 0; i < doneTasks.length; i++) { if (doneTasks[i].id === taskId) { start = i; break; } }
    openCoverflowList(doneTasks, start, true);
  }

  // FLIP: fly every card from its board-cell position into the coverflow, then
  // let the dark backdrop fade in once the cards have settled.
  function playCoverflowIntro(dom, doneTasks) {
    try {
      var cards = dom.flow.querySelectorAll(".cf-card");
      if (!cards.length) { dom.overlay.classList.remove("cf-intro"); return; }
      cf.animating = true;
      dom.flow.style.overflow = "visible";                 // don't clip cards in transit
      var vp = dom.flow.getBoundingClientRect();
      var vcx = vp.left + vp.width / 2, vcy = vp.top + vp.height / 2;
      var data = [];
      Array.prototype.forEach.call(cards, function (card, i) {
        var finalT = card.style.transform;                 // coverflow's target
        var finalOp = card.style.opacity || "1";           // 0 for far/culled cards
        var t = doneTasks[i];
        var startT = cardBoardTransform(card, t.id, vcx, vcy);  // its board slot
        data.push({ card: card, finalT: finalT, finalOp: finalOp });
        card.style.transition = "none";
        card.style.transform = startT;
        card.style.opacity = "1";                          // visible while it flies
        card.style.filter = CF_SHADOW_HOME;                // small shadow at the board
      });
      dom.flow.getBoundingClientRect();                    // force the start frame
      requestAnimationFrame(function () {
        dom.overlay.classList.remove("cf-intro");          // backdrop fades AS they fly
        data.forEach(function (d) {
          d.card.style.transition = "transform 0.55s cubic-bezier(.2,.7,.25,1), opacity 0.55s ease, filter 0.55s ease";
          d.card.style.transform = d.finalT;
          d.card.style.opacity = d.finalOp;                // far cards fly out & fade
          d.card.style.filter = CF_SHADOW_FAR;             // shadow grows with distance
        });
        setTimeout(function () {
          data.forEach(function (d) { d.card.style.transition = "none"; });
          dom.flow.style.overflow = "";                    // clip again at rest
          cf.animating = false;                            // pinch may engage now
        }, 570);
      });
    } catch (e) {
      dom.overlay.classList.remove("cf-intro");
      dom.flow.style.overflow = "";
    }
  }

  function openCoverflowList(doneTasks, start, animate) {
    var dom = buildCoverflowDom();
    teardownCoverflow();
    cf.tasks = doneTasks;
    cf.current = start;
    // Replace / Remove / Share are owner-only — only when viewing your own card.
    if (dom.replaceBtn) dom.replaceBtn.style.display = boardReadOnly ? "none" : "";
    if (dom.removeBtn) dom.removeBtn.style.display = boardReadOnly ? "none" : "";
    if (dom.shareBtn) dom.shareBtn.style.display = boardReadOnly ? "none" : "";

    // Render each cell at its EXACT on-board size, then scale the whole thing
    // up uniformly — so every proportion (border, title, photo) matches the
    // board cell exactly, just larger.
    var refCell = el.grid.querySelector(".cell");
    var rw = refCell ? Math.round(refCell.getBoundingClientRect().width) : 110;
    var rh = refCell ? Math.round(refCell.getBoundingClientRect().height) : 150;
    if (rw < 20) { rw = 110; rh = 150; }
    var targetW = Math.min(window.innerWidth * 0.62, 250);
    var s = targetW / rw;

    activeSeed = seedOf(boardAcct || current);   // match the board's saved card look
    doneTasks.forEach(function (t) {
      var cell = buildDoneCell(t, cf.urls, null, boardAcct || current);
      cell.style.width = "100%";
      cell.style.height = "100%";
      // Fill the outline's interior with paper so nothing shows outside it.
      cell.style.backgroundImage = handDrawnBorder(ACCENTS[t.accent] || "#1f3a5f", "#efe6d0", cellSeed(t.id));

      // .cf-peek wraps the cell and carries the pinch transform (kept separate
      // from the holder's scale and the card's coverflow transform).
      var peek = document.createElement("div");
      peek.className = "cf-peek";
      peek.appendChild(cell);

      var holder = document.createElement("div");
      holder.className = "cf-holder";
      holder.style.width = rw + "px";
      holder.style.height = rh + "px";
      holder.style.transform = "scale(" + s.toFixed(4) + ")";
      holder.appendChild(peek);

      var card = document.createElement("div");
      card.style.width = Math.round(rw * s) + "px";
      card.style.height = Math.round(rh * s) + "px";
      card.appendChild(holder);
      dom.flow.appendChild(card);
    });

    // The board cells that fly into the coverflow disappear from the card
    // (visibility:hidden keeps their layout so we can measure/return to them).
    hideSources(doneTasks);

    dom.overlay.hidden = false;
    // The overlay itself clips at the viewport (overflow:hidden, no padding);
    // we deliberately DON'T touch document/body overflow — toggling it reflows
    // 100dvh on iOS and shifts the board (causing the snap/top-clip bugs).
    // While intro-ing, keep the dark chrome hidden so the board shows through.
    if (animate) dom.overlay.classList.add("cf-intro");
    else dom.overlay.classList.remove("cf-intro");

    requestAnimationFrame(function () {
      cf.instance = window.createCoverflow(dom.flow, {
        start: start,
        onChange: function (i) { cf.current = i; }
      });
      if (animate) playCoverflowIntro(dom, doneTasks);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (cfFull.open) { closeFullPhoto(true); return; }   // full viewer closes first
    if (cf.dom && !cf.dom.overlay.hidden) closeCoverflow();
  });

  /* ------------------------------------------------------------------ */
  /* Confetti                                                           */
  /* ------------------------------------------------------------------ */
  function confetti() {
    var colors = ["#e8543f", "#f2a03d", "#f4c542", "#6fae4a", "#2fa3a0", "#1f3a5f"];
    for (var i = 0; i < 80; i++) {
      (function () {
        var p = document.createElement("div");
        p.className = "confetti-piece";
        p.style.left = Math.random() * 100 + "vw";
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDuration = (2 + Math.random() * 2) + "s";
        p.style.animationDelay = (Math.random() * 0.6) + "s";
        p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
        document.body.appendChild(p);
        setTimeout(function () { p.remove(); }, 4600);
      })();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Login (name + secret code) — cloud when available, else local       */
  /* ------------------------------------------------------------------ */
  function setLoginBusy(busy) {
    if (!el.loginBtn) return;
    el.loginBtn.disabled = !!busy;
    el.loginBtn.textContent = busy ? "Entering…" : "Enter";
  }
  function rememberSession(acct, code) {
    try {
      localStorage.setItem(LS_CURRENT, JSON.stringify({ id: acct.id, name: acct.name, code: code || "" }));
    } catch (e) {}
  }
  function forgetSession() { try { localStorage.removeItem(LS_CURRENT); } catch (e) {} }

  function finishLogin(acct, pass) {
    current = acct;
    putAccount(acct);
    rememberSession(acct, pass);
    setLoginBusy(false);
    if (el.loginHint) el.loginHint.textContent = "";
    if (el.familyPass) el.familyPass.value = "";
    if (el.familyPass2) el.familyPass2.value = "";
    renderBoard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // A brand-new family must type its password twice (guards against typos that
  // would lock them out); returning families don't need the confirm field.
  function requireConfirm(pass, confirm) {
    if (!confirm || confirm !== pass) throw { kind: "mismatch" };
  }

  // Resolve the account for name+password: sign in (existing) or create (new —
  // needs confirm). Returns Promise<acct>. signInOnly=true (silent resume)
  // refuses to create a missing account.
  function resolveAccount(name, pass, confirm, signInOnly) {
    var id = Cloud.docId(name);
    if (Cloud.enabled) {
      return Cloud.getPlayer(name).then(function (player) {
        if (player) {
          if (player.password && player.password !== pass) throw { kind: "badcode" };
          return {
            id: id, name: player.name || name, nameKey: player.nameKey || Cloud.nameKey(name),
            password: player.password || pass, done: player.done || {},
            photos: {}, preferences: player.preferences || {},
            seed: player.seed || id, createdAt: player.createdAt || Date.now()
          };
        }
        if (signInOnly) throw { kind: "notfound" };
        requireConfirm(pass, confirm);
        var acct = {
          id: id, name: name, nameKey: Cloud.nameKey(name), password: pass,
          done: {}, photos: {}, preferences: {}, seed: genSeed(), createdAt: Date.now()
        };
        return Cloud.savePlayer(acct).then(function () { acct._new = true; return acct; });
      }).catch(function (e) {
        if (e && (e.kind === "badcode" || e.kind === "mismatch" || e.kind === "notfound")) throw e;
        var la = getAccount(id);           // offline / cloud error → cached card
        if (la && (!la.password || la.password === pass)) { la._offline = true; return la; }
        throw e;
      });
    }
    // LOCAL-only mode
    var existing = getAccount(id);
    if (existing) {
      if (existing.password && existing.password !== pass) throw { kind: "badcode" };
      existing.local = true;
      return Promise.resolve(existing);
    }
    if (signInOnly) throw { kind: "notfound" };
    requireConfirm(pass, confirm);
    var na = {
      id: id, name: name, nameKey: Cloud.nameKey(name), password: pass,
      done: {}, photos: {}, preferences: {}, seed: genSeed(), createdAt: Date.now(), local: true
    };
    putAccount(na); na._new = true;
    return Promise.resolve(na);
  }

  function enterAccount(name, pass, confirm) {
    name = (name || "").trim();
    if (!name) return;
    setLoginBusy(true);
    Cloud.ready
      .then(function () { return resolveAccount(name, pass, confirm, false); })
      .then(function (acct) {
        if (acct._new) showToast("Bingo card created for " + name + "!");
        else if (acct._offline) showToast("Offline — showing your saved card. It'll sync when back online.");
        finishLogin(acct, pass);
      })
      .catch(function (err) {
        setLoginBusy(false);
        var kind = err && err.kind;
        if (el.loginHint) {
          el.loginHint.textContent =
            kind === "badcode" ? "That name is taken and the password doesn't match. Try again, or pick a different name."
            : kind === "mismatch" ? "New family? Please type the same password in both boxes to confirm."
            : "Couldn't reach the cloud right now. Check your connection and try again.";
        }
      });
  }

  // Re-establish `current` from the saved session WITHOUT navigating (the Ward
  // View stays on screen). Never creates an account.
  function silentResume() {
    var sess = null;
    try { sess = JSON.parse(localStorage.getItem(LS_CURRENT) || "null"); } catch (e) {}
    if (!sess || !sess.name) return Promise.resolve();
    return Cloud.ready
      .then(function () { return resolveAccount(sess.name, sess.code || "", "", true); })
      .then(function (acct) { current = acct; putAccount(acct); })
      .catch(function () { /* ignore on boot */ });
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                             */
  /* ------------------------------------------------------------------ */
  el.newCardForm.addEventListener("submit", function (e) {
    e.preventDefault();
    enterAccount(
      el.familyName.value,
      el.familyPass ? el.familyPass.value : "",
      el.familyPass2 ? el.familyPass2.value : ""
    );
  });

  // Give a button the app's hand-drawn crayon-pill look, in an accent colour.
  function styleHD(btn, color, dark) {
    if (!btn) return;
    btn.classList.add("hd-btn");
    if (dark) btn.classList.add("hd-dark");
    btn.style.backgroundColor = "transparent";
    btn.style.backgroundImage = handDrawnButton(color, ((btn.id || btn.className || "hd") + "|" + color));
  }
  function applyHandDrawnButtons() {
    styleHD(el.wardJoin, "#e8543f");
    styleHD(el.loginBtn, "#e8543f");
    styleHD(el.boardShare, "#2fa3a0");
    styleHD(el.boardBack, "#f2a03d", true);
    styleHD(el.shareBtn, "#e8543f");
    styleHD(el.modalRemove, "#c94a37");
    styleHD(document.querySelector('label[for="modalFile"]'), "#e8543f");
    styleHD(document.querySelector('#share .btn-ghost'), "#6fae4a");   // Done
  }
  applyHandDrawnButtons();

  if (el.wardJoin) el.wardJoin.addEventListener("click", openJoin);
  if (el.boardBack) el.boardBack.addEventListener("click", renderWard);
  if (el.boardShare) el.boardShare.addEventListener("click", shareWholeCard);
  if (el.shareBtn) el.shareBtn.addEventListener("click", doShare);
  Array.prototype.forEach.call(document.querySelectorAll("[data-share-close]"), function (n) {
    n.addEventListener("click", closeShare);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && el.share && !el.share.hidden) closeShare();
  });
  if (/[?&]debug/i.test(location.search)) {
    window.__kwfb = {
      featured: composeFeaturedImage, card: composeCardImage, loadImage: loadImage,
      featurePhoto: featurePhoto, shareWholeCard: shareWholeCard,
      frameCardShot: frameCardShot, wornEdgeCanvas: wornEdgeCanvas, drawTape: drawTape
    };
  }
  if (el.signOutBtn) el.signOutBtn.addEventListener("click", function () {
    forgetSession(); current = null; closeJoin(); renderWard();
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-join-close]"), function (n) {
    n.addEventListener("click", closeJoin);
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-wd-close]"), function (n) {
    n.addEventListener("click", closeWardDetail);
  });

  // "Switch" on the board → back to the Ward wall (you stay signed in; use
  // "Sign out" in the Join modal to fully log out).
  function switchCard() {
    renderWard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  el.switchBtn.addEventListener("click", switchCard);
  if (el.cardSwitch) el.cardSwitch.addEventListener("click", switchCard);

  el.modalFile.addEventListener("change", function (e) {
    handleFile(e.target.files && e.target.files[0]);
  });
  el.modalRemove.addEventListener("click", removePhoto);

  Array.prototype.forEach.call(el.modal.querySelectorAll("[data-close]"), function (node) {
    node.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!el.modal.hidden) { closeModal(); return; }
    if (el.wardDetail && !el.wardDetail.hidden) { closeWardDetail(); return; }
    if (el.welcome && !el.welcome.hidden) { closeJoin(); return; }
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  function boot() {
    if (!("indexedDB" in window)) {
      showToast("This browser can't store photos. Try a modern browser.");
    }
    renderWard();                    // Ward View is the default landing screen
    silentResume().then(function () {
      if (current) renderWard();     // re-render so your card shows the "You" badge
    });
  }

  boot();
})();
