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
  function handDrawnButton(color) {
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
        var jx = pts[i][0] + (Math.random() - 0.5) * jit;
        var jy = pts[i][1] + (Math.random() - 0.5) * jit;
        d += (i === 0 ? "M" : "L") + jx.toFixed(1) + " " + jy.toFixed(1) + " ";
      }
      return d + "Z";
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
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
  function handDrawnBorder(color, fill) {
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
        var jx = pts[i][0] + (Math.random() - 0.5) * jit;
        var jy = pts[i][1] + (Math.random() - 0.5) * jit;
        d += (i === 0 ? "M" : "L") + jx.toFixed(1) + " " + jy.toFixed(1) + " ";
      }
      return d + "Z";
    }
    // The main path can be FILLED (e.g. paper colour) so the interior is
    // bounded exactly by the outline — nothing shows outside the boundary.
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<path d="' + build(2.4) + '" fill="' + (fill || 'none') + '" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke-opacity="0.95"/>' +
      '<path d="' + build(3.2) + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke-opacity="0.45"/>' +
      '</svg>';
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

  function applyWornEdge() {
    var paper = document.querySelector(".card-paper");
    if (!paper) return;
    var W = 660, H = 840;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var g = cv.getContext ? cv.getContext("2d") : null;
    if (!g) return;
    function rnd(a, b) { return a + Math.random() * (b - a); }

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

    var pad = 16, base = 0.5, amp = 2.2; // amp = barely-there warp; mostly flat
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
      if (Math.random() < 0.26) {
        g.beginPath(); g.arc(op[i][0], op[i][1], rnd(0.5, 2.1), 0, Math.PI * 2); g.fill();
      }
    }
    var chips = Math.round(rnd(8, 14));
    for (var c = 0; c < chips; c++) {
      var k = Math.floor(rnd(0, op.length));
      g.beginPath(); g.arc(op[k][0], op[k][1], rnd(2, 5), 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = "source-over";

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
  /* Accounts (card metadata) in localStorage                           */
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
  function createAccount(name) {
    var list = loadAccounts();
    var id = "fam-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4).toString(36);
    var acct = { id: id, name: name, created: Date.now(), done: {} };
    list.push(acct);
    saveAccounts(list);
    return acct;
  }
  function updateAccount(acct) {
    var list = loadAccounts().map(function (a) { return a.id === acct.id ? acct : a; });
    saveAccounts(list);
  }
  function deleteAccount(id) {
    saveAccounts(loadAccounts().filter(function (a) { return a.id !== id; }));
    TASKS.forEach(function (t) { idbDelete(photoKey(id, t.id)); });
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
    cardSwitch: document.getElementById("cardSwitch"),
    welcome: document.getElementById("welcome"),
    existingCards: document.getElementById("existingCards"),
    cardList: document.getElementById("cardList"),
    newCardForm: document.getElementById("newCardForm"),
    familyName: document.getElementById("familyName"),
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

  function renderWelcome() {
    revokeUrls();
    current = null;
    document.body.classList.remove("board-active");
    el.accountBar.hidden = true;
    el.board.hidden = true;
    el.welcome.hidden = false;

    var accounts = loadAccounts();
    if (accounts.length) {
      el.existingCards.hidden = false;
      el.cardList.innerHTML = "";
      accounts.slice().reverse().forEach(function (a) {
        var doneCount = Object.keys(a.done || {}).length;
        var li = document.createElement("li");

        var open = document.createElement("button");
        open.className = "card-open";
        open.type = "button";
        open.textContent = a.name;
        open.addEventListener("click", function () { openAccount(a.id); });

        var meta = document.createElement("span");
        meta.className = "card-meta";
        meta.textContent = doneCount + "/" + TASKS.length;

        var del = document.createElement("button");
        del.className = "card-del";
        del.type = "button";
        del.setAttribute("aria-label", "Delete " + a.name);
        del.innerHTML = "🗑";
        del.addEventListener("click", function () {
          if (confirm("Delete the Bingo card for \"" + a.name + "\"? This removes its photos too.")) {
            deleteAccount(a.id);
            renderWelcome();
          }
        });

        li.appendChild(open);
        li.appendChild(meta);
        li.appendChild(del);
        el.cardList.appendChild(li);
      });
    } else {
      el.existingCards.hidden = true;
    }
  }

  function renderBoard() {
    revokeUrls();
    el.welcome.hidden = true;
    el.accountBar.hidden = false;
    el.board.hidden = false;
    document.body.classList.add("board-active");
    el.accountName.textContent = current.name;
    if (el.cardName) {
      var nm = (current.name || "").trim();
      el.cardName.textContent = /family\s*$/i.test(nm) ? nm : (nm + " Family");
    }
    applyWornEdge();
    scheduleFit();

    el.grid.innerHTML = "";
    TASKS.forEach(function (task) {
      var done = !!(current.done && current.done[task.id]);
      if (done) {
        el.grid.appendChild(buildDoneCell(task, objectUrls,
          function () { openCoverflow(task.id); }));
      } else {
        el.grid.appendChild(buildTodoCell(task));
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
    cell.style.backgroundImage = handDrawnBorder(ACCENTS[task.accent] || "#1f3a5f");
    return cell;
  }

  // A completed cell EXACTLY as it appears on the board: accent border,
  // small title on top, and the photo as a Polaroid. Reused by the coverflow
  // so each slide is the real bingo item with every element present.
  function buildDoneCell(task, urls, onPhotoClick) {
    var cell = makeCellShell(task, true);

    var title = document.createElement("span");
    title.className = "cell-title";
    title.textContent = task.title;
    cell.appendChild(title);

    var photoBtn = document.createElement("button");
    photoBtn.type = "button";
    photoBtn.className = "cell-photo-btn";
    photoBtn.setAttribute("aria-label", task.title + " — photo added");
    photoBtn.style.setProperty("--tilt", (Math.random() * 6 - 3).toFixed(2) + "deg");

    var pimg = document.createElement("img");
    pimg.className = "cell-photo";
    pimg.alt = task.title;
    photoBtn.appendChild(pimg);
    if (onPhotoClick) photoBtn.addEventListener("click", onPhotoClick);
    cell.appendChild(photoBtn);

    idbGet(photoKey(current.id, task.id)).then(function (blob) {
      if (blob) {
        var u = URL.createObjectURL(blob);
        (urls || objectUrls).push(u);
        pimg.src = u;
      }
    });
    return cell;
  }

  // A not-yet-done cell: poster sticker, title, and the "Add Photo" button.
  function buildTodoCell(task) {
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

    var cam = document.createElement("button");
    cam.className = "cell-cam";
    cam.type = "button";
    cam.style.backgroundImage = handDrawnButton(ACCENTS[task.accent] || "#1f3a5f");
    cam.innerHTML = CAM_ICON + '<span class="cam-tx">Add Photo</span>';
    cam.setAttribute("aria-label", task.title + " — add a photo");
    cam.addEventListener("click", function () { openPicker(task.id); });
    cell.appendChild(cam);
    return cell;
  }

  function updateProgress() {
    var doneCount = Object.keys(current.done || {}).length;
    var total = TASKS.length;
    var pct = Math.round((doneCount / total) * 100);
    el.progressText.textContent = doneCount + " of " + total + " complete";
    el.progressPct.textContent = pct + "%";
    el.progressBar.style.width = pct + "%";
    el.celebrate.hidden = doneCount < total;
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
      idbGet(photoKey(current.id, taskId)).then(function (blob) {
        if (blob && activeTaskId === taskId) {
          var u = URL.createObjectURL(blob);
          objectUrls.push(u);
          el.modalPhoto.src = u;
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
      return idbSet(photoKey(current.id, taskId), blob).then(function () { return blob; });
    }).then(function (blob) {
      current.done = current.done || {};
      current.done[taskId] = Date.now();
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

    showToast("Adding photo…");
    compressImage(file, 1280, 0.82).then(function (blob) {
      return idbSet(photoKey(current.id, taskId), blob);
    }).then(function () {
      current.done = current.done || {};
      current.done[taskId] = Date.now();
      updateAccount(current);
      renderBoard();
      showToast("Activity complete! 🎉");
      if (Object.keys(current.done).length === TASKS.length) setTimeout(confetti, 200);
    }).catch(function () {
      showToast("Couldn't save the photo — your browser may be blocking storage (try turning off Private Browsing).");
    });
  });

  function removePhoto() {
    if (!activeTaskId) return;
    var taskId = activeTaskId;
    idbDelete(photoKey(current.id, taskId)).then(function () {
      if (current.done) delete current.done[taskId];
      updateAccount(current);
      renderBoard();
      closeModal();
      showToast("Photo removed.");
    });
  }

  function removePhotoFor(taskId) {
    return idbDelete(photoKey(current.id, taskId)).then(function () {
      if (current.done) delete current.done[taskId];
      updateAccount(current);
      renderBoard();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Coverflow gallery — tap an uploaded photo to flip through them all  */
  /* ------------------------------------------------------------------ */
  var cf = { instance: null, urls: [], tasks: [], current: 0, dom: null };

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
    bar.appendChild(replace);
    bar.appendChild(remove);

    overlay.appendChild(backdrop);
    overlay.appendChild(close);
    overlay.appendChild(flow);
    overlay.appendChild(bar);
    document.body.appendChild(overlay);

    cf.dom = { overlay: overlay, flow: flow };
    return cf.dom;
  }

  function teardownCoverflow() {
    if (cf.instance) { try { cf.instance.destroy(); } catch (e) {} cf.instance = null; }
    cf.urls.forEach(function (u) { URL.revokeObjectURL(u); });
    cf.urls = [];
    cf.tasks = [];
    if (cf.dom) cf.dom.flow.innerHTML = "";
  }

  function closeCoverflow() {
    teardownCoverflow();
    if (cf.dom) { cf.dom.overlay.hidden = true; cf.dom.overlay.classList.remove("cf-intro"); }
    document.body.style.overflow = "";
  }

  function openCoverflow(taskId) {
    if (!current) return;
    if (typeof window.createCoverflow !== "function") { openModal(taskId); return; }
    var doneTasks = TASKS.filter(function (t) { return current.done && current.done[t.id]; });
    if (!doneTasks.length) { openModal(taskId); return; }
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
      var vp = dom.flow.getBoundingClientRect();
      var vcx = vp.left + vp.width / 2, vcy = vp.top + vp.height / 2;
      var data = [];
      Array.prototype.forEach.call(cards, function (card, i) {
        var finalT = card.style.transform;                 // coverflow's target
        var r = card.getBoundingClientRect();              // its settled box
        var t = doneTasks[i];
        var src = el.grid.querySelector('.cell[data-task="' + t.id + '"]');
        var br = src ? src.getBoundingClientRect() : r;
        var dx = (br.left + br.width / 2) - vcx;
        var dy = (br.top + br.height / 2) - vcy;
        var sc = r.width ? (br.width / r.width) : 0.3;
        var startT = "translate(-50%,-50%) translateX(" + dx.toFixed(1) + "px) translateY(" +
          dy.toFixed(1) + "px) scale(" + sc.toFixed(4) + ")";
        data.push({ card: card, finalT: finalT });
        card.style.transition = "none";
        card.style.transform = startT;
      });
      dom.flow.getBoundingClientRect();                    // force the start frame
      requestAnimationFrame(function () {
        data.forEach(function (d) {
          d.card.style.transition = "transform 0.55s cubic-bezier(.2,.7,.25,1)";
          d.card.style.transform = d.finalT;
        });
        setTimeout(function () {
          data.forEach(function (d) { d.card.style.transition = "none"; });
          dom.overlay.classList.remove("cf-intro");        // now fade the backdrop in
        }, 570);
      });
    } catch (e) {
      dom.overlay.classList.remove("cf-intro");
    }
  }

  function openCoverflowList(doneTasks, start, animate) {
    var dom = buildCoverflowDom();
    teardownCoverflow();
    cf.tasks = doneTasks;
    cf.current = start;

    // Render each cell at its EXACT on-board size, then scale the whole thing
    // up uniformly — so every proportion (border, title, photo) matches the
    // board cell exactly, just larger.
    var refCell = el.grid.querySelector(".cell");
    var rw = refCell ? Math.round(refCell.getBoundingClientRect().width) : 110;
    var rh = refCell ? Math.round(refCell.getBoundingClientRect().height) : 150;
    if (rw < 20) { rw = 110; rh = 150; }
    var targetW = Math.min(window.innerWidth * 0.62, 250);
    var s = targetW / rw;

    doneTasks.forEach(function (t) {
      var cell = buildDoneCell(t, cf.urls, null);
      cell.style.width = "100%";
      cell.style.height = "100%";
      // Fill the outline's interior with paper so nothing shows outside it.
      cell.style.backgroundImage = handDrawnBorder(ACCENTS[t.accent] || "#1f3a5f", "#efe6d0");

      var holder = document.createElement("div");
      holder.className = "cf-holder";
      holder.style.width = rw + "px";
      holder.style.height = rh + "px";
      holder.style.transform = "scale(" + s.toFixed(4) + ")";
      holder.appendChild(cell);

      var card = document.createElement("div");
      card.style.width = Math.round(rw * s) + "px";
      card.style.height = Math.round(rh * s) + "px";
      card.appendChild(holder);
      dom.flow.appendChild(card);
    });

    dom.overlay.hidden = false;
    document.body.style.overflow = "hidden";
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
    if (e.key === "Escape" && cf.dom && !cf.dom.overlay.hidden) closeCoverflow();
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
  /* Navigation                                                         */
  /* ------------------------------------------------------------------ */
  function openAccount(id) {
    var acct = getAccount(id);
    if (!acct) { renderWelcome(); return; }
    current = acct;
    try { localStorage.setItem(LS_CURRENT, id); } catch (e) {}
    renderBoard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                             */
  /* ------------------------------------------------------------------ */
  el.newCardForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = el.familyName.value.trim();
    if (!name) return;
    var acct = createAccount(name);
    el.familyName.value = "";
    openAccount(acct.id);
    showToast("Bingo card created for " + name + "!");
  });

  function switchCard() {
    try { localStorage.removeItem(LS_CURRENT); } catch (e) {}
    renderWelcome();
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
    if (e.key === "Escape" && !el.modal.hidden) closeModal();
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  function boot() {
    if (!("indexedDB" in window)) {
      showToast("This browser can't store photos. Try a modern browser.");
    }
    var lastId = null;
    try { lastId = localStorage.getItem(LS_CURRENT); } catch (e) {}
    if (lastId && getAccount(lastId)) {
      openAccount(lastId);
    } else {
      renderWelcome();
    }
  }

  boot();
})();
