# Render Pipeline Tutorial

An interactive, visual course on the real-time render pipeline. It starts with classical computer graphics foundations and ends with modern GPU APIs and game engines. Every step has a visualization you can drag, slide and break.

**Live site:** https://xxnatoxx.github.io/render-pipeline-tutorial/, or open `index.html` locally. No build step and no server needed.

## Chapters

| # | Chapter | You'll play with |
|---|---------|------------------|
| 01 | [Coordinate Spaces & Transforms](topics/01-transforms.html) | Model/view/projection chain, the frustum, the perspective divide, NDC, the viewport |
| 02 | [Rasterization & Depth](topics/02-rasterization.html) | Edge functions, coverage, the fill rule, barycentrics, painter's algorithm vs the z-buffer |
| 03 | [Lighting & Shading](topics/03-shading.html) | Normals, Lambert, Phong vs Blinn-Phong, flat/Gouraud/per-pixel shading |
| 04 | [Texturing & Sampling](topics/04-texturing.html) | UVs, perspective-correct interpolation, bilinear filtering, mipmaps, anisotropic filtering |
| 05 | [The Programmable GPU](topics/05-gpu-pipeline.html) | Pipeline stage flow, a live GLSL editor, SIMT divergence, overdraw |
| 06 | [Forward, Deferred & Shadows](topics/06-techniques.html) | Many-light cost, G-buffer, tiled/clustered culling, shadow maps, cascades |
| 07 | [PBR, HDR & Post-Processing](topics/07-pbr-post.html) | GGX/Fresnel, the material grid, sRGB, tonemapping, bloom, anti-aliasing |
| 08 | [Modern Graphics APIs](topics/08-apis.html) | OpenGL vs Vulkan/D3D12/Metal/WebGPU, command buffers, fences, barriers |
| 09 | [Game Engine Pipelines](topics/09-engines.html) | Frame graphs, frame budget, Nanite-style LOD, ray tracing, a pixel-art pipeline |

## Structure

```
index.html          overview + animated pipeline diagram
topics/NN-*.html    one self-contained chapter each
assets/style.css    shared design tokens + components (light/dark)
assets/common.js    shared helpers: canvas/DPR, theme colors, sliders, vec3/mat4, meshes
SPEC.md             page contract, conventions and definition of done
```

Conventions: column-major matrices, `MVP = P · V · M`, right-handed and y-up, camera looks down −Z, OpenGL clip space (NDC z ∈ [−1, 1]). Chapter 08 covers how Direct3D, Vulkan, Metal and WebGPU differ.

## Formulas

Formula boxes (`<div class="math">`) contain **MathML**, which browsers render natively, so there is no math library and no network request. The MathML was generated from LaTeX with [KaTeX](https://katex.org) (`output: "mathml"`), and each formula keeps its LaTeX source in an `<annotation encoding="application/x-tex">` element.

To change a formula, edit its LaTeX and regenerate the MathML, for example:

```js
katex.renderToString(tex, { displayMode: true, output: "mathml" })
```

Chrome ignores MathML's `columnalign` attribute, so `style.css` lines up multi-line equations (`aligned`, `cases`) with CSS.

## Updating the stylesheet

Every page links `style.css?v=N`. GitHub Pages lets browsers cache files for 10 minutes, so after changing `assets/style.css`, bump `N` in all pages. Otherwise visitors can get the new HTML with the old CSS.

## How it was made

The shared kit and spec were written first, then frozen. Nine AI agents each wrote one chapter in parallel against that contract. All visuals are procedural (Canvas2D, plus WebGL where it helps), and formulas are native MathML, so the site makes no network requests beyond Google Fonts.

## License

MIT
