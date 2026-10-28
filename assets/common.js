/* Render Pipeline Tutorial — shared helpers (global `RP`). FROZEN kit v1: topic agents must not edit.
   Conventions: column-major mat4, column vectors (p' = M * p), right-handed, y-up,
   camera looks down -Z, OpenGL clip space (NDC z in [-1, 1]). See SPEC.md. */
(function () {
  "use strict";

  const TOPICS = [
    { no: "01", slug: "01-transforms", title: "Coordinate Spaces & Transforms", era: "Foundations", stage: "vtx" },
    { no: "02", slug: "02-rasterization", title: "Rasterization & Depth", era: "Foundations", stage: "ras" },
    { no: "03", slug: "03-shading", title: "Lighting & Shading", era: "Foundations", stage: "frag" },
    { no: "04", slug: "04-texturing", title: "Texturing & Sampling", era: "Foundations", stage: "frag" },
    { no: "05", slug: "05-gpu-pipeline", title: "The Programmable GPU", era: "GPU era", stage: "vtx" },
    { no: "06", slug: "06-techniques", title: "Forward, Deferred & Shadows", era: "Modern techniques", stage: "out" },
    { no: "07", slug: "07-pbr-post", title: "PBR, HDR & Post-Processing", era: "Modern techniques", stage: "frag" },
    { no: "08", slug: "08-apis", title: "Modern Graphics APIs", era: "APIs", stage: "app" },
    { no: "09", slug: "09-engines", title: "Game Engine Pipelines", era: "Engines", stage: "app" },
  ];

  /* ---------- Theme colors (read from CSS tokens so canvases follow light/dark) ---------- */
  const TOKENS = ["paper", "surface", "surface-2", "ink", "muted", "line", "accent", "vtx", "ras", "frag", "out", "good", "warn", "bad"];
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    const c = {};
    for (const t of TOKENS) c[t.replace("-", "")] = cs.getPropertyValue("--" + t).trim();
    return c; // keys: paper, surface, surface2, ink, muted, line, accent, vtx, ras, frag, out, good, warn, bad
  }
  const themeListeners = new Set();
  function onTheme(cb) { themeListeners.add(cb); return () => themeListeners.delete(cb); }
  function fireTheme() { const c = colors(); themeListeners.forEach((cb) => { try { cb(c); } catch (e) { console.error(e); } }); }
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", fireTheme); else if (mq.addListener) mq.addListener(fireTheme);
  }
  new MutationObserver(fireTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- Canvas with DPR + resize ----------
     const v = RP.canvas('#id', (s) => { const {ctx, w, h, c} = s; ... });
     w/h are CSS pixels; for 2D the ctx is pre-scaled by DPR. c = current theme colors.
     v.draw() redraws. Redraws automatically on resize and theme change.
     WebGL: RP.canvas('#id', draw, {webgl: 1}) -> s.ctx is the GL context (or null if unavailable:
     then call RP.fallback(el, msg) and draw a 2D alternative or explanation). */
  function canvas(target, draw, opts = {}) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    let ctx = null;
    try { ctx = el.getContext(opts.webgl ? (opts.webgl === 2 ? "webgl2" : "webgl") : "2d", opts.contextAttrs); } catch (e) { ctx = null; }
    const state = { el, ctx, w: 0, h: 0, dpr: 1, c: colors(), webgl: !!opts.webgl };
    state.draw = () => {
      if (!draw || state.w <= 1 || !state.ctx) return;
      state.c = colors();
      if (!opts.webgl) state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      try { draw(state); } catch (e) { console.error(e); }
    };
    function resize() {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = Math.max(1, r.width); state.h = Math.max(1, r.height); state.dpr = dpr;
      el.width = Math.round(state.w * dpr); el.height = Math.round(state.h * dpr);
      state.draw();
    }
    state.resize = resize;
    if (window.ResizeObserver) new ResizeObserver(resize).observe(el); else window.addEventListener("resize", resize);
    onTheme(() => state.draw());
    requestAnimationFrame(resize);
    return state;
  }
  /* Show a readable message over a canvas whose WebGL context failed. */
  function fallback(el, msg) {
    const stage = el.closest(".viz-stage") || el.parentElement;
    const d = document.createElement("div");
    d.className = "fallback";
    d.textContent = msg || "This demo needs WebGL, which isn't available in this browser. The text and diagrams around it cover the same idea.";
    stage.appendChild(d);
  }

  /* ---------- Animation loop that pauses offscreen and respects reduced motion ----------
     const anim = RP.loop(canvasEl, (t, dt) => {...});  anim.start(), anim.stop(), anim.running
     With prefers-reduced-motion it renders one frame and waits for start(). */
  const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function loop(el, fn) {
    let raf = 0, last = 0, visible = true, wanted = !reduced;
    function frame(t) { const dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t; try { fn(t / 1000, dt); } catch (e) { console.error(e); } raf = requestAnimationFrame(frame); }
    function sync() { const run = wanted && visible; if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); } else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; } }
    if (el && window.IntersectionObserver) new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); }).observe(el);
    const api = { start() { wanted = true; sync(); }, stop() { wanted = false; sync(); }, get running() { return wanted; }, reduced };
    sync();
    if (reduced) requestAnimationFrame(() => fn(0, 0));
    return api;
  }

  /* ---------- Controls ----------
     RP.slider('#id', v => {...}, {fmt: v => v.toFixed(2)}) — fills <output for="id"> automatically. */
  function slider(target, cb, opts = {}) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    const out = document.querySelector(`output[for="${el.id}"]`);
    const stepIsInt = Number.isInteger(parseFloat(el.step || "1"));
    const fmt = opts.fmt || ((v) => (stepIsInt ? String(v) : v.toFixed(2)));
    const fire = () => { const v = parseFloat(el.value); if (out) out.textContent = fmt(v); if (cb) cb(v); };
    el.addEventListener("input", fire); fire();
    return { get value() { return parseFloat(el.value); }, set value(v) { el.value = v; fire(); } };
  }
  /* RP.toggleGroup('#container', v => {...}) — <button class="btn" data-value="x"> children, one aria-pressed at a time */
  function toggleGroup(target, cb) {
    const root = typeof target === "string" ? document.querySelector(target) : target;
    const btns = [...root.querySelectorAll("button[data-value]")];
    function set(v) { btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === v))); if (cb) cb(v); }
    btns.forEach((b) => { b.type = "button"; b.addEventListener("click", () => set(b.dataset.value)); });
    const init = btns.find((b) => b.getAttribute("aria-pressed") === "true") || btns[0];
    if (init) set(init.dataset.value);
    return { set };
  }
  /* RP.drag(canvasEl, {down(x,y) -> false to ignore, move(x,y), up(), hover(x,y)}) — coords in CSS px */
  function drag(el, h) {
    let active = false;
    const pos = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.addEventListener("pointerdown", (e) => { active = h.down ? h.down(...pos(e)) !== false : true; if (active) el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", (e) => { if (active && h.move) h.move(...pos(e)); else if (!active && h.hover) h.hover(...pos(e)); });
    const end = () => { if (active) { active = false; if (h.up) h.up(); } };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  }

  /* ---------- Math: vec3 and column-major mat4 (OpenGL convention) ---------- */
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    mul: (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
    reflect: (i, n) => { const d = 2 * (i[0] * n[0] + i[1] * n[1] + i[2] * n[2]); return [i[0] - d * n[0], i[1] - d * n[1], i[2] - d * n[2]]; },
  };
  const m4 = {
    identity: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    mul(a, b) { // returns a * b (apply b first, then a)
      const o = new Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return o;
    },
    chain(...ms) { return ms.reduce((acc, m) => m4.mul(acc, m)); }, // chain(P, V, M) = P*V*M
    translate: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
    scale: (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1],
    rotX: (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    rotY: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
    rotZ: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    perspective(fovy, aspect, near, far) { // OpenGL: NDC z in [-1,1]
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
    },
    ortho(l, r, b, t, n, f) {
      return [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1];
    },
    lookAt(eye, target, up) {
      const z = v3.norm(v3.sub(eye, target)), x = v3.norm(v3.cross(up, z)), y = v3.cross(z, x);
      return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -v3.dot(x, eye), -v3.dot(y, eye), -v3.dot(z, eye), 1];
    },
    xform: (m, p) => [ // m * vec4 p
      m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12] * p[3],
      m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13] * p[3],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14] * p[3],
      m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15] * p[3],
    ],
    /* project a world point through MVP to CSS-pixel screen coords: returns {x, y, z(ndc), w, clipped} */
    project(mvp, p, w, h) {
      const c = m4.xform(mvp, [p[0], p[1], p[2], 1]);
      const iw = 1 / c[3];
      return { x: (c[0] * iw * 0.5 + 0.5) * w, y: (1 - (c[1] * iw * 0.5 + 0.5)) * h, z: c[2] * iw, w: c[3], clipped: c[3] <= 0 };
    },
  };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function hex2rgb(h) { h = String(h).replace("#", "").trim(); if (h.length === 3) h = h.split("").map((x) => x + x).join(""); const n = parseInt(h, 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function rgb2css(c, a = 1) { return `rgba(${Math.round(clamp(c[0]) * 255)},${Math.round(clamp(c[1]) * 255)},${Math.round(clamp(c[2]) * 255)},${a})`; }
  function alpha(hex, a) { return rgb2css(hex2rgb(hex), a); }
  /* Simple mesh generators: each returns {pos:[[x,y,z]...], nrm:[[...]], uv:[[u,v]...], tri:[[i,j,k]...]} */
  const mesh = {
    cube() {
      const pos = [], nrm = [], uv = [], tri = [];
      const faces = [[[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
        [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
      for (const [n, u, v] of faces) {
        const b = pos.length;
        for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          pos.push([n[0] + u[0] * su + v[0] * sv, n[1] + u[1] * su + v[1] * sv, n[2] + u[2] * su + v[2] * sv].map((x) => x * 0.5));
          nrm.push(n); uv.push([(su + 1) / 2, (sv + 1) / 2]);
        }
        tri.push([b, b + 1, b + 2], [b, b + 2, b + 3]);
      }
      return { pos, nrm, uv, tri };
    },
    sphere(seg = 24, ring = 16, r = 1) {
      const pos = [], nrm = [], uv = [], tri = [];
      for (let j = 0; j <= ring; j++) {
        const v = j / ring, th = v * Math.PI;
        for (let i = 0; i <= seg; i++) {
          const u = i / seg, ph = u * Math.PI * 2;
          const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), -Math.sin(th) * Math.sin(ph)];
          pos.push(v3.scale(n, r)); nrm.push(n); uv.push([u, 1 - v]);
        }
      }
      for (let j = 0; j < ring; j++) for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i, b = a + seg + 1;
        tri.push([a, b, a + 1], [a + 1, b, b + 1]);
      }
      return { pos, nrm, uv, tri };
    },
  };

  /* ---------- Small WebGL helpers ---------- */
  function glProgram(gl, vsSrc, fsSrc) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vsSrc)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  /* ---------- Page chrome: top bar chapter nav + prev/next pager ----------
     Topic pages: <body data-topic="03">, <header class="topbar"><div class="topbar-inner"></div></header>, <nav class="pager"></nav>.
     Hub: <body data-topic="hub">. */
  function initPage() {
    const id = document.body.dataset.topic;
    const inTopics = id && id !== "hub";
    const base = inTopics ? "" : "topics/";
    const home = inTopics ? "../index.html" : "index.html";
    const bar = document.querySelector(".topbar-inner");
    if (bar && !bar.dataset.ready) {
      bar.dataset.ready = "1";
      bar.innerHTML = `<a class="brand" href="${home}"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Render Pipeline</a>
        <nav class="chapter-nav" aria-label="Chapters">${TOPICS.map((t) => `<a href="${base}${t.slug}.html" title="${t.title}"${t.no === id ? ' aria-current="page"' : ""}>${t.no}</a>`).join("")}</nav>`;
    }
    const pager = document.querySelector(".pager");
    if (pager && inTopics) {
      const i = TOPICS.findIndex((t) => t.no === id);
      const prev = TOPICS[i - 1], next = TOPICS[i + 1];
      pager.innerHTML =
        (prev ? `<a class="prev" href="${prev.slug}.html"><small>← Chapter ${prev.no}</small><span>${prev.title}</span></a>` : `<a class="prev" href="../index.html"><small>← Overview</small><span>The whole pipeline</span></a>`) +
        (next ? `<a class="next" href="${next.slug}.html"><small>Chapter ${next.no} →</small><span>${next.title}</span></a>` : `<a class="next" href="../index.html"><small>Back to →</small><span>Overview</span></a>`);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage); else initPage();

  window.RP = { TOPICS, colors, onTheme, canvas, fallback, loop, slider, toggleGroup, drag, v3, m4, mesh, clamp, lerp, smoothstep, hex2rgb, rgb2css, alpha, glProgram, initPage, reduced };
})();
