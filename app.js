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
      [".recipe-card", 60, "fig"]
    ];

    /* Failsafe: if anything about the observer misbehaves, everything is
       visible after three seconds regardless. Content is never lost. */
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll(".reveal, .reveal-fig"),
        function (el) { el.classList.add("in"); });
    }, 3000);

    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

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
        /* anything already on screen at load reveals immediately, so the
           first viewport is never blank while waiting for a scroll */
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) {
          requestAnimationFrame(function () { el.classList.add("in"); });
        } else {
          io.observe(el);
        }
      });
    });

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
