# Render Pipeline Tutorial — Page Spec (v1)

Every topic page follows this spec. The shared kit (`assets/style.css`, `assets/common.js`) is **frozen**: topic authors must not edit it. If a page needs something extra, write it inline in that page's own `<style>` / `<script>`.

## Chapters

| No | File | Title | Learning objective | Must-demonstrate interaction |
|----|------|-------|--------------------|------------------------------|
| 01 | `topics/01-transforms.html` | Coordinate Spaces & Transforms | Follow one vertex from object space through world, view and clip space, the perspective divide, NDC and the viewport | Live MVP chain: sliders for model rotation, camera and FOV; frustum view; matrices that update live; perspective divide shown step by step |
| 02 | `topics/02-rasterization.html` | Rasterization & Depth | How a triangle becomes pixels: edge functions, coverage, barycentric interpolation, clipping, z-buffer | Draggable triangle on a pixel grid with coverage, barycentrics on hover, z-buffer vs painter's algorithm, top-left fill rule |
| 03 | `topics/03-shading.html` | Lighting & Shading | Normals, Lambert diffuse, Phong vs Blinn-Phong specular, flat vs Gouraud vs per-pixel shading | Draggable light around a sphere; toggle flat/Gouraud/Phong; term-by-term breakdown (ambient, diffuse, specular) |
| 04 | `topics/04-texturing.html` | Texturing & Sampling | UV mapping, perspective-correct interpolation, nearest vs bilinear, mipmaps, anisotropic filtering, aliasing | UV unwrap viewer; affine vs perspective-correct on a tilted plane; magnify/minify with filter modes; mip level visualizer |
| 05 | `topics/05-gpu-pipeline.html` | The Programmable GPU | From fixed function to shaders: vertex/fragment shaders, primitive assembly, the full GPU stage list, SIMT, overdraw | Animated pipeline diagram where a triangle flows stage by stage; live editable GLSL fragment shader (WebGL) with presets; overdraw heatmap |
| 06 | `topics/06-techniques.html` | Forward, Deferred & Shadows | Forward vs deferred vs Forward+ (tiled/clustered), the G-buffer, shadow mapping, bias/acne/PCF | Many-light scene cost comparison; G-buffer channel viewer; 2D shadow-map demo with depth buffer from the light, bias slider, acne and peter-panning |
| 07 | `topics/07-pbr-post.html` | PBR, HDR & Post-Processing | Microfacet BRDF (GGX, Fresnel/Schlick, energy), metal/rough workflow, linear vs sRGB, HDR and tonemapping, bloom, anti-aliasing (MSAA/FXAA/TAA) | Roughness × metalness sphere grid; exposure + tonemap operator curves (Reinhard/ACES); bloom pass breakdown; AA comparison zoom |
| 08 | `topics/08-apis.html` | Modern Graphics APIs | OpenGL's state machine vs explicit APIs (Vulkan, Direct3D 12, Metal, WebGPU): command buffers, pipeline state objects, descriptors/bind groups, synchronization, multithreaded recording; clip-space differences | Animated CPU→driver→GPU timeline comparing implicit vs explicit; object-model diagram (device, queue, command buffer, pipeline, bind group); frame-in-flight / fence visualizer; API naming cross-reference table |
| 09 | `topics/09-engines.html` | Game Engine Pipelines | How engines organize rendering: render graphs/frame graphs, Unity SRP (URP/HDRP), Unreal (deferred, Nanite virtualized geometry, Lumen GI, Virtual Shadow Maps), Godot (Forward+/Mobile/Compatibility), hybrid ray tracing | Interactive frame-graph of a typical frame (passes and resources, click a pass to see inputs/outputs); a frame-budget bar (16.6 ms) you can rebalance; a cluster LOD visualizer in the spirit of Nanite; rasterization vs ray tracing ray demo |

## Conventions (the whole tutorial uses these)

