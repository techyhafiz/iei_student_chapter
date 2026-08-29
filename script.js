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
    if (!cv || !cv.getContext || window.innerWidth <= 768) { return; }
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
      return light
        ? { core: "76, 29, 149", hi: "147, 51, 234", trail: "124, 58, 237", nebMax: .12 }
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
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var sy = ((s.y - sc * s.par) % H + H) % H;
        var tw = .5 + .5 * Math.sin(t * s.tw + s.ph);
        var a = s.base * (.45 + .55 * tw);
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + p.core + "," + a.toFixed(3) + ")";
        ctx.arc(s.x, sy, s.r, 0, 6.2832);
        ctx.fill();
        if (s.r > 0.95 && tw > .82) {
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
        grad.addColorStop(0, "rgba(" + p.trail + "," + (.8 * mt.life).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(" + p.trail + ",0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
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
      "  /* light theme: softer, more transparent */",
      "  float a=glow*(mix(0.34,0.16,uLight));",
      "  col=mix(col,vec3(0.42,0.27,0.65),uLight*0.5);",
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
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

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
      gl.uniform1f(uT, (performance.now() - t0) / 1000);
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uLight, theme());
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
      "  gl_PointSize=(1.55+vSeed.x*0.80)*uDpr;",
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
      "  float a=vAlpha*core;",
      "  vec3 violet=vec3(0.78,0.58,1.0);",
      "  vec3 fuchsia=vec3(0.98,0.62,1.0);",
      "  vec3 col=mix(fuchsia,violet,vHue);",
      "  col=mix(col,vec3(0.35,0.22,0.6),uLight*0.55);",
      "  a*=mix(1.0,0.55,uLight);",
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
      gl.blendFunc(gl.ONE, gl.ONE); /* additive: sparks brighten each other + aurora */
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
     THEME TOGGLE — Smooth switch between Obsidian Dark & Titanium Light
     ------------------------------------------------------------ */
  var themeToggle = $("#themeToggle");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-palette", "titanium-mono");
    if (themeToggle) themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  }

  // Restore stored theme or default to light Titanium Minimalist
  var storedTheme = "light";
  try {
    storedTheme = localStorage.getItem("iei-theme") || "light";
  } catch (e) { }

  applyTheme(storedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem("iei-theme", next); } catch (err) { }
    });
  }

  var navSectionIds = ["about", "why", "events", "gallery", "team", "faq", "join"];
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
     ABOUT TERMINAL — typed sequence & quick chips
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
    if (!hasGsap || reduced) { el.textContent = target + suffix; setRing(metricCard(el), 100); return; }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.8, ease: "power2.out", onUpdate: function () {
        el.textContent = Math.round(obj.v) + suffix;
        setRing(metricCard(el), (obj.v / target) * 100);
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
          tlExpandText.textContent = isExpanded ? "Show Less" : "View All Past Events (8)";
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

  var EVENT_ALBUMS = {
    "gal-ctf-finals": [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-zeroday": [
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-red-blue": [
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1510511459019-5dee997ddfef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-threat-intel": [
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-osint": [
      "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-malware": [
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-hardware": [
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-cyber-drill": [
      "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-gridcon": [
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80"
    ],
    "gal-midnight-ctf": [
      "https://images.unsplash.com/photo-1510511459019-5dee997ddfef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"
    ]
  };

  galItems.forEach(function (item) {
    var id = item.id;
    var album = [];
    var urls = EVENT_ALBUMS[id];
    if (urls && urls.length) {
      urls.forEach(function (src, idx) {
        var img = document.createElement("img");
        img.src = src;
        img.alt = (item.dataset.caption || "Event photo") + " — Frame " + pad2(idx + 1);
        img.loading = "lazy";
        album.push(img);
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
  });

  /* "+N FRAMES" chip in each caption — hints at the multi-photo album */
  /* per-row frame counters in the archive log */
  galItems.forEach(function (item) {
    var f = $(".arx-frames", item);
    if (f && item._album) { f.textContent = "\u25A3 " + pad2(item._album.length); }
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
    lockScroll(false);
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
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

      /* surviving frames cascade back into the reel */
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
      if (typeof window.__updateReelUI === "function") {
        window.__updateReelUI();
      }
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
  });

  /* ------------------------------------------------------------
     EVENT -> GALLERY LINKING: Directly Open Gallery Lightbox
     ------------------------------------------------------------ */
  $all(".btn-ev-gallery, .tl-node").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
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

      /* Fallback for timeline-only events: load album directly from EVENT_ALBUMS */
      var urls = (targetId && EVENT_ALBUMS[targetId]) || EVENT_ALBUMS["gal-threat-intel"] || [];
      if (!urls.length) {
        urls = [
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
        ];
      }

      var day = btn.querySelector(".tl-day") ? btn.querySelector(".tl-day").textContent.trim() : "";
      var mo = btn.querySelector(".tl-mo") ? btn.querySelector(".tl-mo").textContent.trim() : "";
      var yr = btn.querySelector(".tl-year") ? btn.querySelector(".tl-year").textContent.trim() : "";
      var dateStr = (day && mo && yr) ? (mo + " " + yr) : (btn.dataset.date || "OCT 2025");
      var nameEl = btn.querySelector(".tl-name");
      var nameStr = (nameEl ? nameEl.textContent.trim() : (btn.getAttribute("aria-label") || "Event")).replace(/\s+-\s+.*$/, "");

      var pseudo = {
        id: targetId || "tl-event",
        dataset: {
          caption: nameStr,
          date: dateStr,
          desc: "Cybersecurity technical session and workshop organised under the IEI Student Chapter."
        },
        _album: urls.map(function (src, idx) {
          var im = document.createElement("img");
          im.src = src;
          im.alt = nameStr + " — Photo " + pad2(idx + 1);
          im.loading = "lazy";
          return im;
        })
      };

      openLightbox(pseudo);
    });
  });

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

  function openBottomSheet(contentHtml) {
    if (!bottomSheet || !sheetBody) return;
    sheetBody.innerHTML = contentHtml;
    bottomSheet.classList.add("is-open");
    bottomSheet.setAttribute("aria-hidden", "false");
    lockScroll(true);
    if (lenis) lenis.stop();
  }

  function closeBottomSheet() {
    if (!bottomSheet) return;
    bottomSheet.classList.remove("is-open");
    bottomSheet.setAttribute("aria-hidden", "true");
    lockScroll(false);
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
