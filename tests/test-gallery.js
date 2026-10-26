/**
 * Smoke tests for image-gallery/index.html, driven through jsdom.
 *
 * Run from the repository root:  npm test
 * or directly:                   node tests/test-gallery.js
 */
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (e) => errors.push("jsdomError: " + e.message));
virtualConsole.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const base = path.join(__dirname, "..", "image-gallery");
const html = fs
  .readFileSync(path.join(base, "index.html"), "utf8")
  .replace(
    '<script src="js/data.js" defer></script>',
    "<script>" + fs.readFileSync(path.join(base, "js/data.js"), "utf8") + "</script>"
  )
  .replace(
    '<script src="js/app.js" defer></script>',
    "<script>" + fs.readFileSync(path.join(base, "js/app.js"), "utf8") + "</script>"
  );

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole,
  url: "https://example.com/index.html",
  beforeParse(window) {
    window.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        query: {
          pages: {
            1: { imageinfo: [{ thumburl: "https://example.org/photo.jpg", url: "https://example.org/photo.jpg" }] }
          }
        }
      })
    });
  }
});

const { window } = dom;
const doc = window.document;
const results = [];
const check = (name, actual, expected) => {
  const ok = String(actual).trim() === String(expected).trim();
  results.push((ok ? "PASS " : "FAIL ") + name + " -> " + actual + (ok ? "" : " (expected " + expected + ")"));
};

function click(el) {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}

(async () => {
  await new Promise((r) => setTimeout(r, 250));

  check("cards rendered", doc.querySelectorAll("#gallery .card").length, 32);
  check("filter buttons", doc.querySelectorAll("#filters .filter-btn").length, 9);
  check("status text", doc.getElementById("status").textContent, "Showing 32 of 32 photos");

  // category filter
  const natureButton = [...doc.querySelectorAll("#filters .filter-btn")].find((b) => b.textContent === "Nature");
  click(natureButton);
  check("nature filter", doc.querySelectorAll("#gallery .card").length, 4);
  check("nature status", doc.getElementById("status").textContent, "Showing 4 of 32 photos");
  const activeButton = doc.querySelector("#filters .filter-btn.active");
  check("active filter", activeButton.textContent, "Nature");
  check("active filter aria", activeButton.getAttribute("aria-pressed"), "true");

  // back to all
  click([...doc.querySelectorAll("#filters .filter-btn")].find((b) => b.textContent === "All"));
  check("all again", doc.querySelectorAll("#gallery .card").length, 32);

  // search (debounced 200ms)
  const search = doc.getElementById("searchInput");
  search.value = "taj";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 350));
  check("search taj", doc.querySelectorAll("#gallery .card").length, 1);
  check("search title", doc.querySelector("#gallery .card h3").textContent, "Taj Mahal");

  // empty state
  search.value = "zzzz";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 350));
  check("empty state", Boolean(doc.querySelector("#gallery .empty")), true);
  check("empty status", doc.getElementById("status").textContent, "0 photos found");

  // clear search
  search.value = "";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 350));

  // favourites
  const favButton = doc.querySelector("#gallery .card .fav-btn");
  click(favButton);
  check("favourite stored", JSON.parse(window.localStorage.getItem("gallery_favs")).length, 1);

  const favFilter = doc.getElementById("favFilterBtn");
  click(favFilter);
  check("fav filter view", doc.querySelectorAll("#gallery .card").length, 1);
  check("fav filter pressed", favFilter.getAttribute("aria-pressed"), "true");
  click(favFilter);
  check("fav filter off", doc.querySelectorAll("#gallery .card").length, 32);

  // theme toggle
  const themeToggle = doc.getElementById("themeToggle");
  click(themeToggle);
  check("theme dark", doc.documentElement.getAttribute("data-theme"), "dark");
  check("theme persisted", JSON.parse(window.localStorage.getItem("gallery_theme")), "dark");
  click(themeToggle);
  check("theme light", doc.documentElement.getAttribute("data-theme"), "light");

  // modal
  const firstCard = doc.querySelector("#gallery .card");
  click(firstCard.querySelector(".image-wrap"));
  check("modal open", doc.getElementById("imageModal").classList.contains("open"), true);
  check("modal title", doc.getElementById("modalTitle").textContent.length > 0, true);
  check("modal source link", doc.getElementById("modalSourceLink").href.startsWith("https://commons.wikimedia.org"), true);

  doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  check("modal closed by Escape", doc.getElementById("imageModal").classList.contains("open"), false);
  check("modal aria hidden", doc.getElementById("imageModal").getAttribute("aria-hidden"), "true");

  // shuffle keeps the count
  click(doc.getElementById("shuffleBtn"));
  check("shuffle keeps count", doc.querySelectorAll("#gallery .card").length, 32);

  console.log(results.join("\n"));
  console.log("\nJS errors:", errors.length ? errors.join("\n") : "none");
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log("\nSUMMARY:", results.length - failed, "passed,", failed, "failed");
  process.exit(failed ? 1 : 0);
})();
