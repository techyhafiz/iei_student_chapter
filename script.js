/* ============================================================
   NULLSEC — interaction engine
   Lenis smooth scroll + GSAP ScrollTrigger + custom FX
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  var hasLenis = typeof Lenis !== "undefined";

  if (!hasGsap) { document.documentElement.classList.add("no-gsap"); }
  if (reduced) { hasGsap = false; }

  var lenis = null;

  /* ------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------ */
  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pad3(n) { n = Math.round(n); return (n < 10 ? "00" : n < 100 ? "0" : "") + n; }

  /* ------------------------------------------------------------
     BACKGROUND MID LAYER — floating hex fragments
     ------------------------------------------------------------ */
  var bgMid = $("#bgMid");
  var hexWords = ["0x7F3A", "0xDEAD", "0xBEEF", "AES::256", "SHA-512", "TCP/443", "SYN→ACK", "0-DAY", "ROOT::", "FF:1A", "NULL", "PTR", "0xC0DE", "DNS?", "TLS1.3", "EOF"];
  var bits = [];
  if (bgMid) {
    for (var i = 0; i < 16; i++) {
      var b = document.createElement("span");
      b.className = "hexbit";
      b.textContent = hexWords[i % hexWords.length];
      b.style.left = rand(2, 94) + "%";
      b.style.top = rand(2, 140) + "%";
      b.style.opacity = rand(.15, .5).toFixed(2);
      b.dataset.spd = rand(.04, .22).toFixed(3);
      bgMid.appendChild(b);
      bits.push(b);
    }
  }

  /* ------------------------------------------------------------
      HERO GLYPH FIELD — procedural canvas background
      Dim binary/hex grid that reacts to the cursor and runs
      autonomous radar pulses, scan beams and glitch sparks.
      Theme-aware, DPR-aware, pauses off-screen / hidden tab.
      ------------------------------------------------------------ */
  (function () {
    var cv = $("#heroFx");
    if (!cv || !cv.getContext) { return; }
    var ctx = cv.getContext("2d");
    var base = document.createElement("canvas");
    var bctx = base.getContext("2d");
    if (!ctx || !bctx) { return; }

    var CELL = 22;
    var FONT = '10px "JetBrains Mono", monospace';
    var GLYPHS = "0000000001111111111ABCDEF7X·+".split("");
    var R_MOUSE = 180;
    var R_CORE = 70;

    var dpr = 1, W = 0, H = 0, cols = 0, rows = 0;
    var cells = [];
    var mouse = { x: -9e3, y: -9e3 };
    var pulses = [], beams = [], bursts = [];
    var tPulse = 1600, tBeam = 5200, tBurst = 400;
    var rafId = 0, running = false, last = 0, lastBase = 0;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var light = document.documentElement.getAttribute("data-theme") === "light";

    function pal() {
      return light
        ? { base: "24,27,34", hi: "148,94,0", glow: "184,125,0" }
        : { base: "212,160,23", hi: "242,193,78", glow: "242,193,78" };
    }

    function size() {
      var host = cv.parentElement.getBoundingClientRect();
      W = Math.max(1, Math.ceil(host.width));
      H = Math.max(1, Math.ceil(host.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      base.width = W * dpr; base.height = H * dpr;
      cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
      cells = new Array(cols * rows);
      for (var i = 0; i < cells.length; i++) {
        cells[i] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
    }

    /* slow spatial wobble so the base field has organic bright patches */
    function patchNoise(c, r, t) {
      return (Math.sin(c * .34 + Math.cos(r * .5 + t) * 2.2) +
              Math.sin(r * .27 + c * .12)) * .25 + .5;
    }

    function renderBase(now) {
      var p = pal();
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, W, H);
      bctx.font = FONT;
      bctx.textAlign = "center";
      bctx.textBaseline = "middle";
      var t = now * .00006;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i = r * cols + c;
          if (Math.random() < .02) { cells[i] = GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
          var a = .03 + patchNoise(c, r, t) * .11;
          bctx.fillStyle = "rgba(" + p.base + "," + a.toFixed(3) + ")";
          bctx.fillText(cells[i], c * CELL + CELL / 2, r * CELL + CELL / 2);
        }
      }
    }

    function lit(ch, x, y, alpha, color) {
      ctx.fillStyle = "rgba(" + color + "," + (alpha > 1 ? 1 : alpha).toFixed(3) + ")";
      ctx.fillText(ch, x, y);
    }

    function drawFrame(now) {
      var dt = Math.min(100, now - last || 16);
      last = now;
      var p = pal();

      if (now - lastBase > 240) { renderBase(now); lastBase = now; }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(base, 0, 0, W, H);
      ctx.font = FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      /* spawn autonomous events */
      tPulse -= dt; tBeam -= dt; tBurst -= dt;
      if (tPulse <= 0) {
        pulses.push({ x: W * rand(.35, .95), y: H * rand(.15, .8), r: 10, v: rand(.09, .14), max: Math.max(W, H) * .5 });
        tPulse = rand(3800, 6500);
      }
      if (tBeam <= 0) {
        beams.push({ y: -20, v: rand(.03, .05) });
        tBeam = rand(8000, 13000);
      }
      if (tBurst <= 0) {
        bursts.push({ x: rand(0, cols) | 0, y: rand(0, rows) | 0, life: 1 });
        tBurst = rand(260, 620);
      }

      /* radar pulses — ring band lights glyphs as it passes */
      var i, p2, c, r, dist, band;
      for (i = pulses.length - 1; i >= 0; i--) {
        p2 = pulses[i];
        p2.r += p2.v * dt;
        if (p2.r > p2.max) { pulses.splice(i, 1); continue; }
        var fade = 1 - p2.r / p2.max;
        var cMin = Math.max(0, ((p2.x - p2.r) / CELL) | 0), cMax = Math.min(cols - 1, ((p2.x + p2.r) / CELL) | 0);
        var rMin = Math.max(0, ((p2.y - p2.r) / CELL) | 0), rMax = Math.min(rows - 1, ((p2.y + p2.r) / CELL) | 0);
        for (r = rMin; r <= rMax; r++) {
          for (c = cMin; c <= cMax; c++) {
            dist = Math.hypot(c * CELL + CELL / 2 - p2.x, r * CELL + CELL / 2 - p2.y);
            band = Math.abs(dist - p2.r);
            if (band < CELL) {
              lit(cells[r * cols + c], c * CELL + CELL / 2, r * CELL + CELL / 2,
                  (1 - band / CELL) * .55 * fade, p.hi);
            }
          }
        }
        ctx.strokeStyle = "rgba(" + p.glow + "," + (.07 * fade).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, p2.r, 0, 6.2832);
        ctx.stroke();
      }

      /* scan beam — horizontal band sweeping down */
      for (i = beams.length - 1; i >= 0; i--) {
        var bm = beams[i];
        bm.y += bm.v * dt;
        if (bm.y > H + 40) { beams.splice(i, 1); continue; }
        var rr = Math.max(0, (((bm.y - 30) / CELL) | 0));
        var rrMax = Math.min(rows - 1, ((bm.y + 30) / CELL) | 0);
        for (r = rr; r <= rrMax; r++) {
          var fall = 1 - Math.abs(r * CELL + CELL / 2 - bm.y) / 30;
          for (c = 0; c < cols; c++) {
            lit(cells[r * cols + c], c * CELL + CELL / 2, r * CELL + CELL / 2, fall * .28, p.base);
          }
        }
        ctx.fillStyle = "rgba(" + p.glow + ",.05)";
        ctx.fillRect(0, bm.y - .5, W, 1);
      }

      /* glitch sparks — single cells flash and decay */
      for (i = bursts.length - 1; i >= 0; i--) {
        var bu = bursts[i];
        bu.life -= dt / 700;
        if (bu.life <= 0) { bursts.splice(i, 1); continue; }
        lit(bu.ch || (bu.ch = cells[bu.y * cols + bu.x]),
            bu.x * CELL + CELL / 2, bu.y * CELL + CELL / 2, bu.life * .9, p.hi);
      }

      /* cursor spotlight — proximity glow + core scramble */
      if (mouse.x > -999) {
        var mc = Math.max(0, (((mouse.x - R_MOUSE) / CELL) | 0)), mcMax = Math.min(cols - 1, ((mouse.x + R_MOUSE) / CELL) | 0);
        var mr = Math.max(0, (((mouse.y - R_MOUSE) / CELL) | 0)), mrMax = Math.min(rows - 1, ((mouse.y + R_MOUSE) / CELL) | 0);
        for (r = mr; r <= mrMax; r++) {
          for (c = mc; c <= mcMax; c++) {
            dist = Math.hypot(c * CELL + CELL / 2 - mouse.x, r * CELL + CELL / 2 - mouse.y);
            if (dist < R_MOUSE) {
              var near = 1 - dist / R_MOUSE;
              var ch = cells[r * cols + c];
              if (dist < R_CORE && Math.random() < .3) {
                ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
              }
              lit(ch, c * CELL + CELL / 2, r * CELL + CELL / 2, near * near * .85, dist < R_CORE ? p.hi : p.glow);
            }
          }
        }
      }
    }

    function loop(now) {
      if (!running) { return; }
      drawFrame(now);
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reducedMotion) { return; }
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    window.addEventListener("mousemove", function (e) {
      var box = cv.getBoundingClientRect();
      mouse.x = e.clientX - box.left;
      mouse.y = e.clientY - box.top;
      if (mouse.x < -60 || mouse.y < -60 || mouse.x > W + 60 || mouse.y > H + 60) {
        mouse.x = -9e3; mouse.y = -9e3;
      }
    }, { passive: true });

    document.addEventListener("mouseleave", function () { mouse.x = -9e3; mouse.y = -9e3; });

    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(cv);
    } else { start(); }

    if ("MutationObserver" in window) {
      new MutationObserver(function () {
        light = document.documentElement.getAttribute("data-theme") === "light";
        renderBase(performance.now());
      }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    }

    var rsz;
    window.addEventListener("resize", function () {
      clearTimeout(rsz);
      rsz = setTimeout(function () {
        size();
        pulses.length = 0;
        beams.length = 0;
        bursts.length = 0;
        renderBase(performance.now());
        if (reducedMotion) { drawFrame(performance.now()); }
      }, 150);
    });

    window.addEventListener("load", function () {
      size();
      renderBase(performance.now());
      if (reducedMotion) { drawFrame(performance.now()); }
    });

    size();
    renderBase(performance.now());
    if (reducedMotion) { drawFrame(performance.now()); }
  })();
  /* ------------------------------------------------------------
     HERO TITLE — split into masked lines
     ------------------------------------------------------------ */
  var heroTitle = $("#heroTitle");
  if (heroTitle) {
    var parts = heroTitle.innerHTML.split("<br>");
    heroTitle.innerHTML = parts.map(function (l, i) {
      return '<span class="line"><span' + (i === 1 ? ' class="accent-line"' : '') + '>' + l.trim() + '</span></span>';
    }).join("");
  }

  /* ------------------------------------------------------------
     PRELOADER — boot sequence
     ⚠️ NOTE: the loader markup in index.html is commented out for
     faster local debugging. UNCOMMENT it before deployment.
     (runLoader safely skips the boot animation when #loader is missing.)
     ------------------------------------------------------------ */
  var loader = $("#loader");
  var loadLines = $("#loadLines");
  var loadFill = $("#loadFill");
  var loadPct = $("#loadPct");
  var bootSeq = [
    "> initializing IEI Student Chapter kernel .......... [ok]",
    "> mounting /dev/ghrcemp ................ [ok]",
    "> handshake: IEI student chapter ....... [ok]",
    "> decrypting interface ................. [ok]"
  ];

  function finishLoader() {
    if (loader) { loader.classList.add("done"); }
    document.body.style.overflow = "";
    playHeroIntro();
  }

  function runLoader() {
    if (!loader || reduced || !hasGsap) { finishLoader(); return; }
    document.body.style.overflow = "hidden";
    var li = 0, ci = 0, current = "";
    var totalChars = bootSeq.join("").length;
    var doneChars = 0;

    function step() {
      if (li >= bootSeq.length) {
        loadFill.style.width = "100%";
        loadPct.textContent = "100%";
        setTimeout(finishLoader, 350);
        return;
      }
      var line = bootSeq[li];
      if (ci < line.length) {
        current += line[ci]; ci++; doneChars++;
        var pct = Math.min(100, (doneChars / totalChars) * 100);
        loadFill.style.width = pct + "%";
        loadPct.textContent = pad3(pct) + "%";
        renderLoadLines(current, false);
        setTimeout(step, line[ci - 1] === "." ? 14 : rand(8, 26));
      } else {
        renderLoadLines(current, true);
        current = ""; ci = 0; li++;
        setTimeout(step, 120);
      }
    }
    function renderLoadLines(typing, lineDone) {
      var html = "";
      for (var k = 0; k < li; k++) {
        html += bootSeq[k].replace("[ok]", '<span class="ok">[ok]</span>') + "\n";
      }
      if (!lineDone && typing) { html += typing + '<span class="caret"></span>'; }
      loadLines.innerHTML = html;
    }
    setTimeout(step, 300);
  }

  /* ------------------------------------------------------------
     HERO INTRO TIMELINE
     ------------------------------------------------------------ */
  function playHeroIntro() {
    if (!hasGsap) { return; }
    var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero-bg", { scale: 1.08, opacity: 0, duration: 1.6, ease: "power2.out" }, 0)
      .from(".hero-kicker", { y: 24, opacity: 0, duration: .8 }, .15)
      .from("#heroTitle .line span", { yPercent: 115, duration: 1.1, stagger: .14 }, .25)
      .from(".hero-sub", { y: 26, opacity: 0, duration: .9 }, .75)
      .from(".hero-cta .btn", { y: 22, opacity: 0, duration: .7, stagger: .12 }, .95)
      .from(".hero-stats-bar", { y: 40, opacity: 0, duration: 1 }, 1.1)
      .from(".scroll-hint", { opacity: 0, duration: 1 }, 1.3);
  }

  /* ------------------------------------------------------------
     LENIS SMOOTH SCROLL
     ------------------------------------------------------------ */
  if (hasLenis && hasGsap && !reduced) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToHash(hash) {
    var el = document.querySelector(hash);
    if (!el) return;
    if (lenis) { lenis.scrollTo(el, { offset: -70, duration: 1.4 }); }
    else { el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); }
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute("href");
    if (hash.length > 1) {
      e.preventDefault();
      closeMobileMenu();
      scrollToHash(hash);
      if (history.pushState) history.pushState(null, "", hash);
    }
  });

  /* ------------------------------------------------------------
     NAV — scrolled state, active link, mobile menu
     ------------------------------------------------------------ */
  var nav = $("#nav");
  var burger = $("#burger");
  var mobileMenu = $("#mobileMenu");

  function onScrollNav() {
    var y = window.pageYOffset;
    if (nav) { nav.classList.toggle("scrolled", y > 40); }
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
  }
  if (burger && mobileMenu) {
    burger.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
      if (lenis) { open ? lenis.stop() : lenis.start(); }
    });
  }

  /* ------------------------------------------------------------
     THEME TOGGLE — light/dark with persistence
     ------------------------------------------------------------ */
  var themeToggle = $("#themeToggle");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeToggle) themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  }

  if (themeToggle) {
    var stored = null;
    try { stored = localStorage.getItem("iei-theme"); } catch (e) { }
    applyTheme(stored === "light" ? "light" : "dark");
    themeToggle.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem("iei-theme", next); } catch (e) { }
    });
  }

  var navSectionIds = ["about", "events", "gallery", "team", "join"];
  function setActive(id) {
    $all(".nav-links a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  }
  if (hasGsap) {
    navSectionIds.forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: "top 45%", end: "bottom 45%",
        onToggle: function (self) { if (self.isActive) setActive(id); }
      });
    });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: "-40% 0px -50% 0px" });
    navSectionIds.forEach(function (id) {
      var s = document.getElementById(id); if (s) io.observe(s);
    });
  }

  /* ------------------------------------------------------------
     PROGRESS BAR + QUICK NAV BACK TO TOP + PARALLAX LAYERS
     ------------------------------------------------------------ */
  var progressBar = $("#progressBar");
  var quickNav = $("#quickNav");
  var btnQuickTop = $("#btnQuickTop");

  function updateProgress() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (progressBar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
    }
    if (quickNav) {
      if (scrollY > 380) {
        quickNav.classList.add("is-visible");
      } else {
        quickNav.classList.remove("is-visible");
      }
    }
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  if (btnQuickTop) {
    btnQuickTop.addEventListener("click", function () {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (hasGsap && !reduced) {
    gsap.to("#bgGrid", { yPercent: 5, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true } });
    gsap.to("#bgGlow", { yPercent: -8, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true } });

    ScrollTrigger.create({
      trigger: document.body, start: "top top", end: "bottom bottom",
      onUpdate: function (self) {
        var y = self.scroll();
        for (var i = 0; i < bits.length; i++) {
          bits[i].style.transform = "translateY(" + (-y * parseFloat(bits[i].dataset.spd)) + "px)";
        }
      }
    });
  }

  /* ------------------------------------------------------------
     HERO — scroll parallax for background image
     ------------------------------------------------------------ */
  if (hasGsap && !reduced) {
    gsap.to("#heroFx", {
      yPercent: 12, scale: 1.05, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero-content", {
      yPercent: -25, opacity: .1, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "80% top", scrub: true }
    });
    gsap.to(".hero-bg", {
      opacity: .25, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero-stats-bar", {
      yPercent: 30, opacity: 0, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "60% top", end: "bottom top", scrub: true }
    });
  }

  /* ------------------------------------------------------------
     REVEALS
     ------------------------------------------------------------ */
  if (hasGsap && !reduced) {
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el,
        { y: 38, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true }
        }
      );
    });
  } else {
    // CSS/IO fallback
    var rio = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.style.opacity = 1; en.target.style.transform = "none"; rio.unobserve(en.target); }
      });
    }, { threshold: .12 }) : null;
    $all("[data-reveal]").forEach(function (el) {
      if (rio) rio.observe(el); else { el.style.opacity = 1; el.style.transform = "none"; }
    });
  }

  /* ------------------------------------------------------------
     ABOUT TERMINAL — typed sequence
     ------------------------------------------------------------ */
  var termBody = $("#termBody");
  var termScript = [
    { t: "whoami", c: "cmd" },
    { t: "iei student chapter // ghrcemp", c: "out" },
    { t: "cat mission.txt", c: "cmd" },
    { t: "turn curiosity into engineering capability.", c: "out" },
    { t: "ls labs/", c: "cmd" },
    { t: "web/  pwn/  crypto/  forensics/  osint/", c: "out" },
    { t: "./join --now", c: "cmd" },
    { t: "[ok] access_granted — see you friday 17:00", c: "ok" }
  ];
  var termStarted = false;

  function renderTermInstant() {
    if (!termBody) return;
    termBody.innerHTML = termScript.map(function (l) {
      return '<div class="' + l.c + '">' + l.t + '</div>';
    }).join("") + '<span class="caret"></span>';
  }

  function typeTerm() {
    if (termStarted || !termBody) return;
    termStarted = true;
    if (!hasGsap || reduced) { renderTermInstant(); return; }
    var li = 0;
    function nextLine() {
      if (li >= termScript.length) {
        termBody.insertAdjacentHTML("beforeend", '<span class="caret"></span>');
        return;
      }
      var line = termScript[li];
      var div = document.createElement("div");
      div.className = line.c;
      termBody.appendChild(div);
      var ci = 0;
      var speed = line.c === "cmd" ? 42 : 12;
      (function ch() {
        if (ci <= line.t.length) {
          div.textContent = line.t.slice(0, ci);
          ci++;
          setTimeout(ch, speed);
        } else {
          li++;
          setTimeout(nextLine, line.c === "cmd" ? 260 : 140);
        }
      })();
    }
    nextLine();
  }

  if (termBody) {
    if (hasGsap && !reduced) {
      ScrollTrigger.create({ trigger: "#about", start: "top 62%", once: true, onEnter: typeTerm });
    } else if ("IntersectionObserver" in window) {
      var tio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { typeTerm(); tio.disconnect(); }
      }, { threshold: .3 });
      tio.observe($("#about"));
    } else { renderTermInstant(); }
  }

  /* ------------------------------------------------------------
     STAT COUNTERS
     ------------------------------------------------------------ */
  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var suffix = el.dataset.suffix || "";
    if (!hasGsap || reduced) { el.textContent = target + suffix; return; }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.8, ease: "power2.out", onUpdate: function () {
        el.textContent = Math.round(obj.v) + suffix;
      }
    });
  }
  if (hasGsap && !reduced) {
    $all("[data-count]").forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: function () { animateCount(el); } });
    });
  } else {
    $all("[data-count]").forEach(animateCount);
  }

  /* ------------------------------------------------------------
     EVENTS — activity calendar timeline (HORIZONTAL)
     alternating branches + filter + scroll/drag navigation.
     Default view anchors on the next upcoming event so past
     events trail off faded to the left.
     ------------------------------------------------------------ */
  var evTrack = $("#evTrack");
  var evViewport = $("#evViewport");
  var evShell = $("#evShell");
  if (evTrack && evViewport && evShell) {

    function refreshTimelineAlternation() {
      var visibleNodes = $all(".tl-node:not(.tl-eof):not(.is-hidden)", evTrack);
      visibleNodes.forEach(function (node, i) {
        (i % 2 === 0) ? node.classList.remove("tl-alt") : node.classList.add("tl-alt");
      });
    }

    function tlMaxScroll() {
      return Math.max(0, evViewport.scrollWidth - evViewport.clientWidth);
    }

    /* arrows disabled state + left/right edge fades */
    function updateTlChrome() {
      var x = evViewport.scrollLeft;
      var max = tlMaxScroll();
      var prev = $(".tl-prev", evShell);
      var next = $(".tl-next", evShell);
      if (prev) { prev.disabled = x <= 2; }
      if (next) { next.disabled = x >= max - 2; }
      evShell.classList.toggle("at-start", x <= 2);
      evShell.classList.toggle("at-end", x >= max - 2);
    }

    function tlGoTo(x, smooth) {
      evViewport.scrollTo({
        left: Math.max(0, Math.min(x, tlMaxScroll())),
        behavior: smooth && !reduced ? "smooth" : "auto"
      });
    }

    /* anchor on the first upcoming event (~1/3 from the left) */
    function tlFocusDefault(smooth) {
      var target = $(".tl-node[data-type='upcoming']:not(.is-hidden)", evTrack);
      if (!target) { tlGoTo(0, false); updateTlChrome(); return; }
      var x = evTrack.offsetLeft + target.offsetLeft - evViewport.clientWidth * .34;
      tlGoTo(x, smooth);
      updateTlChrome();
    }

    /* tap/click expands a card (drag across the strip won't trigger it) */
    var tlDragged = false;
    $all(".ev-card", evTrack).forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        if (tlDragged) return;
        card.classList.toggle("is-open");
      });
    });

    /* arrow buttons */
    var tlPrevBtn = $(".tl-prev", evShell);
    var tlNextBtn = $(".tl-next", evShell);
    if (tlPrevBtn) {
      tlPrevBtn.addEventListener("click", function () {
        tlGoTo(evViewport.scrollLeft - evViewport.clientWidth * .72, true);
      });
    }
    if (tlNextBtn) {
      tlNextBtn.addEventListener("click", function () {
        tlGoTo(evViewport.scrollLeft + evViewport.clientWidth * .72, true);
      });
    }

    evViewport.addEventListener("scroll", updateTlChrome, { passive: true });
    window.addEventListener("resize", updateTlChrome);

    /* mouse drag-to-scroll (touch scrolls natively) */
    var tlDrag = null;
    evViewport.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      tlDrag = { x: e.clientX, left: evViewport.scrollLeft, moved: 0 };
      evViewport.classList.add("is-dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!tlDrag) return;
      var dx = e.clientX - tlDrag.x;
      if (Math.abs(dx) > tlDrag.moved) { tlDrag.moved = Math.abs(dx); }
      evViewport.scrollLeft = tlDrag.left - dx;
      e.preventDefault();
    });
    window.addEventListener("pointerup", function () {
      if (!tlDrag) return;
      tlDragged = tlDrag.moved > 8;
      tlDrag = null;
      evViewport.classList.remove("is-dragging");
      if (tlDragged) {
        setTimeout(function () { tlDragged = false; }, 0);
      }
    });

    /* filter tabs: ALL / UPCOMING / COMPLETED */
    var filterBtns = $all(".ev-filter-btn");
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var filter = btn.dataset.filter;
        var nodes = $all(".tl-node:not(.tl-eof)", evTrack);
        nodes.forEach(function (node) {
          var type = node.dataset.type || "history";
          if (filter === "all" || type === filter) {
            node.classList.remove("is-hidden");
          } else {
            node.classList.add("is-hidden");
          }
        });
        refreshTimelineAlternation();
        tlFocusDefault(false);
        if (hasGsap && typeof ScrollTrigger !== "undefined") {
          ScrollTrigger.refresh();
        }
      });
    });

    refreshTimelineAlternation();
    updateTlChrome();
    tlFocusDefault(false);

    /* re-anchor once fonts/layout have fully settled */
    window.addEventListener("load", function () {
      tlFocusDefault(false);
    });
  }

  /* ------------------------------------------------------------
      GALLERY — per-item parallax drift + lightbox
      ------------------------------------------------------------ */
  if (hasGsap && !reduced) {
    $all(".gal-item").forEach(function (item) {
      var spd = parseFloat(item.dataset.speed || "1");
      var img = $(".gal-img", item);
      if (!img) return;
      gsap.set(img, { scale: 1.18 });
      gsap.fromTo(img,
        { yPercent: -7 * spd },
        {
          yPercent: 7 * spd, ease: "none",
          scrollTrigger: { trigger: item, start: "top bottom", end: "bottom top", scrub: true }
        }
      );
    });
    gsap.fromTo(".foot-word", { yPercent: 34 }, {
      yPercent: 6, ease: "none",
      scrollTrigger: { trigger: "footer", start: "top bottom", end: "bottom bottom", scrub: true }
    });
  }

  /* staggered entrance for the collage frames */
  if (hasGsap && !reduced && $(".gal")) {
    gsap.set(".gal-item", { opacity: 0, y: 34, scale: .97 });
    ScrollTrigger.batch(".gal-item", {
      start: "top 92%",
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1, y: 0, scale: 1,
          duration: .8, stagger: .07, ease: "power3.out",
          overwrite: true, clearProps: "transform"
        });
      }
    });
  }

  var GAL_BG = "#15181d", GAL_GOLD = "#d4a017", GAL_HI = "#f2c14e", GAL_OK = "#8a9a5b";

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function svgPlate(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="300" fill="' + GAL_BG + '"/>' + inner + '</svg>';
  }

  function hexpts(cx, cy, rad) {
    var p = [];
    for (var k = 0; k < 6; k++) {
      var a = Math.PI / 3 * k - Math.PI / 6;
      p.push((cx + rad * Math.cos(a)).toFixed(1) + "," + (cy + rad * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  }

  var GEN = [
    function dots(r) {
      var s = "";
      for (var row = 0; row < 8; row++) {
        for (var col = 0; col < 12; col++) {
          s += '<circle cx="' + (24 + col * 32) + '" cy="' + (24 + row * 36) + '" r="' + (r() < .9 ? 2 : 3.4) + '" fill="' + (r() < .07 ? GAL_HI : GAL_GOLD) + '" opacity="' + (.15 + .65 * r()).toFixed(2) + '"/>';
        }
      }
      return s;
    },
    function bars(r) {
      var s = "";
      for (var i = 0; i < 10; i++) {
        var h = 40 + Math.floor(r() * 215);
        s += '<rect x="' + (30 + i * 34) + '" y="' + (268 - h) + '" width="26" height="' + h + '" fill="' + (i % 4 === 2 ? GAL_HI : GAL_GOLD) + '" opacity="' + (.35 + .55 * r()).toFixed(2) + '"/>';
      }
      return s + '<line x1="20" y1="270" x2="386" y2="270" stroke="' + GAL_GOLD + '" opacity=".3"/>';
    },
    function waves(r) {
      var s = "";
      for (var li = 0; li < 3; li++) {
        var base = 70 + 70 * li, amp = 22 + 26 * r(), pts = "";
        for (var x = 0; x <= 400; x += 20) {
          var y = base + Math.sin(x / (28 + li * 9) + li * 1.7 + r() * .4) * amp;
          pts += x + "," + y.toFixed(1) + " ";
        }
        s += '<polyline points="' + pts.trim() + '" fill="none" stroke="' + (li === 1 ? GAL_HI : GAL_GOLD) + '" stroke-width="2" opacity="' + (li === 1 ? ".85" : ".35") + '"/>';
      }
      return s;
    },
    function hexes(r) {
      var s = "";
      for (var i = 0; i < 13; i++) {
        var cx = 20 + r() * 360, cy = 20 + r() * 260, rad = 8 + r() * 16;
        if (r() < .35) {
          s += '<polygon points="' + hexpts(cx, cy, rad) + '" fill="' + GAL_GOLD + '" opacity="' + (.12 + .22 * r()).toFixed(2) + '"/>';
        } else {
          s += '<polygon points="' + hexpts(cx, cy, rad) + '" fill="none" stroke="' + GAL_GOLD + '" stroke-width="1.2" opacity="' + (.2 + .5 * r()).toFixed(2) + '"/>';
        }
      }
      return s;
    },
    function rings(r) {
      var s = "";
      for (var c = 0; c < 2; c++) {
        var cx = 90 + r() * 220, cy = 70 + r() * 160;
        for (var k = 1; k <= 3; k++) {
          s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + k * (16 + r() * 9) + '" fill="none" stroke="' + GAL_GOLD + '" stroke-width="1.4" opacity="' + (.75 - .22 * k).toFixed(2) + '"/>';
        }
        s += '<line x1="' + cx + '" y1="' + (cy - 6) + '" x2="' + cx + '" y2="' + (cy + 6) + '" stroke="' + GAL_HI + '" stroke-width="1.6"/>';
        s += '<line x1="' + (cx - 6) + '" y1="' + cy + '" x2="' + (cx + 6) + '" y2="' + cy + '" stroke="' + GAL_HI + '" stroke-width="1.6"/>';
      }
      return s;
    },
    function diag(r) {
      var s = "";
      for (var k = 0; k < 14; k++) {
        var x = -80 + k * 40;
        s += '<line x1="' + x + '" y1="0" x2="' + (x + 220) + '" y2="300" stroke="' + (k % 4 === 2 ? GAL_HI : GAL_GOLD) + '" stroke-width="' + (k % 4 === 2 ? 2 : 1) + '" opacity="' + (.1 + .5 * r()).toFixed(2) + '"/>';
      }
      return s;
    },
    function blocks(r) {
      var s = "";
      for (var row = 0; row < 4; row++) {
        var y = 45 + row * 55, x = 36;
        while (x < 340) {
          var w = 8 + r() * 26;
          s += '<rect x="' + x.toFixed(0) + '" y="' + y + '" width="' + w.toFixed(0) + '" height="14" fill="' + (row === 1 && r() < .2 ? GAL_HI : GAL_GOLD) + '" opacity="' + (.15 + .6 * r()).toFixed(2) + '"/>';
          x += w + 6;
        }
      }
      return s;
    },
    function scatter(r) {
      var s = "", pts = [];
      for (var i = 0; i < 14; i++) pts.push([20 + r() * 360, 20 + r() * 260]);
      for (i = 0; i < pts.length; i++) {
        var j = (i + 1 + Math.floor(r() * (pts.length - 1))) % pts.length;
        if (r() < .55) {
          s += '<line x1="' + pts[i][0].toFixed(1) + '" y1="' + pts[i][1].toFixed(1) + '" x2="' + pts[j][0].toFixed(1) + '" y2="' + pts[j][1].toFixed(1) + '" stroke="' + GAL_GOLD + '" opacity=".22"/>';
        }
        s += '<circle cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1].toFixed(1) + '" r="' + (2 + r() * 1.5).toFixed(1) + '" fill="' + (r() < .25 ? GAL_HI : GAL_GOLD) + '" opacity="' + (.4 + .5 * r()).toFixed(2) + '"/>';
      }
      return s;
    },
    function gauge(r) {
      var s = "";
      for (var a = 0; a < 360; a += 15) {
        var big = a % 45 === 0, rad = Math.PI / 180 * a;
        var r1 = big ? 106 : 114;
        s += '<line x1="' + (200 + r1 * Math.cos(rad)).toFixed(1) + '" y1="' + (150 + r1 * Math.sin(rad)).toFixed(1) + '" x2="' + (200 + 120 * Math.cos(rad)).toFixed(1) + '" y2="' + (150 + 120 * Math.sin(rad)).toFixed(1) + '" stroke="' + GAL_GOLD + '" opacity="' + (big ? ".7" : ".4") + '"/>';
      }
      var na = r() * 2 * Math.PI;
      s += '<circle cx="200" cy="150" r="118" fill="none" stroke="' + GAL_GOLD + '" opacity=".16"/>';
      s += '<line x1="200" y1="150" x2="' + (200 + 92 * Math.cos(na)).toFixed(1) + '" y2="' + (150 + 92 * Math.sin(na)).toFixed(1) + '" stroke="' + GAL_HI + '" stroke-width="2"/>';
      s += '<circle cx="200" cy="150" r="4" fill="' + GAL_OK + '"/>';
      return s;
    },
    function chevrons(r) {
      var s = "";
      for (var row = 0; row < 5; row++) {
        var y = 60 + row * 46;
        for (var k = 0; k < 9; k++) {
          var x = 40 + k * 36;
          s += '<path d="M' + x + ' ' + (y + 10) + ' l10 -14 l10 14" fill="none" stroke="' + (row === 2 ? GAL_HI : GAL_GOLD) + '" stroke-width="1.6" opacity="' + (.2 + .6 * r()).toFixed(2) + '"/>';
        }
      }
      return s;
    }
  ];

  function parsePieceInner(inner) {
    var holder = document.createElement("div");
    holder.innerHTML = svgPlate(inner);
    return holder.firstElementChild;
  }

  var lightbox = $("#lightbox");
  var lbContent = $("#lbContent");
  var lbName = $("#lbName");
  var lbDate = $("#lbDate");
  var lbDesc = $("#lbDesc");
  var lbCount = $("#lbCount");
  var lbClose = $(".lb-close");
  var lbPrev = $(".lb-prev");
  var lbNext = $(".lb-next");
  var lbPeek = $("#lbPeek");
  var lbPeekImg = $("#lbPeekImg");
  var galItems = $all(".gal-item");
  var lbAlbum = [];
  var lbIndex = 0;
  var lbDir = 1;
  var lastFocus = null;
  var lbDotsWrap = $("#lbDots");
  var lbDotCount = -1;

  galItems.forEach(function (item, ei) {
    var seed = mulberry32(ei * 1013904223 + 1664525);
    var cover = item.querySelector("svg");
    var extra = 4 + Math.floor(seed() * 3);
    var album = cover ? [cover.cloneNode(true)] : [];
    for (var i = 0; i < extra; i++) {
      var idx = (ei * 3 + i * 7) % GEN.length;
      album.push(parsePieceInner(GEN[idx](mulberry32(ei * 97 + i * 5321 + 7))));
    }
    item._album = album;
  });

  /* "+N FRAMES" chip in each caption — hints at the multi-photo album */
  galItems.forEach(function (item) {
    var n = item._album ? item._album.length : 1;
    var fc = $("figcaption", item);
    if (n > 1 && fc && !$(".gal-frames", fc)) {
      var chip = document.createElement("span");
      chip.className = "gal-frames";
      chip.textContent = "\u25A3 " + pad2(n);
      fc.insertBefore(chip, $(".gal-action-hint", fc));
    }
  });

  function galEventInfo(item) {
    var fc = item.querySelector("figcaption");
    var caption = (item.dataset.caption || (fc ? fc.textContent : "") || "").trim();
    var date = (item.dataset.date || "").trim();
    var name = caption;
    var m = caption.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)\s+\d{4}\b/);
    if (m) {
      if (!date) date = m[0];
      name = caption.slice(0, m.index).replace(/[\s—–-]+$/, "").trim();
    }
    if (!date) date = "ARCHIVE";
    return { name: name || caption, date: date };
  }

  function renderLightbox() {
    var piece = lbAlbum[lbIndex];
    if (!piece) return;
    lbContent.innerHTML = "";
    var frame = piece.cloneNode(true);
    lbContent.appendChild(frame);
    if (hasGsap && !reduced) {
      /* slide glides in from the direction you navigated */
      gsap.fromTo(frame,
        { autoAlpha: 0, x: 34 * lbDir },
        { autoAlpha: 1, x: 0, duration: .42, ease: "power2.out", overwrite: true }
      );
    }
    lbCount.textContent = pad2(lbIndex + 1) + " / " + pad2(lbAlbum.length);
    var disabled = lbAlbum.length < 2;
    lbPrev.disabled = disabled;
    lbNext.disabled = disabled;
    if (lbPeek && lbPeekImg) {
      var nextIdx = (lbIndex + 1) % lbAlbum.length;
      lbPeek.style.display = lbAlbum.length > 1 ? "" : "none";
      lbPeekImg.innerHTML = "";
      if (lbAlbum[nextIdx]) lbPeekImg.appendChild(lbAlbum[nextIdx].cloneNode(true));
      lbPeek.setAttribute("aria-label", "Next photo: " + pad2(nextIdx + 1) + " of " + pad2(lbAlbum.length));
    }
    if (lbDotsWrap) {
      if (lbDotCount !== lbAlbum.length) {
        lbDotCount = lbAlbum.length;
        lbDotsWrap.innerHTML = "";
        for (var d = 0; d < lbAlbum.length; d++) {
          (function (idx) {
            var dot = document.createElement("button");
            dot.type = "button";
            dot.className = "lb-dot";
            dot.setAttribute("aria-label", "Go to photo " + pad2(idx + 1));
            dot.addEventListener("click", function (e) {
              e.stopPropagation();
              if (idx === lbIndex) return;
              lbDir = idx > lbIndex ? 1 : -1;
              lbIndex = idx;
              renderLightbox();
            });
            lbDotsWrap.appendChild(dot);
          })(d);
        }
      }
      lbDotsWrap.style.display = lbAlbum.length > 1 ? "" : "none";
      $all(".lb-dot", lbDotsWrap).forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === lbIndex);
      });
    }
  }

  var currentGalEventIdx = 0;
  var currentGalItem = null;
  var lbEventTracker = $("#lbEventTracker");
  var lbPrevEvent = $("#lbPrevEvent");
  var lbNextEvent = $("#lbNextEvent");

  function openLightbox(item) {
    if (!lightbox || !item._album || !item._album.length) return;
    currentGalItem = item;
    currentGalEventIdx = galItems.indexOf(item);
    if (currentGalEventIdx < 0) currentGalEventIdx = 0;
    lbAlbum = item._album;
    lbIndex = 0;
    lbDir = 1;
    var info = galEventInfo(item);
    lbName.textContent = info.name;
    lbDate.textContent = info.date;
    if (lbDesc) lbDesc.textContent = item.dataset.desc || "";
    if (lbEventTracker) {
      lbEventTracker.textContent = "EVENT " + pad2(currentGalEventIdx + 1) + " OF " + pad2(galItems.length);
    }
    renderLightbox();
    lastFocus = document.activeElement;
    lightbox.classList.add("open");
    if (lenis) lenis.stop();
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains("open")) return;
    lightbox.classList.remove("open");
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  }

  function showLightbox(delta) {
    if (!lightbox || !lightbox.classList.contains("open") || lbAlbum.length === 0) return;
    lbDir = delta >= 0 ? 1 : -1;
    lbIndex = (lbIndex + delta + lbAlbum.length) % lbAlbum.length;
    renderLightbox();
  }

  function switchEvent(delta) {
    if (!galItems.length) return;
    var nextEventIdx = (currentGalEventIdx + delta + galItems.length) % galItems.length;
    openLightbox(galItems[nextEventIdx]);
  }

  /* ------------------------------------------------------------
      GALLERY CATEGORY FILTERING (animated, with plain fallback)
      ------------------------------------------------------------ */
  var galFilterBtns = $all(".gal-filter-btn");
  galFilterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-active")) return;
      galFilterBtns.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var cat = btn.dataset.cat;

      galItems.forEach(function (item) {
        var match = cat === "all" || (item.dataset.category || "workshop") === cat;
        if (hasGsap && !reduced) { gsap.killTweensOf(item); }
        item.classList.toggle("is-filtered-out", !match);
      });

      /* surviving frames cascade back into the reflowed grid */
      if (hasGsap && !reduced) {
        var show = galItems.filter(function (item) {
          return !item.classList.contains("is-filtered-out");
        });
        gsap.fromTo(show,
          { opacity: 0, y: 26, scale: .96 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: .55, stagger: .05, ease: "power3.out",
            overwrite: true, clearProps: "transform"
          }
        );
      }

      if (hasGsap && typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.refresh();
      }
    });
  });

  var galGrid = $(".gal");
  galItems.forEach(function (item) {
    item.addEventListener("click", function () { openLightbox(item); });
    item.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(item); }
    });
  });

  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbPrev) lbPrev.addEventListener("click", function (e) { e.stopPropagation(); showLightbox(-1); });
  if (lbNext) lbNext.addEventListener("click", function (e) { e.stopPropagation(); showLightbox(1); });
  if (lbPeek) lbPeek.addEventListener("click", function () { showLightbox(1); });
  if (lbPrevEvent) lbPrevEvent.addEventListener("click", function (e) { e.stopPropagation(); switchEvent(-1); });
  if (lbNextEvent) lbNextEvent.addEventListener("click", function (e) { e.stopPropagation(); switchEvent(1); });
  if (lightbox) lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeLightbox();
      closeMobileMenu();
    }
    if (!lightbox || !lightbox.classList.contains("open")) return;
    if (e.key === "Tab") {
      var focusables = $all("button:not(:disabled)", lightbox).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.key === "ArrowRight") {
      if (e.shiftKey) { switchEvent(1); } else { showLightbox(1); }
    }
    if (e.key === "ArrowLeft") {
      if (e.shiftKey) { switchEvent(-1); } else { showLightbox(-1); }
    }
    if (e.key === "ArrowUp") switchEvent(-1);
    if (e.key === "ArrowDown") switchEvent(1);
  });

  /* ------------------------------------------------------------
     EVENT -> GALLERY LINKING: Jump & Open Gallery Lightbox
     ------------------------------------------------------------ */
  $all(".btn-ev-gallery").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var targetId = btn.dataset.galTarget;
      if (!targetId) return;
      var targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      // If target item is filtered out, reset gallery filter to ALL first
      if (targetEl.classList.contains("is-filtered-out")) {
        galFilterBtns.forEach(function (b) {
          b.classList.toggle("is-active", b.dataset.cat === "all");
        });
        galItems.forEach(function (it) { it.classList.remove("is-filtered-out"); });
      }

      if (lenis) {
        lenis.scrollTo(targetEl, { offset: -80, duration: 1.2 });
      } else {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      targetEl.classList.remove("target-highlight");
      void targetEl.offsetWidth; // trigger reflow
      targetEl.classList.add("target-highlight");

      setTimeout(function () {
        openLightbox(targetEl);
      }, 650);
    });
  });

  /* ------------------------------------------------------------
     CARD TILT — subtle 3D on cursor
     ------------------------------------------------------------ */
  if (hasGsap && finePointer && !reduced) {
    $all("[data-tilt]").forEach(function (el) {
      gsap.set(el, { transformPerspective: 800 });
      var rx = gsap.quickTo(el, "rotationX", { duration: .7, ease: "power2.out" });
      var ry = gsap.quickTo(el, "rotationY", { duration: .7, ease: "power2.out" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        ry(px * 7); rx(-py * 7);
      });
      el.addEventListener("mouseleave", function () { rx(0); ry(0); });
    });
  }



  /* ------------------------------------------------------------
     JOIN FORM
     ------------------------------------------------------------ */
  var form = $("#joinForm");
  var formStatus = $("#formStatus");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#fName").value.trim();
      var mail = $("#fMail").value.trim();
      formStatus.classList.remove("err");
      if (!name || !mail || mail.indexOf("@") < 0) {
        formStatus.classList.add("err");
        formStatus.textContent = "> err: name + valid email required to open a channel.";
        return;
      }
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      formStatus.textContent = "> transmitting request ...";
      setTimeout(function () {
        formStatus.textContent = "> request received — an operator will ping " + name.split(" ")[0] + " within 48h. welcome aboard.";
        btn.disabled = false;
        form.reset();
      }, 1400);
    });
  }

  /* ------------------------------------------------------------
     BOOT
     ------------------------------------------------------------ */
  window.addEventListener("load", function () {
    runLoader();
    if (hasGsap) { setTimeout(function () { ScrollTrigger.refresh(); }, 400); }
  });
  // safety: if load event already fired
  if (document.readyState === "complete") { runLoader(); }

})();
