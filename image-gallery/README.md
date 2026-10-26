# Image Gallery

A responsive photo gallery built with vanilla HTML, CSS and JavaScript for the **CodeAlpha** frontend internship (Task 01).

The gallery ships with a curated catalogue of 32 Indian landmarks, landscapes, festivals, food, architecture, wildlife, beaches and cultural subjects. Each photo is loaded on demand from the public [Wikimedia Commons](https://commons.wikimedia.org) API — there are no bundled image files and no API key.

**[Open the gallery](./index.html)**

## Features

| Feature | Notes |
|---|---|
| Category filters | Built automatically from the catalogue, so adding a category needs no HTML changes |
| Live search | Debounced (200 ms), matches titles and categories, case insensitive |
| Favourites | Saved to `localStorage` and filterable with the ❤️ Favs button |
| Shuffle | Fisher–Yates shuffle; double-click the button to restore the original order |
| Light / dark theme | Follows `prefers-color-scheme` on first visit, then remembers your choice |
| Lightbox | Larger preview, description, source link and a download button |
| Lazy loading | The first 8 images load eagerly, the rest only when scrolled near |
| Graceful failures | Placeholder + "Try again" button when a photo cannot be fetched |
| Keyboard support | `Esc` closes the lightbox and focus returns to the card you came from |
| Reduced motion | Animations are switched off when the OS asks for it |

## How it works

1. `js/data.js` holds the catalogue as plain objects: `{ category, items: [[title, query, description], …] }`.
2. `js/app.js` flattens that into a list of photos and renders one card per photo.
3. For each card the app calls the Commons API:

   ```
   https://commons.wikimedia.org/w/api.php
     ?action=query&generator=search&gsrsearch=<query>&gsrnamespace=6
     &gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json
   ```

   The first result that carries an image URL is used. Results are cached per search phrase, so scrolling or re-filtering never repeats a request, and every request is aborted after 12 seconds.

## Project structure

```
image-gallery/
├── index.html          # markup only
├── css/
│   └── styles.css      # design tokens, layout, theming, responsive rules
├── js/
│   ├── data.js         # the photo catalogue
│   └── app.js          # rendering, filters, favourites, lightbox, theme
└── README.md
```

## Running it

```bash
# from the repository root
npm run serve        # then open http://localhost:8000/image-gallery/
```

Or simply open `index.html` in a browser. Serving over HTTP is recommended because some browsers block `fetch()` from `file://` pages.

## Adding a photo

Open `js/data.js` and append a tuple to the category you want:

```js
["Sun Temple Konark", "Konark Sun Temple Odisha", "A 13th century temple in Odisha shaped like the chariot of the sun god."]
```

The title becomes the card heading, the second value is the Commons search phrase and the third is the description shown in the lightbox.

## Testing

```bash
npm install     # jsdom, test-only
npm run test:gallery
```

The test boots the real page in jsdom with a stubbed Commons response and asserts that 32 cards render, that category filters, search, empty states, favourites, theme persistence, the lightbox and `Esc` all behave (25 checks).

## Known limitations

- Photos require an internet connection; offline you will see the placeholder state.
- Image quality and relevance depend on what Wikimedia Commons returns for each search phrase.
- Image licences belong to their original authors — check the source link before reusing a photo.
- The catalogue is curated rather than user-uploaded; there is no backend or upload flow.

## Possible next steps

- Server-side caching of Commons responses so repeat visits are instant.
- A "load more" pattern instead of rendering all 32 cards at once.
- Grid/list view toggle and a sort control (A–Z, newest).

## Licence

MIT — see the [repository licence](../LICENSE).
