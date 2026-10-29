# Scroll-Linked Image Sequence on Canvas

An Apple-style, high-performance scroll-driven image sequence animation built on HTML5 Canvas.

## Features

- **Hardware-Accelerated Frame Extraction**: Decodes the uploaded mechanical watch disassembly video (`watch-exploded.mp4`) directly into memory (`ImageBitmap` objects) in the browser, eliminating network requests during scrolling.
- **Retina / High-DPI Support**: Automatically scales with `window.devicePixelRatio` for crystal-clear visuals on mobile, tablet, and 4K desktop screens.
- **Silky 60fps / 120fps Lerp Smoothing**: Linear interpolation (`targetFrame += diff * lerpFactor`) via `requestAnimationFrame` delivers the buttery smooth glide popularized by Apple product pages. Can be toggled to instant raw scrub.
- **Cinematic Scrollytelling Overlays**: Dynamic glassmorphic story cards fade in and out at exact deconstruction milestones:
  1. *Aurelia Chrono 1888* (Fully assembled watch)
  2. *Precision Lug Separation* (Spring pins & Italian leather strap disengage)
  3. *Double-Domed Sapphire Crystal* (Bezel and AR-coated lens separate)
  4. *The Skeleton Calibre* (28,800 VPH mechanical movement & balance wheel exposed)
  5. *Kinematic Deconstruction* (All 180 components floating in 3D harmony)
- **Interactive Scrubber & HUD**: Real-time frame counter, scroll percentage, timestamp, FPS meter, and draggable scrub bar.
- **Contain vs. Cover Aspect Modes**: Toggle between full product geometry view and cinematic edge-to-edge bleed.
- **Scroll Track Multiplier**: Adjust scroll height on the fly (3x = 300vh, 5x = 500vh, 8x = 800vh) to customize scroll resistance.
- **Custom Media Loader**: Drag & drop any MP4/WebM video or folder of numbered images (`.webp`, `.png`, `.jpg`).
- **Frame Sequence Exporter**: Export single frame snapshots or batch download extracted sequence frames as PNG.
- **Keyboard Shortcuts**:
  - `[Space]`: Toggle Auto-Preview loop
  - `[↓] / [→] / [j]`: Advance 1 frame
  - `[↑] / [←] / [k]`: Reverse 1 frame
  - `[F]`: Toggle Contain / Cover mode
  - `[S]`: Toggle Smooth Lerp

## Running the Project

Start the included zero-dependency range-request HTTP server:

```bash
pnpm start
# or
node server.js
```

Then open `http://localhost:3000` in your web browser.

## Project Structure

```
scroll-canvas-sequence/
├── assets/
│   └── watch-exploded.mp4     # The mechanical watch deconstruction video
├── index.html                 # Semantic markup & sticky viewport stage
├── style.css                  # Apple/Swiss luxury glassmorphism styles
├── app.js                     # Canvas scroller, video decoder, lerp engine
├── server.js                  # Node.js HTTP server supporting Range requests
├── package.json               # Project manifest
└── README.md
```
