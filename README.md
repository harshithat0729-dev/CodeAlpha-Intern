# CodeAlpha Internship Projects

A collection of frontend projects built during my **CodeAlpha** internship. Each task lives in its own folder, ships as plain HTML, CSS and JavaScript with no build step, and comes with its own README, tests and accessibility notes.

| # | Project | What it does | Stack |
|---|---------|--------------|-------|
| 01 | [Image Gallery](./image-gallery) | A responsive photo gallery with category filters, live search, favourites, shuffle, dark mode and a lightbox. Photos are fetched on demand from Wikimedia Commons. | HTML · CSS · Vanilla JS |
| 02 | [Calcio Calculator](./calculator) | A scientific calculator with matrices, graphing, statistics, equations, calculus tools, unit conversion and an offline study helper. | HTML · CSS · Vanilla JS |
| 03 | [Portfolio](./portfolio) | A single-page personal portfolio: hero with headline numbers, about, skills, four project write-ups, certifications and awards, contact cards, plus a light/dark theme. | HTML · CSS · Vanilla JS |
| 04 | _Coming soon_ | Fourth internship task | — |

## Repository layout

```
codealpha-intern/
├── image-gallery/          # Task 01
│   ├── index.html
│   ├── css/styles.css
│   ├── js/data.js          # photo catalogue
│   ├── js/app.js           # gallery logic
│   └── README.md
├── calculator/             # Task 02
│   ├── index.html
│   ├── css/styles.css
│   ├── js/app.js           # expression engine + all calculator modes
│   └── README.md
├── portfolio/              # Task 03
│   ├── index.html
│   ├── css/styles.css
│   ├── js/main.js          # mobile nav + current year
│   └── README.md
├── tests/                  # jsdom smoke tests for both projects
├── package.json
└── LICENSE
```

## Running the projects

Both projects are static sites, so there is nothing to install or compile.

**Option 1 — just open the file**

Double-click `image-gallery/index.html` or `calculator/index.html`.

**Option 2 — serve locally (recommended)**

```bash
git clone https://github.com/harshithat0729-dev/CodeAlpha-Intern.git
cd CodeAlpha-Intern
npm run serve          # python3 -m http.server 8000
```

Then visit <http://localhost:8000/image-gallery/>, <http://localhost:8000/calculator/> or <http://localhost:8000/portfolio/>.

Serving over HTTP is recommended for the gallery because some browsers restrict `fetch()` calls from `file://` pages.

## Tests

The tests drive the real pages through [jsdom](https://github.com/jsdom/jsdom) — they click buttons, type expressions and assert on the rendered output. jsdom is the only dependency and it is only needed for testing; the projects themselves have none.

```bash
npm install     # installs jsdom
npm test        # 31 calculator + 25 gallery + 37 portfolio checks
```

Current status: **93 checks passing, 0 failing**.

## What these projects demonstrate

- Structuring a frontend project into separate HTML, CSS and JavaScript files instead of one large inline file.
- Reading data from a public API (Wikimedia Commons) with caching, timeouts and graceful error states.
- State management with `localStorage`, debounced input, and keyboard-accessible dialogs.
- A hand-written expression parser/evaluator with an allowlist so only maths functions and declared variables can run.
- Accessibility basics: semantic landmarks, ARIA labels and live regions, visible focus styles, `prefers-reduced-motion` support.
- A theme that is applied before first paint, so there is no flash of the wrong colour scheme.
- Automated smoke tests that run in CI-friendly Node without a browser.

## Roadmap

- [x] Task 01 — Image gallery
- [x] Task 02 — Scientific calculator
- [x] Task 03 — Personal portfolio
- [ ] Task 04 — to be added

## Author

**Harshitha Thummala**
GitHub: [@harshithat0729-dev](https://github.com/harshithat0729-dev)

## Licence

Released under the [MIT Licence](./LICENSE). Photos shown in the gallery are fetched from Wikimedia Commons and remain under their own licences.
