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
