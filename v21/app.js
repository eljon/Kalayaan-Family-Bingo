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
  var ICON_BASE = "assets/stickers/";

  // Accent colour per cell (matches the CSS data-accent palette).
  var ACCENTS = {
    red: "#e8543f", orange: "#f2a03d", green: "#6fae4a",
    teal: "#2fa3a0", navy: "#1f3a5f", purple: "#8f6fb0"
  };

  // A wobbly, hand-drawn rounded-rectangle outline as an SVG data URI.
  // Regenerated (randomised) for every cell on every load, so no two boxes —
  // and no two page loads — are outlined the same way.
  function handDrawnBorder(color) {
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
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<path d="' + build(2.4) + '" fill="none" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="0.95"/>' +
      '<path d="' + build(3.2) + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="0.45"/>' +
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
    var titles = el.grid.querySelectorAll(".cell-title");
    for (var i = 0; i < titles.length; i++) {
      var t = titles[i];
      t.style.fontSize = "";                 // reset to the CSS-driven size
      var size = parseFloat(getComputedStyle(t).fontSize) || 12;
      var guard = 0;
      while (t.scrollHeight > t.clientHeight + 1 && size > 6.5 && guard < 40) {
        size -= 0.5;
        t.style.fontSize = size + "px";
        guard++;
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
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return _dbPromise;
  }

  function idbSet(key, value) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbDelete(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
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
  /* ------------------------------------------------------------------ */
  function compressImage(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Could not process image"));
        }, "image/jpeg", quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Invalid image")); };
      img.src = url;
    });
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
      var cell = document.createElement("button");
      cell.className = "cell" + (done ? " done" : "");
      cell.type = "button";
      cell.setAttribute("role", "listitem");
      cell.setAttribute("data-accent", task.accent);
      cell.setAttribute("aria-label", task.title + (done ? " — completed" : " — tap to add a photo"));
      cell.style.backgroundImage = handDrawnBorder(ACCENTS[task.accent] || "#1f3a5f");

      // Icon area: the poster illustration, or the photo thumbnail once done
      var iconWrap = document.createElement("div");
      iconWrap.className = "cell-icon";

      var ill = document.createElement("img");
      ill.className = "cell-ill";
      ill.src = ICON_BASE + task.id + ".png";
      ill.alt = "";
      ill.loading = "lazy";
      ill.decoding = "async";

      var thumb = document.createElement("img");
      thumb.className = "cell-thumb";
      thumb.alt = "";

      iconWrap.appendChild(ill);
      iconWrap.appendChild(thumb);

      var title = document.createElement("span");
      title.className = "cell-title";
      title.textContent = task.title;

      cell.appendChild(iconWrap);
      cell.appendChild(title);

      if (task.sub) {
        var sub = document.createElement("span");
        sub.className = "cell-sub";
        sub.textContent = task.sub;
        cell.appendChild(sub);
      }

      // Poster-style tick box (fills in when the activity is complete)
      var box = document.createElement("span");
      box.className = "cell-box";
      box.setAttribute("aria-hidden", "true");
      cell.appendChild(box);

      cell.addEventListener("click", function () { openModal(task.id); });
      el.grid.appendChild(cell);

      if (done) {
        idbGet(photoKey(current.id, task.id)).then(function (blob) {
          if (blob) {
            var u = URL.createObjectURL(blob);
            objectUrls.push(u);
            thumb.src = u;
          }
        });
      }
    });

    updateProgress();
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
      showToast("Sorry, that image could not be added.");
    });
  }

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
