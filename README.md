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
- **Client-Side Image Compression**: An asynchronous HTML5 Canvas compressor (`resizeAndCompress`) scales uploaded photos to a maximum of 1080px (Instagram standard) and profile avatars to 256px, converting them to compressed JPEGs before saving. This reduces raw image weights by ~95%, bypassing browser LocalStorage limits and preventing crash issues.
- **Data Persistence**: Automatically stores custom posts, avatar changes, and bio adjustments in your browser's LocalStorage.

---

## 🛠️ Tech Stack

- **Structure**: Semantic HTML5.
- **Styling**: Vanilla CSS3 (CSS Custom Properties, CSS Grid, custom scrollbars, active slide animations).
- **Logic**: Vanilla ES6 JavaScript (Touch/mouse drag event listeners, HTML5 Canvas API, LocalStorage).
- **Icons**: Inline scalable SVGs.

---

## 🚀 How to Run Locally

You can run this application without compiling or installing any dependencies:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Start a local HTTP server**:
   If you have Python installed, you can start a server directly from your terminal:
   ```bash
   python3 -m http.server 8080
   ```
   *Or with Node.js:*
   ```bash
   npx serve .
   ```

3. **Open the browser**:
   Navigate to [http://localhost:8080](http://localhost:8080) to interact with the simulator.