- Math: column vectors, `p' = M · p`, column-major `mat4` (OpenGL convention). MVP = `P · V · M`.
- Right-handed world, **y-up**, camera looks down **−Z**.
- Clip space: OpenGL NDC z ∈ [−1, 1]. Chapter 08 explains that Direct3D/Vulkan/Metal/WebGPU use z ∈ [0, 1] (and that Vulkan's NDC y points down).
- Screen space: origin top-left, y down (canvas convention). Say so when converting.
- Colors in shading math are **linear**; convert to sRGB for display (chapter 07 explains why).
- Terminology: "fragment" = candidate pixel produced by rasterization; "pixel" = framebuffer location. "Vertex shader", "fragment shader" (note "pixel shader" as the D3D name).
- Stage colors (CSS tokens): `--vtx` vertex processing, `--ras` rasterization, `--frag` fragment/pixel, `--out` output merge / framebuffer. Use them in diagrams consistently.

## Page template

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Rasterization & Depth · Render Pipeline</title>
<link rel="stylesheet" href="../assets/style.css">
<style>/* page-only styles, token colors only */</style>
</head>
<body data-topic="02">
<header class="topbar"><div class="topbar-inner"></div></header>
<main class="lesson">
  <section class="hero">
    <p class="eyebrow">Chapter 02 · Foundations</p>
    <h1>Rasterization & Depth</h1>
    <p class="lede">One or two sentences.</p>
    <div class="stage-band"><span class="app">Application</span><span class="vtx">Vertex</span><span class="on ras">Rasterize</span><span class="frag">Fragment</span><span class="out">Output</span></div>
  </section>
  <aside class="objectives"><h2>You'll learn</h2><ul><li>…</li></ul></aside>
  <section class="step" id="coverage">
    <h2><span class="step-no">STEP 1</span>Which pixels does a triangle cover?</h2>
    <p>Prose…</p>
    <figure class="viz">
      <div class="viz-stage"><canvas id="cov" aria-label="Describe what the canvas shows"></canvas><div class="hud" id="cov-hud"></div></div>
      <div class="controls">
        <div class="control"><label for="grid">Grid size <output for="grid"></output></label><input type="range" id="grid" min="8" max="40" value="16"></div>
        <div class="btn-row" id="mode"><button class="btn" data-value="a" aria-pressed="true">A</button><button class="btn" data-value="b">B</button></div>
      </div>
      <figcaption><b>Try it:</b> drag a vertex…</figcaption>
    </figure>
    <div class="callout ras"><strong>Key idea.</strong> …</div>
  </section>
  <!-- more steps -->
  <section class="step" id="recap"><h2><span class="step-no">RECAP</span>What to remember</h2><ul>…</ul></section>
</main>
<nav class="pager" aria-label="Chapter navigation"></nav>
<script src="../assets/common.js"></script>
<script>
// page code using RP.*
</script>
</body>
</html>
```

Kit classes: `.lesson .hero .eyebrow .lede .stage-band .objectives .step .step-no .viz .viz-stage .viz-split .pane-label .hud .controls .control .btn-row .btn .legend .callout(.vtx/.ras/.frag/.out/.warn) .math .table-wrap .kv details pre code`. Canvas heights: default 360px, `.tall` 460px, `.short` 240px.

Kit JS (`window.RP`): `canvas(sel, draw, {webgl})`, `fallback(el,msg)`, `loop(el, fn)`, `slider(sel, cb, {fmt})`, `toggleGroup(sel, cb)`, `drag(el, {down,move,up,hover})`, `colors()`, `onTheme(cb)`, `v3.*`, `m4.*` (incl. `perspective`, `lookAt`, `chain(P,V,M)`, `xform`, `project(mvp,p,w,h)`), `mesh.cube()`, `mesh.sphere()`, `glProgram(gl,vs,fs)`, `clamp lerp smoothstep hex2rgb rgb2css alpha`, `reduced`. Read `assets/common.js` for exact signatures.

## Definition of done (every page)

1. **Graphical step by step:** 4–6 `.step` sections, and every step has its own interactive visualization (canvas with controls, drag or animation). No step is text only. The recap step is the exception.
2. **No network:** no fetch/XHR, no external images or textures (generate them procedurally), no CDN libraries. Only `../assets/style.css` and `../assets/common.js`, both relative. Works from `file://`.
3. **Canvas2D by default.** Use WebGL only where it earns its place, and always handle a null context with `RP.fallback()`.
4. **Theme-aware:** every canvas color comes from `s.c` / `RP.colors()` tokens (never hard-coded light-only colors). Physically-meant colors (material albedo, rendered images) may be literal, but their labels, axes and backgrounds use tokens.
5. **Responsive:** works at 375px wide without horizontal page scroll. Canvases size from CSS; hit-testing uses CSS px.
6. **Accessible:** controls have labels, canvases have `aria-label`, keyboard can operate the buttons and sliders, motion pauses with `prefers-reduced-motion` (use `RP.loop`).
7. **Accurate:** follows the conventions above, with no invented API names or claims. Hedge vendor-specific internals ("Unreal 5 describes Nanite as…").
8. **No console errors.** Plain ES2020, no modules. All code lives in one inline `<script>` after `common.js`.
9. **Writing:** plain, direct sentences for a motivated beginner who knows basic algebra. Short paragraphs, real numbers in examples, one key-idea callout per step.
