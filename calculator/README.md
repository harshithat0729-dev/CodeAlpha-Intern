# Calcio — Scientific Calculator

A scientific calculator that runs entirely in the browser, built with vanilla HTML, CSS and JavaScript for the **CodeAlpha** frontend internship (Task 02).

No frameworks, no build step, no backend and no API keys — every calculation happens on your device.

**[Open the calculator](./index.html)**

## Modes

| Tab | What you can do |
|---|---|
| **Calculator** | Trigonometry (DEG/RAD), logs, powers, roots, factorial, nCr/nPr, percentages, `Ans`, the M/X/Y variables, fraction ⇄ decimal toggle and a searchable history |
| **Matrix** | Up to 4×4 matrices: A+B, A−B, A×B, B×A, determinants, inverses (Gauss–Jordan) and transposes |
| **Graph** | Plot up to three functions of `x` on a canvas with grid, axes, pan by dragging and zoom |
| **Statistics** | n, Σx, Σx², mean, population and sample standard deviation, quartiles, median, min/max, plus linear regression (A, B, r, Σxy) |
| **Equations** | Quadratic roots (real and complex), 2×2 simultaneous equations, and a DEC/BIN/OCT/HEX converter |
| **More Tools** | Definite integral (Simpson's rule, 1000 intervals), numerical derivative, Σ summation, table mode, polynomial roots for any degree (Durand–Kerner), complex arithmetic, vectors (dot/cross/angle), unit conversion and physical constants |
| **Study Help** | An offline helper that explains each mode — matrices, DEG vs RAD, standard deviation, quadratics, graphs, calculus |

## Expression syntax

The calculator understands normal maths notation, so most people can just type what they mean:

```
sin(30) + √(16)       → 4.5      (in DEG mode)
5!                    → 120
2^10                  → 1024
45%                   → 0.45
nCr(5,2)              → 10
2π                    → 6.283185307
1e5                   → 100000
Ans * 2               → twice the previous answer
```

`×` and `÷`, `√(`, `∛(`, `π`, `ᴇ`, `sin⁻¹(`, `cos⁻¹(`, `tan⁻¹(`, `|x|` and `Ans` all work as typed from the keypad.

## How the expression engine works

1. **Prepare** — pretty symbols are normalised (`π` → `pi`, `×` → `*`, `x²` → `x**2`, `5!` → `fact(5)`, `2pi` → `2*pi`, implicit multiplication, and so on).
2. **Validate** — only `0-9 a-z A-Z _ + - * / ( ) . ,` survive, and every identifier must be a known maths function, `pi`, `e`, or a variable the caller declared. Anything else (`alert(1)`, `fetch(...)`) is rejected with an error instead of being evaluated.
3. **Evaluate** — the expression is compiled once with `new Function` and run with exactly those names in scope.

The same engine powers the graph, matrix, statistics and calculus tools, so `x^2/5` means the same thing everywhere.

## Project structure

```
calculator/
├── index.html          # markup for every tab
├── css/
│   └── styles.css      # design tokens, theming, keypad grid, layout
├── js/
│   └── app.js          # expression engine + all modes, organised in 11 sections
└── README.md
```

`js/app.js` is split into clearly labelled sections: helpers, expression engine, keypad and history, matrices, graph, statistics, equations, more tools, study helper, theme, boot.

## Running it

```bash
# from the repository root
npm run serve        # then open http://localhost:8000/calculator/
```

Or just open `index.html` — the calculator works from `file://` too.

## Keyboard

- `Enter` in the expression field calculates.
- `Enter` in the study helper field sends your question.
- Every button is reachable with `Tab` and has a visible focus ring.

## Testing

```bash
npm install     # jsdom, test-only
npm run test:calculator
```

The suite drives the real page in jsdom: it types expressions and clicks keys, then asserts results for arithmetic, factorials, percentages, implicit multiplication, `Ans` chaining, DEG/RAD switching, determinant and inverse, statistics and regression, quadratics, simultaneous equations, base conversion, integrals, derivatives, polynomial roots, complex numbers, vectors and unit conversion (31 checks).

## Accuracy notes

- The integral uses Simpson's rule with 1000 intervals — accurate for smooth functions, less so for functions with sharp features.
- The derivative uses a central difference with `h = 1e-5`, which is fine for display precision but not for high-precision work.
- Polynomial roots use the Durand–Kerner iteration; results are shown to 10 significant figures.
- `toPrecision(10)` is applied to every displayed number, so `0.1 + 0.2` shows `0.3` rather than `0.30000000000000004`.

## Known limitations

- The study helper answers from a built-in knowledge base; it is not a live language model. Free-form questions outside that knowledge base get a pointer to the topics it does cover.
- Matrices are limited to 4×4 and to real numbers.
- There is no unit-test coverage of canvas drawing; the graph is verified by manual inspection.

## Possible next steps

- Optional backend for a real conversational tutor, so the UI never holds a key.
- History persisted across sessions and exportable as CSV.
- Complex matrices and a step-by-step solution view for quadratics.

## Licence

MIT — see the [repository licence](../LICENSE).
