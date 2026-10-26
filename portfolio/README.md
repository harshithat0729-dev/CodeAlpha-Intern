# Personal Portfolio

A single-page portfolio for **Harshitha Thummala** — BSc. Artificial Intelligence student and Python / web developer. Built with plain HTML, CSS and JavaScript for the **CodeAlpha** frontend internship (Task 03).

**[Open the portfolio](./index.html)**

## What is on the page

| Section | Content |
|---|---|
| Hero | Name, role, one-line summary and three headline numbers (30+ Python projects, 5+ websites, 8.68 CGPA) |
| About | Background, what I have built so far, and what I am looking for — plus a facts panel with degree, college, year, CGPA and focus areas |
| Skills | Four groups: Programming, Web Development, AI & Data, Tools & Platforms |
| Projects | Lab Tracker, Calcio (calculator with AI tutor), Python AI Chatbot, Scam Message Detector — with a note on the other 30+ mini projects |
| Achievements | Certifications (Kaggle Python, Microsoft Python fundamentals, Web Blitz) and awards, plus the languages I speak |
| Contact | Email, phone and LinkedIn cards |
| Footer | Copyright with an auto-updating year |

## Features

- **Light and dark theme.** Follows `prefers-color-scheme` on the first visit, then remembers the visitor's choice in `localStorage`. An inline script in `<head>` applies the theme before first paint, so the page never flashes the wrong colours.
- **Sticky navbar** that gains a shadow once you scroll, with the active link following the section in view (`IntersectionObserver`).
- **Mobile menu** with `aria-expanded` kept in sync, closed by `Escape`, by tapping a link, or by resizing back to desktop.
- **Reveal-on-scroll** for each block, applied once per element and then unobserved. Skipped entirely when the visitor prefers reduced motion.
- **No frameworks, no build step.** Three files, zero dependencies; the only network request is the Google Font.

## Accessibility

- Skip link, `<main>` landmark, semantic `header` / `nav` / `section` / `footer` structure.
- `aria-pressed` on the theme toggle and `aria-expanded` / `aria-label` on the menu button.
- Visible focus outlines on every interactive element.
- Every external link uses `rel="noopener noreferrer"`.
- Colour tokens are defined once per theme, so contrast is easy to audit and adjust.

## Project structure

```
portfolio/
├── index.html          # all content and structure
├── css/
│   └── styles.css      # design tokens, layout, responsive rules, motion
├── js/
│   └── main.js         # theme, menu, scroll spy, reveal, footer year
└── README.md
```

## Running it

```bash
# from the repository root
npm run serve        # then open http://localhost:8000/portfolio/
```

Or just open `index.html` in a browser — there is nothing to install or compile.

## Updating the content

Everything lives in `index.html`, grouped by section comments:

- **Numbers in the hero** (`.hero-stats`) — project counts and CGPA.
- **Facts panel** (`.facts`) — degree, college, year, CGPA, focus.
- **Skills** (`#skills .cards`) — each card is one group with a `.chips` list.
- **Projects** (`#projects .projects`) — copy an `<article class="project">` block and edit the tag, title, description and chips.
- **Achievements** (`#achievements .timeline`) — add `<li><b>Title</b><span>Detail</span></li>`.
- **Contact** (`.contact-cards`) — the email, phone and LinkedIn links.

Two things worth a look before this goes public: the phone number in the contact section is visible to anyone who opens the page (remove the `tel:` card if you would rather not publish it), and the projects currently have no links — add a repository or live URL inside each `.project` block when it is ready.

## Publishing with GitHub Pages

1. Push the repository (already done).
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/` — or move this folder into its own repository and point Pages at it.
3. The site then lives at `https://harshithat0729-dev.github.io/CodeAlpha-Intern/portfolio/`.

## Testing

```bash
npm run test:portfolio
```

37 checks in jsdom: page title, hero and section structure, all four project cards, the skill and contact blocks, `rel` safety on external links, the theme toggle (flip + persist + `aria-pressed`), the mobile menu (open, `Escape`, close on link click), the reveal fallback when `IntersectionObserver` is unavailable, and the footer year.

## Possible next steps

- Add repository or live links to each project card.
- A `resume.pdf` download button in the hero.
- A short "writing" section if I start publishing notes.
