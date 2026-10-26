/**
 * calculator/js/app.js
 * ==================================================================
 * Calcio - an offline scientific calculator.
 *
 * Sections
 *   1.  Helpers and DOM references
 *   2.  Expression engine  (parse -> validate -> evaluate)
 *   3.  Calculator keypad, history and fraction display
 *   4.  Matrix tools       (add, multiply, determinant, inverse, transpose)
 *   5.  Graph plotter      (canvas, pan, zoom)
 *   6.  Statistics         (descriptive stats + linear regression)
 *   7.  Equations          (quadratic, simultaneous, base-N)
 *   8.  More tools         (integral, derivative, sigma, table, roots,
 *                           complex numbers, vectors, units, constants)
 *   9.  Study helper       (offline knowledge base)
 *   10. Theme and accent colour
 *   11. Action delegation and boot
 *
 * Everything runs in the browser: there is no backend, no API key and
 * no network request anywhere in this file.
 * ==================================================================
 */
(function () {
  "use strict";

  /* ================================================================== *
   * 1. Helpers and DOM references
   * ================================================================== */

  const $ = function (selector) {
    return document.querySelector(selector);
  };

  const byId = function (id) {
    return document.getElementById(id);
  };

  const DEGREES = true;

  /** Error type used for user-facing calculation problems. */
  class CalcError extends Error {}

  /** Numeric display: trims floating point noise, flags invalid results. */
  function fmt(value) {
    if (typeof value !== "number" || !isFinite(value)) {
      return "Math ERROR";
    }
    return String(parseFloat(value.toPrecision(10)));
  }

  function setText(id, text) {
    byId(id).textContent = text;
  }

  /* ================================================================== *
   * 2. Expression engine
   * ================================================================== */

  /** Storage for the M / X / Y variables. */
  const variables = { M: 0, X: 0, Y: 0 };

  let angleMode = DEGREES; // true = degrees, false = radians
  let lastAnswer = 0;

  /**
   * Build the maths function table for a given angle mode.
   * Trigonometric functions convert only in degree mode, so the table
   * is cached per mode instead of rebuilt on every keystroke.
   */
  const functionCache = new Map();

  function functionsFor(degrees) {
    if (functionCache.has(degrees)) {
      return functionCache.get(degrees);
    }

    const k = function () {
      return degrees ? Math.PI / 180 : 1;
    };

    const fact = function (n) {
      if (n < 0 || n % 1) {
        throw new CalcError("Factorial needs a whole number that is zero or more");
      }
      let result = 1;
      for (let i = 2; i <= n; i += 1) {
        result *= i;
      }
      return result;
    };

    const table = {
      sin: (x) => Math.sin(x * k()),
      cos: (x) => Math.cos(x * k()),
      tan: (x) => Math.tan(x * k()),
      asin: (x) => Math.asin(x) / k(),
      acos: (x) => Math.acos(x) / k(),
      atan: (x) => Math.atan(x) / k(),
      sinh: Math.sinh,
      cosh: Math.cosh,
      tanh: Math.tanh,
      log: Math.log10,
      ln: Math.log,
      sqrt: Math.sqrt,
      cbrt: Math.cbrt,
      abs: Math.abs,
      exp: Math.exp,
      fact: fact,
      C: (n, r) => fact(n) / (fact(r) * fact(n - r)),
      P: (n, r) => fact(n) / fact(n - r),
      rnd: Math.random,
      gcd: function gcd(a, b) {
        return b ? gcd(b, a % b) : a;
      }
    };

    functionCache.set(degrees, table);
    return table;
  }

  /**
   * Turn pretty calculator input into JavaScript the engine can run:
   *  π -> pi, × -> *, ÷ -> /, √( -> sqrt(, x² -> x**2, 45% -> (45/100),
   *  5! -> fact(5), 2pi -> 2*pi, and so on.
   */
  function prepare(expression) {
    return expression
      .replace(/π/g, "pi")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/√\(/g, "sqrt(")
      .replace(/∛\(/g, "cbrt(")
      .replace(/sin⁻¹\(/g, "asin(")
      .replace(/cos⁻¹\(/g, "acos(")
      .replace(/tan⁻¹\(/g, "atan(")
      .replace(/Abs\(/g, "abs(")
      .replace(/Ans/g, "(" + lastAnswer + ")")
      .replace(/(\d+\.?\d*)%/g, "($1/100)")
      .replace(/(\d+\.?\d*|\))!/g, "fact($1)")
      .replace(/nCr/g, "C")
      .replace(/nPr/g, "P")
      .replace(/ᴇ/g, "*10**")
      .replace(/(\d)e([+-]?\d)/g, "$1*10**$2")
      .replace(/\^/g, "**")
      .replace(/(\d|\))\s*(?=[a-zA-Z(])/g, "$1*")
      .replace(/\)\s*(?=\d)/g, ")*")
      .replace(/pi(?=\d)/g, "pi*");
  }

  /**
   * Evaluate a calculator expression.
   * @param {string} expression  e.g. "sin(30)+√(16)"
   * @param {object} [scope]     extra variables, e.g. { x: 2 }
   * @param {object} [options]   { degrees: boolean }
   * @returns {number}
   */
  function evaluate(expression, scope, options) {
    const settings = options || {};
    const degrees = settings.degrees === undefined ? angleMode : settings.degrees;
    const fns = functionsFor(degrees);
    const code = prepare(String(expression));

    /* Only allow characters that can legitimately appear in maths. */
    if (/[^0-9a-zA-Z_+\-*/().,\s]/.test(code)) {
      throw new CalcError("Unsupported character in the expression");
    }

    const mergedScope = Object.assign({}, variables, scope || {});
    const names = Object.keys(fns).concat(["pi", "e"], Object.keys(mergedScope));

    /*
     * Only the maths functions, the two constants and the caller's own
     * variables may appear in the expression. This keeps a stray global
     * such as alert() or fetch() from ever reaching the function body.
     */
    const allowed = new Set(names);
    const identifiers = code.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const unknown = identifiers.find((name) => !allowed.has(name));

    if (unknown) {
      throw new CalcError('Unknown name "' + unknown + '"');
    }

    /* eslint-disable-next-line no-new-func -- sandboxed by the character check above */
    const runner = new Function(
      ...names,
      '"use strict";return (' + code + ");"
    );

    return runner(
      ...Object.keys(fns).map((name) => fns[name]),
      Math.PI,
      Math.E,
      ...Object.keys(mergedScope).map((name) => mergedScope[name])
    );
  }

  /** evaluate() for inputs that must produce a usable number. */
  function evaluateNumber(expression, scope, options) {
    const value = evaluate(expression, scope, options);
    if (typeof value !== "number" || !isFinite(value)) {
      throw new CalcError("Result is not a finite number");
    }
    return value;
  }

  /* ================================================================== *
   * 3. Calculator keypad, history and fraction display
   * ================================================================== */

  const expressionInput = byId("ex");
  let showAsFraction = false;

  /** Insert text at the caret position inside the expression field. */
  function insert(text) {
    const start = expressionInput.selectionStart;
    const end = expressionInput.selectionEnd;
    const from = start === null ? expressionInput.value.length : start;
    const to = end === null ? from : end;

    expressionInput.value =
      expressionInput.value.slice(0, from) + text + expressionInput.value.slice(to);
    expressionInput.focus();
    expressionInput.setSelectionRange(from + text.length, from + text.length);
  }

  /** Refresh the result line, honouring the S⇔D fraction toggle. */
  function showResult() {
    byId("rs").textContent = showAsFraction ? toFraction(lastAnswer) : fmt(lastAnswer);
    byId("ans").textContent = "Ans = " + fmt(lastAnswer);
  }

  function calculate() {
    const expression = expressionInput.value;

    if (!expression.trim()) {
      return;
    }

    try {
      const value = evaluateNumber(expression);
      lastAnswer = value;
      showResult();
      addToHistory(expression, value);
      byId("ans").textContent = "Ans = " + fmt(value);
    } catch (error) {
      byId("rs").textContent = "Syntax / Math ERROR";
    }
  }

  /* Keypad layout: [label, insert value, style] */
  const KEYS = [
    ["sin", "sin(", "n"], ["cos", "cos(", "n"], ["tan", "tan(", "n"],
    ["sin⁻¹", "sin⁻¹(", "n"], ["cos⁻¹", "cos⁻¹(", "n"], ["tan⁻¹", "tan⁻¹(", "n"],
    ["log", "log(", "n"], ["ln", "ln(", "n"], ["√", "√(", "n"],
    ["∛", "∛(", "n"], ["x²", "^2", "n"], ["xʸ", "^", "n"],
    ["x⁻¹", "^(-1)", "n"], ["n!", "!", "n"], ["nCr", "nCr(", "n"],
    ["nPr", "nPr(", "n"], ["|x|", "Abs(", "n"], ["eˣ", "exp(", "n"],
    ["sinh", "sinh(", "n"], ["cosh", "cosh(", "n"], ["tanh", "tanh(", "n"],
    ["π", "π", "n"], ["e", "e", "n"], ["Ans", "Ans", "n"],
    ["(", "(", "n"], [")", ")", "n"], [",", ",", "n"],
    ["%", "%", "n"], ["ᴇ", "ᴇ", "n"], ["Rnd", "rnd()", "n"],
    ["M", "M", "n"], ["X", "X", "n"], ["Y", "Y", "n"],
    ["→M", "S:M", "o"], ["→X", "S:X", "o"], ["→Y", "S:Y", "o"],
    ["7", "7"], ["8", "8"], ["9", "9"], ["DEL", "DEL", "o"], ["AC", "AC", "o"], ["÷", "÷", "o"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["×", "×", "o"], ["−", "-", "o"], ["+", "+", "o"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["0", "0"], [".", "."], ["=", "=", "e"]
  ];

  function buildKeypad() {
    const keypad = byId("keys");
    const fragment = document.createDocumentFragment();

    KEYS.forEach(function (key) {
      const [label, value, style] = key;
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = label;
      button.className = style || "";
      button.setAttribute("aria-label", label);

      button.addEventListener("click", function () {
        handleKey(value);
      });

      fragment.appendChild(button);
    });

    keypad.appendChild(fragment);
  }

  function handleKey(value) {
    if (value === "AC") {
      expressionInput.value = "";
      byId("rs").textContent = "0";
      return;
    }

    if (value === "DEL") {
      expressionInput.value = expressionInput.value.slice(0, -1);
      return;
    }

    if (value === "=") {
      calculate();
      return;
    }

    if (value.indexOf("S:") === 0) {
      const name = value[2];
      variables[name] = lastAnswer;
      byId("rs").textContent = name + " = " + fmt(lastAnswer);
      return;
    }

    insert(value);
  }

  /* ---------------------------------------------------------------- *
   * History
   * ---------------------------------------------------------------- */

  const history = [];

  function addToHistory(expression, value) {
    history.unshift([expression, value]);
    renderHistory();
  }

  function renderHistory() {
    const container = byId("hl");
    const term = byId("hs").value.toLowerCase();
    container.replaceChildren();

    const matches = history.filter(function (entry) {
      return (entry[0] + " = " + fmt(entry[1])).toLowerCase().indexOf(term) !== -1;
    });

    if (matches.length === 0) {
      container.className = "mu";
      container.textContent = history.length ? "No matches" : "No history yet";
      return;
    }

    container.className = "";
    matches.forEach(function (entry) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "hist-row";
      row.textContent = entry[0] + " = " + fmt(entry[1]);
      row.addEventListener("click", function () {
        expressionInput.value = entry[0];
        byId("hp").classList.add("hide");
        byId("histBtn").setAttribute("aria-expanded", "false");
        activateTab("calc");
      });
      container.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------- *
   * Fraction display (continued fraction expansion)
   * ---------------------------------------------------------------- */

  function toFraction(value) {
    if (Number.isInteger(value)) {
      return String(value);
    }

    const sign = value < 0 ? "-" : "";
    const target = Math.abs(value);
    let numerator = 1;
    let previousNumerator = 0;
    let denominator = 0;
    let previousDenominator = 1;
    let remainder = target;

    for (let i = 0; i < 20; i += 1) {
      const whole = Math.floor(remainder);
      [numerator, previousNumerator] = [whole * numerator + previousNumerator, numerator];
      [denominator, previousDenominator] = [whole * denominator + previousDenominator, denominator];

      if (Math.abs(target - numerator / denominator) < 1e-9 * target || remainder - whole < 1e-12) {
        break;
      }
      remainder = 1 / (remainder - whole);
    }

    return denominator > 1e6 ? fmt(value) : sign + numerator + "/" + denominator;
  }

  /* ================================================================== *
   * 4. Matrix tools
   * ================================================================== */

  function readMatrix(prefix, rows, columns) {
    const inputs = document.querySelectorAll("#g" + prefix + " input");
    const values = Array.prototype.map.call(inputs, function (input) {
      return evaluateNumber(input.value);
    });

    return Array.from({ length: rows }, function (_, row) {
      return values.slice(row * columns, row * columns + columns);
    });
  }

  function matrixA() {
    return readMatrix("A", Number(byId("ar").value), Number(byId("ac").value));
  }

  function matrixB() {
    return readMatrix("B", Number(byId("br").value), Number(byId("bc").value));
  }

  function buildMatrixGrid(prefix, rows, columns) {
    const host = byId("g" + prefix);
    host.replaceChildren();

    const grid = document.createElement("div");
    grid.className = "mat";
    grid.style.gridTemplateColumns = "repeat(" + columns + ", auto)";

    for (let index = 0; index < rows * columns; index += 1) {
      const input = document.createElement("input");
      const row = Math.floor(index / columns);
      const column = index % columns;

      input.className = "f";
      input.value = row === column ? 1 : 0; // identity matrix by default
      input.setAttribute("aria-label", "Matrix " + prefix + " row " + (row + 1) + " column " + (column + 1));
      grid.appendChild(input);
    }

    host.appendChild(grid);
  }

  function rebuildMatrices() {
    buildMatrixGrid("A", Number(byId("ar").value), Number(byId("ac").value));
    buildMatrixGrid("B", Number(byId("br").value), Number(byId("bc").value));
  }

  function determinant(matrix) {
    if (matrix.length === 1) {
      return matrix[0][0];
    }

    return matrix[0].reduce(function (sum, value, column) {
      const minor = matrix.slice(1).map(function (row) {
        return row.filter(function (_, index) {
          return index !== column;
        });
      });
      return sum + (column % 2 ? -1 : 1) * value * determinant(minor);
    }, 0);
  }

  function inverse(matrix) {
    const size = matrix.length;

    if (size !== matrix[0].length) {
      throw new CalcError("A square matrix is required");
    }

    /* Gauss-Jordan elimination on [matrix | identity]. */
    const augmented = matrix.map(function (row, rowIndex) {
      const identityRow = Array.from({ length: size }, function (_, columnIndex) {
        return Number(rowIndex === columnIndex);
      });
      return row.concat(identityRow);
    });

    for (let column = 0; column < size; column += 1) {
      let pivot = column;
      for (let row = column + 1; row < size; row += 1) {
        if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
          pivot = row;
        }
      }

      if (Math.abs(augmented[pivot][column]) < 1e-12) {
        throw new CalcError("Singular matrix (no inverse exists)");
      }

      [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

      const divisor = augmented[column][column];
      augmented[column] = augmented[column].map(function (value) {
        return value / divisor;
      });

      for (let row = 0; row < size; row += 1) {
        if (row === column) {
          continue;
        }
        const factor = augmented[row][column];
        augmented[row] = augmented[row].map(function (value, index) {
          return value - factor * augmented[column][index];
        });
      }
    }

    return augmented.map(function (row) {
      return row.slice(size);
    });
  }

  function transpose(matrix) {
    return matrix[0].map(function (_, column) {
      return matrix.map(function (row) {
        return row[column];
      });
    });
  }

  function multiplyMatrices(a, b) {
    if (a[0].length !== b.length) {
      throw new CalcError("Dimensions do not match: columns of the first matrix must equal rows of the second");
    }

    return a.map(function (row) {
      return b[0].map(function (_, column) {
        return row.reduce(function (sum, value, index) {
          return sum + value * b[index][column];
        }, 0);
      });
    });
  }

  function addMatrices(a, b, sign) {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new CalcError("Both matrices must be the same size");
    }

    return a.map(function (row, rowIndex) {
      return row.map(function (value, columnIndex) {
        return value + sign * b[rowIndex][columnIndex];
      });
    });
  }

  function requireSquare(matrix, name) {
    if (matrix.length !== matrix[0].length) {
      throw new CalcError("Matrix " + name + " must be square");
    }
    return matrix;
  }

  const matrixOperations = {
    "A+B": () => addMatrices(matrixA(), matrixB(), 1),
    "A−B": () => addMatrices(matrixA(), matrixB(), -1),
    "A×B": () => multiplyMatrices(matrixA(), matrixB()),
    "B×A": () => multiplyMatrices(matrixB(), matrixA()),
    "det A": () => determinant(requireSquare(matrixA(), "A")),
    "det B": () => determinant(requireSquare(matrixB(), "B")),
    "A⁻¹": () => inverse(matrixA()),
    "B⁻¹": () => inverse(matrixB()),
    "Aᵀ": () => transpose(matrixA()),
    "Bᵀ": () => transpose(matrixB())
  };

  function renderMatrixResult(name, result) {
    const output = byId("mout");

    if (typeof result === "number") {
      const pre = document.createElement("pre");
      pre.className = "out";
      pre.textContent = name + " = " + fmt(result);
      output.replaceChildren(pre);
      return;
    }

    const table = document.createElement("table");
    result.forEach(function (row) {
      const tr = document.createElement("tr");
      row.forEach(function (value) {
        const td = document.createElement("td");
        td.textContent = fmt(value);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    output.replaceChildren(table);
  }

  function buildMatrixOperations() {
    const host = byId("mops");

    Object.keys(matrixOperations).forEach(function (name) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn g";
      button.textContent = name;

      button.addEventListener("click", function () {
        try {
          renderMatrixResult(name, matrixOperations[name]());
        } catch (error) {
          const pre = document.createElement("pre");
          pre.className = "out err";
          pre.textContent = error instanceof CalcError ? error.message : "Invalid input";
          byId("mout").replaceChildren(pre);
        }
      });

      host.appendChild(button);
    });
  }

  /* ================================================================== *
   * 5. Graph plotter
   * ================================================================== */

  const view = { x0: -10, x1: 10, y0: -6, y1: 6 };
  const CURVE_COLOURS = ["#2563eb", "#e11d48", "#16a34a"];

  function zoomGraph(factor) {
    const centreX = (view.x0 + view.x1) / 2;
    const centreY = (view.y0 + view.y1) / 2;
    const halfWidth = ((view.x1 - view.x0) * factor) / 2;
    const halfHeight = ((view.y1 - view.y0) * factor) / 2;

    view.x0 = centreX - halfWidth;
    view.x1 = centreX + halfWidth;
    view.y0 = centreY - halfHeight;
    view.y1 = centreY + halfHeight;
    drawGraph();
  }

  function panGraph(direction) {
    const shift = (view.x1 - view.x0) * 0.2 * direction;
    view.x0 += shift;
    view.x1 += shift;
    drawGraph();
  }

  function drawGraph() {
    const canvas = byId("cv");
    const width = (canvas.width = canvas.clientWidth * 2 || 1400);
    const height = (canvas.height = 640);
    const ctx = canvas.getContext("2d");
    const colour = getComputedStyle(document.body).color;

    const toX = (x) => ((x - view.x0) / (view.x1 - view.x0)) * width;
    const toY = (y) => height - ((y - view.y0) / (view.y1 - view.y0)) * height;

    ctx.clearRect(0, 0, width, height);
    ctx.font = "20px sans-serif";
    ctx.fillStyle = colour;
    ctx.strokeStyle = "rgba(128,128,128,.25)";
    ctx.lineWidth = 1;

    /* Vertical grid lines */
    const stepX = Math.pow(10, Math.floor(Math.log10((view.x1 - view.x0) / 6)));
    for (let x = Math.ceil(view.x0 / stepX) * stepX; x < view.x1; x += stepX) {
      ctx.beginPath();
      ctx.moveTo(toX(x), 0);
      ctx.lineTo(toX(x), height);
      ctx.stroke();
      ctx.fillText(Number(x.toFixed(6)), toX(x) + 3, Math.min(height - 4, Math.max(18, toY(0) + 18)));
    }

    /* Horizontal grid lines */
    const stepY = Math.pow(10, Math.floor(Math.log10((view.y1 - view.y0) / 6)));
    for (let y = Math.ceil(view.y0 / stepY) * stepY; y < view.y1; y += stepY) {
      ctx.beginPath();
      ctx.moveTo(0, toY(y));
      ctx.lineTo(width, toY(y));
      ctx.stroke();
      ctx.fillText(Number(y.toFixed(6)), Math.max(3, toX(0) + 4), toY(y) - 3);
    }

    /* Axes */
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(0), 0);
    ctx.lineTo(toX(0), height);
    ctx.moveTo(0, toY(0));
    ctx.lineTo(width, toY(0));
    ctx.stroke();

    /* Curves - always evaluated in radians */
    ["f1", "f2", "f3"].forEach(function (id, index) {
      const expression = byId(id).value.trim();
      if (!expression) {
        return;
      }

      ctx.strokeStyle = CURVE_COLOURS[index];
      ctx.lineWidth = 3;
      ctx.beginPath();

      let penDown = false;
      let previousY = 0;

      for (let px = 0; px <= width; px += 2) {
        const x = view.x0 + (px / width) * (view.x1 - view.x0);
        let y;

        try {
          y = evaluate(expression, { x: x }, { degrees: false });
        } catch (error) {
          y = NaN;
        }

        if (!isFinite(y) || (penDown && Math.abs(toY(y) - previousY) > height * 2)) {
          penDown = false;
          previousY = toY(y);
          continue;
        }

        const screenY = toY(y);
        if (penDown) {
          ctx.lineTo(px, screenY);
        } else {
          ctx.moveTo(px, screenY);
        }
        penDown = true;
        previousY = screenY;
      }

      ctx.stroke();
    });
  }

  function bindGraphDragging() {
    const canvas = byId("cv");
    let dragOrigin = null;

    canvas.addEventListener("pointerdown", function (event) {
      dragOrigin = [event.clientX, event.clientY];
    });

    window.addEventListener("pointerup", function () {
      dragOrigin = null;
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!dragOrigin) {
        return;
      }

      const rect = event.target.getBoundingClientRect();
      const deltaX = ((event.clientX - dragOrigin[0]) / rect.width) * (view.x1 - view.x0);
      const deltaY = ((event.clientY - dragOrigin[1]) / rect.height) * (view.y1 - view.y0);

      view.x0 -= deltaX;
      view.x1 -= deltaX;
      view.y0 += deltaY;
      view.y1 += deltaY;

      dragOrigin = [event.clientX, event.clientY];
      drawGraph();
    });
  }

  /* ================================================================== *
   * 6. Statistics
   * ================================================================== */

  function parseNumberList(text) {
    return text
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map(Number)
      .filter(function (value) {
        return !isNaN(value);
      });
  }

  function quantile(sorted, probability) {
    const position = (sorted.length - 1) * probability;
    const lower = Math.floor(position);
    return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
  }

  const sum = function (values) {
    return values.reduce(function (total, value) {
      return total + value;
    }, 0);
  };

  function calculateStatistics() {
    const x = parseNumberList(byId("sx").value);
    const y = parseNumberList(byId("sy").value);
    const n = x.length;

    if (n === 0) {
      setText("sout", "Please enter some values");
      return;
    }

    const mean = sum(x) / n;
    const sumSquares = sum(x.map((value) => (value - mean) ** 2));
    const sorted = x.slice().sort((a, b) => a - b);

    let report =
      "n = " + n +
      "\nΣx = " + fmt(sum(x)) +
      "\nΣx² = " + fmt(sum(x.map((value) => value * value))) +
      "\nMean x̄ = " + fmt(mean) +
      "\nPopulation σx = " + fmt(Math.sqrt(sumSquares / n)) +
      "\nSample sx = " + (n > 1 ? fmt(Math.sqrt(sumSquares / (n - 1))) : "-") +
      "\nMin = " + sorted[0] +
      "  Q1 = " + fmt(quantile(sorted, 0.25)) +
      "  Median = " + fmt(quantile(sorted, 0.5)) +
      "  Q3 = " + fmt(quantile(sorted, 0.75)) +
      "  Max = " + sorted[n - 1];

    if (y.length === n && n > 1) {
      const meanY = sum(y) / n;
      const covariance = sum(x.map((value, index) => (value - mean) * (y[index] - meanY)));
      const varianceY = sum(y.map((value) => (value - meanY) ** 2));
      const slope = covariance / sumSquares;
      const intercept = meanY - slope * mean;

      report +=
        "\n\n— Linear regression y = A + Bx —" +
        "\nA = " + fmt(intercept) +
        "\nB = " + fmt(slope) +
        "\nr = " + fmt(covariance / Math.sqrt(sumSquares * varianceY)) +
        "\nΣxy = " + fmt(sum(x.map((value, index) => value * y[index])));
    }

    setText("sout", report);
  }

  /* ================================================================== *
   * 7. Equations
   * ================================================================== */

  function solveQuadratic() {
    try {
      const a = evaluateNumber(byId("qa").value);
      const b = evaluateNumber(byId("qb").value);
      const c = evaluateNumber(byId("qc").value);

      if (a === 0) {
        setText("qo", "a must not be 0 (otherwise the equation is linear)");
        return;
      }

      const discriminant = b * b - 4 * a * c;
      let report = "Discriminant = " + fmt(discriminant) + "\n";

      if (discriminant >= 0) {
        const root = Math.sqrt(discriminant);
        report += "x₁ = " + fmt((-b + root) / (2 * a)) + "\nx₂ = " + fmt((-b - root) / (2 * a));
      } else {
        const realPart = -b / (2 * a);
        const imaginaryPart = Math.sqrt(-discriminant) / (2 * a);
        report +=
          "x₁ = " + fmt(realPart) + " + " + fmt(imaginaryPart) + "i" +
          "\nx₂ = " + fmt(realPart) + " − " + fmt(Math.abs(imaginaryPart)) + "i";
      }

      setText("qo", report);
    } catch (error) {
      setText("qo", "Invalid input");
    }
  }

  function solveSimultaneous() {
    try {
      const first = byId("s1").value.split(",").map(evaluateNumber);
      const second = byId("s2").value.split(",").map(evaluateNumber);
      const [a1, b1, c1] = first;
      const [a2, b2, c2] = second;

      const denominator = a1 * b2 - b1 * a2;

      if (Math.abs(denominator) < 1e-12) {
        setText("so", "No unique solution (the lines are parallel or identical)");
        return;
      }

      setText(
        "so",
        "x = " + fmt((c1 * b2 - b1 * c2) / denominator) +
          "\ny = " + fmt((a1 * c2 - c1 * a2) / denominator)
      );
    } catch (error) {
      setText("so", "Format: a,b,c");
    }
  }

  function convertBase() {
    const value = parseInt(byId("bn").value, Number(byId("bf").value));

    setText(
      "bo",
      isNaN(value)
        ? "Invalid number for the selected base"
        : "DEC " + value +
            "\nBIN " + value.toString(2) +
            "\nOCT " + value.toString(8) +
            "\nHEX " + value.toString(16).toUpperCase()
    );
  }

  /* ================================================================== *
   * 8. More tools
   * ================================================================== */

  const functionOfX = function (expression, x) {
    return evaluate(expression, { x: x });
  };

  function integrate() {
    try {
      const expression = byId("cf").value;
      const a = evaluateNumber(byId("ca").value);
      const b = evaluateNumber(byId("cb").value);
      const intervals = 1000; // Simpson's rule needs an even count
      const h = (b - a) / intervals;

      let total = functionOfX(expression, a) + functionOfX(expression, b);
      for (let i = 1; i < intervals; i += 1) {
        total += functionOfX(expression, a + i * h) * (i % 2 ? 4 : 2);
      }

      setText("co", "∫ f(x)dx = " + fmt((total * h) / 3));
    } catch (error) {
      setText("co", "Invalid input");
    }
  }

  function differentiate() {
    try {
      const expression = byId("cf").value;
      const a = evaluateNumber(byId("ca").value);
      const h = 1e-5;
      const derivative =
        (functionOfX(expression, a + h) - functionOfX(expression, a - h)) / (2 * h);

      setText("co", "f′(" + a + ") = " + fmt(derivative));
    } catch (error) {
      setText("co", "Invalid input");
    }
  }

  function summation() {
    try {
      const expression = byId("cf").value;
      const a = evaluateNumber(byId("ca").value);
      const b = evaluateNumber(byId("cb").value);

      let total = 0;
      for (let i = a; i <= b; i += 1) {
        total += functionOfX(expression, i);
      }

      setText("co", "Σ f(x) = " + fmt(total));
    } catch (error) {
      setText("co", "Invalid input");
    }
  }

  function buildTable() {
    try {
      const expression = byId("tf").value;
      const start = evaluateNumber(byId("t0").value);
      const end = evaluateNumber(byId("t1").value);
      const step = evaluateNumber(byId("ts").value);

      if (step <= 0 || (end - start) / step > 200) {
        throw new CalcError("Choose a positive step that produces at most 200 rows");
      }

      const table = document.createElement("table");
      const head = document.createElement("tr");
      ["x", "f(x)"].forEach(function (label) {
        const th = document.createElement("th");
        th.textContent = label;
        head.appendChild(th);
      });
      table.appendChild(head);

      for (let x = start; x <= end + 1e-9; x += step) {
        const row = document.createElement("tr");
        [fmt(x), fmt(functionOfX(expression, x))].forEach(function (text) {
          const cell = document.createElement("td");
          cell.textContent = text;
          row.appendChild(cell);
        });
        table.appendChild(row);
      }

      byId("tout").replaceChildren(table);
    } catch (error) {
      setText("tout", error instanceof CalcError ? error.message : "Invalid input");
    }
  }

  /** Durand-Kerner iteration for polynomial roots (real + complex). */
  function polynomialRoots() {
    try {
      const coefficients = byId("pc").value
        .trim()
        .split(/[\s,]+/)
        .map(Number);

      const degree = coefficients.length - 1;

      if (degree < 1 || !coefficients[0] || coefficients.some(isNaN)) {
        throw new CalcError("Invalid coefficients");
      }

      const monic = coefficients.map((value) => value / coefficients[0]).slice(1);
      const multiply = (p, q) => [
        p[0] * q[0] - p[1] * q[1],
        p[0] * q[1] + p[1] * q[0]
      ];

      let roots = Array.from({ length: degree }, function (_, index) {
        return [1.5 * Math.cos(index * 2 + 0.4), 1.5 * Math.sin(index * 2 + 0.4)];
      });

      for (let iteration = 0; iteration < 500; iteration += 1) {
        roots = roots.map(function (z, index) {
          let value = [1, 0];
          monic.forEach(function (coefficient) {
            value = multiply(value, z);
            value = [value[0] + coefficient, value[1]];
          });

          let denominator = [1, 0];
          roots.forEach(function (other, otherIndex) {
            if (otherIndex !== index) {
              denominator = multiply(denominator, [z[0] - other[0], z[1] - other[1]]);
            }
          });

          const magnitude = denominator[0] * denominator[0] + denominator[1] * denominator[1] || 1e-30;

          return [
            z[0] - (value[0] * denominator[0] + value[1] * denominator[1]) / magnitude,
            z[1] - (value[1] * denominator[0] - value[0] * denominator[1]) / magnitude
          ];
        });
      }

      setText(
        "po",
        roots
          .map(function (z, index) {
            let line = "x" + (index + 1) + " = " + fmt(z[0]);
            if (Math.abs(z[1]) > 1e-7) {
              line += (z[1] < 0 ? " − " : " + ") + fmt(Math.abs(z[1])) + "i";
            }
            return line;
          })
          .join("\n")
      );
    } catch (error) {
      setText("po", "Invalid coefficients");
    }
  }

  function complexOperation(operator) {
    try {
      const [a, b] = byId("z1").value.split(",").map(evaluateNumber);
      const [c, d] = byId("z2").value.split(",").map(evaluateNumber);

      let real;
      let imaginary;

      if (operator === "+") {
        real = a + c;
        imaginary = b + d;
      } else if (operator === "−") {
        real = a - c;
        imaginary = b - d;
      } else if (operator === "×") {
        real = a * c - b * d;
        imaginary = a * d + b * c;
      } else {
        const magnitudeSquared = c * c + d * d;
        if (magnitudeSquared === 0) {
          throw new CalcError("Cannot divide by zero");
        }
        real = (a * c + b * d) / magnitudeSquared;
        imaginary = (b * c - a * d) / magnitudeSquared;
      }

      const angleUnit = angleMode ? "°" : " rad";
      setText(
        "zo",
        fmt(real) + (imaginary < 0 ? " − " : " + ") + fmt(Math.abs(imaginary)) + "i" +
          "\n|z| = " + fmt(Math.hypot(real, imaginary)) +
          "\narg = " + fmt(Math.atan2(imaginary, real) / (angleMode ? Math.PI / 180 : 1)) + angleUnit
      );
    } catch (error) {
      setText("zo", "Format: a,b");
    }
  }

  function vectorTools() {
    try {
      const u = byId("v1").value.split(",").map(evaluateNumber);
      const v = byId("v2").value.split(",").map(evaluateNumber);

      if (u.length !== v.length) {
        throw new CalcError("Vectors must have the same length");
      }

      const dot = u.reduce((total, value, index) => total + value * v[index], 0);
      const magnitude = (vector) => Math.hypot.apply(null, vector);
      const angleUnit = angleMode ? "°" : " rad";

      let report =
        "A·B = " + fmt(dot) +
        "\n|A| = " + fmt(magnitude(u)) +
        "\n|B| = " + fmt(magnitude(v)) +
        "\nangle = " + fmt(Math.acos(dot / magnitude(u) / magnitude(v)) / (angleMode ? Math.PI / 180 : 1)) + angleUnit;

      if (u.length === 3) {
        report +=
          "\nA×B = (" +
          fmt(u[1] * v[2] - u[2] * v[1]) + ", " +
          fmt(u[2] * v[0] - u[0] * v[2]) + ", " +
          fmt(u[0] * v[1] - u[1] * v[0]) + ")";
      }

      setText("vo", report);
    } catch (error) {
      setText("vo", "Vectors must have the same length");
    }
  }

  const UNIT_GROUPS = {
    length: ["m", "km", "cm", "mm", "mi", "ft", "in"],
    mass: ["kg", "g", "lb", "oz"],
    temperature: ["°C", "°F", "K"]
  };

  const UNIT_FACTORS = {
    m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254,
    kg: 1, g: 0.001, lb: 0.45359237, oz: 0.0283495
  };

  function unitGroupOf(unit) {
    return Object.keys(UNIT_GROUPS).find(function (group) {
      return UNIT_GROUPS[group].indexOf(unit) !== -1;
    });
  }

  function convertUnit() {
    try {
      const value = evaluateNumber(byId("uv").value);
      const from = byId("uf").value;
      const to = byId("ut").value;

      if (unitGroupOf(from) !== unitGroupOf(to)) {
        throw new CalcError("Select two units of the same kind");
      }

      let result;

      if (unitGroupOf(from) === "temperature") {
        const celsius = from === "°C" ? value : from === "°F" ? ((value - 32) * 5) / 9 : value - 273.15;
        result = to === "°C" ? celsius : to === "°F" ? (celsius * 9) / 5 + 32 : celsius + 273.15;
      } else {
        result = (value * UNIT_FACTORS[from]) / UNIT_FACTORS[to];
      }

      setText("uo", value + " " + from + " = " + fmt(result) + " " + to);
    } catch (error) {
      setText("uo", error instanceof CalcError ? error.message : "Invalid input");
    }
  }

  const PHYSICAL_CONSTANTS = [
    ["c (m/s)", 299792458],
    ["g (m/s²)", 9.80665],
    ["h (J·s)", 6.62607015e-34],
    ["G", 6.6743e-11],
    ["e (C)", 1.602176634e-19],
    ["Nₐ", 6.02214076e23],
    ["k_B", 1.380649e-23],
    ["mₑ (kg)", 9.1093837e-31],
    ["R", 8.314462618]
  ];

  /* ================================================================== *
   * 9. Study helper (offline knowledge base)
   * ================================================================== */

  const HELP_TOPICS = [
    {
      test: /standard deviation|variance|\bsd\b|σ/i,
      answer:
        "Standard deviation: open the Statistics tab, paste your values and press Calculate. σx is the population SD (divides by n) and sx is the sample SD (divides by n−1). Use sx when your data is only a sample of a larger group."
    },
    {
      test: /matrix|matrices|inverse|determinant|transpose/i,
      answer:
        "Matrices: open the Matrix tab, choose the size of A and B, fill in the numbers, then tap A×B, det A, A⁻¹ and so on. An inverse exists only for a square matrix whose determinant is not zero. For A×B the columns of A must equal the rows of B."
    },
    {
      test: /\b(deg|rad|degree|degrees|radian|radians)\b/i,
      answer:
        "DEG vs RAD: DEG measures angles in degrees (a full circle is 360°) and RAD in radians (2π). Tap the DEG/RAD button before using sin, cos or tan. For example sin(30) is 0.5 in DEG but about −0.988 in RAD."
    },
    {
      test: /quadratic|roots|discriminant/i,
      answer:
        "Quadratic ax²+bx+c=0: open the Equations tab, enter a, b, c and press Solve. The discriminant b²−4ac decides the roots: positive gives two real roots, zero gives one repeated root, and negative gives a pair of complex roots."
    },
    {
      test: /fraction|decimal/i,
      answer:
        "Fractions: calculate as usual, then press S⇔D to switch the result between decimal and fraction. For example 0.75 becomes 3/4."
    },
    {
      test: /graph|plot/i,
      answer:
        "Graphs: open the Graph tab, type up to three functions of x (for example sin(x) or x^2/5) and press Plot. Drag the canvas to pan and use Zoom + / Zoom −. The graph always uses radians."
    },
    {
      test: /integral|integrat|derivative|differentiat|sigma|summation|table/i,
      answer:
        "Calculus and tables: open More Tools. Enter f(x), a and b, then use the ∫, d/dx or Σ buttons. The integral uses Simpson's rule with 1000 intervals and the derivative uses a central difference. The Table section lists f(x) across a range of x."
    },
    {
      test: /permutation|combination|ncr|npr|factorial/i,
      answer:
        "nCr counts combinations (order does not matter) and nPr counts permutations (order does). Type nCr(5,2) directly, or use the n! key for a factorial."
    },
    {
      test: /\blog\b|\bln\b|logarithm/i,
      answer:
        "log is base 10 and ln is base e. For example log(1000) = 3 and ln(e) = 1."
    },
    {
      test: /unit|convert|temperature|celsius|fahrenheit|kelvin/i,
      answer:
        "Unit conversion: open More Tools and scroll to Unit conversion. Pick a value, a source unit and a target unit, then press Convert. Length, mass and temperature are supported."
    },
    {
      test: /vector|cross|dot product/i,
      answer:
        "Vectors: open More Tools, enter both vectors as comma separated numbers and press Dot / Cross / Angle. The cross product is shown for three dimensional vectors."
    },
    {
      test: /history|previous|earlier/i,
      answer:
        "History: press 🕘 History at the top to open your recent calculations. Tap any entry to load that expression back into the calculator, or use the search box to filter."
    }
  ];

  const SUGGESTIONS = [
    "How do I find a matrix inverse?",
    "What is the difference between DEG and RAD?",
    "How do I calculate standard deviation?",
    "Solve a quadratic step by step",
    "How does the Graph tab work?"
  ];

  const FALLBACK_ANSWER =
    "I can explain standard deviation, matrices, DEG vs RAD, quadratics, fractions, graphs, calculus, permutations, units and vectors. Try rephrasing with one of those words, or tap a suggestion above.";

  function answerQuestion(question) {
    const match = HELP_TOPICS.find(function (topic) {
      return topic.test.test(question);
    });
    return match ? match.answer : FALLBACK_ANSWER;
  }

  function appendChatMessage(kind, text) {
    const bubble = document.createElement("div");
    bubble.className = "m " + kind;
    bubble.textContent = text;

    const chat = byId("chat");
    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;
    return bubble;
  }

  function askHelper() {
    const input = byId("q");
    const question = input.value.trim();

    if (!question) {
      return;
    }

    input.value = "";
    appendChatMessage("u", question);
    appendChatMessage("a", answerQuestion(question));
  }

  /* ================================================================== *
   * 10. Theme and accent colour
   * ================================================================== */

  const STORAGE = { theme: "calcio_theme", accent: "calcio_accent" };

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
      /* Preferences are a nice-to-have; ignore storage failures. */
    }
  }

  function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    byId("thL").classList.toggle("on", mode === "light");
    byId("thD").classList.toggle("on", mode === "dark");
    savePreference(STORAGE.theme, mode);
    drawGraph();
  }

  function initTheme() {
    const stored = readPreference(STORAGE.theme);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(stored || (prefersDark ? "dark" : "light"));

    const accent = readPreference(STORAGE.accent);
    if (accent) {
      document.documentElement.style.setProperty("--ac", accent);
      byId("acc").value = accent;
    }
  }

  /* ================================================================== *
   * 11. Tabs, action delegation and boot
   * ================================================================== */

  const TABS = [
    ["calc", "Calculator"],
    ["mat", "Matrix"],
    ["gr", "Graph"],
    ["st", "Statistics"],
    ["eq", "Equations"],
    ["tl", "More Tools"],
    ["ai", "Study Help"]
  ];

  function activateTab(id) {
    TABS.forEach(function (tab, index) {
      const isActive = tab[0] === id;
      byId("p-" + tab[0]).classList.toggle("hide", !isActive);
      const button = byId("tabs").children[index];
      button.classList.toggle("on", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    if (id === "gr") {
      drawGraph();
    }
  }

  function buildTabs() {
    TABS.forEach(function (tab) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = tab[1];
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", "false");
      button.addEventListener("click", function () {
        activateTab(tab[0]);
      });
      byId("tabs").appendChild(button);
    });
  }

  /** Map data-action values to their handlers. */
  const ACTIONS = {
    zoom: (value) => zoomGraph(Number(value)),
    pan: (value) => panGraph(Number(value)),
    draw: () => drawGraph(),
    stats: () => calculateStatistics(),
    quad: () => solveQuadratic(),
    sim: () => solveSimultaneous(),
    base: () => convertBase(),
    integ: () => integrate(),
    deriv: () => differentiate(),
    sigma: () => summation(),
    table: () => buildTable(),
    roots: () => polynomialRoots(),
    complex: (value) => complexOperation(value),
    vec: () => vectorTools(),
    unit: () => convertUnit()
  };

  function bindActions() {
    document.addEventListener("click", function (event) {
      const trigger = event.target.closest("[data-action]");
      if (!trigger) {
        return;
      }

      const handler = ACTIONS[trigger.dataset.action];
      if (handler) {
        handler(trigger.dataset.value);
      }
    });
  }

  function bindControls() {
    expressionInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        calculate();
      }
    });

    byId("angle").addEventListener("click", function (event) {
      angleMode = !angleMode;
      event.target.textContent = angleMode ? "DEG" : "RAD";
      event.target.setAttribute("aria-pressed", String(!angleMode));
    });

    byId("sd").addEventListener("click", function () {
      showAsFraction = !showAsFraction;
      showResult();
    });

    byId("histBtn").addEventListener("click", function () {
      const panel = byId("hp");
      const isHidden = panel.classList.toggle("hide");
      this.setAttribute("aria-expanded", String(!isHidden));
      if (!isHidden) {
        renderHistory();
        byId("hs").focus();
      }
    });

    byId("hs").addEventListener("input", renderHistory);

    byId("thL").addEventListener("click", () => setTheme("light"));
    byId("thD").addEventListener("click", () => setTheme("dark"));

    byId("acc").addEventListener("input", function (event) {
      document.documentElement.style.setProperty("--ac", event.target.value);
      savePreference(STORAGE.accent, event.target.value);
    });

    byId("send").addEventListener("click", askHelper);
    byId("q").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        askHelper();
      }
    });

    window.addEventListener("resize", function () {
      if (!byId("p-gr").classList.contains("hide")) {
        drawGraph();
      }
    });
  }

  function buildMatrixSizeSelectors() {
    ["ar", "ac", "br", "bc"].forEach(function (id) {
      const select = byId(id);
      for (let size = 1; size <= 4; size += 1) {
        select.add(new Option(size, size));
      }
      select.value = 2;
      select.addEventListener("change", rebuildMatrices);
    });
  }

  function buildUnitSelectors() {
    Object.values(UNIT_GROUPS)
      .flat()
      .forEach(function (unit) {
        byId("uf").add(new Option(unit, unit));
        byId("ut").add(new Option(unit, unit));
      });

    byId("ut").value = "km";
  }

  function buildConstantChips() {
    const host = byId("cn");

    PHYSICAL_CONSTANTS.forEach(function (constant) {
      const [name, value] = constant;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = name;
      chip.title = "Insert " + value + " into the calculator";
      chip.addEventListener("click", function () {
        activateTab("calc");
        insert("(" + String(value).replace("e+", "ᴇ").replace("e", "ᴇ") + ")");
      });
      host.appendChild(chip);
    });
  }

  function buildSuggestionChips() {
    const host = byId("chips");

    SUGGESTIONS.forEach(function (text) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = text;
      chip.addEventListener("click", function () {
        byId("q").value = text;
        askHelper();
      });
      host.appendChild(chip);
    });
  }

  function init() {
    buildTabs();
    buildKeypad();
    buildMatrixSizeSelectors();
    rebuildMatrices();
    buildMatrixOperations();
    buildUnitSelectors();
    buildConstantChips();
    buildSuggestionChips();
    bindControls();
    bindActions();
    bindGraphDragging();
    initTheme();
    activateTab("calc");
    showResult();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
