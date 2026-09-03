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
    if (nav) nav.setAttribute("data-solid", y > window.innerHeight * 0.82 ? "true" : "false");
    if (heroMedia && !reduced && y < window.innerHeight * 1.3) {
      heroMedia.style.transform =
        "translate3d(0," + (y * 0.28).toFixed(1) + "px,0) scale(" + (1 + y * 0.00007).toFixed(4) + ")";
    }
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(onFrame); }
  onFrame();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });


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
      [".menu-index a", 55],
      [".menu", 0],
      [".menu-fig", 0, "fig"],
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
    }, { threshold: 0.01, rootMargin: "0px 0px -8% 0px" }) : null;

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

    /* ============================================================
       The menu rail.

       The five menus occupy one place, centred below the nav, and
       scrolling moves through them: the one you are leaving drifts
       up and fades out, the next rises into its place.

       Two things make it feel fluid rather than stepped. The position
       is smoothed every frame toward where the scroll actually is, so
       the movement carries on for a moment after the wheel stops and
       never starts abruptly. And the curve across each step is a
       smootherstep, which is flat in both its first and second
       derivative at each end, so there is no visible kick as one menu
       hands over to the next.

       It only runs when a whole menu fits the centred area. If it does
       not, the section stays the plain column it is, because the menus
       are the point of the page.
       ============================================================ */
    (function menuRail() {
      var box = document.querySelector(".menus");
      if (!box) return;
      var section = box.closest("section");
      if (!section) return;

      var faces = Array.prototype.slice.call(box.querySelectorAll(".menu"));
      var n = faces.length;
      if (n < 2) return;

      var PACE = 1.0;     /* screens of scroll per menu */
      var LEAD = 0.10;    /* a short flat moment at the start of each step */
      var HOLD = 0.10;    /* and at the end, so each menu settles briefly */
      var LIFT = 70;      /* how far a menu travels as it hands over, px */
      var TAU  = 105;     /* smoothing time constant, ms. Lower is tighter */

      var track = document.createElement("div");
      track.className = "rail-track";
      var pin = document.createElement("div");
      pin.className = "rail-pin";
      var stage = document.createElement("div");
      stage.className = "rail-stage";
      var hint = document.createElement("p");
      hint.className = "rail-hint";
      hint.setAttribute("aria-hidden", "true");

      var on = false, pinH = 0, current = 0, target = 0, running = false, last = 0, shown = -1;

      function navH() {
        var el = document.getElementById("nav");
        return el ? el.getBoundingClientRect().height : 64;
      }

      function attach() {
        if (on) return;
        stage.appendChild(document.createDocumentFragment());
        track.appendChild(pin);
        pin.appendChild(stage);
        pin.appendChild(hint);
        box.parentNode.insertBefore(track, box);
        faces.forEach(function (f) { stage.appendChild(f); });
        section.classList.add("rail");
        track.appendChild(box);
        on = true;
      }

      function detach() {
        if (!on) return;
        faces.forEach(function (f) {
          f.style.transform = "";
          f.style.opacity = "";
          f.style.filter = "";
          f.style.pointerEvents = "";
          box.appendChild(f);
        });
        section.classList.remove("rail");
        section.style.removeProperty("--pin-h");
        if (track.parentNode) {
          track.parentNode.insertBefore(box, track);
          track.parentNode.removeChild(track);
        }
        on = false;
      }

      function layout() {
        var h = Math.round(window.innerHeight - navH() - 24);
        /* the anchor offset needs this whether the rail runs or not */
        document.documentElement.style.setProperty("--navh", Math.round(navH()) + "px");
        if (h < 420) { detach(); return; }

        attach();
        section.style.setProperty("--pin-h", h + "px");

        var tallest = 0;
        faces.forEach(function (f) {
          tallest = Math.max(tallest, f.scrollHeight);
        });
        /* headroom, so a size that only just fits does not flip the rail on
           and off as the window is nudged or a font finishes loading */
        if (tallest > h - 20) { detach(); return; }

        pinH = h;
        track.style.height = Math.round(pinH + (n - 1) * window.innerHeight * PACE) + "px";
      }

      /* Flat at both ends, and smooth into and out of the movement.
         The old version held still for a third of the step and then
         moved, which is what read as rigid. */
      function shape(t) {
        var span = 1 - LEAD - HOLD;
        var u = (t - LEAD) / span;
        if (u <= 0) return 0;
        if (u >= 1) return 1;
        return u * u * u * (u * (u * 6 - 15) + 10);
      }

      function measure() {
        var r = track.getBoundingClientRect();
        var travel = track.offsetHeight - pinH;
        var stickAt = navH() + 24;
        var scrolled = Math.min(Math.max(stickAt - r.top, 0), travel);
        var raw = travel > 0 ? (scrolled / travel) * (n - 1) : 0;
        var i = Math.min(Math.floor(raw), n - 2);
        target = raw >= n - 1 ? n - 1 : i + shape(raw - i);

        /* fade the whole rail in as it arrives and out as it leaves, so a
           half-visible menu never drifts through the page on its own */
        var lead = Math.min(Math.max((stickAt + 420 - r.top) / 420, 0), 1);
        var tail = Math.min(Math.max((r.bottom - stickAt - pinH + 420) / 420, 0), 1);
        pin.style.opacity = Math.min(lead, tail).toFixed(3);
      }

      function render(pos) {
        for (var k = 0; k < n; k++) {
          var d = k - pos;                 /* negative above, positive below */
          var a = Math.abs(d);
          var f = faces[k];
          if (a >= 1.9) {
            if (f.style.opacity !== "0") { f.style.opacity = "0"; f.style.pointerEvents = "none"; }
            continue;
          }
          var fade = a >= 1 ? 0 : 1 - a * a;              /* soft, not linear */
          f.style.opacity = fade.toFixed(3);
          f.style.transform =
            "translate3d(0," + (-50 + d * -LIFT / 10).toFixed(2) + "%,0) translateY(" +
            (d * LIFT).toFixed(1) + "px) scale(" + (1 - a * 0.035).toFixed(4) + ")";
          f.style.filter = a < 0.04 ? "none" : "blur(" + Math.min(a * 5, 5).toFixed(1) + "px)";
          f.style.pointerEvents = a < 0.5 ? "auto" : "none";
        }
        var idx = Math.round(pos);
        if (idx !== shown) {
          shown = idx;
          hint.textContent = String(idx + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0");
        }
      }

      /* Exponential smoothing toward the scroll position, in real time so
         it behaves the same at 60 and at 120 frames a second. */
      function tick(now) {
        var dt = last ? Math.min(now - last, 64) : 16;
        last = now;
        var d = target - current;
        if (Math.abs(d) < 0.0004) {
          current = target;
          render(current);
          running = false;
          last = 0;
          return;
        }
        current += d * (1 - Math.exp(-dt / TAU));
        render(current);
        requestAnimationFrame(tick);
      }

      function kick() {
        if (running) return;
        running = true;
        requestAnimationFrame(tick);
      }

      function onScroll() {
        if (!on) return;
        measure();
        kick();
      }

      /* Where the page has to be scrolled to for menu k to be the one in
         front. Every menu now sits in the same place on the screen, so a
         plain #brasa jump would land on the first one; the rail has to
         translate the name into a scroll position itself. */
      function yFor(k) {
        var travel = track.offsetHeight - pinH;
        return Math.round(window.scrollY + track.getBoundingClientRect().top
          - navH() - 24 + (travel * k) / (n - 1));
      }

      function jump(k, smooth) {
        window.scrollTo({ top: yFor(k), behavior: smooth ? "smooth" : "auto" });
        onScroll();
      }

      function indexOfHash(hash) {
        if (!hash || hash.length < 2) return -1;
        var el;
        try { el = document.getElementById(decodeURIComponent(hash.slice(1))); }
        catch (err) { el = null; }
        return el ? faces.indexOf(el) : -1;
      }

      /* the five cards above the rail, the nav, and every "back to this
         menu" link on a recipe page */
      document.addEventListener("click", function (e) {
        if (!on) return;
        var a = e.target.closest && e.target.closest('a[href*="#"]');
        if (!a) return;
        /* only a jump within this page — a link to /recipes/x/#note is a
           navigation, not a rail move */
        if (a.host !== window.location.host || a.pathname !== window.location.pathname) return;
        var k = indexOfHash(a.hash);
        if (k < 0) return;
        e.preventDefault();
        if (window.history && history.replaceState) history.replaceState(null, "", a.hash);
        jump(k, true);
      });

      /* arriving from another page on /#brasa. Run it once the images are
         in too, because the track is a different height by then. */
      var landed = false;
      function landOnHash() {
        if (landed || !on) return;
        var k = indexOfHash(window.location.hash);
        if (k < 1) { landed = true; return; }
        landed = true;
        jump(k, false);
        current = target;
        render(current);
      }

      window.addEventListener("hashchange", function () {
        var k = indexOfHash(window.location.hash);
        if (on && k >= 0) jump(k, true);
      });

      /* Keyboard: only when the focus genuinely came from tabbing. Scripts
         move focus too — the lightbox hands it back to the photograph it was
         opened from — and treating that as navigation threw the reader up
         the page. */
      var tabbing = false;
      document.addEventListener("keydown", function (e) {
        if (e.key === "Tab") tabbing = true;
      }, true);
      document.addEventListener("pointerdown", function () { tabbing = false; }, true);

      document.addEventListener("focusin", function (e) {
        if (!on || !tabbing) return;
        tabbing = false;
        var f = e.target.closest && e.target.closest(".menu");
        if (!f) return;
        var k = faces.indexOf(f);
        if (k < 0) return;
        jump(k, false);
      });

      layout();
      measure();
      current = target;
      render(current);

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", function () {
        layout();
        if (on) { measure(); current = target; render(current); }
      }, { passive: true });
      window.addEventListener("load", function () {
        layout();
        if (on) { measure(); current = target; render(current); }
        landOnHash();
      });
    })();

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

  /* Five clear days before the earliest bookable date. The fish, the heritage
     potatoes and the island cheeses come from suppliers, not a supermarket, so
     the window has to be real. Recomputed on every load, so it always moves
     with today's date rather than being fixed at build time. */
  var LEAD_DAYS = 5;
  var dateField = document.getElementById("f-date");
  var earliest = null;
  if (dateField) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + LEAD_DAYS);
    earliest = d;
    var iso = d.getFullYear() + "-" +
              String(d.getMonth() + 1).padStart(2, "0") + "-" +
              String(d.getDate()).padStart(2, "0");
    dateField.min = iso;
    var hint = document.getElementById("date-hint");
    if (hint) {
      hint.textContent = "Earliest date I can cook is " +
        d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) +
        ". I need five days to source properly.";
    }
  }

  var status = document.getElementById("status");
  var waSame = document.getElementById("waSame");

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
    var name = val("f-name");
    var email = val("f-email");
    var date = val("f-date");
    var guests = val("f-guests");

    setError("name", name ? "" : "Please add your name so I know who I am writing back to.");
    if (!name) problems.push("name");

    if (!email) { setError("email", "I need an email address to reply to."); problems.push("email"); }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("email", "That address does not look complete. Please check it."); problems.push("email"); }
    else setError("email", "");

    if (!date) {
      setError("date", "Give me a date, even an approximate one.");
      problems.push("date");
    } else if (earliest && new Date(date + "T00:00:00") < earliest) {
      setError("date", "I need five days to shop and prepare. The earliest I can cook is " +
        earliest.toLocaleDateString("en-GB", { day: "numeric", month: "long" }) + ".");
      problems.push("date");
    } else {
      setError("date", "");
    }

    setError("guests", guests ? "" : "How many will be at the table?");
    if (!guests) problems.push("guests");

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
  function refreshWa() {
    if (!waSame) return;
    waSame.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Hola Alex, " + body());
  }
  form.addEventListener("input", refreshWa);
  refreshWa();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      if (status) status.textContent = "";
      return;
    }
    var subject = "Dinner enquiry, " + (val("f-date") || "date to confirm") + ", " + val("f-guests") + " guests";
    window.location.href =
      "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body());
    if (status) {
      status.textContent =
        "Your email app should have opened with everything filled in. If nothing happened, use WhatsApp instead or write to " + EMAIL + ".";
    }
  });
})();
