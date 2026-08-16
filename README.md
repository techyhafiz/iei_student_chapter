# NULLSEC // Department of Cybersecurity Landing Page

> **Break Systems. Build Defenders.**  
> A high-performance, dark-themed, interactive landing page for the NULLSEC Cybersecurity Club.

![NULLSEC Landing Page](assets/hero_bg_user.png)

---

## ⚡ Features

- **Cyberpunk / Tactical Design System**: High-contrast typography (`Space Grotesk`, `JetBrains Mono`, `Inter`), glowing accent indicators, and glassmorphic UI elements.
- **Interactive 3D Stacked Operators Deck**: 3D rotating stacked card deck displaying club leadership with 2-second auto-progression, hover pause, centered navigation controls, and animated dynamic profile transitions.
- **Smooth Inertial Scrolling**: Powered by [Lenis](https://lenis.darkroom.engineering/) and [GSAP ScrollTrigger](https://greensock.com/gsap/).
- **Event Timeline & CTF Showcase**: Interactive tabs for workshops, hackathons, and CTF achievements.
- **Responsive Layout**: Designed for seamless performance across mobile, tablet, and desktop viewports.

---

## 📁 Repository Structure

```
club/
├── index.html        # Main HTML structure & SEO tags
├── styles.css        # Core stylesheet & design tokens
├── operators.css     # 3D Stacked Deck Operators Carousel styles
├── operators.js      # Operators Deck JavaScript controller & autoplay
├── script.js         # GSAP animations, Lenis smooth scroll, & lightbox
└── assets/
    └── hero_bg_user.png   # Hero section background asset
```

---

## 🚀 Quick Start (Local Setup)

1. Clone or download this repository.
2. Open `index.html` directly in any web browser, or serve it using a local dev server (e.g. VS Code Live Server / Python HTTP Server):

```bash
# Optional: Serve locally with Python
python -m http.server 8000
```

3. Visit `http://localhost:8000` in your browser.

---

## 🌐 Deploying to GitHub Pages

1. Push the contents of the `club` folder to your GitHub repository.
2. Go to **Settings** > **Pages** in your repository.
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`
   - **Branch**: Select `main` / `root` (`/`) and click **Save**.
4. Your site will be live on GitHub Pages in 1-2 minutes!

---

© 2025 NULLSEC // DEPT. OF CYBERSECURITY
