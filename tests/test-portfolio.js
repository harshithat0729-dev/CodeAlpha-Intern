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
const html = fs.readFileSync(path.join(base, "index.html"), "utf8");

/* The page loads its script with defer; inline it so jsdom runs it in order. */
const inline = html.replace(
  '<script src="js/main.js" defer></script>',
  "<script>" + fs.readFileSync(path.join(base, "js", "main.js"), "utf8") + "</script>"
);

const dom = new JSDOM(inline, {
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

const click = (element) => element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

/* --- structure ----------------------------------------------------- */
check("page title", doc.title, "Harshitha Thummala | Portfolio");
check("hero name", doc.querySelector(".hero h1").textContent, "Harshitha Thummala");
check("hero role", doc.querySelector(".hero .role").textContent, "BSc. Artificial Intelligence Student");
check("main landmark", Boolean(doc.querySelector("main#main")), true);
check("skip link target", doc.querySelector(".skip-link").getAttribute("href"), "#main");

const sections = ["home", "about", "skills", "projects", "achievements", "contact"];
check("all sections present", sections.every((id) => doc.getElementById(id)), true);
check("nav links", doc.querySelectorAll("#navLinks a").length, 5);

/* --- content ------------------------------------------------------- */
check("hero stats", doc.querySelectorAll(".hero-stats .stat").length, 3);
check("fact rows", doc.querySelectorAll(".facts .fact").length, 5);
check("skill cards", doc.querySelectorAll("#skills .card").length, 4);
check("project cards", doc.querySelectorAll("#projects .project").length, 4);
check("project titles", [...doc.querySelectorAll("#projects .project h3")].map((h) => h.textContent).join(" | "),
  "Lab Tracker Website | Calcio — Scientific Calculator with AI Tutor | Python AI Chatbot | Scam Message Detector");
check("certifications", doc.querySelectorAll("#achievements .split ul.timeline").length, 2);
check("language chips", doc.querySelectorAll(".lang-row .chips li").length, 3);
check("contact cards", doc.querySelectorAll(".contact-card").length, 3);
check("email link", doc.querySelector('a[href^="mailto:"]').getAttribute("href"), "mailto:harshithat0729@gmail.com");
check("phone link", doc.querySelector('a[href^="tel:"]').getAttribute("href"), "tel:+919581157958");

/* --- external links are safe -------------------------------------- */
const external = [...doc.querySelectorAll('a[href^="http"]')];
check("external links", external.length > 0, true);
check(
  "external links use noopener noreferrer",
  external.every((a) => a.getAttribute("rel") === "noopener noreferrer"),
  true
);

/* --- theme toggle -------------------------------------------------- */
const themeToggle = doc.getElementById("themeToggle");
const startTheme = doc.documentElement.getAttribute("data-theme");
check("theme is set on load", ["light", "dark"].includes(startTheme), true);
check("theme aria-pressed matches", themeToggle.getAttribute("aria-pressed"), String(startTheme === "dark"));

click(themeToggle);
const flipped = doc.documentElement.getAttribute("data-theme");
check("theme flips", flipped === (startTheme === "dark" ? "light" : "dark"), true);
check("theme saved", window.localStorage.getItem("theme"), flipped);
check("theme aria-pressed after flip", themeToggle.getAttribute("aria-pressed"), String(flipped === "dark"));

/* --- mobile menu --------------------------------------------------- */
const menuToggle = doc.getElementById("menuToggle");
const navLinks = doc.getElementById("navLinks");

check("menu closed initially", navLinks.classList.contains("open"), false);
check("menu aria-expanded initially", menuToggle.getAttribute("aria-expanded"), "false");

click(menuToggle);
check("menu opens", navLinks.classList.contains("open"), true);
check("menu aria-expanded open", menuToggle.getAttribute("aria-expanded"), "true");
check("menu aria-label open", menuToggle.getAttribute("aria-label"), "Close menu");

doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
check("Escape closes menu", navLinks.classList.contains("open"), false);
check("menu aria-expanded after Escape", menuToggle.getAttribute("aria-expanded"), "false");

click(menuToggle);
click(navLinks.querySelector("a"));
check("menu closes after clicking a link", navLinks.classList.contains("open"), false);

/* --- reveal fallback (no IntersectionObserver in jsdom) ------------- */
const reveals = [...doc.querySelectorAll(".reveal")];
check("reveal elements exist", reveals.length > 20, true);
check("reveal shown without IntersectionObserver", reveals.every((el) => el.classList.contains("in")), true);

/* --- footer -------------------------------------------------------- */
check("footer year", doc.getElementById("year").textContent, String(new Date().getFullYear()));

/* --- housekeeping --------------------------------------------------- */
const stripped = doc.body.innerHTML.replace(/<!--[\s\S]*?-->/g, "");
check("no lorem ipsum", /lorem ipsum/i.test(stripped), false);
check("no TODO markers in markup", /TODO/.test(stripped), false);

console.log(results.join("\n"));
console.log("\nJS errors:", errors.length ? errors.join("\n") : "none");
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log("\nSUMMARY:", results.length - failed, "passed,", failed, "failed");
process.exit(failed ? 1 : 0);
