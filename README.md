# Instagram Profile Feed Simulator & iPhone 16 Pro Max Mockup

A premium, interactive web-based simulator designed to create, preview, and curate an Instagram profile grid feed on a highly realistic, responsive iPhone 16 Pro Max frame. Built as a high-fidelity Single Page Application (SPA) using clean, modern HTML5, CSS3, and ES6 JavaScript.

## 📲 Live Features

- **iPhone 16 Pro Max Mockup**: A realistic physical frame containing side buttons (including Action and Camera Control buttons), dynamic iOS overlays (battery indicator, wifi, live status clock), and dynamic island.
- **Instagram Profile Simulation**:
  - Direct profile layout matching Instagram's metadata block (customizable Display Name, Category, multiline Bio text, and Website Link).
  - Live statistics columns synchronizing post count, followers count, and following count.
  - Interactive story highlights tray (circles style).
  - Grid View Tab Bar (Grid, Reels, Tagged).
- **4:5 Aspect Ratio Grid**: A 3-column feed grid displaying post thumbnails in vertical 4:5 portrait ratio (preventing text titles or graphic headers from being cropped on preview).
- **Slide-up Detail Overlay**: Click any grid item to open its dedicated post detail layout, complete with headers, location tags, action bars, and comments.
- **Interactive Multi-Photo Carousels**:
  - Overlapping-sheets badge indicator in the top-right corner of grid thumbnails.
  - Interactive swiping: drag/swipe horizontally (with touch or mouse) or click the navigation arrows to glide through carousel photos.
  - Active dot indicators mapping the slide progress.
- **Double-Tap to Like**: Double-click any photo in the detail view to trigger a heart animation and toggle the post's like state.
- **Instagram Live Sync**: One-click in-app synchronization to automatically fetch official posts, multi-photo carousels, captions, avatar, and follower statistics from `@lasertech_schio` (or any public Instagram profile).
- **Client-Side Image Compression**: An asynchronous HTML5 Canvas compressor (`resizeAndCompress`) scales uploaded photos to a maximum of 1080px (Instagram standard) and profile avatars to 256px, converting them to compressed JPEGs before saving. This reduces raw image weights by ~95%, bypassing browser LocalStorage limits and preventing crash issues.
- **Data Persistence**: Automatically stores custom posts, avatar changes, and bio adjustments in your browser's LocalStorage.

---

## 🛠️ Tech Stack

- **Structure**: Semantic HTML5.
- **Styling**: Vanilla CSS3 (CSS Custom Properties, CSS Grid, custom scrollbars, active slide animations).
- **Logic**: Vanilla ES6 JavaScript (Touch/mouse drag event listeners, HTML5 Canvas API, LocalStorage).
- **Backend & Sync**: Lightweight Python 3 server (`server.py` and `ig_sync.py`) for static serving and live Instagram fetching with image optimization.
- **Icons**: Inline scalable SVGs.

---

## 🚀 How to Run Locally

You can run this application without compiling or installing external packages:

1. **Start the local server** (with Live Sync support):
   ```bash
   python3 server.py 8080
   ```
   *Or using npm:*
   ```bash
   npm start
   ```

2. **Open the browser**:
   Navigate to [http://localhost:8080](http://localhost:8080) to interact with the simulator.

3. **Sync from Instagram**:
   Click the **"Sincronizza Post Ufficiali"** button in the left sidebar to automatically fetch the official feed from `@lasertech_schio` into the iPhone mockup!

4. *(Optional) CLI Standalone Sync*:
   You can also sync directly from terminal:
   ```bash
   python3 sync_lasertech.py --limit 12
   ```
   This generates a `lasertech_schio_project.json` file that you can import with the "Import Project" button.

