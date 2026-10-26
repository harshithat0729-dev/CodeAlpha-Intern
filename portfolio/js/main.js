/**
 * portfolio/js/main.js
 * ==================================================================
 * Interaction layer for the portfolio. Six small, independent jobs:
 *
 *   1. Light / dark theme, remembered in localStorage
 *   2. Mobile menu (with Escape to close and aria-expanded kept in sync)
 *   3. Navbar shadow once the page is scrolled
 *   4. Active nav link that follows the section in view
 *   5. Reveal-on-scroll animation, skipped when the user prefers less motion
 *   6. Current year in the footer
 *
 * The page is fully readable with JavaScript disabled; everything here
 * is progressive enhancement.
 * ==================================================================
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var menuToggle = document.getElementById("menuToggle");
  var navLinks = document.getElementById("navLinks");
  var nav = document.getElementById("nav");

  /* ------------------------------------------------------------------ *
   * Storage that never throws (private mode, blocked cookies, etc.)
   * ------------------------------------------------------------------ */
  function readPreference(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function savePreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* Theme choice is a convenience, not a requirement. */
    }
  }

  /* ------------------------------------------------------------------ *
   * 1. Theme
   * ------------------------------------------------------------------ */
  function applyTheme(mode) {
    root.setAttribute("data-theme", mode);

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(mode === "dark"));
      themeToggle.setAttribute(
        "aria-label",
        mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
      );
    }
  }

  if (themeToggle) {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      savePreference("theme", next);
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. Mobile menu
   * ------------------------------------------------------------------ */
  function closeMenu() {
    if (!navLinks || !menuToggle) {
      return;
    }
    navLinks.classList.remove("open");
    menuToggle.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("open");
      menuToggle.classList.toggle("open", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) {
        closeMenu();
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. Navbar shadow on scroll (rAF throttled)
   * ------------------------------------------------------------------ */
  if (nav) {
    var ticking = false;

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) {
          return;
        }

        ticking = true;
        window.requestAnimationFrame(function () {
          nav.classList.toggle("scrolled", window.scrollY > 8);
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------ *
   * 4. Active nav link while scrolling
   * ------------------------------------------------------------------ */
  var supportsObservers = "IntersectionObserver" in window;

  if (supportsObservers && navLinks) {
    var linkFor = {};

    navLinks.querySelectorAll("a").forEach(function (link) {
      var target = link.getAttribute("href");
      if (target && target.charAt(0) === "#") {
        linkFor[target.slice(1)] = link;
      }
    });

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          Object.keys(linkFor).forEach(function (id) {
            linkFor[id].classList.remove("active");
          });

          var activeLink = linkFor[entry.target.id];
          if (activeLink) {
            activeLink.classList.add("active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    document.querySelectorAll("section[id]").forEach(function (section) {
      spy.observe(section);
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. Reveal on scroll (once per element, then unobserved)
   * ------------------------------------------------------------------ */
  var revealables = document.querySelectorAll(".reveal");
  var prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!supportsObservers || prefersReducedMotion) {
    /* No animation available or wanted: show everything immediately. */
    revealables.forEach(function (element) {
      element.classList.add("in");
    });
  } else {
    var revealer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    revealables.forEach(function (element) {
      revealer.observe(element);
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. Footer year
   * ------------------------------------------------------------------ */
  var yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }
})();
