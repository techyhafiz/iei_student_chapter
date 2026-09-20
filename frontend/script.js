/* ============================================================
   NULLSEC — interaction engine
   Lenis smooth scroll + GSAP ScrollTrigger + custom FX
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  /* touch phones/tablets: skip cursor-driven FX, run leaner effects */
  var coarsePointer = !finePointer || window.matchMedia("(hover: none), (pointer: coarse)").matches;
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
     BACKEND API — public endpoints served by the existing
     Express backend (see backend/routes/events.routes.js and
     backend/routes/gallery.routes.js). No auth required.
     ------------------------------------------------------------ */
  var API_BASE = "http://localhost:5000/api";
  window.IEI_API_BASE = API_BASE;

  /* ------------------------------------------------------------
     SCROLL LOCK — keeps the page still while the menu / lightbox
     is open. Lenis cannot block native touch scrolling, so we also
     clip overflow on <html> via the .is-scroll-locked class.
     ------------------------------------------------------------ */
  var scrollLockCount = 0;
  function lockScroll(lock) {
    scrollLockCount = Math.max(0, scrollLockCount + (lock ? 1 : -1));
    document.documentElement.classList.toggle("is-scroll-locked", scrollLockCount > 0);
  }

  /* ------------------------------------------------------------
       SITE-WIDE SPACE — living background canvas
       Fixed full-page layer behind all content: pre-rendered
       nebula clouds that drift + breathe, three star layers
       with scroll parallax and twinkle, occasional shooting
       stars. Theme-aware, DPR-capped, pauses on hidden tab.
       ------------------------------------------------------------ */
  (function () {
    var cv = $("#spaceFx");
    if (!cv || !cv.getContext) { return; }
    var ctx = cv.getContext("2d");
    if (!ctx) { return; }

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var light = document.documentElement.getAttribute("data-theme") === "light";

    var LAYERS = [
      { share: .5, rMin: .47, rMax: .89, aMin: .22, aMax: .6, par: .045 },
      { share: .3, rMin: .89, rMax: 1.42, aMin: .3, aMax: .8, par: .11 },
      { share: .2, rMin: 1.37, rMax: 1.94, aMin: .38, aMax: 1, par: .2 }
    ];

    var stars = [];
    var meteors = [];
    var tMeteor = 3200;
    var nebulas = [];

    var dpr = 1, W = 0, H = 0;
    var rafId = 0, running = false, last = 0;

    function pal() {
      var isLight = document.documentElement.getAttribute("data-theme") === "light";
      return isLight
        ? { core: "38, 12, 68", hi: "68, 18, 118", trail: "48, 14, 86", nebMax: .22 }
        : { core: "248, 248, 255", hi: "232, 121, 249", trail: "196, 132, 252", nebMax: .34 };
    }

    /* pre-render each nebula blob once — per-frame cost is a single drawImage */
    function makeNebula(spec) {
      var sz = Math.max(380, Math.round(Math.min(W, H) * spec.scale));
      var off = document.createElement("canvas");
      var octx = off.getContext("2d");
      off.width = sz; off.height = sz;
      var g = octx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
      var c = spec.rgb;
      g.addColorStop(0, "rgba(" + c + "," + spec.a + ")");
      g.addColorStop(.45, "rgba(" + c + "," + (spec.a * .4).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + c + ",0)");
      octx.fillStyle = g;
      octx.fillRect(0, 0, sz, sz);
      return {
        cv: off,
        sz: sz,
        bx: spec.bx, by: spec.by,
        par: spec.par,
        w1: rand(.023, .058), p1: rand(0, 6.28),   /* drift freq/phase */
        w2: rand(.014, .040), p2: rand(0, 6.28),   /* breathe freq/phase */
        amp: rand(.06, .14),
        alpha: rand(.85, 1)
      };
    }

    var NEBULA_SPECS = [
      { rgb: "124, 58, 237", a: .30, scale: .95, bx: .16, by: .18, par: .035 },
      { rgb: "232, 121, 249", a: .20, scale: .80, bx: .84, by: .30, par: .055 },
      { rgb: "49, 46, 129", a: .30, scale: 1.05, bx: .50, by: .78, par: .028 },
      { rgb: "192, 132, 252", a: .16, scale: .65, bx: .30, by: .55, par: .045 },
      { rgb: "124, 58, 237", a: .18, scale: .70, bx: .72, by: .92, par: .06 }
    ];

    function size() {
      W = Math.max(1, window.innerWidth);
      H = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = W * dpr; cv.height = H * dpr;

      var total = Math.min(240, Math.round(W * H / 9000));
      stars = [];
      LAYERS.forEach(function (L, li) {
        var n = Math.max(4, Math.round(total * L.share));
        for (var i = 0; i < n; i++) {
          stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: rand(L.rMin, L.rMax),
            base: rand(L.aMin, L.aMax),
            tw: rand(.17, .69),
            ph: rand(0, 6.28),
            par: L.par
          });
        }
      });

      nebulas = NEBULA_SPECS.map(makeNebula);
    }

    function drawFrame(now) {
      var dt = Math.min(100, now - last || 16);
      last = now;
      var p = pal();
      var t = now * .001;
      var sc = window.pageYOffset || 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      /* nebula clouds — drift, breathe, gentle scroll parallax (seamless wrap) */
      for (var n = 0; n < nebulas.length; n++) {
        var nb = nebulas[n];
        var sz = nb.sz;
        var range = H + sz * 2;
        var ny = (((nb.by * range - sc * nb.par) % range) + range) % range - sz;
        var nx = nb.bx * W + Math.sin(t * nb.w1 + nb.p1) * sz * nb.amp;
        var breathe = 1 + Math.sin(t * nb.w2 + nb.p2) * .1;
        ctx.globalAlpha = nb.alpha * (p.nebMax / .34);
        ctx.drawImage(nb.cv, nx - sz / 2, ny - sz / 2, sz * breathe, sz * breathe);
      }
      ctx.globalAlpha = 1;

      /* stars — scroll parallax + twinkle */
      var isLight = document.documentElement.getAttribute("data-theme") === "light";
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var sy = ((s.y - sc * s.par) % H + H) % H;
        var tw = .5 + .5 * Math.sin(t * s.tw + s.ph);
        var a = s.base * (.45 + .55 * tw);
        ctx.beginPath();
        if (isLight) {
          ctx.fillStyle = "rgba(38, 12, 68, " + (a * 0.95).toFixed(3) + ")";
          ctx.arc(s.x, sy, s.r * 1.35, 0, 6.2832);
        } else {
          ctx.fillStyle = "rgba(" + p.core + "," + a.toFixed(3) + ")";
          ctx.arc(s.x, sy, s.r, 0, 6.2832);
        }
        ctx.fill();
        if (isLight && s.r > 0.95 && tw > .8) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(76, 22, 130, " + (a * 0.38).toFixed(3) + ")";
          ctx.arc(s.x, sy, s.r * 2.2, 0, 6.2832);
          ctx.fill();
        } else if (!isLight && s.r > 0.95 && tw > .82) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(" + p.hi + "," + (a * .22).toFixed(3) + ")";
          ctx.arc(s.x, sy, s.r * 2.2, 0, 6.2832);
          ctx.fill();
        }
      }

      /* shooting stars */
      tMeteor -= dt;
      if (tMeteor <= 0) {
        meteors.push({
          x: rand(W * .25, W * 1.05), y: rand(-20, H * .3),
          vx: -rand(.09, .17), vy: rand(.045, .095), life: 1
        });
        tMeteor = rand(6000, 12000);
      }
      for (var m = meteors.length - 1; m >= 0; m--) {
        var mt = meteors[m];
        mt.x += mt.vx * dt; mt.y += mt.vy * dt;
        mt.life -= dt / 2100;
        if (mt.life <= 0 || mt.x < -80 || mt.y > H + 80) { meteors.splice(m, 1); continue; }
        var tail = 90 * mt.life;
        var grad = ctx.createLinearGradient(mt.x, mt.y, mt.x + tail, mt.y - tail * .55);
        if (isLight) {
          grad.addColorStop(0, "rgba(42, 12, 75," + (.98 * mt.life).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(68, 18, 118, 0)");
        } else {
          grad.addColorStop(0, "rgba(" + p.trail + "," + (.8 * mt.life).toFixed(3) + ")");
          grad.addColorStop(1, "rgba(" + p.trail + ",0)");
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = isLight ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(mt.x, mt.y);
        ctx.lineTo(mt.x + tail, mt.y - tail * .55);
        ctx.stroke();
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

    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
    start();

    if ("MutationObserver" in window) {
      new MutationObserver(function () {
        light = document.documentElement.getAttribute("data-theme") === "light";
      }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    }

    var rsz;
    window.addEventListener("resize", function () {
      clearTimeout(rsz);
      rsz = setTimeout(function () {
        size();
        if (reducedMotion) { drawFrame(performance.now()); }
      }, 150);
    });

    window.addEventListener("load", function () {
      size();
      if (reducedMotion) { drawFrame(performance.now()); }
    });

    size();
    if (reducedMotion) { drawFrame(performance.now()); }
  })();

  /* ------------------------------------------------------------
       HERO AURORA — WebGL flowing energy waves
       Layered sine bands in violet/fuchsia rising from the
       hero's lower half. Additive blending over the space
       canvas. Runs only while the hero is on screen; static
       frame under reduced motion; graceful skip if WebGL
       is unavailable.
       ------------------------------------------------------------ */
  (function () {
    var cv = $("#auroraFx");
    if (!cv) { return; }

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var FRAG = [
      "uniform float uT;",
      "uniform vec2 uRes;",
      "uniform float uLight;",
      "",
      "float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}",
      "float noise(vec2 q){",
      "  vec2 i=floor(q);vec2 f=fract(q);",
      "  f=f*f*(3.0-2.0*f);",
      "  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),",
      "             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);",
      "}",
      "",
      "void main(){",
      "  vec2 uv=gl_FragCoord.xy/uRes;",
      "  float t=uT*0.25;",
      "",
      "  /* wave field: fbm-warped x, energy concentrated low */",
      "  float n=noise(vec2(uv.x*3.0+t*0.7,uv.y*2.0-t*0.4));",
      "  float x=uv.x+(n-0.5)*0.35;",
      "  float y=uv.y;",
      "",
      "  /* three travelling sine bands with phase offsets */",
      "  float w1=0.5+0.5*sin(x*6.2831+t*1.6);",
      "  float w2=0.5+0.5*sin(x*4.7124-t*1.1+2.1);",
      "  float w3=0.5+0.5*sin(x*7.8540+t*0.7+4.2);",
      "",
      "  float e1=exp(-abs(y-(0.42+w1*0.10))*9.0);",
      "  float e2=exp(-abs(y-(0.30+w2*0.13))*7.0);",
      "  float e3=exp(-abs(y-(0.18+w3*0.08))*11.0);",
      "",
      "  /* vertical falloff + gentle scroll shimmer */",
      "  float fall=smoothstep(0.0,0.35,y)*(1.0-smoothstep(0.75,1.0,y));",
      "  float shim=0.85+0.15*sin(t*3.0+x*12.0);",
      "",
      "  float glow=e1*0.55+e2*0.75+e3*0.45;",
      "  glow*=fall*shim;",
      "",
      "  /* colour: violet -> fuchsia by height */",
      "  vec3 violet=vec3(0.486,0.341,0.933);",
      "  vec3 fuchsia=vec3(0.910,0.475,0.976);",
      "  vec3 indigo=vec3(0.192,0.180,0.506);",
      "  vec3 col=mix(violet,fuchsia,clamp(y*1.6,0.0,1.0));",
      "  col=mix(col,indigo,0.35*e2);",
      "",
      "  /* light theme: rich, very dark royal purple and deep violet ribbon */",
      "  vec3 darkViolet=mix(vec3(0.14,0.03,0.26),vec3(0.30,0.08,0.52),clamp(y*1.5,0.0,1.0));",
      "  col=mix(col,darkViolet,uLight);",
      "  float a=glow*(mix(0.34,0.32,uLight));",
      "",
      "  o=vec4(col*a,a);",
      "}"
    ].join("\n");

    /* GL2 gets a real output var; GL1 aliases it to gl_FragColor */
    var V2R = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";
    var F2R = "#version 300 es\nprecision highp float;\nout vec4 o;\n" + FRAG;
    var V1R = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";
    var F1R = "precision mediump float;\n#define o gl_FragColor\n" + FRAG;

    var attrs = { alpha: true, premultipliedAlpha: true, antialias: true, depth: false };
    var gl = cv.getContext("webgl2", attrs);
    var isGL2 = !!gl;
    if (!gl) { gl = cv.getContext("webgl", attrs) || cv.getContext("experimental-webgl", attrs); }
    if (!gl) { cv.style.display = "none"; return; }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && window.console) {
        console.warn(gl.getShaderInfoLog(s));
      }
      return s;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, isGL2 ? V2R : V1R));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, isGL2 ? F2R : F1R));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.style.display = "none"; return; }
    gl.useProgram(prog);

    /* fullscreen triangle */
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uT = gl.getUniformLocation(prog, "uT");
    var uRes = gl.getUniformLocation(prog, "uRes");
    var uLight = gl.getUniformLocation(prog, "uLight");

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);

    var dpr = 1, W = 0, H = 0;
    var t0 = performance.now();
    var visible = true;
    var rafId = 0;

    function theme() { return document.documentElement.getAttribute("data-theme") === "light" ? 1 : 0; }

    function size() {
      var host = cv.parentElement.getBoundingClientRect();
      W = Math.max(1, Math.ceil(host.width));
      H = Math.max(1, Math.ceil(host.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = W * dpr; cv.height = H * dpr;
      gl.viewport(0, 0, cv.width, cv.height);
    }

    function draw() {
      var isLight = theme() > 0.5;
      if (isLight) {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      }
      gl.uniform1f(uT, (performance.now() - t0) / 1000);
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uLight, isLight ? 1.0 : 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop() {
      if (!visible) { rafId = 0; return; }
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (!rafId) { rafId = requestAnimationFrame(loop); }
    }
    function stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : (visible && start());
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
      }, { threshold: 0 }).observe(cv);
    }

    var rsz;
    window.addEventListener("resize", function () {
      clearTimeout(rsz);
      rsz = setTimeout(function () {
        size();
        if (reducedMotion) { draw(); }
      }, 150);
    });

    size();
    if (reducedMotion) { draw(); }
    else { start(); }
  })();

  /* ------------------------------------------------------------
       HERO WARP PARTICLES — GPU transform-feedback system
       ~9k particles computed entirely on the GPU: each has a
       base drift (warp travel) plus a swirl force steered by
       the cursor (attractor). Additive violet sparks with
       depth-varying size/speed/brightness. Runs only while
       the hero is on screen; hides if WebGL2 is unavailable
       (transform feedback is GL2-only; the hero keeps the
       aurora + stars either way).
       ------------------------------------------------------------ */
  (function () {
    var cv = $("#warpFx");
    if (!cv) { return; }
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl) { cv.style.display = "none"; return; }

    /* fewer particles on phones/tablets — same look, much lighter on the GPU */
    var COUNT = (coarsePointer || Math.min(window.innerWidth, window.innerHeight) < 700) ? 1600 : 4200;

    /* ---- shaders ---- */
    var SIM_V = [
      "#version 300 es",
      "precision highp float;",
      "in vec2 aPos;",
      "in vec2 aVel;",
      "in vec3 aSeed;",            /* x: size, y: depth, z: portal phase */
      "uniform vec2 uRes;",
      "uniform vec2 uMouse;",
      "uniform float uAmp;",
      "uniform float uDt;",
      "uniform float uT;",
      "uniform float uSpeed;",
      "uniform vec2 uShockPos;",
      "uniform float uShockAmp;",
      "out vec2 vPos;",
      "out vec2 vVel;",
      "out vec3 vSeed;",
      "void main(){",
      "  vec2 p=aPos; vec2 v=aVel;",
      "  /* slow base warp drift: toward lower-left, scaled by depth & smooth start ramp */",
      "  float sp=(14.5+aSeed.y*60.0)*uSpeed;",
      "  vec2 dir=normalize(vec2(-0.72,-0.42));",
      "  v+=dir*sp*uDt*(0.45+aSeed.y*0.55);",
      "  v*=exp(-1.1*uDt);",        /* friction */
      "  /* cursor attractor with orbital swirl (only while cursor is over hero) */",
      "  vec2 mp=uMouse*uRes;",
      "  vec2 d=mp-p;",
      "  float dist=length(d)+1.0;",
      "  float pull=exp(-dist/340.0)*uAmp;",
      "  vec2 tang=vec2(-d.y,d.x)/dist;",
      "  v+=(normalize(d)*pull*145.0+tang*pull*106.0)*uDt;",
      "  /* click / tap repellent shockwave */",
      "  vec2 sDiff=p-uShockPos*uRes;",
      "  float sDist=length(sDiff)+1.0;",
      "  float sForce=exp(-sDist/280.0)*uShockAmp*920.0;",
      "  v+=(sDiff/sDist)*sForce*uDt;",
      "  /* gentle wander so streams aren't perfectly straight */",
      "  v+=vec2(sin(uT*0.40+aSeed.z*6.28),cos(uT*0.29+aSeed.z*9.42))*2.3*uDt*uSpeed;",
      "  p+=v*uDt;",
      "  /* wrap / respawn to designated non-uniform segments on top and right edges */",
      "  float m=20.0;",
      "  if(p.x<-m||p.y<-m){",
      "    if(aSeed.z<0.54){",
      "      /* Top segment with natural cluster modulation */",
      "      float xFrac=0.38+pow(aSeed.z/0.54,1.4)*0.48;",
      "      p.x=uRes.x*xFrac+(aSeed.y-0.5)*45.0;",
      "      p.y=uRes.y+4.0;",
      "    }else{",
      "      /* Right segment with natural cluster modulation */",
      "      float yFrac=0.28+pow((aSeed.z-0.54)/0.46,1.3)*0.58;",
      "      p.x=uRes.x+4.0;",
      "      p.y=uRes.y*yFrac+(aSeed.y-0.5)*45.0;",
      "    }",
      "    v=dir*sp;",
      "  }",
      "  vPos=p; vVel=v; vSeed=aSeed;",
      "}"
    ].join("\n");

    var SIM_F = [
      "#version 300 es",
      "precision highp float;",
      "out vec4 o;",
      "void main(){o=vec4(0.0);}"
    ].join("\n");

    var DRAW_V = [
      "#version 300 es",
      "precision highp float;",
      "in vec2 vPos;",
      "in vec2 vVel;",
      "in vec3 vSeed;",
      "uniform vec2 uRes;",
      "uniform float uLight;",
      "uniform float uTime;",
      "uniform float uDpr;",
      "out float vAlpha;",
      "out float vHue;",
      "void main(){",
      "  vec2 clip=(vPos/uRes)*2.0-1.0;",
      "  gl_Position=vec4(clip,0.0,1.0);",
      "  gl_PointSize=(1.55+vSeed.x*0.80)*uDpr*(1.0+uLight*0.30);",
      "  vAlpha=clamp(0.35+vSeed.y*0.55,0.0,1.0);",
      "  vHue=vSeed.y;",
      "}",
    ].join("\n");

    var DRAW_F = [
      "#version 300 es",
      "precision highp float;",
      "in float vAlpha;",
      "in float vHue;",
      "uniform float uLight;",
      "out vec4 o;",
      "void main(){",
      "  vec2 c=gl_PointCoord*2.0-1.0;",
      "  float r=length(c);",
      "  if(r>1.0)discard;",
      "  float core=exp(-r*r*3.5);",
      "  float a=vAlpha*core*mix(1.0,0.95,uLight);",
      "  vec3 violet=vec3(0.78,0.58,1.0);",
      "  vec3 fuchsia=vec3(0.98,0.62,1.0);",
      "  vec3 lightCol=mix(fuchsia,violet,vHue);",
      "  /* Light mode: rich, very dark deep royal purple & obsidian plum */",
      "  vec3 darkPlum=vec3(0.12,0.03,0.22);",
      "  vec3 darkViolet=vec3(0.26,0.06,0.45);",
      "  vec3 darkCol=mix(darkPlum,darkViolet,vHue);",
      "  vec3 col=mix(lightCol,darkCol,uLight);",
      "  o=vec4(col*a,a);",
      "}",
    ].join("\n");

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        if (window.console) { console.warn("warp shader:", gl.getShaderInfoLog(s)); }
        return null;
      }
      return s;
    }

    function program(vs, fs) {
      var p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      return p;
    }

    var simProg = program(SIM_V, SIM_F);
    var drawProg = program(DRAW_V, DRAW_F);

    /* transform-feedback varyings for the sim program */
    gl.transformFeedbackVaryings(simProg, ["vPos", "vVel", "vSeed"], gl.SEPARATE_ATTRIBS);
    gl.linkProgram(simProg);
    if (!gl.getProgramParameter(simProg, gl.LINK_STATUS)) {
      if (window.console) { console.warn("warp sim link:", gl.getProgramInfoLog(simProg)); }
      cv.style.display = "none"; return;
    }
    gl.linkProgram(drawProg);
    if (!gl.getProgramParameter(drawProg, gl.LINK_STATUS)) {
      if (window.console) { console.warn("warp draw link:", gl.getProgramInfoLog(drawProg)); }
      cv.style.display = "none"; return;
    }

    /* ---- buffers: two ping-pong pairs of (pos, vel, seed) ---- */
    function makeBuf(data) {
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_COPY);
      return b;
    }

    var dirX = -0.72, dirY = -0.42;
    var dirLen = Math.hypot(dirX, dirY);
    dirX /= dirLen; dirY /= dirLen;

    var pos0 = new Float32Array(COUNT * 2);
    var vel0 = new Float32Array(COUNT * 2);
    var seed0 = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      vel0[i * 2] = 0.0;
      vel0[i * 2 + 1] = 0.0;
      seed0[i * 3] = rand(0.8, 1.8);     /* size scale */
      seed0[i * 3 + 1] = Math.random(); /* depth 0..1 */
      seed0[i * 3 + 2] = Math.random(); /* portal & phase */
    }

    var pairs = [];
    for (var k = 0; k < 2; k++) {
      pairs.push({
        pos: makeBuf(new Float32Array(COUNT * 2)),
        vel: makeBuf(vel0),
        seed: makeBuf(seed0)
      });
    }

    var vaoA = gl.createVertexArray();
    var vaoB = gl.createVertexArray();
    var cur = 0;

    function attrib(vao, pair, prog) {
      gl.bindVertexArray(vao);
      var aPos = gl.getAttribLocation(prog, "aPos");
      var aVel = gl.getAttribLocation(prog, "aVel");
      var aSeed = gl.getAttribLocation(prog, "aSeed");
      gl.bindBuffer(gl.ARRAY_BUFFER, pair.pos);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, pair.vel);
      gl.enableVertexAttribArray(aVel);
      gl.vertexAttribPointer(aVel, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, pair.seed);
      gl.enableVertexAttribArray(aSeed);
      gl.vertexAttribPointer(aSeed, 3, gl.FLOAT, false, 0, 0);
    }

    /* draw VAOs read sim outputs (vPos/vVel/vSeed as inputs) */
    function drawAttrib(vao, pair) {
      gl.bindVertexArray(vao);
      var vPos = gl.getAttribLocation(drawProg, "vPos");
      var vVel = gl.getAttribLocation(drawProg, "vVel");
      var vSeed = gl.getAttribLocation(drawProg, "vSeed");
      gl.bindBuffer(gl.ARRAY_BUFFER, pair.pos);
      gl.enableVertexAttribArray(vPos);
      gl.vertexAttribPointer(vPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, pair.vel);
      gl.enableVertexAttribArray(vVel);
      gl.vertexAttribPointer(vVel, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, pair.seed);
      gl.enableVertexAttribArray(vSeed);
      gl.vertexAttribPointer(vSeed, 3, gl.FLOAT, false, 0, 0);
    }

    attrib(vaoA, pairs[0], simProg);
    attrib(vaoB, pairs[1], simProg);

    var drawVaoA = gl.createVertexArray();
    var drawVaoB = gl.createVertexArray();
    drawAttrib(drawVaoA, pairs[0]);
    drawAttrib(drawVaoB, pairs[1]);

    var tf = gl.createTransformFeedback();

    var uSim = {
      res: gl.getUniformLocation(simProg, "uRes"),
      mouse: gl.getUniformLocation(simProg, "uMouse"),
      amp: gl.getUniformLocation(simProg, "uAmp"),
      dt: gl.getUniformLocation(simProg, "uDt"),
      t: gl.getUniformLocation(simProg, "uT"),
      speed: gl.getUniformLocation(simProg, "uSpeed"),
      shockPos: gl.getUniformLocation(simProg, "uShockPos"),
      shockAmp: gl.getUniformLocation(simProg, "uShockAmp")
    };
    var uDraw = {
      res: gl.getUniformLocation(drawProg, "uRes"),
      light: gl.getUniformLocation(drawProg, "uLight"),
      time: gl.getUniformLocation(drawProg, "uTime"),
      dpr: gl.getUniformLocation(drawProg, "uDpr")
    };

    var dpr = 1, W = 0, H = 0;
    var mouse = { x: .5, y: .5 };
    var amp = 0, ampT = 0;          /* attractor strength: eased 0..1 */
    var shock = { x: .5, y: .5, amp: 0 };
    var visible = true;
    var running = false;
    var rafId = 0, last = 0;
    var startTime = performance.now();

    function densityField(nx, ny) {
      var d1 = Math.sin(nx * 3.4 + 0.9) * Math.cos(ny * 2.7 + 1.1);
      var d2 = Math.sin(nx * 5.8 - ny * 3.6 + 1.8) * 0.45;
      var d3 = Math.cos(nx * 2.1 + ny * 4.2 - 0.4) * 0.55;
      var raw = (d1 + d2 + d3 + 2.0) / 4.0;
      return Math.pow(Math.max(0.0, Math.min(1.0, raw)), 2.4);
    }

    function size() {
      var host = cv.parentElement.getBoundingClientRect();
      W = Math.max(1, Math.ceil(host.width));
      H = Math.max(1, Math.ceil(host.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = W * dpr; cv.height = H * dpr;
      gl.viewport(0, 0, cv.width, cv.height);
      startTime = performance.now();

      /* scatter particles with organic cosmic density variation (some areas dense, some voids) */
      var src = pairs[cur], dst = pairs[1 - cur];
      for (var i = 0; i < COUNT; i++) {
        var px = Math.random() * W, py = Math.random() * H;
        for (var attempt = 0; attempt < 8; attempt++) {
          var cx = Math.random() * W, cy = Math.random() * H;
          var thresh = densityField(cx / Math.max(1, W), cy / Math.max(1, H)) * 0.92 + 0.08;
          if (Math.random() < thresh) {
            px = cx; py = cy;
            break;
          }
        }
        pos0[i * 2] = px;
        pos0[i * 2 + 1] = py;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, src.pos);
      gl.bufferData(gl.ARRAY_BUFFER, pos0, gl.DYNAMIC_COPY);
      gl.bindBuffer(gl.ARRAY_BUFFER, dst.pos);
      gl.bufferData(gl.ARRAY_BUFFER, pos0, gl.DYNAMIC_COPY);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    function lightTheme() { return document.documentElement.getAttribute("data-theme") === "light" ? 1 : 0; }

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      amp += (ampT - amp) * Math.min(1, dt * 4.8);

      /* decay click/tap repellent shockwave impulse */
      shock.amp *= Math.exp(-4.2 * dt);
      if (shock.amp < 0.001) { shock.amp = 0; }

      /* initial pause/halt followed by gentle, smooth ramp-up to slow speed */
      var elapsed = Math.max(0, (now - startTime) / 1000);
      var speedFactor = 0.0;
      if (elapsed > 0.4) {
        var ramp = Math.min(1.0, (elapsed - 0.4) / 2.6);
        speedFactor = ramp * ramp * (3.0 - 2.0 * ramp);
      }

      var src = pairs[cur], dst = pairs[1 - cur];
      var srcVao = cur === 0 ? vaoA : vaoB;
      var srcDrawVao = cur === 0 ? drawVaoA : drawVaoB;

      /* 1. simulate */
      gl.useProgram(simProg);
      gl.uniform2f(uSim.res, W, H);
      gl.uniform2f(uSim.mouse, mouse.x, 1 - mouse.y);
      gl.uniform1f(uSim.amp, amp);
      gl.uniform1f(uSim.dt, dt);
      gl.uniform1f(uSim.t, now / 1000);
      gl.uniform1f(uSim.speed, speedFactor);
      gl.uniform2f(uSim.shockPos, shock.x, 1 - shock.y);
      gl.uniform1f(uSim.shockAmp, shock.amp);
      gl.bindVertexArray(srcVao);
      /* TF dest must not be bound to any non-TF target (generic ARRAY_BUFFER
         included) or WebGL2 drops the draw — unbind to keep the sim valid. */
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, dst.pos);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, dst.vel);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, dst.seed);
      gl.enable(gl.RASTERIZER_DISCARD);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, COUNT);
      gl.endTransformFeedback();
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

      /* 2. draw */
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(drawProg);
      gl.uniform2f(uDraw.res, W, H);
      gl.uniform1f(uDraw.light, lightTheme());
      gl.uniform1f(uDraw.time, now / 1000);
      gl.uniform1f(uDraw.dpr, dpr);
      gl.enable(gl.BLEND);
      if (lightTheme() > 0.5) {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.blendFunc(gl.ONE, gl.ONE); /* additive: sparks brighten each other + aurora */
      }
      gl.bindVertexArray(srcDrawVao);
      gl.drawArrays(gl.POINTS, 0, COUNT);

      /* dst becomes src next frame (VAO bindings persist — buffers never swap identity) */
      cur = 1 - cur;

      rafId = (running && visible) ? requestAnimationFrame(frame) : 0;
    }

    window.addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) / Math.max(1, r.width);
      var y = (e.clientY - r.top) / Math.max(1, r.height);
      if (x > -0.08 && x < 1.08 && y > -0.08 && y < 1.08) {
        mouse.x = Math.max(0, Math.min(1, x));
        mouse.y = Math.max(0, Math.min(1, y));
        ampT = 1;
      } else {
        ampT = 0;   /* cursor left the hero: swirl fades out */
      }
    }, { passive: true });

    window.addEventListener("pointerdown", function (e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) / Math.max(1, r.width);
      var y = (e.clientY - r.top) / Math.max(1, r.height);
      if (x > -0.08 && x < 1.08 && y > -0.08 && y < 1.08) {
        shock.x = Math.max(0, Math.min(1, x));
        shock.y = Math.max(0, Math.min(1, y));
        shock.amp = 1.0;
      }
    }, { passive: true });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && visible && !rafId && !reducedMotion) {
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !rafId && !reducedMotion) {
          last = performance.now();
          rafId = requestAnimationFrame(frame);
        }
      }, { threshold: 0 }).observe(cv);
    }

    var rsz;
    window.addEventListener("resize", function () {
      clearTimeout(rsz);
      rsz = setTimeout(function () {
        size();
        if (reducedMotion) { frame(performance.now()); } /* redraw static sprinkle */
      }, 150);
    });

    size();
    if (!reducedMotion) {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    } else {
      /* single static sprinkle (running stays false so frame() never re-schedules) */
      frame(performance.now());
    }
  })();

  /* ------------------------------------------------------------
     HERO HEADLINE — lines are authored directly in the markup
     (.headline-line spans) and revealed via CSS keyframes.
     ------------------------------------------------------------ */

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
     HERO INTRO — handled by CSS `anim` keyframe reveals
     (reference-style). GSAP only drives scroll parallax below.
     ------------------------------------------------------------ */
  function playHeroIntro() { /* CSS-driven */ }

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
    window.lenis = lenis;
  }

  function scrollToHash(hash) {
    var el = document.querySelector(hash);
    if (!el) return;
    if (lenis) { lenis.scrollTo(el, { offset: -90, duration: 1.4 }); }
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
     NAV — floating card-nav pill with dropdown cards
     ------------------------------------------------------------ */
  var nav = $("#nav");
  var burger = $("#navBurger");
  var navContent = $("#navContent");
  var cardNav = nav ? nav.querySelector(".card-nav") : null;

  function onScrollNav() {
    var y = window.pageYOffset;
    if (nav) { nav.classList.toggle("scrolled", y > 40); }
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  function closeMobileMenu() {
    if (!cardNav) return;
    var wasOpen = cardNav.classList.contains("open");
    cardNav.classList.remove("open");
    if (burger) {
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
    if (navContent) { navContent.setAttribute("aria-hidden", "true"); }
    if (wasOpen) { lockScroll(false); }
    if (lenis) lenis.start();
  }
  if (burger && cardNav) {
    burger.addEventListener("click", function () {
      var open = cardNav.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      if (navContent) { navContent.setAttribute("aria-hidden", open ? "false" : "true"); }
      lockScroll(open);
      if (lenis) { open ? lenis.stop() : lenis.start(); }
    });
  }

  /* ------------------------------------------------------------
     THEME STATE SYNC
     ------------------------------------------------------------ */
  var themeToggle = $("#themeToggle");
  if (themeToggle && !themeToggle.getAttribute("onclick")) {
    themeToggle.addEventListener("click", function (e) {
      if (window.toggleAppTheme) { window.toggleAppTheme(e); }
    });
  }

  var navSectionIds = ["about", "events", "gallery", "team", "faq", "join"];
  function setActive(id) {
    $all(".nav-card-link[href^='#']").forEach(function (a) {
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

  /* ------------------------------------------------------------
     HERO — scroll parallax (Desktop only)
     ------------------------------------------------------------ */
  if (hasGsap && !reduced && window.innerWidth > 768) {
    gsap.to(".hero-core", {
      yPercent: -25, opacity: .1, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "80% top", scrub: true }
    });
    gsap.to(".stats", {
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
     WHY ROWS — staggered visibility on scroll
     ------------------------------------------------------------ */
  var whyRows = $all(".why-row");
  if ("IntersectionObserver" in window && whyRows.length) {
    var wio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          wio.unobserve(en.target);
        }
      });
    }, { threshold: .15 });
    whyRows.forEach(function (r) { wio.observe(r); });
  } else {
    whyRows.forEach(function (r) { r.classList.add("is-visible"); });
  }

  /* ------------------------------------------------------------
     FAQ — accordion (one open at a time)
     ------------------------------------------------------------ */
  var faqItems = $all(".faq-item");
  faqItems.forEach(function (item) {
    var q = $(".faq-q", item);
    if (!q) return;
    q.addEventListener("click", function () {
      var wasOpen = item.classList.contains("open");
      faqItems.forEach(function (other) {
        other.classList.remove("open");
        var oq = $(".faq-q", other);
        if (oq) oq.setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        item.classList.add("open");
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ------------------------------------------------------------
     ABOUT TERMINAL — typed sequence & desktop window tabs
     ------------------------------------------------------------ */
  var termBody = $("#termBody");
  var termChips = $all(".term-chip");
  var termCommands = {
    status: [
      { t: "iei --status", c: "cmd" },
      { t: "● IEI Student Chapter (Department of CSDS, GHRCEM)", c: "out info" },
      { t: "  Affiliation : The Institution of Engineers (India)", c: "out" },
      { t: "  Status      : Active Operations (2025–2026)", c: "out" },
      { t: "  Health      : All systems nominal (100% uptime)", c: "ok" }
    ],
    scope: [
      { t: "iei --scope", c: "cmd" },
      { t: "● Cross-disciplinary technical integration across all years.", c: "out" },
      { t: "● Live drills, CTF hackathons, and security engineering.", c: "out" },
      { t: "● Peer-driven mentoring and direct industry connections.", c: "ok" }
    ],
    events: [
      { t: "iei --events --latest", c: "cmd" },
      { t: "● [SESSION] Threat Intel in the Age of AI (NOV 09)", c: "out info" },
      { t: "● [DRILL]   Red vs Blue: Live Fire (OCT 20)", c: "out" },
      { t: "● [CTF]     Cyber Defense Hackathon Finals (OCT 02)", c: "ok" }
    ],
    team: [
      { t: "iei --team --roster", c: "cmd" },
      { t: "● Leadership: 4 Executives, 11 Technical Leads, 4 Teams", c: "out info" },
      { t: "● Total Active Operator Network: 40+ Student Engineers", c: "out" },
      { t: "● Faculty Guidance: Dr. Rajesh Kumar & Advisory Board", c: "ok" }
    ],
    join: [
      { t: "./join --club --now", c: "cmd" },
      { t: "[✓] Application channel open. Scroll down to request access.", c: "ok" }
    ]
  };

  /* Hydrate the events tab from the live backend (GET /api/events).
     Falls back to the placeholder lines if the API is unreachable. */
  (function hydrateTermEvents() {
    if (!termBody) return;
    fetch(API_BASE + "/events")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) return;
        var published = (data.events || []).filter(function (e) { return e.status === "published"; });
        if (!published.length) return;
        published.sort(function (a, b) {
          if (a.display_order !== b.display_order) {
            return (a.display_order || 0) - (b.display_order || 0);
          }
          return new Date(b.event_date) - new Date(a.event_date);
        });
        var lines = [{ t: "iei --events --latest", c: "cmd" }];
        published.slice(0, 3).forEach(function (ev, idx) {
          var d = new Date(ev.event_date);
          var stamp = d.toLocaleString("default", { month: "short" }).toUpperCase() + " " +
            ((d.getDate() < 10 ? "0" : "") + d.getDate());
          lines.push({
            t: "● [" + (ev.category || "EVENT").toUpperCase() + "] " + ev.title + " (" + stamp + ")",
            c: idx === 0 ? "out info" : (idx === published.slice(0, 3).length - 1 ? "ok" : "out")
          });
        });
        termCommands.events = lines;
      })
      .catch(function () { /* keep placeholder lines */ });
  })();
  var termStarted = false;
  var termTypingTimers = [];

  function clearTermTyping() {
    while (termTypingTimers.length) {
      clearTimeout(termTypingTimers.pop());
    }
  }

  function runTermCommand(cmdKey) {
    if (!termBody || !termCommands[cmdKey]) return;
    clearTermTyping();
    termChips.forEach(function (c) {
      c.classList.toggle("is-active", c.getAttribute("data-cmd") === cmdKey);
      c.setAttribute("aria-selected", c.getAttribute("data-cmd") === cmdKey ? "true" : "false");
    });
    termBody.innerHTML = "";
    var script = termCommands[cmdKey];
    var li = 0;
    function next() {
      if (li >= script.length) {
        termBody.insertAdjacentHTML("beforeend", '<span class="caret"></span>');
        return;
      }
      var line = script[li];
      var div = document.createElement("div");
      div.className = line.c;
      termBody.appendChild(div);
      var ci = 0;
      var spd = line.c === "cmd" ? 35 : 10;
      (function step() {
        if (ci <= line.t.length) {
          div.textContent = line.t.slice(0, ci);
          ci++;
          termTypingTimers.push(setTimeout(step, spd));
        } else {
          li++;
          termTypingTimers.push(setTimeout(next, line.c === "cmd" ? 180 : 80));
        }
      })();
    }
    next();
  }

  termChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var cmd = this.getAttribute("data-cmd");
      runTermCommand(cmd);
    });
  });

  function renderTermInstant() {
    if (!termBody) return;
    clearTermTyping();
    termBody.innerHTML = termCommands.status.map(function (l) {
      return '<div class="' + l.c + '">' + l.t + '</div>';
    }).join("") + '<span class="caret"></span>';
  }

  function typeTerm() {
    if (termStarted || !termBody) return;
    termStarted = true;
    if (!hasGsap || reduced) { renderTermInstant(); return; }
    runTermCommand("status");
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
     STAT COUNTERS — metric cards
     Number climbs, a conic progress ring sweeps around the card
     border in sync, a holographic sheen passes once, and the
     value glows while counting. Reduced motion: final values only.
     ------------------------------------------------------------ */
  function metricCard(el) { return el.closest ? el.closest(".bento-metric-card") : null; }

  function setRing(card, p) {
    if (!card) { return; }
    card.style.setProperty("--p", p.toFixed(1));
  }

  function activateMetricFx(el) {
    var card = metricCard(el);
    if (!card) { return; }
    if (card.querySelector(".metric-ring")) { return; }
    var ring = document.createElement("span");
    ring.className = "metric-ring";
    ring.setAttribute("aria-hidden", "true");
    card.appendChild(ring);
    setRing(card, 0);
    card.classList.add("is-live");
    if (!reduced) { el.classList.add("is-counting"); }
  }

  function settleMetricFx(el) {
    el.classList.remove("is-counting");
    setRing(metricCard(el), 100);
  }

  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var suffix = el.dataset.suffix || "";
    activateMetricFx(el);
    if (!hasGsap || reduced || target === 0) {
      el.textContent = target + suffix;
      setRing(metricCard(el), 100);
      settleMetricFx(el);
      return;
    }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.8, ease: "power2.out", onUpdate: function () {
        el.textContent = Math.round(obj.v) + suffix;
        setRing(metricCard(el), (obj.v / (target || 1)) * 100);
      },
      onComplete: function () { settleMetricFx(el); }
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
     METRIC CARDS — WebGL Specular Prismatic Rim Refraction
     Renders an Apple-grade prismatic specular highlight along the
     rounded rim of each metric card, dynamically reacting to pointer
     proximity and angle.
     ------------------------------------------------------------ */
  (function () {
    var cards = $all("[data-metric-specular]");
    /* skipped on touch: the rim reacts to pointer proximity, and the
       per-frame WebGL redraw is wasted GPU on phones */
    if (!cards.length || reduced || coarsePointer) { return; }

    var attrs = { alpha: true, premultipliedAlpha: true, antialias: true };

    var FRAG = [
      "precision mediump float;",
      "uniform vec2 uCenter;",
      "uniform vec2 uHalfSize;",
      "uniform float uRadius;",
      "uniform float uAngle;",
      "uniform float uPx;",
      "uniform vec3 uLineColor;",
      "uniform vec3 uBaseColor;",
      "uniform float uIntensity;",
      "uniform float uShineSize;",
      "uniform float uShineFade;",
      "uniform float uThickness;",
      "uniform float uBaseWidth;",
      "float sdRoundedRect(vec2 p, vec2 b, float r){",
      "  vec2 q=abs(p)-b+r;",
      "  return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;",
      "}",
      "float gaussianLine(float d, float sigma){",
      "  float x=d/(sigma+1e-6);",
      "  float k=mix(1.0,1.6,smoothstep(0.0,1.5,x));",
      "  return exp(-k*x*x);",
      "}",
      "void main(){",
      "  vec2 p=gl_FragCoord.xy-uCenter;",
      "  float d=sdRoundedRect(p,uHalfSize,uRadius);",
      "  vec2 L=vec2(cos(uAngle),sin(uAngle));",
      "  float base=(1.0-smoothstep(0.0,uBaseWidth,abs(d)))*0.14;",
      "  vec2 nEll=normalize(p/(uHalfSize*uHalfSize)+1e-6);",
      "  float phi=acos(clamp(abs(dot(nEll,L)),0.0,1.0));",
      "  float rim=1.0-smoothstep(uShineSize-uShineFade,uShineSize+uShineFade+1e-4,phi);",
      "  float line=gaussianLine(d,uThickness);",
      "  float edgeClamp=1.0-smoothstep(0.5*uPx,3.0*uPx,abs(d));",
      "  float hi=line*rim*edgeClamp*uIntensity;",
      "  vec3 col=uBaseColor*base+uLineColor*hi;",
      "  float a=clamp(base+hi,0.0,1.0);",
      "  gl_FragColor=vec4(col,a);",
      "}"
    ].join("\n");

    function compile(gl, type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    var UNIS = ["uCenter", "uHalfSize", "uRadius", "uAngle", "uPx", "uLineColor",
      "uBaseColor", "uIntensity", "uShineSize", "uShineFade", "uThickness", "uBaseWidth"];

    var items = [];
    var rafId = 0;

    cards.forEach(function (card, idx) {
      var fx = card.querySelector(".specular-card__fx");
      if (!fx) { return; }
      fx.innerHTML = "";
      var cv = document.createElement("canvas");
      fx.appendChild(cv);

      var gl = cv.getContext("webgl2", attrs) || cv.getContext("webgl", attrs);
      if (!gl) { return; }

      var prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, "attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}"));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { return; }
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      var u = {};
      UNIS.forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });

      var item = {
        card: card, canvas: cv, gl: gl, u: u,
        angle: 1.8 + idx * 1.5, target: null, prox: 0,
        dpr: 1, radius: 16, visible: true
      };

      function size() {
        var r = card.getBoundingClientRect();
        var w = Math.max(1, r.width), h = Math.max(1, r.height);
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        item.dpr = dpr;
        cv.width = Math.ceil((w + 8) * dpr);
        cv.height = Math.ceil((h + 8) * dpr);
        gl.viewport(0, 0, cv.width, cv.height);
        var br = parseFloat(getComputedStyle(card).borderRadius) || 16;
        item.radius = Math.min(br, Math.min(w, h) / 2) * dpr;
      }

      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(size).observe(card);
      } else {
        window.addEventListener("resize", size);
      }
      size();

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          item.visible = entries[0].isIntersecting;
          if (item.visible && rafId === 0) {
            start();
          }
        }, { threshold: 0 }).observe(card);
      }

      window.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = e.clientX - cx, dy = e.clientY - cy;
        var dist = Math.hypot(dx, dy);
        var reach = Math.max(r.width, r.height) * 1.2;
        if (dist < reach) {
          item.prox = Math.max(0, 1 - dist / reach);
          item.target = Math.atan2(e.clientY - cy, e.clientX - cx);
        } else {
          item.prox = Math.max(0, item.prox - 0.05);
          item.target = null;
        }
      });

      items.push(item);
    });

    if (!items.length) { return; }

    function renderLoop() {
      rafId = 0;
      if (document.hidden) { return; }
      var any = false;

      items.forEach(function (it) {
        if (!it.visible) { return; }
        any = true;
        var r = it.card.getBoundingClientRect();
        var dpr = it.dpr;
        var gl = it.gl;
        var u = it.u;

        if (it.target !== null) {
          var diff = it.target - it.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          it.angle += diff * 0.1;
        } else {
          it.angle += 0.012;
        }

        gl.uniform2f(u.uCenter, (r.width / 2 + 4) * dpr, (r.height / 2 + 4) * dpr);
        gl.uniform2f(u.uHalfSize, (r.width / 2) * dpr, (r.height / 2) * dpr);
        gl.uniform1f(u.uRadius, it.radius);
        gl.uniform1f(u.uAngle, it.angle);
        gl.uniform1f(u.uPx, dpr);

        gl.uniform3f(u.uLineColor, 0.72, 0.48, 0.94);
        gl.uniform3f(u.uBaseColor, 0.38, 0.16, 0.65);
        gl.uniform1f(u.uIntensity, 0.32 + it.prox * 0.42);
        gl.uniform1f(u.uShineSize, 0.45 + it.prox * 0.2);
        gl.uniform1f(u.uShineFade, 0.35);
        gl.uniform1f(u.uThickness, (1.1 + it.prox * 0.35) * dpr);
        gl.uniform1f(u.uBaseWidth, 1.1 * dpr);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      });

      if (any) {
        rafId = requestAnimationFrame(renderLoop);
      }
    }

    function start() {
      if (!rafId) {
        rafId = requestAnimationFrame(renderLoop);
      }
    }

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) start();
    });

    start();
  })();

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
    evTrack.innerHTML = '<div style="padding: 2rem; color: var(--tx2); font-family: var(--mono);">[LOADING_EVENTS...]</div>';

    /* API: fetch published events from the existing backend.
       Response: { success, events: [{ id, title, description, category,
       event_date, start_time, end_time, location, poster_url, status,
       display_order }] } — see backend/controllers/events.controller.js */
    fetch(API_BASE + "/events")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) throw new Error("API failed");
        cacheEvents(data.events || []);
        renderEvents(data.events || []);
        renderPastSection();
        initTimeline();
        initEventCountdownTicker();
      })
      .catch(function (err) {
        evTrack.innerHTML = '<div style="padding: 2rem; color: #ff6b6b; font-family: var(--mono);">[ERROR: FAILED_TO_LOAD_EVENTS]</div>';
        console.error(err);
      });

    /* Shared event state + helpers for timeline, spotlight, archive grid,
       detail view and countdowns. All dates interpreted in Asia/Kolkata. */
    var EVENTS_CACHE = {};
    var pastCatFilter = "all";
    var spotlightEventId = null;

    /* Spotlight opens the same reusable event-detail view. Bound once. */
    function bindSpotlightDetail() {
      var card = $("#nextEventCard");
      if (!card || card.dataset.detailBound) return;
      card.dataset.detailBound = "1";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.addEventListener("click", function () {
        if (spotlightEventId) openEventDetail(spotlightEventId);
      });
      card.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && spotlightEventId) {
          e.preventDefault();
          openEventDetail(spotlightEventId);
        }
      });
    }

    function cacheEvents(allEvents) {
      EVENTS_CACHE = {};
      (allEvents || []).forEach(function (e) { if (e && e.id) EVENTS_CACHE[e.id] = e; });
    }

    function escHtml(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    function evEndDate(ev) {
      return new Date(ev.event_date + "T" + (ev.end_time || "23:59:59") + "+05:30");
    }

    function evStartDate(ev) {
      return new Date(ev.event_date + "T" + (ev.start_time || "00:00:00") + "+05:30");
    }

    /* Sort key for Past Events: end datetime when available,
       otherwise start datetime, otherwise the bare date. */
    function evSortTime(ev) {
      var t = ev.end_time || ev.start_time || "00:00:00";
      var d = new Date(ev.event_date + "T" + t + "+05:30");
      if (!isNaN(d.getTime())) return d.getTime();
      var f = new Date(ev.event_date);
      return isNaN(f.getTime()) ? 0 : f.getTime();
    }

    function evPhase(ev, now) {
      if (!ev || !ev.event_date) return "tba";
      var end = evEndDate(ev);
      if (isNaN(end.getTime())) return "tba";
      return end.getTime() <= (now || Date.now()) ? "past" : "upcoming";
    }

    /* Event countdown target: admin override or event start. Null = NONE. */
    function evCountdownTarget(ev) {
      if (!ev.event_countdown_enabled) return null;
      if (ev.event_countdown_at) {
        var t = new Date(ev.event_countdown_at);
        if (!isNaN(t.getTime())) return t;
      }
      if (ev.event_date) {
        var s = evStartDate(ev);
        if (!isNaN(s.getTime())) return s;
      }
      return null;
    }

    /* Registration deadline countdown target. Null = NONE. */
    function regCountdownTarget(ev) {
      if (!ev.registration_enabled || !ev.registration_deadline) return null;
      var t = new Date(ev.registration_deadline);
      return isNaN(t.getTime()) ? null : t;
    }

    function registrationOpen(ev, now) {
      if (!ev.registration_enabled || !ev.registration_url) return false;
      var dl = regCountdownTarget(ev);
      if (dl && dl.getTime() <= now) return false;
      return true;
    }

    function setSpotlightEmpty() {
      spotlightEventId = null;      var cardDisplay = $("#nextEventDateDisplay");
      if (cardDisplay) cardDisplay.innerHTML = "<strong>--</strong><span>--</span>";
      var cardTag = $("#nextEventTag");
      if (cardTag) cardTag.textContent = "NO EVENTS";
      var cardTitle = $("#nextEventTitle");
      if (cardTitle) cardTitle.textContent = "Stay tuned";
      var cardDesc = $("#nextEventDesc");
      if (cardDesc) cardDesc.textContent = "New events will be announced here.";
      var cardMeta = $("#nextEventMeta");
      if (cardMeta) cardMeta.textContent = "";
      var cdSlot = $("#nextEventCountdown");
      if (cdSlot) cdSlot.innerHTML = "";
      var regSlot = $("#nextEventReg");
      if (regSlot) regSlot.innerHTML = "";
    }

    function renderEvents(allEvents) {
      var now = Date.now();
      var publishedEvents = allEvents.filter(function (e) { return e.status === "published"; });
      publishedEvents.sort(function (a, b) {
        if (a.display_order !== b.display_order) {
          return (a.display_order || 0) - (b.display_order || 0);
        }
        return new Date(b.event_date) - new Date(a.event_date);
      });

      var upcoming = publishedEvents.filter(function (e) { return evPhase(e, now) === "upcoming"; });
      var past = publishedEvents.filter(function (e) { return evPhase(e, now) === "past"; });

      evTrack.innerHTML = "";
      if (publishedEvents.length === 0) {
        evTrack.innerHTML = '<div style="padding: 2rem; color: var(--tx2); font-family: var(--mono);">[NO_UPCOMING_EVENTS_FOUND]</div>';
        setSpotlightEmpty();
        return;
      }

      /* Spotlight: first upcoming in sort order, else most recent past */
      var spot = upcoming.length ? upcoming[0] : past[0];
      spotlightEventId = spot.id;
      bindSpotlightDetail();
      var nextD = spot.event_date ? new Date(spot.event_date) : null;
      var dayStr = "--";
      var moYr = "--";
      if (nextD && !isNaN(nextD.getTime())) {
        dayStr = (nextD.getDate() < 10 ? "0" : "") + nextD.getDate();
        moYr = nextD.toLocaleString('default', { month: 'short' }).toUpperCase() + ' ' + nextD.getFullYear();
      }

      /* Spotlight card — markup contract kept identical to index.html */
      var cardDisplay = $("#nextEventDateDisplay");
      var cardTag = $("#nextEventTag");
      var cardTitle = $("#nextEventTitle");
      var cardDesc = $("#nextEventDesc");
      var cardMeta = $("#nextEventMeta");

      if (cardDisplay) cardDisplay.innerHTML = '<strong>' + dayStr + '</strong><span id="nextEventDateText">' + moYr + '</span>';
      if (cardTag) cardTag.textContent = (spot.category || 'EVENT').toUpperCase();
      if (cardTitle) cardTitle.innerHTML = spot.title;
      if (cardDesc) cardDesc.textContent = spot.description || '';
      if (cardMeta) cardMeta.textContent = (spot.location || 'TBA') + (spot.start_time ? ' · ' + spot.start_time : '');

      /* Spotlight countdown (EVENT START and/or REGISTRATION DEADLINE) */
      var cdSlot = $("#nextEventCountdown");
      if (cdSlot) {
        var spotEct = evCountdownTarget(spot);
        var spotRct = regCountdownTarget(spot);
        var spotHtml = "";
        if (spotEct && evPhase(spot, now) === "upcoming") {
          spotHtml += '<div class="cd-line" data-cd-to="' + spotEct.toISOString() + '" data-cd-label="STARTS IN" data-cd-expired="LIVE NOW">STARTS IN ...</div>';
        }
        if (spotRct) {
          spotHtml += '<div class="cd-line cd-line--reg" data-cd-to="' + spotRct.toISOString() + '" data-cd-label="REGISTRATION CLOSES IN" data-cd-expired="REGISTRATION CLOSED">REGISTRATION CLOSES IN ...</div>';
        }
        cdSlot.innerHTML = spotHtml;
      }

      /* Spotlight registration */
      var regSlot = $("#nextEventReg");
      if (regSlot) {
        if (registrationOpen(spot, now) && evPhase(spot, now) === "upcoming") {
          regSlot.innerHTML = '<a class="specular-button specular-button--sm is-primary" href="' + escHtml(spot.registration_url) + '" target="_blank" rel="noopener"><span class="specular-button__label">Register -></span></a>';
        } else if (spot.registration_enabled && spot.registration_url) {
          regSlot.innerHTML = '<span class="mono reg-closed">REGISTRATION CLOSED</span>';
        } else {
          regSlot.innerHTML = "";
        }
      }

      /* Past-events toggle count */
      var expandText = $("#tlExpandText");
      if (expandText && evShell && !evShell.classList.contains("is-expanded")) {
        expandText.textContent = "View All Past Events (" + past.length + ")";
      }

      publishedEvents.forEach(function (ev) {
        var d = new Date(ev.event_date);
        var dDay = (d.getDate() < 10 ? "0" : "") + d.getDate();
        var mo = d.toLocaleString('default', { month: 'short' }).toUpperCase();
        var yr = d.getFullYear();
        var phase = evPhase(ev, now);

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tl-node btn-ev-gallery";
        if (ev.id === spot.id) btn.classList.add("is-selected");
        btn.dataset.type = phase === "upcoming" ? "upcoming" : "history";
        btn.dataset.evId = ev.id;
        /* data-gal-target links the timeline node to its gallery card ("gal-" + event id) */
        btn.dataset.galTarget = "gal-" + ev.id;
        btn.setAttribute("aria-label", ev.title + " - " + mo + " " + dDay + ", " + yr);

        var nodeEct = evCountdownTarget(ev);
        var cdLine = (nodeEct && phase === "upcoming")
          ? '<div class="tl-countdown mono" data-cd-to="' + nodeEct.toISOString() + '" data-cd-label="T-" data-cd-expired="LIVE">T- ...</div>'
          : "";
        var regDot = (registrationOpen(ev, now) && phase === "upcoming")
          ? '<span class="tl-regdot mono" title="Registration open">REG OPEN</span>'
          : "";

        btn.innerHTML =
          '<div class="tl-date"><time><span class="tl-day">' + dDay + '</span><span class="tl-mo">' + mo + '</span></time><span class="tl-year mono">' + yr + '</span></div>' +
          '<div class="tl-marker"><span class="tl-tick tl-tick-top"></span><span class="tl-dot"></span><span class="tl-tick tl-tick-bottom"></span></div>' +
          '<div class="tl-card"><span class="ev-tag mono">' + (ev.category || 'EVENT').toUpperCase() + '</span><h3 class="tl-name">' + ev.title + '</h3>' + cdLine + regDot + '</div>';

        /* click opens the event detail view (guarded against drag-scrolls) */
        var downX = 0, downY = 0;
        btn.addEventListener("pointerdown", function (e) { downX = e.clientX; downY = e.clientY; });
        btn.addEventListener("click", function (e) {
          if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 10) return;
          openEventDetail(ev.id);
        });

        evTrack.appendChild(btn);
      });
    }

    /* ------------------------------------------------------------
       PAST EVENTS ARCHIVE — 3-column responsive grid of published
       past events (works with or without a gallery album).
       ------------------------------------------------------------ */
    var PAST_CATS = ["workshop", "hackathon", "session", "drill", "competition", "seminar", "meetup", "other"];

    /* Frontend display labels for backend category values (values unchanged). */
    function pastCatLabel(c) {
      var map = {
        competition: "COMPETITIONS",
        workshop: "WORKSHOPS",
        drill: "DEFENSE",
        hackathon: "HACKATHONS",
        session: "SESSIONS",
        seminar: "SEMINARS",
        meetup: "MEETUPS",
        other: "OTHER"
      };
      return map[c] || String(c || "OTHER").toUpperCase();
    }

    function getPastEvents() {
      var now = Date.now();
      return Object.keys(EVENTS_CACHE).map(function (k) { return EVENTS_CACHE[k]; })
        .filter(function (e) { return e && e.status === "published" && evPhase(e, now) === "past"; })
        .sort(function (a, b) { return evSortTime(b) - evSortTime(a); });
    }

    function renderPastSection() {
      var grid = $("#pastGrid");
      if (!grid) return;
      var emptyMsg = $("#pastEmpty");
      var bar = $("#pastFilterBar");
      var pastList = getPastEvents();

      if (bar && !bar.dataset.built) {
        bar.dataset.built = "1";
        var counts = {};
        pastList.forEach(function (e) { if (e.category) counts[e.category] = (counts[e.category] || 0) + 1; });
        var btns = ['<button type="button" class="filter-btn past-filter-btn is-active" data-cat="all" role="tab" aria-selected="true">ALL (' + pastList.length + ')</button>'];
        PAST_CATS.forEach(function (c) {
          if (!counts[c]) return;
          btns.push('<button type="button" class="filter-btn past-filter-btn" data-cat="' + c + '" role="tab" aria-selected="false">' + pastCatLabel(c) + ' (' + counts[c] + ')</button>');
        });
        bar.innerHTML = btns.join("");
        $all(".past-filter-btn", bar).forEach(function (b) {
          b.addEventListener("click", function () {
            $all(".past-filter-btn", bar).forEach(function (x) { x.classList.remove("is-active"); x.setAttribute("aria-selected", "false"); });
            b.classList.add("is-active");
            b.setAttribute("aria-selected", "true");
            pastCatFilter = b.dataset.cat;
            renderPastSection();
          });
        });
      }

      var list = pastCatFilter === "all" ? pastList : pastList.filter(function (e) { return e.category === pastCatFilter; });
      grid.innerHTML = "";
      if (!list.length) {
        if (emptyMsg) emptyMsg.hidden = false;
        return;
      }
      if (emptyMsg) emptyMsg.hidden = true;
      list.forEach(function (ev) { grid.appendChild(buildPastCard(ev)); });
    }

    function buildPastCard(ev) {
      var d = new Date(ev.event_date);
      var dDay = (d.getDate() < 10 ? "0" : "") + d.getDate();
      var mo = d.toLocaleString('default', { month: 'short' }).toUpperCase();
      var yr = d.getFullYear();
      var desc = ev.description || "";
      var shortDesc = desc.length > 140 ? desc.slice(0, 140) + "..." : desc;

      var card = document.createElement("article");
      card.className = "past-card glass";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", ev.title + " - view details");
      var poster = ev.poster_url
        ? '<div class="past-card-media"><img src="' + escHtml(ev.poster_url) + '" alt="' + escHtml(ev.title) + ' poster" loading="lazy"></div>'
        : '<div class="past-card-media past-card-media--empty mono">[NO_POSTER]</div>';
      card.innerHTML =
        poster +
        '<div class="past-card-body">' +
          '<div class="past-card-top mono"><span class="ev-tag">' + escHtml((ev.category || "EVENT").toUpperCase()) + '</span>' +
          '<span class="past-card-date">' + dDay + " " + mo + " " + yr + '</span></div>' +
          '<h3 class="past-card-title">' + escHtml(ev.title) + '</h3>' +
          (shortDesc ? '<p class="past-card-desc">' + escHtml(shortDesc) + '</p>' : "") +
          '<div class="past-card-meta mono">' + escHtml(ev.location || "TBA") + (ev.start_time ? " - " + escHtml(ev.start_time) : "") + '</div>' +
          '<span class="past-card-badge mono">COMPLETED - VIEW DETAILS -></span>' +
        '</div>';
      card.addEventListener("click", function () { openEventDetail(ev.id); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEventDetail(ev.id); }
      });
      return card;
    }

    /* ------------------------------------------------------------
       EVENT DETAIL — full event view in the bottom sheet.
       Gallery is optional supplementary data (event renders fully
       with or without a gallery album).
       ------------------------------------------------------------ */
    function openEventDetail(id) {
      if (typeof openBottomSheet !== "function") return;
      var cached = EVENTS_CACHE[id];
      openBottomSheet('<div class="evd-sheet"><div class="evd-gallery mono">[LOADING_EVENT...]</div></div>');
      /* Fresh single-event record; falls back to the cached list copy. */
      fetch(API_BASE + "/events/" + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var ev = (data && data.success && data.event) || cached;
          if (!ev) {
            openBottomSheet('<div class="evd-sheet"><div class="evd-gallery mono">[EVENT_NOT_FOUND]</div></div>');
            return;
          }
          EVENTS_CACHE[ev.id] = ev;
          renderEventDetailSheet(ev);
        })
        .catch(function () {
          if (cached) { renderEventDetailSheet(cached); return; }
          openBottomSheet('<div class="evd-sheet"><div class="evd-gallery mono">[EVENT_NOT_FOUND]</div></div>');
        });
    }

    function renderEventDetailSheet(ev) {
      var now = Date.now();
      var phase = evPhase(ev, now);
      var d = ev.event_date ? new Date(ev.event_date) : null;
      var dateStr = (d && !isNaN(d.getTime()))
        ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "TBA";
      var timeStr = [ev.start_time, ev.end_time].filter(Boolean).join(" - ") || "";
      var ect = evCountdownTarget(ev);
      var rct = regCountdownTarget(ev);
      var cdHtml = "";
      if (ect && phase === "upcoming") {
        cdHtml += '<div class="evd-countdown mono"><span class="evd-cd-label">EVENT STARTS IN</span><span data-cd-to="' + ect.toISOString() + '" data-cd-expired="LIVE NOW">...</span></div>';
      }
      if (rct) {
        cdHtml += '<div class="evd-countdown mono evd-countdown--reg"><span class="evd-cd-label">REGISTRATION CLOSES IN</span><span data-cd-to="' + rct.toISOString() + '" data-cd-expired="REGISTRATION CLOSED">...</span></div>';
      }
      var regHtml = "";
      if (registrationOpen(ev, now) && phase === "upcoming") {
        regHtml = '<div class="evd-reg"><a class="specular-button specular-button--sm is-primary" href="' + escHtml(ev.registration_url) + '" target="_blank" rel="noopener"><span class="specular-button__label">Register Now -></span></a></div>';
      } else if (ev.registration_enabled && ev.registration_url) {
        regHtml = '<div class="evd-reg"><span class="mono reg-closed">REGISTRATION CLOSED</span></div>';
      }
      var posterHtml = ev.poster_url
        ? '<div class="evd-poster"><img src="' + escHtml(ev.poster_url) + '" alt="' + escHtml(ev.title) + ' poster"></div>'
        : "";
      openBottomSheet(
        '<div class="evd-sheet">' +
          '<div class="evd-top mono"><span class="ev-tag">' + escHtml((ev.category || "EVENT").toUpperCase()) + '</span>' +
          '<span class="evd-phase">' + (phase === "upcoming" ? "UPCOMING" : phase === "past" ? "COMPLETED" : "TBA") + '</span></div>' +
          '<h3 class="evd-title">' + escHtml(ev.title) + '</h3>' +
          '<div class="evd-meta mono">' + escHtml(dateStr) + (timeStr ? " - " + escHtml(timeStr) : "") + (ev.location ? "<br>" + escHtml(ev.location) : "") + '</div>' +
          posterHtml +
          (ev.description ? '<p class="evd-desc">' + escHtml(ev.description) + '</p>' : "") +
          (cdHtml ? '<div class="evd-countdowns">' + cdHtml + '</div>' : "") +
          regHtml +
          '<div id="evDetailSections"></div>' +
          '<div class="evd-gallery mono" id="evDetailGallery">[LOADING_GALLERY...]</div>' +
        '</div>'
      );
      enrichEventDetailGallery(ev);
    }

    /* Gallery + rich sections enrichment inside the SAME detail view.
       Sections load for every phase (no gallery needed); gallery blocks
       render only when a published gallery exists. Section images and
       gallery photos share one viewer album (section images first). */
    var evdViewerAlbum = [];

    function visibleSections(sections, phaseKey) {
      return (sections || []).filter(function (s) {
        if (!s || (!s.section_type && !s.title && !s.content)) return false;
        if (!phaseKey) return true;
        var sp = sectionPhaseOf(s.section_type);
        return sp === "both" || sp === phaseKey;
      });
    }

    function collectSectionImages(list) {
      var out = [];
      (list || []).forEach(function (s) {
        parseSectionBlocks(s.content).forEach(function (b) {
          if (b.k === "image" && b.url) out.push({ src: b.url, caption: b.caption || "" });
        });
      });
      return out;
    }

    function galleryViewerImages(media) {
      return (media || [])
        .filter(function (m) { return (m.media_type || "image") !== "video" && (m.media_url || m.thumbnail_url); })
        .slice(0, 8);
    }

    function bindViewerThumbs(box) {
      if (!box) return;
      var thumbs = box.querySelectorAll("[data-viewer-idx]");
      for (var i = 0; i < thumbs.length; i++) {
        (function (el) {
          el.style.cursor = "zoom-in";
          el.addEventListener("click", function () {
            var idx = parseInt(el.getAttribute("data-viewer-idx"), 10);
            if (!isNaN(idx)) openPhotoViewer(evdViewerAlbum, idx, el.getAttribute("alt") || "");
          });
        })(thumbs[i]);
      }
    }

    function enrichEventDetailGallery(ev) {
      var phaseKey = evPhase(ev, Date.now()) === "past" ? "post" : "pre";
      var secP = fetch(API_BASE + "/events/" + encodeURIComponent(ev.id) + "/sections")
        .then(function (r) { return r.json(); })
        .catch(function () { return null; });
      var galP = fetch(API_BASE + "/gallery/" + encodeURIComponent(ev.id))
        .then(function (r) { return r.json(); })
        .catch(function () { return null; });
      Promise.all([secP, galP]).then(function (res) {
        var sdata = res[0], gdata = res[1];
        var list = ((sdata && sdata.success) ? visibleSections(sdata.sections, phaseKey) : []);
        var galMedia = (gdata && gdata.success && gdata.media) || [];
        var galImages = (gdata && gdata.success) ? galleryViewerImages(galMedia) : [];
        evdViewerAlbum = collectSectionImages(list).concat(galImages.map(function (m) {
          return { src: m.thumbnail_url || m.media_url, caption: m.caption || m.title || "" };
        }));
        var secBox = document.getElementById("evDetailSections");
        if (secBox) {
          secBox.innerHTML = buildEventSectionsHtml(list, phaseKey, 0);
          bindViewerThumbs(secBox);
        }
        var galBox = document.getElementById("evDetailGallery");
        if (galBox) {
          var galHtml = (gdata && gdata.success)
            ? buildEventGalleryHtml(gdata, ev.title, collectSectionImages(list).length)
            : "";
          galBox.innerHTML = galHtml || "[PHOTOS_COMING_SOON]";
          bindViewerThumbs(galBox);
        }
      });
    }

    /* Pure gallery-block builders (string in/out) for the detail view.
       Event-info sections come from /api/events/:id/sections instead
       (same rows for Upcoming and Past, no gallery required). */
    function buildEventGalleryHtml(gdata, eventTitle, albumBase) {
      var gal = gdata.gallery || null;
      var media = gdata.media || [];
      var guests = gdata.guests || [];
      var sponsors = gdata.sponsors || [];
      if (!gal && !media.length && !guests.length && !sponsors.length) return "";
      var imgBase = (albumBase === undefined || albumBase === null) ? 0 : albumBase;
      var parts = ['<span class="evd-gal-label">EVENT GALLERY</span>'];
      if (gal) {
        if (gal.cover_image_url) {
          parts.push('<div class="evd-gal-cover"><img src="' + escHtml(gal.cover_image_url) + '" alt="' + escHtml(eventTitle) + ' gallery cover" loading="lazy"></div>');
        }
        if (gal.short_summary) parts.push('<p class="evd-gal-summary">' + escHtml(gal.short_summary) + '</p>');
        if (gal.full_description) parts.push('<p class="evd-gal-desc">' + escHtml(gal.full_description) + '</p>');
      }
      var images = galleryViewerImages(media);
      var videos = media.filter(function (m) { return m.media_type === "video" && m.media_url; });
      var totalImages = media.filter(function (m) { return (m.media_type || "image") !== "video" && (m.media_url || m.thumbnail_url); }).length;
      if (images.length) {
        parts.push('<div class="evd-gal-sub mono">IMAGES (' + totalImages + ')</div><div class="evd-thumbs">' + images.map(function (m, mi) {
          return '<img data-viewer-idx="' + (imgBase + mi) + '" src="' + escHtml(m.thumbnail_url || m.media_url) + '" alt="' + escHtml(m.caption || m.title || eventTitle) + '" loading="lazy">';
        }).join("") + '</div>');
      }
      if (videos.length) {
        parts.push('<div class="evd-gal-sub mono">VIDEOS (' + videos.length + ')</div><div class="evd-videos">' + videos.slice(0, 4).map(function (m) {
          return '<video controls preload="none"' + (m.thumbnail_url ? ' poster="' + escHtml(m.thumbnail_url) + '"' : '') + ' src="' + escHtml(m.media_url) + '"></video>';
        }).join("") + '</div>');
      }
      if (guests.length) {
        parts.push('<div class="evd-gal-sub mono">GUESTS (' + guests.length + ')</div><div class="evd-guests">' + guests.map(function (g) {
          return '<div class="evd-guest">' +
            (g.photo_url ? '<img src="' + escHtml(g.photo_url) + '" alt="' + escHtml(g.name || "Guest") + '" loading="lazy">' : "") +
            '<div class="evd-guest-info"><strong>' + escHtml(g.name || "Guest") + '</strong>' +
            (g.designation ? '<span>' + escHtml(g.designation) + '</span>' : "") +
            (g.organization ? '<span>' + escHtml(g.organization) + '</span>' : "") +
            (g.bio ? '<p>' + escHtml(g.bio) + '</p>' : "") +
            (g.linkedin_url ? '<a href="' + escHtml(g.linkedin_url) + '" target="_blank" rel="noopener">LinkedIn -></a>' : "") +
            '</div></div>';
        }).join("") + '</div>');
      }
      if (sponsors.length) {
        parts.push('<div class="evd-gal-sub mono">SPONSORS (' + sponsors.length + ')</div><div class="evd-sponsors">' + sponsors.map(function (s) {
          var logo = s.logo_url ? '<img src="' + escHtml(s.logo_url) + '" alt="' + escHtml(s.name || "Sponsor") + ' logo" loading="lazy">' : "";
          if (s.website_url && logo) logo = '<a href="' + escHtml(s.website_url) + '" target="_blank" rel="noopener">' + logo + '</a>';
          return '<div class="evd-sponsor">' + logo +
            '<div class="evd-sponsor-info"><strong>' + escHtml(s.name || "Sponsor") + '</strong>' +
            (s.website_url ? '<a href="' + escHtml(s.website_url) + '" target="_blank" rel="noopener">' + escHtml(s.website_url) + '</a>' : "") +
            (s.description ? '<p>' + escHtml(s.description) + '</p>' : "") +
            '</div></div>';
        }).join("") + '</div>');
      }
      if (gal && gal.copyright_text) parts.push('<div class="evd-copy mono">' + escHtml(gal.copyright_text) + '</div>');
      return parts.join("");
    }

    /* Rich event-info sections: same admin-managed rows for Upcoming
       and Past phases (event_id never changes across the lifecycle).
       phaseKey: "pre" (upcoming) or "post" (past). section_type values
       "pre"/"post" restrict visibility; anything else shows in both. */
    function sectionPhaseOf(t) {
      if (t === "pre" || t === "post") return t;
      return "both";
    }

    function parseSectionBlocks(content) {
      if (!content) return [];
      try {
        var parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.filter(function (b) {
            return b && typeof b === "object" &&
              (b.k === "text" || b.k === "image" || b.k === "link" || b.k === "video" || b.k === "resource");
          });
        }
      } catch (e) { /* legacy plain text below */ }
      return [{ k: "text", text: content }];
    }

    /* Classify a video URL for inline playback. Pure helper. */
    function videoEmbedInfo(url) {
      var u = String(url || "");
      var yt = u.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
      if (yt) return { kind: "youtube", id: yt[1] };
      var vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vm) return { kind: "vimeo", id: vm[1] };
      if (/\.(mp4|webm|mov)(\?|#|$)/i.test(u)) return { kind: "file" };
      return { kind: "link" };
    }

    function renderSectionBlocks(blocks, eventTitle, startIdx) {
      var imgIdx = (startIdx === undefined || startIdx === null) ? 0 : startIdx;
      var out = [];
      (blocks || []).forEach(function (b) {
        if (b.k === "text") {
          if (b.text) out.push('<p class="evd-block-text">' + escHtml(b.text) + '</p>');
          return;
        }
        if (b.k === "image") {
          if (!b.url) return;
          out.push('<figure class="evd-block-figure"><img class="evd-block-img" data-viewer-idx="' + (imgIdx++) + '" src="' + escHtml(b.url) + '" alt="' + escHtml(b.caption || eventTitle) + '" loading="lazy">' +
            (b.caption ? '<figcaption>' + escHtml(b.caption) + '</figcaption>' : "") + '</figure>');
          return;
        }
        if (b.k === "link") {
          if (!b.url) return;
          out.push('<a class="evd-block-link" href="' + escHtml(b.url) + '" target="_blank" rel="noopener">' + escHtml(b.label || b.url) + '</a>');
          return;
        }
        if (b.k === "video") {
          if (!b.url) return;
          var info = videoEmbedInfo(b.url);
          var label = escHtml(b.label || b.url);
          if (info.kind === "youtube") {
            out.push('<div class="evd-block-video"><iframe src="https://www.youtube-nocookie.com/embed/' + info.id + '" title="' + label + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>');
          } else if (info.kind === "vimeo") {
            out.push('<div class="evd-block-video"><iframe src="https://player.vimeo.com/video/' + info.id + '" title="' + label + '" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>');
          } else if (info.kind === "file") {
            out.push('<div class="evd-block-video"><video controls preload="none" src="' + escHtml(b.url) + '"></video></div>');
          } else {
            out.push('<a class="evd-block-link" href="' + escHtml(b.url) + '" target="_blank" rel="noopener">' + label + '</a>');
          }
          return;
        }
        if (b.k === "resource") {
          if (!b.url && !b.label && !b.desc) return;
          out.push('<div class="evd-block-resource"><a href="' + escHtml(b.url || "#") + '"' + (b.url ? ' target="_blank" rel="noopener"' : "") + '>' + escHtml(b.label || b.url || "Resource") + '</a>' +
            (b.desc ? '<p>' + escHtml(b.desc) + '</p>' : "") + '</div>');
          return;
        }
      });
      return out.join("");
    }

    function buildEventSectionsHtml(sections, phaseKey, albumBase) {
      var list = visibleSections(sections, phaseKey);
      if (!list.length) return "";
      var imgIdx = (albumBase === undefined || albumBase === null) ? 0 : albumBase;
      var parts = list.map(function (s) {
        var html = renderSectionBlocks(parseSectionBlocks(s.content), "", imgIdx);
        imgIdx += collectSectionImages([s]).length;
        if (!s.title && !html) return "";
        return '<div class="evd-section">' +
          (s.title ? '<strong>' + escHtml(s.title) + '</strong>' : "") + html +
          '</div>';
      });
      if (!parts.join("")) return "";
      return '<div class="evd-gal-sub mono">EVENT DETAILS</div><div class="evd-sections">' + parts.join("") + '</div>';
    }

    /* ------------------------------------------------------------
       COUNTDOWN TICKER — updates every [data-cd-to] element live.
       Modes: NONE (no element) / EVENT START / REGISTRATION
       DEADLINE / BOTH (two elements).
       ------------------------------------------------------------ */
    var cdTickerStarted = false;
    function padCd(n) { return (n < 10 ? "0" : "") + n; }
    function initEventCountdownTicker() {
      if (cdTickerStarted) return;
      cdTickerStarted = true;
      setInterval(function () {
        var now = Date.now();
        $all("[data-cd-to]").forEach(function (el) {
          var t = new Date(el.getAttribute("data-cd-to")).getTime();
          if (isNaN(t)) return;
          var label = el.getAttribute("data-cd-label") || "";
          var prefix = label ? label + " " : "";
          var diff = t - now;
          if (diff <= 0) {
            el.textContent = prefix + (el.getAttribute("data-cd-expired") || "ENDED");
            return;
          }
          var s = Math.floor(diff / 1000);
          el.textContent = prefix + padCd(Math.floor(s / 86400)) + "D : " + padCd(Math.floor(s % 86400 / 3600)) + "H : " + padCd(Math.floor(s % 3600 / 60)) + "M : " + padCd(s % 60) + "S";
        });
      }, 1000);
    }

    function initTimeline() {
      refreshTimelineAlternation();

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

    /* Mobile Timeline Expand / Collapse Toggle */
    var tlExpandBtn = $("#tlExpandBtn");
    var tlExpandText = $("#tlExpandText");
    if (tlExpandBtn && evShell) {
      tlExpandBtn.addEventListener("click", function () {
        var isExpanded = evShell.classList.toggle("is-expanded");
        tlExpandBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        if (tlExpandText) {
          tlExpandText.textContent = isExpanded ? "Show Less" : "View All Past Events (" + $all(".tl-node[data-type='history']", evTrack).length + ")";
        }
        if (hasGsap && typeof ScrollTrigger !== "undefined") {
          setTimeout(function () { ScrollTrigger.refresh(); }, 150);
        }
      });
    }

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
    updateTlChrome();
    tlFocusDefault(false);

    /* re-anchor once fonts/layout have fully settled */
    window.addEventListener("load", function () {
      tlFocusDefault(false);
    });
    }

    /* re-bind event->gallery links after API nodes are injected (delegated) */
    bindEvGalleryLinks();
  }

  /* ------------------------------------------------------------
      FOOTER wordmark drift
      ------------------------------------------------------------ */
  if (hasGsap && !reduced) {
    gsap.fromTo(".foot-word", { yPercent: 34 }, {
      yPercent: 6, ease: "none",
      scrollTrigger: { trigger: "footer", start: "top bottom", end: "bottom bottom", scrub: true }
    });
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

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

  /* ------------------------------------------------------------
     GALLERY ALBUMS — populated from the API (see fetchPublicGalleries).
     Each rendered card receives item._album = [HTMLImageElement, ...].
     ------------------------------------------------------------ */
  function bindGalCardEvents(item) {
    /* Click or press Enter/Space to open Apple-grade Lightbox */
    item.addEventListener("click", function (e) {
      e.stopPropagation();
      openLightbox(item);
    });
    item.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(item);
      }
    });
  }

  function attachAlbumToCard(item, mediaList) {
    var album = [];
    if (mediaList && mediaList.length) {
      mediaList.forEach(function (m) {
        var piece = albumPieceFromMedia(m, item.dataset.caption);
        if (piece) album.push(piece);
      });
    } else {
      var cover = null;
      if (item.dataset.img) {
        cover = document.createElement("img");
        cover.src = item.dataset.img;
        cover.alt = "";
      } else {
        cover = item.querySelector("img, svg");
      }
      if (cover) album.push(cover.cloneNode(true));
    }
    item._album = album;
    bindGalCardEvents(item);

    /* "+N FRAMES" chip in each caption — hints at the multi-photo album */
    var f = $(".arx-frames", item);
    if (f && item._album) { f.textContent = "\u25A3 " + pad2(item._album.length); }
  }

  /* Initial static cards (if any before the API responds) get albums too */
  galItems.forEach(function (item) {
    if (!item._album) attachAlbumToCard(item, null);
  });

  /* live UTC clock on the archive bar */
  var galClock = $("#galClock");
  if (galClock) {
    var tickGalClock = function () {
      var d = new Date();
      galClock.textContent =
        pad2(d.getUTCHours()) + ":" +
        pad2(d.getUTCMinutes()) + ":" +
        pad2(d.getUTCSeconds());
    };
    tickGalClock();
    setInterval(tickGalClock, 1000);
  }

  /* ambient glitch — the preview screen flickers now and then */
  if (!reduced && $("#arxSplit") && typeof IntersectionObserver !== "undefined") {
    var arxOnScreen = false;
    new IntersectionObserver(function (entries) {
      arxOnScreen = entries[0].isIntersecting;
    }).observe($("#arxSplit"));
    setInterval(function () {
      if (!arxOnScreen || document.hidden || window.innerWidth <= 900) return;
      var screenEl = $("#arxScreen");
      if (!screenEl) return;
      screenEl.classList.add("is-glitching");
      setTimeout(function () {
        screenEl.classList.remove("is-glitching");
      }, 200 + Math.random() * 180);
    }, 3600);
  }

  function toTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/(?:^|\s|\/|-|\()\w/g, function (match) {
      return match.toUpperCase();
    });
  }

  function galEventInfo(item) {
    var fc = item.querySelector("figcaption");
    var caption = (item.dataset.caption || (fc ? fc.textContent : "") || "").trim();
    var date = (item.dataset.date || "").trim();
    var name = caption;
    var m = caption.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)\s+\d{4}\b/i);
    if (m) {
      if (!date) date = m[0];
      name = caption.slice(0, m.index).replace(/[\s—–-]+$/, "").trim();
    }
    if (!date) date = "OCT 2025";
    return { name: toTitleCase(name || caption), date: date.toUpperCase() };
  }

  var currentGalEventIdx = 0;
  var currentGalItem = null;
  var lbEventTracker = $("#lbEventTracker");
  var lbPrevEvent = $("#lbPrevEvent");
  var lbNextEvent = $("#lbNextEvent");
  var lbSegmentsWrap = $("#lbSegments");
  var lbNextTitle = $("#lbNextTitle");

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
    lockScroll(true);
    if (lenis) lenis.stop();
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains("open")) return;
    lightbox.classList.remove("open");
    lbZoomReset();
    lockScroll(false);
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  }

  function renderLightbox() {
    var piece = lbAlbum[lbIndex];
    if (!piece) return;
    lbZoomReset();
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
    if (lbCount) lbCount.textContent = pad2(lbIndex + 1) + " / " + pad2(lbAlbum.length);
    var disabled = lbAlbum.length < 2;
    lbPrev.disabled = disabled;
    lbNext.disabled = disabled;

    /* Next item mini-card in footer */
    if (lbPeek && lbPeekImg) {
      var nextEventIdx = (currentGalEventIdx + 1) % galItems.length;
      var nextEventItem = galItems[nextEventIdx];
      var nextInfo = nextEventItem ? galEventInfo(nextEventItem) : null;
      if (lbNextTitle && nextInfo) {
        lbNextTitle.textContent = nextInfo.name;
      }
      var nextSlideIdx = (lbIndex + 1) % lbAlbum.length;
      lbPeekImg.innerHTML = "";
      if (lbAlbum[nextSlideIdx]) {
        var thumb = lbAlbum[nextSlideIdx].cloneNode(true);
        lbPeekImg.appendChild(thumb);
      }
      lbPeek.setAttribute("aria-label", "Next: " + (nextInfo ? nextInfo.name : "Slide " + pad2(nextSlideIdx + 1)));
    }

    /* iOS-Style Segmented Progress Bar */
    if (lbSegmentsWrap) {
      if (lbDotCount !== lbAlbum.length) {
        lbDotCount = lbAlbum.length;
        lbSegmentsWrap.innerHTML = "";
        for (var d = 0; d < lbAlbum.length; d++) {
          (function (idx) {
            var seg = document.createElement("button");
            seg.type = "button";
            seg.className = "lb-segment";
            seg.setAttribute("aria-label", "Go to slide " + (idx + 1) + " of " + lbAlbum.length);
            seg.addEventListener("click", function (e) {
              e.stopPropagation();
              if (idx === lbIndex) return;
              lbDir = idx > lbIndex ? 1 : -1;
              lbIndex = idx;
              renderLightbox();
            });
            lbSegmentsWrap.appendChild(seg);
          })(d);
        }
      }
      lbSegmentsWrap.style.display = lbAlbum.length > 1 ? "flex" : "none";
      $all(".lb-segment", lbSegmentsWrap).forEach(function (seg, i) {
        seg.classList.toggle("is-active", i === lbIndex);
        seg.classList.toggle("is-passed", i < lbIndex);
      });
    }
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
     EVENT PHOTO VIEWER — reuses the existing lightbox viewer.
     Album = detail section images + gallery photos (images only;
     videos play inline in the detail). Adds zoom on top of the
     existing nav/segments/dismiss behavior:
     wheel-trackpad zoom, double-click toggle, drag-pan when zoomed,
     two-finger pinch, +/-/0 keys, reset on navigate/close.
     ------------------------------------------------------------ */
  var lbZoom = { scale: 1, tx: 0, ty: 0 };
  var lbZoomMoved = false;

  function lbZoomFrameImg() {
    if (!lbContent) return null;
    var img = lbContent.querySelector("img");
    return img || null;
  }

  function lbZoomApply() {
    var img = lbZoomFrameImg();
    if (!img) return;
    img.style.transform = "translate(" + lbZoom.tx + "px," + lbZoom.ty + "px) scale(" + lbZoom.scale + ")";
    img.classList.toggle("is-zoomed", lbZoom.scale > 1.01);
  }

  function lbZoomReset() {
    lbZoom.scale = 1; lbZoom.tx = 0; lbZoom.ty = 0; lbZoomMoved = false;
    var img = lbZoomFrameImg();
    if (img) { img.style.transform = ""; img.classList.remove("is-zoomed", "is-panning"); }
  }

  function lbZoomBy(factor) {
    lbZoom.scale = Math.max(1, Math.min(4, lbZoom.scale * factor));
    if (lbZoom.scale <= 1.01) { lbZoom.tx = 0; lbZoom.ty = 0; }
    lbZoomApply();
  }

  function openPhotoViewer(album, index, title) {
    if (!lightbox || !album || !album.length) return;
    lbAlbum = album.map(function (a) {
      return albumPieceFromMedia({ media_url: a.src, media_type: "image", title: a.caption || title }, title);
    }).filter(Boolean);
    if (!lbAlbum.length) return;
    lbIndex = Math.max(0, Math.min(index || 0, lbAlbum.length - 1));
    lbDir = 1;
    currentGalEventIdx = -1;
    if (lbName) lbName.textContent = title || "";
    if (lbDate) lbDate.textContent = "";
    if (lbDesc) lbDesc.textContent = "";
    if (lbEventTracker) lbEventTracker.textContent = "PHOTOS";
    renderLightbox();
    lastFocus = document.activeElement;
    lightbox.classList.add("open");
    lockScroll(true);
    if (lenis) lenis.stop();
    if (lbClose) lbClose.focus();
  }

  var lbZoomWired = false;
  function wirePhotoZoom() {
    if (lbZoomWired || !lbContent) return;
    lbZoomWired = true;
    lbContent.addEventListener("wheel", function (e) {
      if (!lightbox || !lightbox.classList.contains("open")) return;
      if (!lbZoomFrameImg()) return;
      e.preventDefault();
      lbZoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });
    lbContent.addEventListener("dblclick", function () {
      if (!lightbox || !lightbox.classList.contains("open")) return;
      if (!lbZoomFrameImg()) return;
      if (lbZoom.scale > 1.01) { lbZoom.scale = 1; lbZoom.tx = 0; lbZoom.ty = 0; }
      else { lbZoom.scale = 2.5; }
      lbZoomApply();
    });
    var panning = null;
    lbContent.addEventListener("pointerdown", function (e) {
      if (!lightbox || !lightbox.classList.contains("open")) return;
      if (lbZoom.scale <= 1.01 || !lbZoomFrameImg() || !e.isPrimary) return;
      panning = { x: e.clientX - lbZoom.tx, y: e.clientY - lbZoom.ty, id: e.pointerId, moved: false };
      var img = lbZoomFrameImg();
      if (img) img.classList.add("is-panning");
    });
    lbContent.addEventListener("pointermove", function (e) {
      if (!panning || e.pointerId !== panning.id) return;
      var nx = e.clientX - panning.x;
      var ny = e.clientY - panning.y;
      if (Math.abs(nx - lbZoom.tx) + Math.abs(ny - lbZoom.ty) > 4) panning.moved = true;
      var lim = 500 * lbZoom.scale;
      lbZoom.tx = Math.max(-lim, Math.min(lim, nx));
      lbZoom.ty = Math.max(-lim, Math.min(lim, ny));
      lbZoomApply();
    });
    var endPan = function (e) {
      if (panning && e.pointerId === panning.id) {
        if (panning.moved) lbZoomMoved = true;
        panning = null;
        var img = lbZoomFrameImg();
        if (img) img.classList.remove("is-panning");
      }
    };
    lbContent.addEventListener("pointerup", endPan);
    lbContent.addEventListener("pointercancel", endPan);
    var pinchDist = null;
    lbContent.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    lbContent.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && pinchDist && lightbox && lightbox.classList.contains("open") && lbZoomFrameImg()) {
        e.preventDefault();
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (d > 0 && pinchDist > 0) lbZoomBy(d / pinchDist);
        pinchDist = d;
      }
    }, { passive: false });
    lbContent.addEventListener("touchend", function () { pinchDist = null; });
  }
  wirePhotoZoom();

  /* ------------------------------------------------------------
      GALLERY FILTER COUNTS — computed from actual .gal-item elements
      Call this whenever items are added / removed from the mosaic.
      ------------------------------------------------------------ */
  function updateGalFilterCounts() {
    var allItems = $all(".gal-item");
    var counts = { all: allItems.length };
    allItems.forEach(function (item) {
      var cat = item.dataset.category || "workshop";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    $all(".gal-filter-btn").forEach(function (btn) {
      var cat = btn.dataset.cat;
      var n = counts[cat] !== undefined ? counts[cat] : 0;
      /* strip any existing bracket then re-append */
      var label = btn.textContent.replace(/\s*\[\d+\]$/, "").trim();
      btn.textContent = label + " [" + n + "]";
    });
  }
  /* run once on page load */
  updateGalFilterCounts();
  /* expose globally so backend-injected content can call it after adding new cards */
  window.updateGalFilterCounts = updateGalFilterCounts;

  /* ------------------------------------------------------------
      GALLERY API FETCHING & RENDERING
      GET /api/gallery[?category=] -> { success, galleries: [{
        id, event_id, short_summary, cover_image_url, is_published, display_order,
        events: { id, title, category, event_date, poster_url, status, ... } }] }
      Album photos are lazily fetched per event from
      GET /api/gallery/:eventId -> { success, event, gallery,
        media: [{ media_type: "image"|"video", media_url, ... }] }
      ------------------------------------------------------------ */
  function albumPieceFromMedia(m, baseCaption) {
    if (!m || !m.media_url) return null;
    if (m.media_type === "video") {
      var v = document.createElement("video");
      v.src = m.media_url;
      v.controls = true;
      v.playsInline = true;
      v.preload = "metadata";
      v.alt = (m.title || baseCaption || "Event video");
      return v;
    }
    var img = document.createElement("img");
    img.src = m.media_url;
    img.alt = (m.title || baseCaption || "Event photo");
    img.loading = "lazy";
    return img;
  }

  async function fetchEventAlbumMedia(eventId) {
    try {
      var res = await fetch(API_BASE + "/gallery/" + eventId);
      if (!res.ok) return [];
      var data = await res.json();
      if (!data || !data.success) return [];
      return data.media || [];
    } catch (err) {
      console.error("Failed to load album for event " + eventId, err);
      return [];
    }
  }

  function buildGalCard(g, mediaList, idx) {
    var ev = g.events || {};
    var cat = ev.category || "other";
    var title = ev.title || "UNKNOWN";
    var monthYear = ev.event_date
      ? new Date(ev.event_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()
      : "-";
    var summary = g.short_summary
      ? '<p class="gal-card-desc" style="font-size:0.85rem; opacity:0.8; margin-top:0.5rem;">' + g.short_summary + '</p>'
      : "";

    var article = document.createElement("article");
    article.className = "gal-card gal-item";
    article.id = "gal-" + g.id;
    article.dataset.category = cat;
    article.dataset.caption = title.toUpperCase();
    article.dataset.date = monthYear;
    article.dataset.desc = g.short_summary || ev.description || "";
    article.dataset.eventId = g.event_id || ev.id || "";
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute("aria-label", "Open album: " + title);

    var fallbackIcons = [
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8L38 16V32L24 40L10 32V16L24 8Z"/><line x1="24" y1="8" x2="24" y2="40"/><line x1="10" y1="16" x2="24" y2="24"/><line x1="38" y1="16" x2="24" y2="24"/></svg>',
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 34H34C38.42 34 42 30.42 42 26C42 21.85 38.85 18.44 34.8 18.05C33.3 12.25 28.1 8 22 8C14.82 8 9 13.82 9 21C6.15 21.8 4 24.4 4 27.5C4 31.09 6.91 34 10.5 34H16Z"/></svg>',
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="14" stroke-dasharray="3 3"/><circle cx="24" cy="24" r="7"/><line x1="24" y1="4" x2="24" y2="12"/><line x1="24" y1="36" x2="24" y2="44"/><line x1="4" y1="24" x2="12" y2="24"/><line x1="36" y1="24" x2="44" y2="24"/></svg>',
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M24 10C17.37 10 12 15.37 12 22C12 28.63 17.37 34 24 34"/><path d="M17 22C17 18.13 20.13 15 24 15C27.87 15 31 18.13 31 22C31 29 27 33 24 38"/><path d="M24 20C22.9 20 22 20.9 22 22C22 26 25 28 25 32"/><path d="M36 22C36 15.37 30.63 10 24 10"/><path d="M38 29C37.5 33 34 37 30 40"/><path d="M10 26C10.5 31 13 36 17 39"/></svg>',
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="16" height="20" rx="8"/><path d="M19 16C19 13.24 21.24 11 24 11C26.76 11 29 13.24 29 16"/><line x1="8" y1="18" x2="16" y2="21"/><line x1="32" y1="21" x2="40" y2="18"/><line x1="6" y1="26" x2="16" y2="26"/><line x1="32" y1="26" x2="42" y2="26"/><line x1="8" y1="34" x2="16" y2="31"/><line x1="32" y1="31" x2="40" y2="34"/><line x1="20" y1="8" x2="18" y2="5"/><line x1="28" y1="8" x2="30" y2="5"/></svg>',
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6L10 12V24C10 33 16 40 24 43C32 40 38 33 38 24V12L24 6Z"/><polyline points="18 24 22 28 30 19"/></svg>'
    ];
    var safeIdx = idx || 0;
    var currentIcon = fallbackIcons[safeIdx % fallbackIcons.length];

    var mediaHtml = "";
    var imageUrl = g.cover_image_url || ev.poster_url;
    if (imageUrl) {
      mediaHtml = '<img src="' + imageUrl + '" class="gal-poster-img" alt="">';
    } else {
      mediaHtml = '<div class="matrix-icon">' + currentIcon + '</div>';
    }

    article.innerHTML =
      '<div class="tactical-matrix">' +
      '<span class="matrix-corner tl">+</span>' +
      '<span class="matrix-corner tr">+</span>' +
      '<span class="matrix-corner bl">+</span>' +
      '<span class="matrix-corner br">+</span>' +
      mediaHtml +
      '<span class="matrix-date-capsule mono" style="position:relative; z-index:1;">' + monthYear + '</span>' +
      '</div>' +
      '<div class="gal-card-body">' +
      '<h3 class="gal-card-title">' + title + '</h3>' +
      summary +
      '</div>';

    attachAlbumToCard(article, mediaList);

    return article;
  }

  async function fetchPublicGalleries(category, isInitial) {
    category = category || "all";
    var clMosaic = document.getElementById("clMosaic");
    if (!clMosaic) return;
    clMosaic.innerHTML = '<p class="mono" style="color:var(--tx2); padding:2rem; width:100%; text-align:center;">[ LOADING DATABASE... ]</p>';

    try {
      var url = category === "all"
        ? API_BASE + "/gallery"
        : API_BASE + "/gallery?category=" + encodeURIComponent(category);
      var res = await fetch(url);
      var data = await res.json();
      if (!res.ok) throw new Error((data && data.message) || "Failed to fetch");

      var galleries = (data && data.galleries) || [];

      if (galleries.length === 0) {
        clMosaic.innerHTML = '<p class="mono" style="color:var(--tx2); padding:2rem; width:100%; text-align:center;">[ NO ENTRIES FOUND ]</p>';
        galItems = [];
        updateGalFilterCounts();
        return;
      }

      clMosaic.innerHTML = "";
      var newItems = [];

      /* Render cards first (cover images only), then hydrate full albums
         from the per-event endpoint so the grid paints fast. */
      var pending = [];
      galleries.forEach(function (g, idx) {
        var card = buildGalCard(g, null, idx);
        clMosaic.appendChild(card);
        newItems.push(card);
        var eventId = card.dataset.eventId;
        if (eventId) {
          pending.push(fetchEventAlbumMedia(eventId).then(function (mediaList) {
            if (mediaList && mediaList.length) attachAlbumToCard(card, mediaList);
          }));
        }
      });

      galItems = $all(".gal-item");

      if (isInitial) {
        updateGalFilterCounts();
      }

      if (hasGsap && !reduced) {
        gsap.fromTo(newItems,
          { opacity: 0, y: 26, scale: .96 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: .55, stagger: .05, ease: "power3.out",
            overwrite: true, clearProps: "transform"
          }
        );
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
      }
      if (typeof window.__updateReelUI === "function") window.__updateReelUI();

      await Promise.all(pending);
    } catch (err) {
      clMosaic.innerHTML = '<p class="mono" style="color:#ff4444; padding:2rem; width:100%; text-align:center;">[ API ERROR: ' + err.message + ' ]</p>';
      console.error(err);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    fetchPublicGalleries("all", true);
  });

  /* ------------------------------------------------------------
      GALLERY CATEGORY FILTERING (API based)
      ------------------------------------------------------------ */
  var galFilterBtns = $all(".gal-filter-btn");
  galFilterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-active")) return;
      galFilterBtns.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var cat = btn.dataset.cat;
      fetchPublicGalleries(cat, false);
    });
  });

  /* ------------------------------------------------------------
      ARCHIVE INDEX — row selection drives the preview viewer
      ------------------------------------------------------------ */
  var arxRows = $all(".arx-row");
  var arxIndexEl = $(".arx-index");
  var arxImg = $("#arxImg");
  var arxTagEl = $("#arxTag");
  var arxRecEl = $("#arxRec");
  var arxNameEl = $("#arxName");
  var arxDateEl = $("#arxDate");
  var arxDescEl = $("#arxDesc");
  var arxFramesEl = $("#arxFrames");
  var arxOpenBtn = $("#arxOpen");
  var arxActive = null;

  function arxSelect(row, fromUser) {
    if (!row || !arxImg) return;
    arxActive = row;
    arxRows.forEach(function (r) { r.classList.toggle("is-active", r === row); });

    arxImg.style.opacity = "0";
    setTimeout(function () {
      if (arxActive !== row && fromUser) return;
      arxImg.src = row.dataset.img || "";
      arxImg.alt = (row.getAttribute("aria-label") || "").replace(/^Preview: /i, "");
      arxImg.style.opacity = "1";
    }, 150);

    if (arxTagEl) { arxTagEl.textContent = row.dataset.tag || ""; }
    if (arxRecEl) {
      var standby = row.dataset.rec === "standby";
      arxRecEl.className = "rec-pill " + (standby ? "is-standby" : "is-rec");
      arxRecEl.innerHTML = "<i></i>" + (standby ? "STANDBY" : "REC");
    }
    if (arxNameEl) { arxNameEl.textContent = row.dataset.name || ""; }
    if (arxDateEl) {
      arxDateEl.textContent = (row.dataset.date || "ARCHIVE") +
        " · ALBUM " + pad2((row._album || []).length);
    }
    if (arxDescEl) { arxDescEl.textContent = row.dataset.desc || ""; }
    if (arxFramesEl) { arxFramesEl.textContent = "\u25A3 " + pad2((row._album || []).length) + " FRAMES"; }

    /* on small screens the viewer is hidden — a tap opens the album */
    if (fromUser && window.matchMedia("(max-width: 900px)").matches) {
      openLightbox(row);
    }
  }

  arxRows.forEach(function (row) {
    row.addEventListener("click", function () { arxSelect(row, true); });
    row.addEventListener("mouseenter", function () { if (finePointer) { arxSelect(row, false); } });
    row.addEventListener("focus", function () { arxSelect(row, false); });
  });

  if (arxOpenBtn) {
    arxOpenBtn.addEventListener("click", function () {
      if (arxActive) { openLightbox(arxActive); }
    });
  }

  /* arrow keys walk the log */
  if (arxIndexEl) {
    arxIndexEl.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      var vis = arxRows.filter(function (r) { return !r.classList.contains("is-filtered-out"); });
      if (!vis.length) return;
      var i = vis.indexOf(arxActive);
      var next;
      if (e.key === "ArrowDown") { next = vis[Math.min(vis.length - 1, i + 1)]; }
      else { next = vis[Math.max(0, i - 1)]; }
      if (!next) { next = vis[0]; }
      arxSelect(next, false);
      next.focus();
    });
  }

  window.__arxReselect = function () {
    var vis = arxRows.filter(function (r) { return !r.classList.contains("is-filtered-out"); });
    if (!vis.length) { return; }
    if (vis.indexOf(arxActive) < 0) { arxSelect(vis[0], false); }
  };

  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbPrev) lbPrev.addEventListener("click", function (e) { e.stopPropagation(); showLightbox(-1); });
  if (lbNext) lbNext.addEventListener("click", function (e) { e.stopPropagation(); showLightbox(1); });
  if (lbPeek) lbPeek.addEventListener("click", function () { showLightbox(1); });
  if (lbPrevEvent) lbPrevEvent.addEventListener("click", function (e) { e.stopPropagation(); switchEvent(-1); });
  if (lbNextEvent) lbNextEvent.addEventListener("click", function (e) { e.stopPropagation(); switchEvent(1); });
  if (lightbox) lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });

  /* touch swipe on the media stage & lightbox walks the album / dismisses — mobile-first nav */
  (function () {
    var stage = $(".lb-stage");
    var lbEl = $("#lightbox");
    if (!stage && !lbEl) { return; }
    var targets = [stage, lbEl].filter(Boolean);
    var sx = 0, sy = 0, tracking = false;

    function onTouchStart(e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    }

    function onTouchEnd(e) {
      if (!tracking) { return; }
      tracking = false;
      /* A zoom drag-pan owns this gesture: never navigate/dismiss from it. */
      if (lbZoomMoved) { lbZoomMoved = false; return; }
      var t = e.changedTouches[0];
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;

      /* vertical swipe-down dismissal */
      if (dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        closeLightbox();
        return;
      }

      /* horizontal flick beats small vertical drift */
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        showLightbox(dx < 0 ? 1 : -1);
      }
    }

    targets.forEach(function (el) {
      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchend", onTouchEnd, { passive: true });
    });
  })();

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
    if ((e.key === "+" || e.key === "=") && lbZoomFrameImg()) lbZoomBy(1.25);
    if ((e.key === "-" || e.key === "_") && lbZoomFrameImg()) lbZoomBy(1 / 1.25);
    if (e.key === "0" && lbZoomFrameImg()) lbZoomReset();
  });

  /* ------------------------------------------------------------
     EVENT -> GALLERY LINKING: Directly Open Gallery Lightbox
     Uses event delegation so API-injected timeline nodes work too.
     ------------------------------------------------------------ */
  function bindEvGalleryLinks() {
    var host = document;
    host.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".btn-ev-gallery, .tl-node") : null;
      if (!btn) return;
      e.stopPropagation();

      var targetId = btn.dataset.galTarget;
      var targetEl = targetId ? document.getElementById(targetId) : null;

      // Update selected state in timeline
      var allNodes = $all(".tl-node", document);
      allNodes.forEach(function (n) { n.classList.remove("is-selected"); });
      btn.classList.add("is-selected");

      if (targetEl && targetEl._album && targetEl._album.length) {
        // Reset gallery filter if target is currently filtered out
        if (targetEl.classList.contains("is-filtered-out")) {
          galFilterBtns.forEach(function (b) {
            b.classList.toggle("is-active", b.dataset.cat === "all");
          });
          galItems.forEach(function (it) { it.classList.remove("is-filtered-out"); });
        }
        arxSelect(targetEl, false);
        openLightbox(targetEl);
        return;
      }

      /* Fallback for timeline-only events (no matching gallery card):
         the event id is embedded in data-gal-target ("gal-<uuid>").
         Try the album from the backend; on failure, show a notice. */
      var eventId = targetId ? targetId.replace(/^gal-/, "") : "";
      var day = btn.querySelector(".tl-day") ? btn.querySelector(".tl-day").textContent.trim() : "";
      var mo = btn.querySelector(".tl-mo") ? btn.querySelector(".tl-mo").textContent.trim() : "";
      var yr = btn.querySelector(".tl-year") ? btn.querySelector(".tl-year").textContent.trim() : "";
      var dateStr = (day && mo && yr) ? (mo + " " + yr) : (btn.dataset.date || "");
      var nameEl = btn.querySelector(".tl-name");
      var nameStr = (nameEl ? nameEl.textContent.trim() : (btn.getAttribute("aria-label") || "Event")).replace(/\s+-\s+.*$/, "");

      var pseudo = {
        id: targetId || "tl-event",
        dataset: {
          caption: nameStr,
          date: dateStr,
          desc: "Cybersecurity technical session and workshop organised under the IEI Student Chapter."
        },
        _album: []
      };

      if (!lightbox || !lightbox.classList.contains("open")) {
        if (lbName) lbName.textContent = nameStr;
        if (lbDate) lbDate.textContent = dateStr;
        if (lbDesc) lbDesc.textContent = pseudo.dataset.desc;
        if (lbCount) lbCount.textContent = "-- / --";
        if (lbEventTracker) lbEventTracker.textContent = "EVENT";
      }

      if (eventId) {
        fetchEventAlbumMedia(eventId).then(function (mediaList) {
          pseudo._album = (mediaList || [])
            .map(function (m) { return albumPieceFromMedia(m, nameStr); })
            .filter(Boolean);
          if (pseudo._album.length) {
            openLightbox(pseudo);
          } else {
            /* No photos published yet — inline notice instead of a broken viewer */
            if (typeof window.openBottomSheet === "function") {
              window.openBottomSheet(
                '<div style="padding:1.5rem; text-align:center;">' +
                '<p class="mono" style="color:var(--tx2); font-size:0.8rem; letter-spacing:0.12em;">// NO ALBUM PHOTOS PUBLISHED FOR THIS EVENT YET</p>' +
                '</div>'
              );
            }
          }
        });
      }
    });
  }

  /* ------------------------------------------------------------
     SPECULAR BUTTONS — WebGL border shine (ported from reference)
     Gaussian light streak travels along the rounded border,
     tracking the cursor with a 250px proximity fade, over a
     permanent subtle base ring. Exact shader + easing port.
     ------------------------------------------------------------ */
  (function () {
    var sbButtons = $all(".specular-button");
    if (!sbButtons.length) { return; }

    var FRAG_COMMON =
      "uniform vec2 uCenter;uniform vec2 uHalfSize;uniform float uRadius;" +
      "uniform float uAngle;uniform float uPx;uniform vec3 uLineColor;" +
      "uniform vec3 uBaseColor;uniform float uIntensity;uniform float uShineSize;" +
      "uniform float uShineFade;uniform float uThickness;uniform float uBaseWidth;" +
      "float sdRoundedRect(vec2 p, vec2 b, float r){vec2 q=abs(p)-b+r;" +
      "return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;}" +
      "float shapeSDF(vec2 p){return sdRoundedRect(p,uHalfSize,uRadius);}" +
      "float gaussianLine(float d, float sigma){float x=d/(sigma+1e-6);" +
      "float k=mix(1.0,1.6,smoothstep(0.0,1.5,x));return exp(-k*x*x);}" +
      "void main(){vec2 p=gl_FragCoord.xy-uCenter;float d=shapeSDF(p);" +
      "vec2 L=vec2(cos(uAngle),sin(uAngle));" +
      "float base=(1.0-smoothstep(0.0,uBaseWidth,abs(d)))*0.45;" +
      "vec2 nEll=normalize(p/(uHalfSize*uHalfSize)+1e-6);" +
      "float phi=acos(clamp(abs(dot(nEll,L)),0.0,1.0));" +
      "float rim=1.0-smoothstep(uShineSize-uShineFade,uShineSize+uShineFade+1e-4,phi);" +
      "float line=gaussianLine(d,uThickness);" +
      "float edgeClamp=1.0-smoothstep(0.5*uPx,3.0*uPx,abs(d));" +
      "float hi=line*rim*edgeClamp*uIntensity;" +
      "vec3 col=uBaseColor*base+uLineColor*hi;" +
      "float a=clamp(base+hi,0.0,1.0);__OUT__}";

    var V2 = "#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}";
    var F2 = "#version 300 es\nprecision highp float;\nout vec4 fragColor;\n" +
      FRAG_COMMON.replace("__OUT__", "fragColor=vec4(col,a);");
    var V1 = "attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}";
    var F1 = "precision mediump float;\n" + FRAG_COMMON.replace("__OUT__", "gl_FragColor=vec4(col,a);");

    var UNIS = ["uCenter", "uHalfSize", "uRadius", "uAngle", "uPx", "uLineColor",
      "uBaseColor", "uIntensity", "uShineSize", "uShineFade", "uThickness", "uBaseWidth"];

    var items = [];

    function initButton(btn) {
      var fx = btn.querySelector(".specular-button__fx");
      if (!fx) {
        fx = document.createElement("span");
        fx.className = "specular-button__fx";
        fx.setAttribute("aria-hidden", "true");
        btn.appendChild(fx);
      }
      fx.innerHTML = "";
      var canvas = document.createElement("canvas");
      fx.appendChild(canvas);

      var attrs = { alpha: true, premultipliedAlpha: true, antialias: true };
      var gl = canvas.getContext("webgl2", attrs);
      var isGL2 = !!gl;
      if (!gl) { gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs); }
      if (!gl) { return null; }

      function compile(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      }
      var prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, isGL2 ? V2 : V1));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, isGL2 ? F2 : F1));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { return null; }
      gl.useProgram(prog);

      /* fullscreen triangle */
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      var u = {};
      UNIS.forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });

      var item = {
        btn: btn, canvas: canvas, gl: gl, u: u,
        angle: 2.4, idle: 2.4, target: null, prox: 0, g: 0,
        dpr: 1, radius: 18, visible: true, settled: false
      };

      function size() {
        var r = btn.getBoundingClientRect();
        var w = Math.max(1, r.width), h = Math.max(1, r.height);
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        item.dpr = dpr;
        canvas.width = Math.ceil((w + 40) * dpr);
        canvas.height = Math.ceil((h + 40) * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        var br = parseFloat(getComputedStyle(btn).borderRadius) || 18;
        item.radius = Math.min(br, Math.min(w, h) / 2) * dpr;
        gl.uniform2f(u.uCenter, (20 + w / 2) * dpr, (20 + h / 2) * dpr);
        gl.uniform2f(u.uHalfSize, w / 2 * dpr, h / 2 * dpr);
        gl.uniform1f(u.uPx, dpr);
        gl.uniform1f(u.uBaseWidth, dpr);
        item.settled = false;
      }

      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(size).observe(btn);
      } else {
        window.addEventListener("resize", size);
      }
      size();

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (en) {
          item.visible = en[0].isIntersecting;
        }, { rootMargin: "80px" }).observe(btn);
      }

      return item;
    }

    sbButtons.forEach(function (btn) {
      /* the shine tracks the cursor — pointless (and a battery drain) on touch */
      var item = (!reduced && !coarsePointer) ? initButton(btn) : null;
      if (item) { items.push(item); }
      else { btn.classList.add("sb-static"); }
    });

    if (!items.length) { return; }

    window.addEventListener("pointermove", function (e) {
      items.forEach(function (it) {
        var r = it.btn.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var n = Math.hypot(
          Math.max(r.left - e.clientX, 0, e.clientX - r.right),
          Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
        );
        if (n === 0) {
          var t = (e.clientX - cx) / (r.width / 2);
          var v = (cy - e.clientY) / (r.height / 2);
          it.target = Math.atan2(2 / r.height, -2 / r.width) + 0.3 * t + 0.15 * v;
        } else {
          it.target = Math.atan2(cy - e.clientY, e.clientX - cx);
        }
        var a = Math.max(0, 1 - n / 250);
        it.prox = a * a * (3 - 2 * a);
        it.settled = false;
      });
    }, { passive: true });

    var last = performance.now();

    function drawItem(it) {
      var gl = it.gl, u = it.u;
      gl.uniform1f(u.uAngle, it.angle);
      gl.uniform1f(u.uRadius, it.radius);
      gl.uniform3f(u.uLineColor, 1, 1, 1);
      gl.uniform3f(u.uBaseColor, 82 / 255, 82 / 255, 82 / 255);
      gl.uniform1f(u.uIntensity, it.g);
      gl.uniform1f(u.uShineSize, 10 * Math.PI / 180);
      gl.uniform1f(u.uShineFade, 40 * Math.PI / 180);
      gl.uniform1f(u.uThickness, it.dpr);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick(now) {
      requestAnimationFrame(tick);
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (document.hidden) { return; }
      items.forEach(function (it) {
        if (!it.visible) { return; }
        it.idle += 0.35 * dt;
        var target = (it.target != null) ? it.target : it.idle;
        var delta = ((target - it.angle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
        it.angle += delta * (1 - Math.exp(-7 * dt));
        it.g += (it.prox - it.g) * (1 - Math.exp(-8 * dt));
        var settled = it.g < 0.004 && (Math.abs(delta) < 0.01 || it.target != null);
        if (settled && it.settled) { return; }
        it.settled = settled;
        drawItem(it);
      });
    }
    requestAnimationFrame(tick);
  })();

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
     NATIVE IOS BOTTOM SHEET (DRAWER) CONTROLLER
     ------------------------------------------------------------ */
  var bottomSheet = $("#bottomSheet");
  var sheetBackdrop = $("#sheetBackdrop");
  var sheetClose = $("#sheetClose");
  var sheetBody = $("#sheetBody");
  var sheetPanel = $("#sheetPanel");
  var sheetReturnY = null;

  function openBottomSheet(contentHtml) {
    if (!bottomSheet || !sheetBody) return;
    /* Remember the page position so closing returns without a jump. */
    if (!bottomSheet.classList.contains("is-open")) {
      sheetReturnY = window.scrollY || window.pageYOffset || 0;
    }
    sheetBody.innerHTML = contentHtml;
    bottomSheet.classList.add("is-open");
    bottomSheet.setAttribute("aria-hidden", "false");
    /* Long detail content always starts at the top of the sheet. */
    if (sheetPanel) sheetPanel.scrollTop = 0;
    /* Focus the panel (without moving the page) so wheel, touch-adjacent
       keyboard, arrows, space and PgUp/PgDn scroll the detail natively. */
    if (sheetPanel && sheetPanel.focus) {
      try { sheetPanel.focus({ preventScroll: true }); } catch (e) { sheetPanel.focus(); }
    }
    lockScroll(true);
    if (lenis) lenis.stop();
  }

  function closeBottomSheet() {
    if (!bottomSheet) return;
    bottomSheet.classList.remove("is-open");
    bottomSheet.setAttribute("aria-hidden", "true");
    lockScroll(false);
    /* Restore the pre-open page position before scroll resumes. */
    if (sheetReturnY !== null) {
      window.scrollTo(0, sheetReturnY);
      sheetReturnY = null;
    }
    if (lenis) lenis.start();
  }

  if (sheetBackdrop) sheetBackdrop.addEventListener("click", closeBottomSheet);
  if (sheetClose) sheetClose.addEventListener("click", closeBottomSheet);

  // Keyboard Escape dismissal
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && bottomSheet && bottomSheet.classList.contains("is-open")) {
      closeBottomSheet();
    }
  });

  // Swipe-down to dismiss gesture
  if (sheetPanel) {
    var touchStartY = 0;
    var touchCurrentY = 0;
    sheetPanel.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });
    sheetPanel.addEventListener("touchmove", function (e) {
      if (e.touches.length === 1) {
        touchCurrentY = e.touches[0].clientY;
        var diff = touchCurrentY - touchStartY;
        if (diff > 0 && sheetPanel.scrollTop <= 0) {
          sheetPanel.style.transform = "translateY(" + diff + "px)";
        }
      }
    }, { passive: true });
    sheetPanel.addEventListener("touchend", function () {
      var diff = touchCurrentY - touchStartY;
      sheetPanel.style.transform = "";
      if (diff > 90 && sheetPanel.scrollTop <= 0) {
        closeBottomSheet();
      }
      touchStartY = 0;
      touchCurrentY = 0;
    }, { passive: true });
  }

  window.openBottomSheet = openBottomSheet;
  window.closeBottomSheet = closeBottomSheet;

  /* ------------------------------------------------------------
     FLOATING BOTTOM THUMB DOCK (MOBILE ONLY)
     ------------------------------------------------------------ */
  var bottomDock = $("#bottomDock");
  var dockTabs = bottomDock ? $all(".dock-tab", bottomDock) : [];
  var lastScrollPos = 0;
  var dockScrollTicking = false;

  function updateDockActive(activeId) {
    if (!activeId) return;
    dockTabs.forEach(function (tab) {
      var target = tab.getAttribute("data-dock");
      tab.classList.toggle("is-active", target === activeId);
    });
  }

  // Zero-reflow section spy using IntersectionObserver
  if ("IntersectionObserver" in window) {
    var dockSections = ["about", "events", "team", "faq", "join"];
    var dockSpyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          updateDockActive(entry.target.id);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: "-20% 0px -45% 0px"
    });

    dockSections.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) dockSpyObserver.observe(el);
    });
  }

  function onScrollDock() {
    if (!bottomDock) return;
    var curY = window.pageYOffset || document.documentElement.scrollTop;

    // Smart auto-hide during fast downward scroll, reveal on scroll up
    if (curY > lastScrollPos + 12 && curY > 160) {
      bottomDock.classList.add("is-hidden");
    } else if (curY < lastScrollPos - 8 || curY < 100) {
      bottomDock.classList.remove("is-hidden");
    }
    lastScrollPos = curY;
    dockScrollTicking = false;
  }

  window.addEventListener("scroll", function () {
    if (!dockScrollTicking) {
      dockScrollTicking = true;
      requestAnimationFrame(onScrollDock);
    }
  }, { passive: true });
  onScrollDock();

  /* ------------------------------------------------------------
     GPU BATTERY OPTIMIZER (MOBILE 60/120FPS PROMOTION)
     ------------------------------------------------------------ */
  var warpCanvas = document.getElementById("warpFx");
  if (warpCanvas && "IntersectionObserver" in window) {
    var heroObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        warpCanvas.style.display = entry.isIntersecting ? "block" : "none";
      });
    }, { threshold: 0.05 });
    var heroSection = document.getElementById("hero");
    if (heroSection) heroObserver.observe(heroSection);
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
