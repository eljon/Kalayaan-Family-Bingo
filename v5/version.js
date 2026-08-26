/* Version badge + switcher for Kalayaan Ward Family Bingo.
 *
 * How versioning works on GitHub Pages (static hosting):
 *   /            -> always the LATEST release
 *   /v1/, /v2/…  -> frozen snapshots of each release
 * Typing a slug like  /v1  reverts to that version (Pages serves /v1/).
 *
 * This file is self-contained (it injects its own CSS) so it can be dropped
 * into any snapshot folder without touching that snapshot's styles.
 * Each page sets `window.APP_VERSION` before loading this script.
 */
(function () {
  "use strict";

  // Ordered oldest -> newest. Update when a new /vN/ snapshot is released.
  var VERSIONS = ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"];
  var LATEST = "v8";

  var current = window.APP_VERSION || LATEST;

  // Are we inside a /vN/ folder, or at the site root (latest)?
  var path = location.pathname.replace(/index\.html$/, "");
  var inVersionDir = /\/v\d+\/$/.test(path) || /\/v\d+$/.test(path);
  var prefix = inVersionDir ? "../" : "./";
  function hrefFor(v) { return prefix + v + "/"; }
  var latestHref = prefix; // root of the deployment = latest
  var viewingOld = current !== LATEST;

  // ---- styles -------------------------------------------------------------
  var css = "" +
    ".version-badge{position:fixed;left:12px;bottom:12px;z-index:70;" +
      "font-family:'Nunito',system-ui,sans-serif;}" +
    ".vb-toggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;" +
      "border:none;border-radius:999px;padding:7px 13px;font-weight:800;" +
      "font-size:13px;color:#fff;background:#1f3a5f;" +
      "box-shadow:0 4px 14px rgba(31,58,95,.28);}" +
    ".vb-toggle.old{background:#f2a03d;color:#3a2a10;}" +
    ".vb-dot{width:8px;height:8px;border-radius:50%;background:#6fae4a;}" +
    ".vb-toggle.old .vb-dot{background:#c33f2c;}" +
    ".version-menu{position:absolute;left:0;bottom:44px;min-width:190px;" +
      "background:#fff;border:1px solid #e7dcc6;border-radius:14px;padding:8px;" +
      "box-shadow:0 12px 32px rgba(31,58,95,.22);display:none;}" +
    ".version-menu.open{display:block;}" +
    ".vm-head{font-size:11px;font-weight:800;letter-spacing:.5px;" +
      "text-transform:uppercase;color:#9b8f78;padding:4px 8px 6px;}" +
    ".vm-item{display:flex;align-items:center;justify-content:space-between;" +
      "gap:8px;text-decoration:none;color:#1f3a5f;font-weight:700;font-size:14px;" +
      "padding:9px 10px;border-radius:9px;}" +
    ".vm-item:hover{background:#fbeed7;}" +
    ".vm-item.current{background:#eef6e7;}" +
    ".vm-item .tag{font-size:11px;font-weight:800;color:#6fae4a;}" +
    ".vm-item.latest .tag{color:#2fa3a0;}" +
    ".vm-check{color:#6fae4a;font-weight:900;}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ---- badge --------------------------------------------------------------
  var wrap = document.createElement("div");
  wrap.className = "version-badge";

  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "vb-toggle" + (viewingOld ? " old" : "");
  toggle.setAttribute("aria-haspopup", "true");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<span class="vb-dot"></span>' + current +
    (viewingOld ? " · old" : "");
  toggle.title = viewingOld
    ? "You are viewing an older version. Tap to switch."
    : "App version " + current + ". Tap to view or revert versions.";

  var menu = document.createElement("div");
  menu.className = "version-menu";
  menu.setAttribute("role", "menu");

  var head = document.createElement("div");
  head.className = "vm-head";
  head.textContent = "Version";
  menu.appendChild(head);

  // Latest shortcut
  var latest = document.createElement("a");
  latest.className = "vm-item latest" + (!viewingOld ? " current" : "");
  latest.href = latestHref;
  latest.setAttribute("role", "menuitem");
  latest.innerHTML = "<span>Latest (" + LATEST + ")</span>" +
    (!viewingOld ? '<span class="vm-check">✓</span>' : '<span class="tag">newest</span>');
  menu.appendChild(latest);

  // Each frozen version
  VERSIONS.slice().reverse().forEach(function (v) {
    if (v === LATEST) return; // already shown as "Latest"
    var a = document.createElement("a");
    var isCur = v === current;
    a.className = "vm-item" + (isCur ? " current" : "");
    a.href = hrefFor(v);
    a.setAttribute("role", "menuitem");
    a.innerHTML = "<span>" + v + "</span>" +
      (isCur ? '<span class="vm-check">✓</span>' : '<span class="tag">revert</span>');
    menu.appendChild(a);
  });

  function setOpen(open) {
    menu.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(!menu.classList.contains("open"));
  });
  document.addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });

  wrap.appendChild(menu);
  wrap.appendChild(toggle);

  function mount() { document.body.appendChild(wrap); }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
