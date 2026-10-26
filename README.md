# Seatpeek

Get a peek before you take your seat.

An interactive Singapore Indoor Stadium explorer with a colour-coded seating plan, an illustrative 3D arena and representative stage views. This personal project explores how concertgoers can understand their section before attending a concert.

**Live site:** https://meeyaow2.github.io/seatpeek/

## Features

- Interactive 3D arena, top-down seating plan and section-view camera.
- Level 2, Level 3 and standing-area selection.
- Section, row and seat ticket inputs, with section highlighting.
- Viewer height and seated/standing eye-level estimates.
- Normal and Concert modes, with illustrative performers, crowds, lightsticks and lighting.
- A 29-song EXO playlist using individual YouTube releases and a visible player.
- Responsive phone, tablet and desktop layouts, with touch rotation and pinch-to-zoom.
- Shareable view URLs and reduced-motion support.

## Run locally

No build step or dependency installation is required. From the repository root, run:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000 in your browser. Use an HTTP server rather than opening `index.html` directly so browser APIs and embedded media have a normal origin.

With Node.js installed, check the application JavaScript:

```sh
npm run check
```

## Deploy

GitHub Pages publishes the repository's `main` branch from `/ (root)`.

- Live URL: https://meeyaow2.github.io/seatpeek/
- The root `index.html` opens the application in `dist/`, preserving shared URL parameters.
- `.nojekyll` keeps the site static and prevents README-to-homepage generation.
- Changes pushed to `main` publish through GitHub's built-in Pages deployment.
- `.github/workflows/pages.yml` checks JavaScript and entry points only; it does not run a competing deployment.
- In Settings → Pages, keep Source set to **Deploy from a branch**, branch **main**, folder **/ (root)**.

The existing ChatGPT-hosted site is separate. The optional `vercel.json` supports static hosting on Vercel.

## Project structure

```text
dist/
  index.html             Page structure and accuracy/reference information
  style.css              Interface and responsive styles
  app.js                 Three.js arena, cameras, ticket controls and gestures
  crowd.js               Crowd geometry and animation
  reference-layout.js    Concert section and stage geometry
  tracks.js              Playlist metadata and YouTube video IDs
  playlist.js            YouTube playback and compact-player controls
  three.min.js           Vendored Three.js runtime
  THREE-LICENSE.txt      Third-party Three.js licence
  *.png / *.jpg          Supplied venue and concert reference images
```

Additional earlier section data and reference images are retained with the exported project.

## Accuracy and playback limits

This is an illustrative prototype, not an official venue map or measured seat-view service. The supplied EXhOrizon seating reference informs section outlines and categories. Individual chair positions, row counts, dimensions, audience placement and sightlines are estimated.

Ticket row and seat numbers are preserved as entered, but the map currently locates the **section**, not the exact chair. Height-based views are approximate and should not be used as verified obstruction predictions.

The soundtrack follows the user's selected playlist; it is not a verified Singapore concert setlist. MAMA uses the official **MAMA (Rearranged)** audio release. YouTube controls embedding, ads, regional availability and autoplay. If autoplay is blocked, press Play. The player stays visible during playback; closing the full playlist minimises it, and backgrounding the browser tab pauses playback.

## Credits and rights

Created by Amanda Teo as a personal design and AI-assisted development project. Independent and unaffiliated with the venue, event organiser, ticketing provider, EXO or SM Entertainment.

Three.js is distributed under its included MIT licence. Reference photographs, seating plans, logos, music and artist materials belong to their respective rights holders; their inclusion does not grant redistribution rights. Music is embedded through YouTube rather than downloaded or hosted here. Google Fonts and the YouTube player require internet access.

No blanket licence is granted for the project or third-party assets by this README.
