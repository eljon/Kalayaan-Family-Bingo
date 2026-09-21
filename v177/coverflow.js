/*
 * coverflow.js — a dependency-free 3D coverflow / cover-flow carousel.
 * Vanilla JS, pointer events (touch + mouse), ~200 lines, no build step.
 *
 *   import { createCoverflow } from './coverflow.js';
 *   const cf = createCoverflow(document.querySelector('#flow'), {
 *     onChange: (i) => console.log('centered', i),
 *   });
 *   cf.goTo(3); cf.next(); cf.prev();
 *
 * The element you pass becomes the 3D viewport; its direct children become the
 * cards (give them a fixed width/height in CSS). Everything is driven by ONE
 * continuous float `position` (in card units); layout is a pure function of it.
 *
 * See coverflow.css for the required styles and README.md for the full guide.
 * MIT — do whatever you like with it.
 */

export function createCoverflow(root, options = {}) {
  const opt = {
    spacingFactor: 0.42, // gap between neighbours, as a fraction of viewport width (capped at maxSpacing)
    maxSpacing: 180,     // px cap on that gap
    maxTilt: 58,         // rotateY of a fully off-centre card, degrees
    minScale: 0.62,      // scale of a far card (centre is 1.0)
    depth: 130,          // translateZ per card of distance (real 3D stacking, not z-index)
    ease: 0.28,          // fraction of the remaining gap the settle closes per frame
    cullBeyond: 2.6,     // cards more than this many slots out are hidden + non-interactive
    flickReach: 5,       // how far a hard flick throws (× release velocity)
    flickMax: 2,         // …but never more than this many cards past where you released
    maxOver: 0.55,       // rubber-band: most cards you can drag past an end
    start: 0,            // initial centred index
    onChange: () => {},  // (index) => void, when the centred card changes
    ...options,
  };

  // --- build the 3D scaffold: viewport (perspective) > track (preserve-3d) > cards
  const cards = [...root.children];
  const track = document.createElement('div');
  track.className = 'cf-track';
  cards.forEach((c) => { c.classList.add('cf-card'); track.appendChild(c); });
  root.classList.add('cf-viewport');
  root.appendChild(track);

  const clamp = (p) => Math.max(0, Math.min(cards.length - 1, p));
  const spacing = () => Math.min(opt.maxSpacing, (root.clientWidth || 320) * opt.spacingFactor);
  // Rubber-band resistance: the further past an end, the less it gives.
  const rubber = (over) => over / (1 + over / opt.maxOver);

  let position = clamp(opt.start); // the continuous camera position, in card units
  let index = -1;                  // the settled centre index (drives onChange)
  let target = position;           // where the glide is easing to
  let bounceBack = null;           // set during an end-of-list bounce
  let raf = null;

  /** Turn `position` into a transform on every card. The whole look lives here. */
  function layout() {
    const gap = spacing();
    cards.forEach((card, i) => {
      const offset = i - position;
      const abs = Math.abs(offset);
      // first neighbour sits a full step out; the rest compress into a stack
      const mag = Math.min(abs, 1) * gap + Math.max(0, abs - 1) * gap * 0.34;
      const x = Math.sign(offset) * mag;
      const ry = Math.max(-opt.maxTilt, Math.min(opt.maxTilt, -offset * 50));
      const scale = Math.max(opt.minScale, 1 - abs * 0.10);
      const z = -abs * opt.depth; // real depth: nearer cards sit forward, no z-index pop
      // translate(-50%,-50%) centres each card on the viewport, then the fan is
      // applied. For a "cards resting on a shelf / reflection" look, use
      // translate(-50%,-100%) here + `top:68%` and `transform-origin:50% 100%` in CSS.
      card.style.transform =
        `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg) scale(${scale})`;
      const hidden = abs > opt.cullBeyond;
      card.style.opacity = hidden ? '0' : '1';
      card.style.pointerEvents = hidden ? 'none' : 'auto';
    });
  }

  function setCurrent(i) {
    const c = clamp(Math.round(i));
    if (c === index) return;
    index = c;
    opt.onChange(index);
  }

  // --- settle animation: exponential ease toward `target`, with an optional
  //     deliberate overshoot-and-spring at the ends (bounceBack).
  function step() {
    position += (target - position) * opt.ease;
    setCurrent(Math.round(position));
    layout();
    if (Math.abs(target - position) < 0.003) {
      position = target;
      if (bounceBack !== null) { target = bounceBack; bounceBack = null; raf = requestAnimationFrame(step); return; }
      setCurrent(position);
      layout();
      raf = null;
      return;
    }
    raf = requestAnimationFrame(step);
  }
  function glideTo(i) { bounceBack = null; target = clamp(Math.round(i)); if (raf == null) raf = requestAnimationFrame(step); }
  function bounceEdge(edge) { bounceBack = edge; target = edge + (edge === 0 ? -0.3 : 0.3); if (raf == null) raf = requestAnimationFrame(step); }
  function stopGlide() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

  /** Which visible card's box is under a point (nearest-centre wins on overlap),
   *  or -1. Geometric, NOT event.target — the 3D stack + pointer capture make the
   *  DOM target unreliable. */
  function cardAt(px, py) {
    let best = -1, bestDist = Infinity;
    cards.forEach((card, i) => {
      if (card.style.opacity === '0') return;
      const r = card.getBoundingClientRect();
      if (px < r.left || px > r.right || py < r.top || py > r.bottom) return;
      const d = Math.abs(px - (r.left + r.right) / 2);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  // --- gestures (one-finger browse; unified touch + mouse via pointer events)
  const pointers = new Map();
  let swipeId = null, dragging = false, startX = 0, startPos = 0, moved = 0, lastT = 0, vel = 0;

  function onDown(e) {
    if (!cards.length) return;
    // Engage only on a visible card, so touching the margins scrolls the page.
    if (pointers.size === 0 && cardAt(e.clientX, e.clientY) < 0) return;
    pointers.set(e.pointerId, e);
    try { root.setPointerCapture(e.pointerId); } catch { /* fine */ }
    swipeId = e.pointerId;
    dragging = true;
    startX = e.clientX;
    startPos = position;
    moved = 0;
    lastT = e.timeStamp;
    vel = 0;
    stopGlide();
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);
    if (!dragging || e.pointerId !== swipeId) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    const raw = startPos - dx / spacing();          // drag one card-width → move one card
    const max = cards.length - 1;
    const next = raw < 0 ? -rubber(-raw) : raw > max ? max + rubber(raw - max) : raw;
    const dt = Math.max(1, e.timeStamp - lastT);
    vel = 0.7 * ((next - position) / dt) + 0.3 * vel; // smoothed, so a flick reads clean
    position = next;
    lastT = e.timeStamp;
    setCurrent(Math.round(position));
    layout();
  }

  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (!dragging || e.pointerId !== swipeId) return;
    dragging = false; swipeId = null;

    const idle = e.timeStamp - lastT;
    const v = idle > 60 ? 0 : vel * 16;              // stale if the finger paused before lifting
    const from = Math.round(position);
    const isFlick = Math.abs(v) > 0.012;

    if (!isFlick && moved < 6) {                     // a tap: centre the tapped card
      const i = cardAt(e.clientX, e.clientY);
      glideTo(i >= 0 ? i : from);
      return;
    }
    if (isFlick) {
      const capped = Math.max(-0.9, Math.min(0.9, v));
      let rawTarget = Math.round(position + capped * opt.flickReach);
      if (v > 0 && rawTarget <= from) rawTarget = from + 1; // a small flick still advances one
      if (v < 0 && rawTarget >= from) rawTarget = from - 1;
      const max = cards.length - 1;
      const t = Math.max(from - opt.flickMax, Math.min(from + opt.flickMax, rawTarget));
      if (t <= 0 && rawTarget < 0) bounceEdge(0);          // flicked past an end → bounce
      else if (t >= max && rawTarget > max) bounceEdge(max);
      else glideTo(t);
    } else {
      glideTo(from);                                 // slow drag → settle to nearest (springs off ends)
    }
  }

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  const onResize = () => layout();
  window.addEventListener('resize', onResize);

  // first paint
  layout();
  setCurrent(position);

  return {
    goTo: (i) => glideTo(i),
    // Chain off the glide target so rapid taps advance reliably (target == the
    // settled position when idle).
    next: () => glideTo(Math.round(target) + 1),
    prev: () => glideTo(Math.round(target) - 1),
    refresh: layout,                                 // call after cards resize/change
    get index() { return index; },
    get position() { return position; },
    destroy() {
      stopGlide();
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize);
    },
  };
}
