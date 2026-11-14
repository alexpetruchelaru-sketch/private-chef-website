/* Alex Chelaru, private chef. Site behaviour.
   Three things: a solid nav on scroll, a hero parallax, and the enquiry form. */

(function () {
  "use strict";

  var EMAIL = "alexpetruchelaru@gmail.com";
  var WHATSAPP = "34641275731";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav solidifies once the hero has passed ---------- */
  var nav = document.getElementById("nav");
  var heroMedia = document.getElementById("heroMedia");
  var raf = 0;

  function onFrame() {
    raf = 0;
    var y = window.scrollY;
    if (nav) nav.setAttribute("data-solid",
      y > window.innerHeight * 0.82 || nav.hasAttribute("data-open") ? "true" : "false");
    if (heroMedia && !reduced && y < window.innerHeight * 1.3) {
      heroMedia.style.transform =
        "translate3d(0," + (y * 0.28).toFixed(1) + "px,0) scale(" + (1 + y * 0.00007).toFixed(4) + ")";
    }
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(onFrame); }
  onFrame();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* ---------- the menu button below desktop width ---------- */
  var navToggle = nav && nav.querySelector(".nav-toggle");
  if (navToggle) {
    var setNavOpen = function (open) {
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) nav.setAttribute("data-open", "");
      else nav.removeAttribute("data-open");
      onFrame();
    };
    navToggle.addEventListener("click", function () { setNavOpen(!nav.hasAttribute("data-open")); });
    nav.querySelector(".navlinks").addEventListener("click", function (ev) {
      if (ev.target.closest("a")) setNavOpen(false);
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && nav.hasAttribute("data-open")) { setNavOpen(false); navToggle.focus(); }
    });
    document.addEventListener("click", function (ev) {
      if (nav.hasAttribute("data-open") && !nav.contains(ev.target)) setNavOpen(false);
    });
  }


  /* ============================================================
     Motion layer. Reveals on scroll everywhere, plus two small
     pointer interactions on desktop. Nothing here is required for
     the page to work: if any of it is skipped the site is simply
     static. All of it is disabled under prefers-reduced-motion.
     ============================================================ */
  (function motion() {
    if (reduced) return;

    /* ---- scroll progress hairline ---- */
    var bar = document.createElement("div");
    bar.className = "progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var cue = document.querySelector(".scrollcue");
    var praf = 0;
    function progress() {
      praf = 0;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      if (cue) cue.style.opacity = window.scrollY > 120 ? "0" : "";
    }
    window.addEventListener("scroll", function () {
      if (!praf) praf = requestAnimationFrame(progress);
    }, { passive: true });
    progress();

    /* ---- reveal on enter ----
       Groups are staggered by their position among siblings, so a row of
       menu cards arrives in sequence rather than all at once. */
    var GROUPS = [
      [".sec-head > *", 70],
      [".strip h2, .strip dl", 90],
      [".aside > *", 90],
      [".custom > *", 70],
      [".chef-body > p, .lineage", 80],
      [".chef-fig", 0, "fig"],
      [".step", 80],
      [".gal figure", 55, "fig"],
      [".fact", 45],
      [".faq-item", 45],
      [".enq-grid > *", 110],
      [".recipe-head > *", 70],
      [".recipe-fig", 0, "fig"],
      [".recipe-meta div", 60],
      [".recipe-intro, .recipe-body section, .chef-note, .serves-with, .recipe-cta", 80],
      [".rel-h, .rel-card", 55],
      [".byline", 0],
      [".recipe-group-h", 0],
      [".recipe-card", 60, "fig"]
    ];

    var seen = new WeakSet();
    var waiting = [];   /* everything still hidden, in document order */
    var hasIO = typeof IntersectionObserver === "function";

    function show(el) { el.classList.add("in"); }

    var io = hasIO ? new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        show(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" }) : null;

    /* Backstop. The observer is the normal path, but a stubborn element, a
       browser without IntersectionObserver, or a section taller than the
       screen must never be left invisible. This sweep runs on every scroll
       and reveals anything that has actually reached the viewport. It also
       keeps its own list short by dropping elements once they are shown. */
    function sweep() {
      var h = window.innerHeight;
      for (var i = waiting.length - 1; i >= 0; i--) {
        var el = waiting[i];
        if (el.classList.contains("in")) { waiting.splice(i, 1); continue; }
        /* Anything whose top has crossed the fold counts, including things
           already scrolled past. Requiring it to still be on screen meant a
           fast scroll, or an anchor jump, could leave an element hidden for
           good once it had gone by. */
        if (el.getBoundingClientRect().top < h * 0.94) { show(el); waiting.splice(i, 1); }
      }
    }
    var sraf = 0;
    function onSweep() {
      if (!sraf) sraf = requestAnimationFrame(function () { sraf = 0; sweep(); });
    }
    window.addEventListener("scroll", onSweep, { passive: true });
    window.addEventListener("resize", onSweep, { passive: true });

    GROUPS.forEach(function (g) {
      var sel = g[0], step = g[1], kind = g[2];
      var nodes = document.querySelectorAll(sel);
      var counters = new Map();
      Array.prototype.forEach.call(nodes, function (el) {
        if (seen.has(el)) return;
        seen.add(el);
        var parent = el.parentElement || document.body;
        var i = counters.get(parent) || 0;
        counters.set(parent, i + 1);
        el.classList.add(kind === "fig" ? "reveal-fig" : "reveal");
        if (step) el.style.setProperty("--d", Math.min(i * step, 420) + "ms");
        waiting.push(el);
        if (io) io.observe(el);
      });
    });

    /* Whatever is already on screen at load arrives at once, so the first
       view is never blank while the page waits for a scroll that may not come. */
    requestAnimationFrame(sweep);

    /* Late layout shifts move things into view without a scroll: a font
       swapping in, a photograph finally arriving and reserving its height.
       Sweep again as those settle so nothing sits hidden just above the fold.
       No blanket timer here on purpose. An earlier version revealed the whole
       page after three seconds "for safety", which meant that by the time you
       had read the first screen everything below was already showing and the
       rest of the page never animated at all. */
    window.addEventListener("load", sweep);
    setTimeout(sweep, 600);
    setTimeout(sweep, 2000);


    /* ---- desktop pointer touches ---- */
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    /* magnetic buttons: a few pixels of pull, then a spring back */
    Array.prototype.forEach.call(document.querySelectorAll(".cta-date"), function (btn) {
      var MAX = 7;
      btn.addEventListener("pointermove", function (ev) {
        var r = btn.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.dataset.magnetic = "on";
        btn.style.transform = "translate3d(" + (dx * MAX).toFixed(1) + "px," + (dy * MAX * 0.55).toFixed(1) + "px,0)";
      });
      btn.addEventListener("pointerleave", function () {
        delete btn.dataset.magnetic;
        btn.style.transform = "";
      });
    });

    /* gallery: the photograph drifts against the cursor inside its frame */
    Array.prototype.forEach.call(document.querySelectorAll(".gal figure"), function (fig) {
      var img = fig.querySelector("img");
      if (!img) return;
      fig.addEventListener("pointermove", function (ev) {
        var r = fig.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2);
        fig.style.setProperty("--px", (-dx * 7).toFixed(1) + "px");
        fig.style.setProperty("--py", (-dy * 7).toFixed(1) + "px");
      });
      fig.addEventListener("pointerleave", function () {
        fig.style.setProperty("--px", "0px");
        fig.style.setProperty("--py", "0px");
      });
    });
  })();

  /* ============================================================
     The menus as a book.

     Each menu is a spread: on the left, the photograph edge to edge
     with the menu's name and introduction over it; on the right, the
     courses on paper. The section is pinned while you scroll through
     it, and scrolling turns the pages, right to left around the spine:
     the right page lifts and falls away to reveal the next menu's
     courses, then the next photograph comes down onto the left.

     Scroll position is the only state. One function turns the
     section's scroll into { spread, turn 0..1 } every frame, and the
     drawn position eases toward it, so reload, the scrollbar, Home and
     End and anchor links all land on the right page, and the turn
     carries on for a moment after the wheel stops instead of halting.

     Phones, or a screen too short for a spread: the menus become a
     horizontal swipe, one page at a time, tilting like a page as it
     goes. Reduced motion: no turning, the pages cross-fade.
     No script: the plain column the markup describes.
     ============================================================ */
  (function menuBook() {
    var section = document.getElementById("menus");
    var box = section && section.querySelector(".menus");
    var index = section && section.querySelector(".menu-index");
    if (!box || !index) return;
    var pages = Array.prototype.slice.call(box.querySelectorAll(":scope > .menu"));
    var n = pages.length;
    if (n < 2) return;
    var links = Array.prototype.slice.call(index.querySelectorAll("a"));

    /* Scroll budget, in screens: DWELL resting on a spread, TURN crossing
       to the next. The last spread has no turn after it. */
    var DWELL = 0.5, TURN = 0.6, CYC = DWELL + TURN;
    var SPAN = n * DWELL + (n - 1) * TURN;

    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function smoother(x) { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); }

    /* ---- one-off restructure: left page and right page per menu ---- */
    pages.forEach(function (art, k) {
      var fig = art.querySelector(".menu-fig");
      var body = fig && fig.nextElementSibling;
      if (!fig || !body) return;
      var left = document.createElement("div");
      left.className = "pg pg-l";
      var head = document.createElement("div");
      head.className = "pg-head";
      Array.prototype.slice.call(body.querySelectorAll(":scope > .menu-title, :scope > .menu-meta, :scope > .menu-blurb"))
        .forEach(function (el) { head.appendChild(el); });
      left.appendChild(fig);
      left.appendChild(head);
      var right = document.createElement("div");
      right.className = "pg pg-r";
      var inner = document.createElement("div");
      inner.className = "pg-in";
      while (body.firstChild) inner.appendChild(body.firstChild);
      right.appendChild(inner);
      [left, right].forEach(function (pg) {
        var shade = document.createElement("i");
        shade.className = "pg-shade";
        shade.setAttribute("aria-hidden", "true");
        pg.appendChild(shade);
      });
      art.removeChild(body);
      art.appendChild(left);
      art.appendChild(right);
      Array.prototype.forEach.call(art.querySelectorAll(".course"), function (c, j) { c.style.setProperty("--k", j); });
      art.style.setProperty("--k", k);
    });

    /* track (tall, scrolls) > pin (sticky, one screen) > index + menus */
    var track = document.createElement("div");
    track.className = "book-track";
    var pin = document.createElement("div");
    pin.className = "book-pin";
    var spine = document.createElement("i");
    spine.className = "book-spine";
    spine.setAttribute("aria-hidden", "true");
    box.parentNode.insertBefore(track, box);
    track.appendChild(pin);
    pin.appendChild(index);
    pin.appendChild(box);
    pin.appendChild(spine);

    var mode = "";        // "book" or "swipe"
    var navH = 64;
    var shown = -1;       // live page, for the index and for inert

    function setLive(k) {
      if (k === shown) return;
      shown = k;
      links.forEach(function (a, j) {
        if (j === k) a.setAttribute("aria-current", "step");
        else a.removeAttribute("aria-current");
      });
      /* on a narrow screen the row of names scrolls: keep the live one in view */
      if (mode === "swipe" && links[k] && index.scrollWidth > index.clientWidth) {
        index.scrollTo({ left: links[k].offsetLeft - (index.clientWidth - links[k].offsetWidth) / 2, behavior: reduced ? "instant" : "smooth" });
      }
      pages.forEach(function (p, j) {
        if (mode === "book" && j !== k) p.setAttribute("inert", "");
        else p.removeAttribute("inert");
      });
    }

    /* ============ book mode ============ */
    var target = 0, current = 0, raf = 0, unit = 1;

    function bookFits() {
      if (window.innerWidth < 1000 || window.innerHeight < 620) return false;
      var avail = window.innerHeight - navH - 120;
      var worst = 1;
      pages.forEach(function (p) {
        var inner = p.querySelector(".pg-in");
        inner.style.setProperty("--fit", 1);
        /* a long menu sets its courses in two columns before it shrinks */
        p.removeAttribute("data-dense");
        if (inner.scrollHeight > avail) p.setAttribute("data-dense", "");
        var h = inner.scrollHeight;
        var s = h > avail ? avail / h : 1;
        inner.style.setProperty("--fit", s.toFixed(3));
        if (s < worst) worst = s;
      });
      return worst >= 0.74;
    }

    function measure() {
      var r = track.getBoundingClientRect();
      var travel = track.offsetHeight - pin.offsetHeight;
      var p = travel > 0 ? clamp01(-r.top / travel) : 0;
      target = p * SPAN;
      return r;
    }

    /* Draw position u (in screens along the book). */
    function render(u) {
      var i = Math.min(n - 1, Math.floor(u / CYC));
      var local = u - i * CYC;
      var f = i >= n - 1 ? 0 : clamp01((local - DWELL) / TURN);
      var t = smoother(f);
      var next = Math.min(n - 1, i + 1);

      for (var k = 0; k < n; k++) {
        var pg = pages[k];
        var L = pg.children[0], R = pg.children[1];
        var vis = k === i || (k === next && f > 0);
        pg.style.visibility = vis ? "visible" : "hidden";
        if (!vis) { L.style.visibility = R.style.visibility = ""; continue; }
        if (reduced) {
          /* cross-fade instead of turning */
          var o = k === i ? 1 - clamp01((f - 0.3) / 0.4) : clamp01((f - 0.3) / 0.4);
          pg.style.zIndex = k === i ? 2 : 3;
          pg.style.opacity = o.toFixed(3);
          L.style.transform = R.style.transform = "";
          L.style.visibility = R.style.visibility = "";
          pg.style.setProperty("--a", o.toFixed(3));
          continue;
        }
        pg.style.opacity = "";
        /* each menu is one layer: the leaving one is on top while its page
           lifts, the arriving one while its photograph comes down */
        pg.style.zIndex = (k === i) === (t < 0.5) ? 3 : 2;
        if (k === i) {
          /* leaving: right page lifts from flat to edge-on over the first half */
          var lift = clamp01(t * 2);
          R.style.transform = lift ? "rotateY(" + (-90 * lift).toFixed(2) + "deg)" : "";
          R.style.zIndex = 4;
          R.style.visibility = lift >= 1 ? "hidden" : "visible";
          R.style.setProperty("--shade", (lift * 0.55).toFixed(3));
          L.style.transform = "";
          L.style.zIndex = 1;
          L.style.visibility = "visible";
          /* the arriving page casts its shadow on this photograph */
          L.style.setProperty("--shade", (clamp01(t * 2 - 1) * 0.45).toFixed(3));
          pg.style.setProperty("--a", (1 - clamp01(t * 1.6)).toFixed(3));
        } else {
          /* arriving: courses lie underneath, photograph comes down over the second half */
          var fall = clamp01(t * 2 - 1);
          L.style.transform = fall < 1 ? "rotateY(" + (90 * (1 - fall)).toFixed(2) + "deg)" : "";
          L.style.zIndex = 4;
          L.style.visibility = fall > 0 ? "visible" : "hidden";
          L.style.setProperty("--shade", ((1 - fall) * 0.55).toFixed(3));
          R.style.transform = "";
          R.style.zIndex = 1;
          R.style.visibility = "visible";
          /* shadow of the lifting page on the courses beneath */
          R.style.setProperty("--shade", ((1 - clamp01(t * 2)) * 0.4).toFixed(3));
          pg.style.setProperty("--a", clamp01(t * 1.25 - 0.1).toFixed(3));
        }
      }
      setLive(f < 0.5 ? i : next);
    }

    function frame() {
      raf = 0;
      var d = target - current;
      current = Math.abs(d) < 0.0008 ? target : current + d * 0.18;
      render(current);
      if (current !== target) raf = requestAnimationFrame(frame);
    }

    function onBookScroll() {
      var r = measure();
      /* off screen there is nothing to animate: land exactly */
      if (r.bottom < 0 || r.top > window.innerHeight) { current = target; render(current); return; }
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function yForBook(k) {
      var travel = track.offsetHeight - pin.offsetHeight;
      var top = window.scrollY + track.getBoundingClientRect().top;
      return Math.round(top + (k * CYC + DWELL * 0.5) / SPAN * travel);
    }

    /* ============ swipe mode ============ */
    var sraf = 0;
    function swipeFrame() {
      sraf = 0;
      var w = box.clientWidth || 1;
      var pos = box.scrollLeft / w;
      var a = Math.floor(pos), b = Math.min(n - 1, a + 1);
      var h = Math.max(pages[a].offsetHeight, pages[b].offsetHeight);
      if (pos - a < 0.02) h = pages[a].offsetHeight;
      box.style.height = h + "px";
      pages.forEach(function (p, k) {
        var d = k - pos;
        if (Math.abs(d) > 1.2 || reduced) { p.style.transform = ""; p.style.opacity = ""; return; }
        p.style.transformOrigin = d > 0 ? "left center" : "right center";
        p.style.transform = "perspective(1600px) rotateY(" + (d * -16).toFixed(2) + "deg)";
        p.style.opacity = (1 - Math.min(1, Math.abs(d)) * 0.55).toFixed(3);
      });
      setLive(Math.round(pos));
    }
    function onSwipe() { if (!sraf) sraf = requestAnimationFrame(swipeFrame); }

    /* ============ switching ============ */
    function clearStyles() {
      pages.forEach(function (p) {
        p.removeAttribute("style");
        p.removeAttribute("inert");
        Array.prototype.forEach.call(p.children, function (c) {
          if (c.classList.contains("pg")) { c.style.transform = c.style.zIndex = c.style.visibility = ""; c.style.removeProperty("--shade"); }
        });
      });
      box.style.height = "";
      shown = -1;
    }

    function layout() {
      navH = nav ? nav.offsetHeight : 64;
      section.style.setProperty("--nav-h", navH + "px");
      var want;
      section.classList.add("book");          // measure the right page as a book page
      section.classList.remove("swipe");
      want = bookFits() ? "book" : "swipe";
      if (want === "swipe") { section.classList.remove("book"); section.classList.add("swipe"); }
      if (want !== mode) { clearStyles(); mode = want; }
      if (mode === "book") {
        track.style.height = "calc(100vh + " + (SPAN * 100).toFixed(1) + "vh)";
        measure(); current = target; render(current);
      } else {
        track.style.height = "";
        swipeFrame();
      }
    }

    function go(k, smooth) {
      if (mode === "book") {
        window.scrollTo({ top: yForBook(k), behavior: "instant" });   // the turn animates itself
        onBookScroll();
      } else {
        /* bring the names and the new page's photograph to the top of the screen */
        box.scrollTo({ left: k * box.clientWidth, behavior: smooth && !reduced ? "smooth" : "instant" });
        window.scrollTo({ top: Math.round(window.scrollY + index.getBoundingClientRect().top - navH - 12), behavior: smooth && !reduced ? "smooth" : "instant" });
      }
    }

    function indexOfHash(hash) {
      if (!hash || hash.length < 2) return -1;
      var el;
      try { el = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (err) { el = null; }
      return el ? pages.indexOf(el) : -1;
    }

    /* the index, and any same-page link to a menu (#brasa) */
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || a.host !== location.host || a.pathname !== location.pathname) return;
      var k = indexOfHash(a.hash);
      if (k < 0) return;
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, "", a.hash);
      go(k, true);
    });
    window.addEventListener("hashchange", function () {
      var k = indexOfHash(location.hash);
      if (k >= 0) go(k, true);
    });

    /* keyboard: left and right turn the pages while the book is on screen */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.target.closest && e.target.closest("input, textarea, select, .lb")) return;
      var r = section.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.5 || r.bottom < window.innerHeight * 0.5) return;
      var k = Math.max(0, Math.min(n - 1, (shown < 0 ? 0 : shown) + (e.key === "ArrowRight" ? 1 : -1)));
      e.preventDefault();
      go(k, true);
    });

    window.addEventListener("scroll", function () { if (mode === "book") onBookScroll(); }, { passive: true });
    box.addEventListener("scroll", function () { if (mode === "swipe") onSwipe(); }, { passive: true });
    var rto = 0;
    window.addEventListener("resize", function () { clearTimeout(rto); rto = setTimeout(layout, 120); }, { passive: true });
    window.addEventListener("pageshow", layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    Array.prototype.forEach.call(box.querySelectorAll("img"), function (img) {
      if (!img.complete) img.addEventListener("load", function () { if (mode === "swipe") onSwipe(); }, { once: true });
    });

    layout();
    window.addEventListener("load", function () {
      layout();
      var k = indexOfHash(location.hash);
      if (k >= 0) go(k, false);
    });
  })();

  /* ============================================================
     Photographs open full size.
     The plate is the product, so a thumbnail in a grid is not
     enough to sell it. Click, tap, or press Enter on any
     photograph and it fills the screen; arrows, swipe and the
     keyboard walk through the rest. Works with reduced motion on,
     it simply appears rather than fading.
     ============================================================ */
  (function lightbox() {
    var ZOOMABLE = ".gal figure img, .menu-fig img, .chef-fig img, .aside figure img, .recipe-fig img";
    var shots = Array.prototype.slice.call(document.querySelectorAll(ZOOMABLE));
    if (!shots.length) return;

    var es = (document.documentElement.lang || "en").slice(0, 2) === "es";
    var T = es
      ? { open: "Ver la foto en grande", close: "Cerrar", prev: "Foto anterior", next: "Foto siguiente", dialog: "Fotografía", of: "de" }
      : { open: "View this photograph larger", close: "Close", prev: "Previous photograph", next: "Next photograph", dialog: "Photograph", of: "of" };

    var CHEV = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var CROSS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    var box = document.createElement("div");
    box.className = "lb";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", T.dialog);
    box.innerHTML =
      '<button class="lb-btn lb-close" type="button" aria-label="' + T.close + '">' + CROSS + '</button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="' + T.prev + '">' + CHEV + '</button>' +
      '<button class="lb-btn lb-next" type="button" aria-label="' + T.next + '">' + CHEV + '</button>' +
      '<figure class="lb-stage"><img alt=""><figcaption aria-hidden="true"></figcaption></figure>' +
      '<p class="lb-count" aria-hidden="true"></p>';
    document.body.appendChild(box);

    var stageImg = box.querySelector(".lb-stage img");
    var cap = box.querySelector("figcaption");
    var count = box.querySelector(".lb-count");
    var btnClose = box.querySelector(".lb-close");
    var btnPrev = box.querySelector(".lb-prev");
    var btnNext = box.querySelector(".lb-next");
    var buttons = [btnClose, btnPrev, btnNext];
    var index = 0;
    var opener = null;

    if (shots.length < 2) { btnPrev.hidden = true; btnNext.hidden = true; count.hidden = true; }

    function full(img) { return img.currentSrc || img.getAttribute("src"); }

    function paint() {
      var src = shots[index];
      stageImg.src = full(src);
      stageImg.alt = src.getAttribute("alt") || "";
      cap.textContent = src.getAttribute("alt") || "";
      count.textContent = (index + 1) + " " + T.of + " " + shots.length;
      /* have the neighbours ready before they are asked for */
      [index + 1, index - 1].forEach(function (n) {
        var s = shots[(n + shots.length) % shots.length];
        if (s) { var pre = new Image(); pre.src = full(s); }
      });
    }

    /* Locking the page behind the photograph. Simply hiding overflow loses
       the scroll position (and does nothing at all on iOS), so the body is
       pinned where it stands and put back exactly there on close. */
    var savedY = 0;

    function open(i) {
      index = i;
      opener = shots[i];
      paint();
      box.hidden = false;
      savedY = window.scrollY;
      document.body.style.top = -savedY + "px";
      document.documentElement.classList.add("lb-open");
      btnClose.focus();
    }

    function close() {
      box.hidden = true;
      document.documentElement.classList.remove("lb-open");
      document.body.style.top = "";
      /* the page scrolls smoothly by default, which here would glide the
         reader back down over half a second. Put them back instantly. */
      var root = document.documentElement;
      var behaviour = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, savedY);
      root.style.scrollBehavior = behaviour;
      if (opener) opener.focus({ preventScroll: true });
    }

    function go(step) {
      index = (index + step + shots.length) % shots.length;
      opener = shots[index];
      paint();
    }

    shots.forEach(function (img, i) {
      img.classList.add("zoomable");
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      var alt = img.getAttribute("alt");
      img.setAttribute("aria-label", T.open + (alt ? ". " + alt : ""));
      img.addEventListener("click", function () { open(i); });
      img.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(i); }
      });
    });

    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", function () { go(-1); });
    btnNext.addEventListener("click", function () { go(1); });

    /* clicking the empty space around the photograph closes it */
    box.addEventListener("click", function (ev) {
      if (ev.target === box || ev.target.classList.contains("lb-stage")) close();
    });

    document.addEventListener("keydown", function (ev) {
      if (box.hidden) return;
      if (ev.key === "Escape") { ev.preventDefault(); close(); }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); go(1); }
      else if (ev.key === "ArrowLeft") { ev.preventDefault(); go(-1); }
      else if (ev.key === "Tab") {
        /* keep the keyboard inside the dialog while it is open */
        var live = buttons.filter(function (b) { return !b.hidden; });
        var at = live.indexOf(document.activeElement);
        var to = ev.shiftKey ? at - 1 : at + 1;
        ev.preventDefault();
        live[(to + live.length) % live.length].focus();
      }
    });

    /* swipe, for the phone. The browser's own image dragging would swallow
       the gesture, so it is turned off on the stage. */
    stageImg.setAttribute("draggable", "false");
    box.addEventListener("dragstart", function (ev) { ev.preventDefault(); });

    var x0 = null, y0 = null;
    function down(x, y) { x0 = x; y0 = y; }
    function up(x, y) {
      if (x0 === null) return;
      var dx = x - x0, dy = y - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }
    box.addEventListener("pointerdown", function (ev) { down(ev.clientX, ev.clientY); });
    box.addEventListener("pointerup", function (ev) { up(ev.clientX, ev.clientY); });
    box.addEventListener("pointercancel", function () { x0 = null; });
    box.addEventListener("touchstart", function (ev) {
      if (ev.touches.length === 1) down(ev.touches[0].clientX, ev.touches[0].clientY);
    }, { passive: true });
    box.addEventListener("touchend", function (ev) {
      if (ev.changedTouches.length) up(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
    }, { passive: true });
  })();

  /* ---------- enquiry form ---------- */
  var form = document.getElementById("enquiry");
  if (!form) return;

  /* The note goes to the Alba Zas Worker, which emails it to Admin@albazas.com
     (Cloudflare Pages cannot send mail itself). If that ever fails, the guest
     is offered WhatsApp and email with everything already filled in. */
  var ENDPOINT = "https://albazas.com/api/chef-enquiry";
  var es = (document.documentElement.lang || "en").slice(0, 2) === "es";
  var T = es ? {
    lead: function (d) { return "La primera fecha en la que puedo cocinar es el " + d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) + ". Necesito cinco días para conseguir el producto."; },
    tooSoon: function (d) { return "Necesito cinco días para conseguir el producto, porque algunos tardan en llegar. La primera fecha posible es el " + d.toLocaleDateString("es-ES", { day: "numeric", month: "long" }) + "."; },
    noDate: "Dime una fecha, aunque sea aproximada.",
    noName: "Pon tu nombre para saber a quién respondo.",
    noEmail: "Necesito un email para responderte.",
    badEmail: "Ese email no parece completo. Revísalo, por favor.",
    noGuests: "¿Cuántos seréis a la mesa?",
    sending: "Enviando…",
    sent: "Recibido. Respondo a todas las consultas el mismo día, con el precio completo. No hay nada reservado hasta que digas que sí.",
    failed: "No se ha podido enviar. Mándamela por WhatsApp, o escríbeme a ",
    hello: "Hola Alex, ",
    subject: "Consulta para una cena"
  } : {
    lead: function (d) { return "Earliest date I can cook is " + d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + ". I need five days to source properly."; },
    tooSoon: function (d) { return "I need five days to source the ingredients, as some take time to arrive. The earliest I can cook is " + d.toLocaleDateString("en-GB", { day: "numeric", month: "long" }) + "."; },
    noDate: "Give me a date, even an approximate one.",
    noName: "Please add your name so I know who I am writing back to.",
    noEmail: "I need an email address to reply to.",
    badEmail: "That address does not look complete. Please check it.",
    noGuests: "How many will be at the table?",
    sending: "Sending…",
    sent: "Received. I reply to every enquiry the same day, with a full price. Nothing is booked until you say yes.",
    failed: "It did not send. Please use WhatsApp instead, or write to ",
    hello: "Hola Alex, ",
    subject: "Dinner enquiry"
  };

  /* Five clear days before the earliest bookable date. The fish, the heritage
     potatoes, the island cheeses and the kid goat come from specific suppliers,
     and some take days to arrive, so the window is firm. Recomputed on every
     load, so it always moves with today's date. */
  var LEAD_DAYS = 5;
  var dateField = document.getElementById("f-date");
  var hint = document.getElementById("date-hint");
  var earliest = new Date(); earliest.setHours(0, 0, 0, 0);
  earliest.setDate(earliest.getDate() + LEAD_DAYS);
  function isoDay(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function chosenDay() { return dateField && dateField.value ? new Date(dateField.value + "T00:00:00") : null; }
  if (dateField) dateField.min = isoDay(earliest);
  if (hint) hint.textContent = T.lead(earliest);

  var status = document.getElementById("status");
  var waSame = document.getElementById("waSame");
  var button = form.querySelector('button[type="submit"]');

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

  function setError(key, message) {
    var wrap = document.getElementById("f-" + key + "-w");
    var out = document.getElementById("e-" + key);
    if (out) out.textContent = message || "";
    if (wrap) {
      if (message) wrap.setAttribute("data-invalid", "true");
      else wrap.removeAttribute("data-invalid");
    }
  }

  function validate() {
    var problems = [];
    var email = val("f-email");
    var day = chosenDay();

    setError("name", val("f-name") ? "" : T.noName);
    if (!val("f-name")) problems.push("name");

    if (!email) { setError("email", T.noEmail); problems.push("email"); }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("email", T.badEmail); problems.push("email"); }
    else setError("email", "");

    if (!day) { setError("date", T.noDate); problems.push("date"); }
    else if (day < earliest) { setError("date", T.tooSoon(earliest)); problems.push("date"); }
    else setError("date", "");

    setError("guests", val("f-guests") ? "" : T.noGuests);
    if (!val("f-guests")) problems.push("guests");

    if (problems.length) {
      var first = document.getElementById("f-" + problems[0]);
      if (first) first.focus();
      return false;
    }
    return true;
  }

  function body() {
    return [
      "Name: " + val("f-name"),
      "Email: " + val("f-email"),
      "Date: " + val("f-date"),
      "Guests: " + val("f-guests"),
      "Where: " + (val("f-where") || "not given"),
      "Menu: " + (val("f-menu") || "not decided"),
      "",
      "Notes, allergies, occasion:",
      val("f-notes") || "none given"
    ].join("\n");
  }

  /* Keep the WhatsApp shortcut carrying whatever has been typed so far. */
  function waHref() { return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(T.hello + body()); }
  function refreshWa() { if (waSame) waSame.href = waHref(); }
  form.addEventListener("input", refreshWa);
  refreshWa();

  /* The menu buttons ("Enquire about Huerta") pre-select that menu. */
  var menuField = document.getElementById("f-menu");
  Array.prototype.forEach.call(document.querySelectorAll('a[href="#enquire"][data-menu]'), function (a) {
    a.addEventListener("click", function () { if (menuField) { menuField.value = a.getAttribute("data-menu"); refreshWa(); } });
  });

  function showFailure() {
    if (!status) return;
    var mail = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(T.subject + ", " + val("f-date")) +
      "&body=" + encodeURIComponent(body());
    status.textContent = T.failed;
    var a = document.createElement("a");
    a.href = mail; a.textContent = EMAIL;
    var w = document.createElement("a");
    w.href = waHref(); w.target = "_blank"; w.rel = "noopener"; w.textContent = "WhatsApp";
    status.appendChild(a);
    status.appendChild(document.createTextNode(". "));
    status.appendChild(w);
  }

  var sending = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    if (!validate()) { if (status) status.textContent = ""; return; }
    sending = true;
    if (button) button.disabled = true;
    if (status) status.textContent = T.sending;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: val("f-name"), email: val("f-email"), date: val("f-date"), guests: val("f-guests"),
        where: val("f-where"), menu: val("f-menu"), notes: val("f-notes"),
        website: val("f-website"), lang: es ? "es" : "en", page: location.pathname
      })
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (status) status.textContent = T.sent;
      form.reset();
      refreshWa();
    }).catch(function () {
      showFailure();
    }).then(function () {
      sending = false;
      if (button) button.disabled = false;
    });
  });
})();
