/**
 * Smoke tests for portfolio/index.html, driven through jsdom.
 *
 * Run from the repository root:  npm test
 * or directly:                   node tests/test-portfolio.js
 */
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (e) => errors.push("jsdomError: " + e.message));
virtualConsole.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const base = path.join(__dirname, "..", "portfolio");
const html = fs
  .readFileSync(path.join(base, "index.html"), "utf8")
  .replace(
    '<script src="js/main.js" defer></script>',
    "<script>" + fs.readFileSync(path.join(base, "js/main.js"), "utf8") + "</script>"
  );

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole,
  url: "https://example.com/portfolio/index.html"
});

const { window } = dom;
const doc = window.document;

const results = [];
const check = (name, actual, expected) => {
  const ok = String(actual).trim() === String(expected).trim();
  results.push((ok ? "PASS " : "FAIL ") + name + " -> " + actual + (ok ? "" : " (expected " + expected + ")"));
};

/* --- structure ---------------------------------------------------- */
check("page title", doc.title, "Harshitha Thummala | Portfolio");
check("hero heading", doc.querySelector(".hero h1").textContent.length > 20, true);
check("sections present", ["about", "work", "skills", "education", "contact"].every((id) => doc.getElementById(id)), true);
check("project cards", doc.querySelectorAll("#work .card").length, 5);
check("skill groups", doc.querySelectorAll("#skills .skill-group").length, 4);
check("education entries", doc.querySelectorAll("#education .timeline-item").length, 1);
check("skip link", Boolean(doc.querySelector(".skip-link")), true);
check("nav links", doc.querySelectorAll("#siteNav a").length, 4);

/* --- every external link is safe ---------------------------------- */
const external = [...doc.querySelectorAll('a[href^="http"]')];
check("external links found", external.length > 0, true);
check(
  "external links use noopener",
  external.every((a) => a.getAttribute("rel") === "noopener noreferrer"),
  true
);
check(
  "external links open in new tab",
  external.every((a) => a.getAttribute("target") === "_blank"),
  true
);

/* --- contact details ---------------------------------------------- */
check("mailto link", doc.querySelector('a[href^="mailto:"]').getAttribute("href"), "mailto:harshithat0729@gmail.com");
check(
  "github link present",
  [...doc.querySelectorAll('a[href*="github.com/harshithat0729-dev"]')].length >= 2,
  true
);

/* --- mobile navigation -------------------------------------------- */
const toggle = doc.getElementById("navToggle");
const nav = doc.getElementById("siteNav");

check("nav closed initially", nav.classList.contains("open"), false);
check("aria-expanded initially", toggle.getAttribute("aria-expanded"), "false");

toggle.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
check("nav opens on click", nav.classList.contains("open"), true);
check("aria-expanded after open", toggle.getAttribute("aria-expanded"), "true");

doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
check("Escape closes nav", nav.classList.contains("open"), false);
check("aria-expanded after Escape", toggle.getAttribute("aria-expanded"), "false");

/* --- footer year is current --------------------------------------- */
check("footer year", doc.getElementById("year").textContent, String(new Date().getFullYear()));

/* --- no leftover template placeholders ---------------------------- */
const body = doc.body.innerHTML;
check("no lorem ipsum", /lorem ipsum/i.test(body), false);
check("no unedited YOUR-HANDLE in links", /YOUR-HANDLE/.test(body.replace(/<!--[\s\S]*?-->/g, "")), false);

console.log(results.join("\n"));
console.log("\nJS errors:", errors.length ? errors.join("\n") : "none");
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log("\nSUMMARY:", results.length - failed, "passed,", failed, "failed");
process.exit(failed ? 1 : 0);
