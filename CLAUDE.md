# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Single-page, dependency-free QR code generator. Plain HTML + CSS + vanilla JS, no
build step, no package manager, no tests. Three source files at the repo root:
`index.html`, `styles.css`, `app.js`.

## Running

Open `index.html` directly in a browser, or serve the folder statically:

```
python3 -m http.server 8000
```

There is nothing to build, lint, or test.

## Architecture

- **`qrcodejs` (v1.0.0) is loaded from a CDN** in `index.html`, not vendored or
  installed. It exposes the global `QRCode`, which `app.js` instantiates against
  the `#containerQR` element. `QR.makeCode(value)` renders/replaces the QR image.
- **The HTML `id` attributes are the contract between markup and script.**
  `app.js` reads `containerQR`, `qrForm`, and `qr-link` by id; renaming any of
  them in `index.html` breaks the wiring silently. Form submit is intercepted
  (`preventDefault`) and the input value is passed straight to `makeCode`.
- **`styles.css` is driven by CSS custom properties in `:root`** — colors,
  `--app-max-width`, and the QR frame geometry (`--b` border, `--c` corner size,
  `--r` radius). The decorative L-shaped corner brackets around the QR come from
  `.qr-container::before` using layered `conic-gradient` masks with
  `mask-composite`; adjust the `--c`/`--b`/`--r` vars rather than hand-editing the
  gradient.
