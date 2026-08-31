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

  /* ---------- enquiry form ---------- */
  var form = document.getElementById("enquiry");
  if (!form) return;

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

    setError("date", date ? "" : "Give me a date, even an approximate one.");
    if (!date) problems.push("date");

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
