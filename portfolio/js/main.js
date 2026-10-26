/**
 * portfolio/js/main.js
 * ------------------------------------------------------------------
 * Two small jobs, nothing more:
 *   1. Mobile navigation toggle.
 *   2. Keep the copyright year current.
 *
 * The page works without JavaScript; this only adds convenience.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("siteNav");
  var year = document.getElementById("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  if (!toggle || !nav) {
    return;
  }

  function closeNav() {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", function () {
    var isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  /* Close the menu after picking a destination. */
  nav.addEventListener("click", function (event) {
    if (event.target.tagName === "A") {
      closeNav();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  /* Reset state if the viewport grows back to desktop width. */
  window.addEventListener("resize", function () {
    if (window.innerWidth > 720) {
      closeNav();
    }
  });
})();
