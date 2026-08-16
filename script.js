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
     ------------------------------------------------------------ */
  var loader = $("#loader");
  var loadLines = $("#loadLines");
  var loadFill = $("#loadFill");
  var loadPct = $("#loadPct");
  var bootSeq = [
    "> initializing nullsec kernel .......... [ok]",
    "> mounting /dev/curiosity .............. [ok]",
    "> handshake: dept. of cybersecurity .... [ok]",
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

  var navMap = { about: 0, events: 0, team: 0, gallery: 0, join: 0 };
  function setActive(id) {
    $all(".nav-links a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  }
  if (hasGsap) {
    Object.keys(navMap).forEach(function (id) {
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
    Object.keys(navMap).forEach(function (id) {
      var s = document.getElementById(id); if (s) io.observe(s);
    });
  }

  /* ------------------------------------------------------------
     PROGRESS BAR + PARALLAX LAYERS
     ------------------------------------------------------------ */
  var progressBar = $("#progressBar");
  function updateProgress() {
    if (!progressBar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (h > 0 ? (window.pageYOffset / h) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

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
    gsap.to(".hero-bg img", {
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
    { t: "nullsec // cybersecurity club — est. 2021", c: "out" },
    { t: "cat mission.txt", c: "cmd" },
    { t: "turn curiosity into capability.", c: "out" },
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
     EVENTS — pinned horizontal scroll (desktop)
     ------------------------------------------------------------ */
  var evTrack = $("#evTrack");
  var evWrap = $("#evWrap");
  var evST = null;

  function setupEvents() {
    if (!evTrack || !evWrap) return;
    if (evST) { evST.kill(); evST = null; }
    gsap && gsap.set(evTrack, { x: 0 });
    var desktop = window.innerWidth > 900 && hasGsap && !reduced;
    if (desktop) {
      evWrap.style.overflow = "visible";
      var dist = function () { return evTrack.scrollWidth - window.innerWidth + 120; };
      evST = gsap.to(evTrack, {
        x: function () { return -dist(); },
        ease: "none",
        scrollTrigger: {
          trigger: "#events",
          start: "top top",
          end: function () { return "+=" + dist(); },
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
        }
      }).scrollTrigger;
    } else {
      evWrap.style.overflowX = "auto";
      evWrap.style.WebkitOverflowScrolling = "touch";
    }
  }
  if (hasGsap) { setupEvents(); window.addEventListener("resize", function () { ScrollTrigger.refresh(); }); }
  else if (evWrap) { evWrap.style.overflowX = "auto"; }

  /* ------------------------------------------------------------
     TEAM — stacked card depth (scale as next covers)
     ------------------------------------------------------------ */
  if (hasGsap && !reduced) {
    var stackCards = $all(".stack-card");
    stackCards.forEach(function (card, i) {
      if (i === stackCards.length - 1) return;
      gsap.to(card, {
        scale: .93, opacity: .55, filter: "brightness(.8)",
        ease: "none",
        scrollTrigger: {
          trigger: stackCards[i + 1],
          start: "top bottom",
          end: "top 130px",
          scrub: true
        }
      });
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

  var lightbox = $("#lightbox");
  var lbContent = $("#lbContent");
  var lbCap = $("#lbCap");
  var lbClose = $(".lb-close");
  var lastFocus = null;

  function openLightbox(item) {
    if (!lightbox) return;
    var svg = item.querySelector("svg");
    lbContent.innerHTML = "";
    if (svg) lbContent.appendChild(svg.cloneNode(true));
    lbCap.textContent = item.dataset.caption || "";
    lastFocus = document.activeElement;
    lightbox.classList.add("open");
    if (lenis) lenis.stop();
    lbClose.focus();
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  }
  $all(".gal-item").forEach(function (item) {
    item.addEventListener("click", function () { openLightbox(item); });
    item.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(item); }
    });
  });
  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lightbox) lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeLightbox();
      closeMobileMenu();
    }
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
     CUSTOM CURSOR
     ------------------------------------------------------------ */
  var cDot = $("#cursorDot");
  var cRing = $("#cursorRing");
  if (cDot && cRing && finePointer && !reduced) {
    var cx = 0, cy = 0, rx2 = 0, ry2 = 0;
    document.addEventListener("mousemove", function (e) {
      cx = e.clientX; cy = e.clientY;
      cDot.style.left = cx + "px"; cDot.style.top = cy + "px";
    }, { passive: true });
    (function ringLoop() {
      rx2 += (cx - rx2) * .16; ry2 += (cy - ry2) * .16;
      cRing.style.left = rx2 + "px"; cRing.style.top = ry2 + "px";
      requestAnimationFrame(ringLoop);
    })();
    document.addEventListener("mouseover", function (e) {
      var hot = e.target.closest("a,button,[data-hover],.gal-item,input,select,textarea");
      cRing.classList.toggle("hot", !!hot);
    }, { passive: true });
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
