/* ============================================================
   KAYAK QUERÉTARO — La travesía (video scrubeado, sin dependencias de CDN)
   ============================================================ */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.matchMedia("(max-width:880px)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  // Controles estéticos de GamaStudio (el cliente los ajusta desde el portal, en vivo).
  const FX = (k, d) => { const f = window.GamaStudioFX || {}; const v = f[k]; return (v == null || isNaN(v)) ? d : v; };

  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  const nav = $("#nav");
  const onNav = () => nav.classList.toggle("scrolled", window.scrollY > 60);
  onNav(); window.addEventListener("scroll", onNav, { passive: true });

  const film = $("#film");
  const beats = $$(".beat");
  const cfg = beats.map((el) => ({
    el, inner: $(".beat__inner", el),
    s: parseFloat(el.dataset.s), e: parseFloat(el.dataset.e),
    enter: el.dataset.enter || "rise", first: el.dataset.first === "true",
  }));

  /* ============ MODO ESTÁTICO (móvil / reduced-motion) ============ */
  if (reduce || isSmall) {
    document.body.classList.add("static-mode");
    if (film) {
      if (isSmall) {
        film.setAttribute("poster", "assets/img/hero-9x16.webp");
        const src = film.querySelector("source");
        if (src) src.src = "assets/video/journey-9x16.mp4"; else film.src = "assets/video/journey-9x16.mp4";
        film.load();
      }
      film.loop = true; film.muted = true; film.play().catch(() => {});
    }
    beats.forEach((b) => b.setAttribute("data-reveal", ""));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    beats.forEach((b) => io.observe(b));
    initRipples();
    if (!reduce) bindMagnetic();
    return;
  }

  /* ============ MODO CINE (desktop): scrub con scroll nativo ============ */
  const exp = $("#exp");
  const bar = $("#voyageBar") && $("#voyageBar").firstElementChild;
  const telemetry = $("#telemetry");
  const tDist = $('[data-tlm="dist"]'), tDepth = $('[data-tlm="depth"]'), tBirds = $('[data-tlm="birds"]');
  const flock = $(".flock");

  /* Preparar el video para hacer seek (forzar carga + despertar decoder) */
  let vdur = 0, seekT = -1;
  if (film) {
    film.preload = "auto";
    const setDur = () => { if (film.duration && isFinite(film.duration)) vdur = film.duration; };
    film.addEventListener("loadedmetadata", setDur);
    film.addEventListener("durationchange", setDur);
    const prime = () => { const p = film.play(); if (p && p.then) p.then(() => film.pause()).catch(() => {}); };
    film.addEventListener("loadeddata", () => { setDur(); prime(); });
    try { film.load(); } catch (e) {}
    prime();
    setDur();
  }

  let birdCount = 0, activeIdx = -1;
  const birdBeats = new Set(["clases", "eventos", "cierre"]);
  function liftFlock() {
    if (!flock) return;
    flock.classList.remove("flying"); void flock.offsetWidth; flock.classList.add("flying");
    birdCount += 5 + Math.floor(Math.random() * 6);
    if (tBirds) tBirds.textContent = birdCount;
  }

  function renderBeat(c, p) {
    const lp = (p - c.s) / (c.e - c.s);
    if (lp < -0.06 || lp > 1.06) { c.el.style.opacity = "0"; c.el.style.pointerEvents = "none"; return; }
    const exitDur = 0.3;
    const appear = c.first ? 1 : smooth(0, 0.32, lp);
    const disappear = 1 - smooth(1 - exitDur, 1, lp);
    const vis = Math.min(appear, disappear);
    c.el.style.opacity = vis.toFixed(3);
    c.el.style.pointerEvents = vis > 0.6 ? "auto" : "none";
    const ein = 1 - appear, eout = 1 - disappear;
    let x = 0, y = 0, sc = 1;
    if (c.enter === "rise") { y = ein * 80 - eout * 60; }
    else if (c.enter === "left") { x = ein * -110; y = eout * -40; }
    else if (c.enter === "right") { x = ein * 110; y = eout * -40; }
    else { y = -eout * 50; sc = 1 - ein * 0.04; }
    c.inner.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
  }

  function getProgress() {
    const top = exp.getBoundingClientRect().top + window.scrollY;
    const range = exp.offsetHeight - window.innerHeight;
    return range > 0 ? clamp((window.scrollY - top) / range) : 0;
  }

  function update(p) {
    if (vdur) {
      const t = Math.min(vdur - 0.05, p * vdur);
      if (Math.abs(t - seekT) > 0.02 && film.readyState >= 1) {
        try { film.currentTime = t; seekT = t; } catch (e) {}
      }
    }
    let idx = 0;
    for (let i = 0; i < cfg.length; i++) { renderBeat(cfg[i], p); if (p >= cfg[i].s && p < cfg[i].e) idx = i; }
    if (idx !== activeIdx) {
      if (idx > activeIdx && birdBeats.has(cfg[idx].el.id)) liftFlock();
      activeIdx = idx;
    }
    if (bar) bar.style.width = (p * 100).toFixed(2) + "%";
    if (tDist) tDist.textContent = (p * 3.2).toFixed(1);
    if (tDepth) tDepth.textContent = lerp(1.2, 6.8, Math.sin(p * Math.PI)).toFixed(1);
    if (telemetry) telemetry.classList.toggle("show", p > 0.035);
  }

  /* El scroll nativo manda: actualizamos en cada evento de scroll
     (responde aunque el rAF esté estrangulado) + rAF para fluidez del video. */
  const tick = () => update(getProgress());
  window.addEventListener("scroll", tick, { passive: true });
  window.addEventListener("resize", tick, { passive: true });
  function frame() { tick(); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  tick();

  /* navegación por progreso */
  function scrollToProgress(p) {
    const top = exp.getBoundingClientRect().top + window.scrollY;
    const range = exp.offsetHeight - window.innerHeight;
    const y = top + clamp(p) * range;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
  $$('a[href^="#"], [data-goto]').forEach((a) => {
    a.addEventListener("click", (ev) => {
      const goto = a.dataset.goto;
      const href = a.getAttribute("href") || "";
      let p = null;
      if (goto != null) p = parseFloat(goto);
      else if (href.length > 1) {
        const id = href.slice(1);
        if (id === "top") p = 0;
        else { const c = cfg.find((c) => c.el.id === id); if (c) p = (c.s + c.e) / 2; }
      }
      if (p == null) return;
      ev.preventDefault();
      scrollToProgress(p);
    });
  });

  initRipples();
  bindMagnetic();

  /* ============ Ondas concéntricas del cursor ============ */
  function initRipples() {
    const cv = $("#ripple-canvas");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let W, H, dpr, last = 0;
    const drops = [];
    const host = cv.parentElement;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = host.getBoundingClientRect();
      W = r.width; H = r.height || window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); window.addEventListener("resize", size);
    function add(cx, cy, strong) {
      const r = cv.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      if (x < 0 || y < 0 || x > W || y > H) return;
      const now = performance.now();
      const mouseFx = Math.max(0.05, FX("mouse", 1));
      if (!strong && now - last < 55 / mouseFx) return;
      last = now;
      drops.push({ x, y, r: 4, a: (strong ? 0.5 : 0.3) * mouseFx });
      if (drops.length > Math.round(18 * FX("particles", 1))) drops.shift();
    }
    window.addEventListener("pointermove", (e) => add(e.clientX, e.clientY, false), { passive: true });
    window.addEventListener("pointerdown", (e) => add(e.clientX, e.clientY, true), { passive: true });
    function draw() {
      requestAnimationFrame(draw);
      if (document.hidden) return;
      ctx.clearRect(0, 0, W, H);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        const spd = FX("speed", 1);
        d.r += 2.5 * spd; d.a *= Math.pow(0.95, spd);
        if (d.a < 0.02) { drops.splice(i, 1); continue; }
        ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(220,238,240,${d.a})`; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 0.6, d.r * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(199,162,78,${d.a * 0.5})`; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    draw();
  }

  /* ============ Magnetismo ============ */
  function bindMagnetic() {
    if (!window.matchMedia("(pointer:fine)").matches) return;
    $$(".magnetic").forEach((el) => {
      const strength = el.classList.contains("wa-fab") ? 0.4 : 0.3;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }
})();
