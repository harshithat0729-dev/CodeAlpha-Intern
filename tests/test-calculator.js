/**
 * Smoke tests for calculator/index.html, driven through jsdom.
 *
 * Run from the repository root:  npm test
 * or directly:                   node tests/test-calculator.js
 */
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (e) => errors.push("jsdomError: " + e.message));
virtualConsole.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

function fakeContext() {
  return new Proxy(
    {},
    {
      get: (target, prop) => {
        if (prop === "canvas") return {};
        return () => {};
      },
      set: () => true
    }
  );
}

function clickText(doc, containerId, text) {
  const nodes = [...doc.querySelectorAll("#" + containerId + " button")];
  const btn = nodes.find((b) => b.textContent.trim() === text);
  if (!btn) throw new Error('button not found: "' + text + '" in #' + containerId);
  btn.click();
  return btn;
}

function typeExpr(doc, value) {
  doc.getElementById("ex").value = value;
  clickText(doc, "keys", "=");
  return doc.getElementById("rs").textContent;
}

(async () => {
  const base = path.join(__dirname, "..", "calculator");
  const html = fs
    .readFileSync(path.join(base, "index.html"), "utf8")
    .replace('<script src="js/app.js" defer></script>', "<script>" + fs.readFileSync(path.join(base, "js/app.js"), "utf8") + "</script>");

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    url: "file://" + base + "/index.html",
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = fakeContext;
      window.matchMedia =
        window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
    }
  });

  const { window } = dom;
  await new Promise((r) => setTimeout(r, 150));

  const doc = window.document;
  const results = [];
  const check = (name, actual, expected) => {
    const ok = String(actual).trim() === String(expected).trim();
    results.push((ok ? "PASS " : "FAIL ") + name + " -> " + actual + (ok ? "" : " (expected " + expected + ")"));
  };

  // keypad exists
  check("keypad button count", doc.querySelectorAll("#keys button").length, 54);

  // core arithmetic
  check("sin(30)+sqrt(16) [DEG]", typeExpr(doc, "sin(30)+√(16)"), "4.5");
  check("factorial 5!", typeExpr(doc, "5!"), "120");
  check("power 2^10", typeExpr(doc, "2^10"), "1024");
  check("percent 45%", typeExpr(doc, "45%"), "0.45");
  check("implicit multiply 2pi", typeExpr(doc, "2π"), "6.283185307");
  check("nCr(5,2)", typeExpr(doc, "nCr(5,2)"), "10");
  check("sqrt negative", typeExpr(doc, "√(-1)"), "Syntax / Math ERROR");
  check("scientific notation 1e5", typeExpr(doc, "1e5"), "100000");
  check("bad char rejected", typeExpr(doc, "alert(1)"), "Syntax / Math ERROR");

  // Ans chaining
  typeExpr(doc, "2+3");
  check("Ans after 2+3", typeExpr(doc, "Ans*2"), "10");

  // angle mode toggle
  clickText(doc, "p-calc", "DEG");
  check("sin(30) in RAD", typeExpr(doc, "sin(30)"), "-0.9880316241");
  clickText(doc, "p-calc", "RAD");
  check("back to DEG", typeExpr(doc, "sin(30)"), "0.5");

  // history
  const histRows = doc.querySelectorAll("#hl .hist-row").length;
  check("history has rows", histRows > 0, true);

  // matrix: default identity 2x2, det A = 1, A*B = identity
  doc.getElementById("ar").value = "2";
  doc.getElementById("ac").value = "2";
  doc.getElementById("ar").dispatchEvent(new window.Event("change"));
  clickText(doc, "mops", "det A");
  check("det of 2x2 identity", doc.querySelector("#mout pre").textContent, "det A = 1");

  // matrix inputs are identity by default
  const aInputs = [...doc.querySelectorAll("#gA input")].map((i) => i.value);
  check("identity grid values", aInputs.join(","), "1,0,0,1");

  // statistics
  doc.getElementById("sx").value = "12, 15, 18, 22, 25, 30";
  doc.getElementById("sy").value = "20, 24, 29, 35, 41, 47";
  clickText(doc, "p-st", "Calculate");
  const stats = doc.getElementById("sout").textContent;
  check("stats n", /n = 6/.test(stats), true);
  check("stats mean", /Mean x̄ = 20\.33333333/.test(stats), true);
  check("stats regression", /B = 1\.543674699/.test(stats), true);

  // quadratic x^2-3x+2 -> roots 2 and 1
  clickText(doc, "p-eq", "Solve");
  const quad = doc.getElementById("qo").textContent;
  check("quadratic roots", /x₁ = 2/.test(quad) && /x₂ = 1/.test(quad), true);

  // simultaneous 2x+y=5, x-y=1 -> x=2 y=1
  const simButtons = [...doc.querySelectorAll("#p-eq button")].filter((b) => b.textContent === "Solve");
  simButtons[1].click();
  check("simultaneous", doc.getElementById("so").textContent.replace(/\s+/g, " "), "x = 2 y = 1");

  // base conversion
  [...doc.querySelectorAll("#p-eq button")].find((b) => b.textContent === "Convert").click();
  check("base 255 hex", /HEX FF/.test(doc.getElementById("bo").textContent), true);

  // integral of x^2 from 0 to 3 = 9
  [...doc.querySelectorAll("#p-tl button")].find((b) => b.textContent.includes("∫")).click();
  check("integral x^2 0..3", doc.getElementById("co").textContent, "∫ f(x)dx = 9");

  // derivative of x^2 at 0 = 0
  [...doc.querySelectorAll("#p-tl button")].find((b) => b.textContent.includes("d/dx")).click();
  check("derivative at 0", doc.getElementById("co").textContent, "f′(0) = 0");

  // polynomial roots x^3-6x^2+11x-6 -> 1,2,3
  [...doc.querySelectorAll("#p-tl button")].find((b) => b.textContent === "Solve").click();
  const poly = doc.getElementById("po").textContent.split("\n").map((l) => l.split("= ")[1]).sort();
  check("cubic roots", poly.join(","), "1,2,3");

  // complex (3+4i)*(1-2i) = 11-2i
  [...doc.querySelectorAll("#p-tl button")].find((b) => b.textContent === "×").click();
  check("complex multiply", doc.getElementById("zo").textContent.split("\n")[0], "11 − 2i");

  // vectors dot [1,2,3].[4,5,6] = 32
  [...doc.querySelectorAll("#p-tl button")].find((b) => b.textContent.includes("Dot")).click();
  check("vector dot", doc.getElementById("vo").textContent.split("\n")[0], "A·B = 32");

  // unit conversion 1 m -> km
  [...doc.querySelectorAll("#p-tl button")].find((b) => b.textContent === "Convert").click();
  check("unit m->km", doc.getElementById("uo").textContent, "1 m = 0.001 km");

  // study helper
  doc.getElementById("q").value = "how do I compute standard deviation?";
  doc.getElementById("send").click();
  const bubbles = doc.querySelectorAll("#chat .m.a");
  check("helper replied", /Statistics tab/.test(bubbles[bubbles.length - 1].textContent), true);

  // tabs
  [...doc.querySelectorAll("#tabs button")].find((b) => b.textContent === "Graph").click();
  check("graph panel visible", !doc.getElementById("p-gr").classList.contains("hide"), true);
  check("calc panel hidden", doc.getElementById("p-calc").classList.contains("hide"), true);

  console.log(results.join("\n"));
  console.log("\nJS errors:", errors.length ? errors.join("\n") : "none");
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log("\nSUMMARY:", results.length - failed, "passed,", failed, "failed");
  process.exit(failed ? 1 : 0);
})();
