# Personal Portfolio

A single-page portfolio built with plain HTML, CSS and JavaScript for the **CodeAlpha** frontend internship (Task 03).

**[Open the portfolio](./index.html)**

## What is in it

- **Hero** — who I am, what I build, and the two links that matter (work, GitHub).
- **About** — the way I approach projects, in my own words.
- **Selected work** — TrustLens, Calcio, Image Gallery, Python mini projects and DSA notes, each with a short honest description, the tech used and a link to the code.
- **Skills** — grouped by languages, backend, frontend and practice.
- **Education** — a timeline with one entry.
- **Contact** — email, GitHub, and a slot for LinkedIn.

## Before you publish it — three placeholders to fill

I deliberately left anything I could not verify as a clearly marked placeholder rather than inventing it. Open `index.html` and search for `TODO`:

1. **Education** (in the `#education` section) — replace the degree, college, city and graduation year.
2. **LinkedIn** (in the `#contact` section) — add your profile URL and uncomment that `<a>` tag.
3. **Email** — the page currently uses `harshithat0729@gmail.com`. Change it if you would rather use another address, or remove the `mailto:` link if you do not want it public.

Everything else is content taken from the repositories: TrustLens, CodeAlpha-Intern (Calcio and Image Gallery), Python-projects and DSA.

## Design decisions

- **One accent colour, one type scale.** The page should read like a document, not a dashboard.
- **No frameworks and no build step.** The whole site is three files and loads instantly; that is itself part of the message.
- **Real states, not screenshots.** Every project card links to working code instead of an image.
- **Accessible by default.** Skip link, landmark elements, `aria-expanded` on the mobile menu, visible focus styles, and `prefers-reduced-motion` support.
- **JavaScript is optional.** Without it the page still renders and all links still work; only the mobile menu and the copyright year need it.

## Project structure

```
portfolio/
├── index.html          # all content and structure
├── css/
│   └── styles.css      # design tokens, layout, responsive rules
├── js/
│   └── main.js         # mobile nav toggle + current year
└── README.md
```

## Running it

```bash
# from the repository root
npm run serve        # then open http://localhost:8000/portfolio/
```

Or open `index.html` directly — there is no build step and nothing to install.

## Publishing with GitHub Pages

1. Push the repository (already done).
2. In GitHub: **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/` — or `/portfolio` if you move this folder to its own repository.
3. The site goes live at `https://harshithat0729-dev.github.io/CodeAlpha-Intern/portfolio/`.

## Testing

```bash
npm run test:portfolio
```

The check boots the page in jsdom and asserts that the hero, five project cards, four skill groups, education timeline and contact links all render, that every external link has `rel="noopener noreferrer"`, and that the mobile nav toggles `aria-expanded` correctly.

## Possible next steps

- A dark theme toggle, sharing the accent colour token.
- A short writing section, if I start publishing notes.
- A `resume.pdf` download button once the résumé is final.
