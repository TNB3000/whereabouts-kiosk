/* Whereabouts kiosk: chapter state machine, the desk of tools, idle reset, video. */
(function () {
  "use strict";

  const CHAPTERS = ["attract", "directory", "events", "people", "broadcasts", "tripper", "everything", "watch", "tiao", "demo"];
  const NAMES = { directory: "Directory", events: "Events", people: "People", broadcasts: "Broadcasts", tripper: "Tripper", everything: "The rest", watch: "Watch it work", tiao: "TIAO", demo: "Book a demo" };
  const IDLE_WARN_MS = 60000;   // show "still there?" after a minute without a touch
  const IDLE_RESET_MS = 15000;  // then return to the attract screen
  const STAGE_W = 1080, STAGE_H = 1920;

  // The eleven tools on a DMO's desk, each replaced by one chapter. Positions are the attract-screen pile.
  const TOOLS = [
    { label: "Member directory software",     short: "Directory software", chapter: "directory",  x: 56,  y: 84,  r: -5 },
    { label: "Events calendar plugin",         short: "Events plugin",      chapter: "events",     x: 604, y: 54,  r: 5 },
    { label: "Email & member communications",  short: "Email tool",         chapter: "broadcasts", x: 128, y: 266, r: 3 },
    { label: "Event ticketing",                short: "Ticketing",          chapter: "everything", x: 712, y: 206, r: -7 },
    { label: "Member portal & forms",          short: "Portal & forms",     chapter: "everything", x: 36,  y: 446, r: -3 },
    { label: "Membership dues & renewals",     short: "Dues & renewals",    chapter: "everything", x: 522, y: 396, r: 5 },
    { label: "Website widgets & embeds",       short: "Widgets & embeds",   chapter: "everything", x: 140, y: 606, r: 4 },
    { label: "Itinerary builder",              short: "Itinerary builder",  chapter: "tripper",    x: 648, y: 556, r: -8 },
    { label: "Resource library & courses",     short: "Resource library",   chapter: "broadcasts", x: 44,  y: 766, r: -2 },
    { label: "CRM",                            short: "CRM",                chapter: "people",     x: 612, y: 716, r: 7 },
    { label: "Analytics & reporting",          short: "Analytics",          chapter: "everything", x: 440, y: 878, r: -4 },
  ];

  const stage = document.getElementById("stage");
  const desk = document.getElementById("desk");
  const slotsWrap = document.getElementById("slots");
  const sections = Object.fromEntries(CHAPTERS.map(c => [c, document.getElementById("ch-" + c)]));
  const railButtons = Array.from(document.querySelectorAll(".rail button"));
  const nextName = document.getElementById("next-name");
  const nextBtn = document.querySelector(".nav .next");
  const backBtn = document.querySelector(".nav .back");
  const trayLabel = document.getElementById("tray-label");
  const toast = document.getElementById("idle-toast");
  const video = document.getElementById("demo-video");
  const player = document.querySelector(".player");
  const playToggle = document.querySelector(".play-toggle");
  const progress = document.querySelector(".progress span");

  let current = 0;
  const visited = new Set();

  /* ----- Stage scaling: fit 1080x1920 into any screen, letterboxed on the green ----- */
  function fit() {
    const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    stage.style.setProperty("--s", s.toFixed(5));
  }
  window.addEventListener("resize", fit);
  fit();

  /* ----- Build the desk ----- */
  const tiles = TOOLS.map((t, i) => {
    const el = document.createElement("div");
    el.className = "tile";
    el.dataset.chapter = t.chapter;
    el.style.setProperty("--dur", (6 + (i % 4) * 0.9).toFixed(1) + "s");
    el.style.setProperty("--delay", (-(i * 1.3)).toFixed(1) + "s");
    const inner = document.createElement("span");
    inner.className = "drift";
    inner.textContent = t.label;
    el.appendChild(inner);
    desk.appendChild(el);
    const slot = document.createElement("div");
    slot.className = "slot";
    slotsWrap.appendChild(slot);
    return Object.assign({ el, inner, slot }, t);
  });

  // Where a chapter's badge sits, in stage coordinates, so removed tiles can fly into it.
  function badgeCenter(chapter) {
    const badge = sections[chapter] && sections[chapter].querySelector(".badge");
    if (!badge) return { x: 108, y: 374 };
    const s = parseFloat(getComputedStyle(stage).getPropertyValue("--s")) || 1;
    const sr = stage.getBoundingClientRect();
    const br = badge.getBoundingClientRect();
    return { x: (br.left - sr.left) / s + br.width / s / 2, y: (br.top - sr.top) / s + br.height / s / 2 };
  }

  function layoutDesk(chapterIndex) {
    const chapter = CHAPTERS[chapterIndex];
    if (chapter === "attract") {
      tiles.forEach(t => {
        t.el.classList.remove("tray", "gone", "hidden");
        t.el.style.width = "";
        t.inner.textContent = t.label;
        t.el.style.transform = `translate(${t.x}px, ${t.y}px) rotate(${t.r}deg)`;
        t.slot.classList.remove("empty");
      });
      setTray(TOOLS.length);
      return;
    }
    const remaining = tiles.filter(t => CHAPTERS.indexOf(t.chapter) > chapterIndex);
    const leaving = tiles.filter(t => t.chapter === chapter);
    const gone = tiles.filter(t => CHAPTERS.indexOf(t.chapter) < chapterIndex);

    // Tray: every tool keeps a fixed slot under the header, in original order, wrapping at the right margin.
    // A removed tool leaves its slot as an empty outline, so the desk visibly clears chapter by chapter.
    const TH = 48, GX = 12, GY = 12, X0 = 64, Y0 = 170, XMAX = 1016;
    let x = X0, y = Y0;
    const c = badgeCenter(chapter);
    tiles.forEach((t) => {
      const w = trayWidth(t.short);
      if (x + w > XMAX) { x = X0; y += TH + GY; }
      t.slot.style.width = w + "px";
      t.slot.style.transform = `translate(${x}px, ${y}px)`;
      const idx = CHAPTERS.indexOf(t.chapter);
      t.inner.textContent = t.short;
      t.el.classList.add("tray");
      t.el.style.width = w + "px";
      if (idx > chapterIndex) {
        t.el.classList.remove("gone", "hidden");
        t.el.style.transform = `translate(${x}px, ${y}px) rotate(0deg)`;
        t.slot.classList.remove("empty");
      } else if (idx === chapterIndex) {
        t.el.classList.remove("hidden");
        t.el.style.transitionDelay = `${0.08 + leaving.indexOf(t) * 0.05}s`;
        t.el.style.transform = `translate(${c.x - w / 2}px, ${c.y - TH / 2}px) rotate(0deg) scale(.12)`;
        t.el.classList.add("gone");
        setTimeout(() => { t.el.style.transitionDelay = ""; }, 900);
        t.slot.classList.add("empty");
      } else {
        t.el.classList.add("gone");
        t.slot.classList.add("empty");
      }
      x += w + GX;
    });

    const n = remaining.length;
    setTray(n);
  }

  // Width of a tray tile: measure each short label once against the real font, in stage pixels.
  const widthCache = new Map();
  function trayWidth(text) {
    if (!widthCache.has(text)) {
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font:500 19px Outfit,sans-serif";
      probe.textContent = text;
      stage.appendChild(probe);
      const s = parseFloat(getComputedStyle(stage).getPropertyValue("--s")) || 1;
      widthCache.set(text, Math.ceil(probe.getBoundingClientRect().width / s) + 14 + 14 + 2);
      probe.remove();
    }
    return widthCache.get(text);
  }

  function setTray(n) {
    trayLabel.textContent = n === 0 ? "Your desk is clear." : `${n} ${n === 1 ? "tool" : "tools"} still on your desk`;
  }

  /* ----- Chapter transitions ----- */
  function goTo(index, opts) {
    index = Math.max(0, Math.min(CHAPTERS.length - 1, index));
    const from = CHAPTERS[current];
    const to = CHAPTERS[index];
    if (from === "watch") pauseVideo();

    current = index;
    stage.dataset.chapter = to;
    CHAPTERS.forEach(c => sections[c].classList.toggle("is-active", c === to));

    if (to === "attract") visited.clear(); else visited.add(index);
    railButtons.forEach(b => {
      const i = Number(b.dataset.go);
      b.classList.toggle("current", i === index);
      b.classList.toggle("visited", visited.has(i) && i !== index);
      b.setAttribute("aria-selected", i === index ? "true" : "false");
    });

    // Next button copy
    if (index === CHAPTERS.length - 1) {
      nextBtn.querySelector(".next-label").textContent = "Finished?";
      nextName.textContent = "Start over";
    } else {
      nextBtn.querySelector(".next-label").textContent = "Next";
      nextName.textContent = NAMES[CHAPTERS[index + 1]];
    }
    backBtn.style.visibility = index <= 1 ? "hidden" : "visible";

    // Lay the desk out now (synchronous: a throttled tab may never fire requestAnimationFrame before it is shown).
    layoutDesk(index);

    if (to === "watch") startVideo();
    if (to === "tiao") buildDots();
    resetIdle();
  }

  function next() { goTo(current === CHAPTERS.length - 1 ? 0 : current + 1); }
  function prev() { goTo(Math.max(1, current - 1)); }

  stage.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { goTo(Number(go.dataset.go)); return; }
    const nav = e.target.closest("[data-nav]");
    if (nav) { nav.dataset.nav === "next" ? next() : prev(); return; }
    if (current === 0 && !e.target.closest("button")) goTo(1);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { if (!e.target.closest("button") || e.key === "ArrowRight") { e.preventDefault(); next(); } }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "Home" || e.key === "Escape") { goTo(0); }
  });

  // Swipe left/right between chapters
  let px = null, py = null, pt = 0;
  stage.addEventListener("pointerdown", (e) => { px = e.clientX; py = e.clientY; pt = Date.now(); }, { passive: true });
  stage.addEventListener("pointerup", (e) => {
    if (px === null) return;
    const dx = e.clientX - px, dy = e.clientY - py, dt = Date.now() - pt;
    px = py = null;
    if (current === 0 || dt > 900 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx)) return;
    dx < 0 ? next() : prev();
  }, { passive: true });

  /* ----- Idle reset ----- */
  let warnTimer = null, resetTimer = null;
  function clearIdle() { clearTimeout(warnTimer); clearTimeout(resetTimer); toast.classList.remove("show"); }
  function resetIdle() {
    clearIdle();
    if (current === 0) return;
    warnTimer = setTimeout(() => {
      if (current === 7 && !video.paused && !video.ended) { resetIdle(); return; } // someone is watching
      toast.classList.add("show");
      resetTimer = setTimeout(() => goTo(0), IDLE_RESET_MS);
    }, IDLE_WARN_MS);
  }
  ["pointerdown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, resetIdle, { passive: true }));

  /* ----- Video ----- */
  function startVideo() {
    try { video.currentTime = 0; } catch (_) {}
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }
  function pauseVideo() { video.pause(); }
  video.addEventListener("play", () => { player.classList.add("is-playing"); player.classList.remove("show-controls"); });
  video.addEventListener("pause", () => player.classList.remove("is-playing"));
  video.addEventListener("ended", () => { player.classList.remove("is-playing"); resetIdle(); });
  const markers = Array.from(document.querySelectorAll(".markers li"));
  video.addEventListener("timeupdate", () => {
    if (video.duration) progress.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`;
    let activeIdx = 0;
    markers.forEach((li, i) => { if (Number(li.querySelector("button").dataset.seek) <= video.currentTime + 0.5) activeIdx = i; });
    markers.forEach((li, i) => li.classList.toggle("current", i === activeIdx));
  });
  markers.forEach(li => li.querySelector("button").addEventListener("click", (e) => {
    e.stopPropagation();
    video.currentTime = Number(e.currentTarget.dataset.seek);
    startVideoFromHere();
    resetIdle();
  }));
  function toggleVideo(e) {
    e.stopPropagation();
    if (video.paused || video.ended) { startVideoFromHere(); } else { video.pause(); }
  }
  function startVideoFromHere() { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
  video.addEventListener("click", toggleVideo);
  playToggle.addEventListener("click", toggleVideo);

  /* ----- The 15,000 dots ----- */
  let dotsBuilt = false;
  function buildDots() {
    if (dotsBuilt) return;
    const wrap = document.getElementById("otd-dots");
    for (let i = 0; i < 150; i++) {
      const d = document.createElement("i");
      d.style.setProperty("--i", i);
      wrap.appendChild(d);
    }
    dotsBuilt = true;
  }

  /* ----- Kiosk flag: ?kiosk hides the pointer on the booth screen ----- */
  if (new URLSearchParams(location.search).has("kiosk")) document.documentElement.classList.add("kiosk");

  /* ----- Start ----- */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { widthCache.clear(); if (current > 0) layoutDesk(current); });
  goTo(0);
})();
