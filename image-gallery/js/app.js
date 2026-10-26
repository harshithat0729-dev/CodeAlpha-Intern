/**
 * image-gallery/js/app.js
 * ------------------------------------------------------------------
 * Image Gallery - interaction layer.
 *
 * Responsibilities
 *   1. Build the category filter bar from GALLERY_COLLECTIONS (data.js).
 *   2. Render photo cards and lazy-load each photo from Wikimedia Commons.
 *   3. Search, filter, shuffle and favourites (persisted in localStorage).
 *   4. Lightbox modal with keyboard support (Esc to close, focus restore).
 *   5. Light / dark theme, remembered between visits.
 *
 * The file is an IIFE so nothing leaks into the global scope.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */
  const API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
  const SOURCE_SEARCH = "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=";
  const THUMB_WIDTH = 800;
  const REQUEST_TIMEOUT_MS = 12000;
  const SEARCH_DEBOUNCE_MS = 200;
  const STORAGE_KEYS = { favourites: "gallery_favs", theme: "gallery_theme" };
  const ALL_CATEGORY = "All";

  /* ------------------------------------------------------------------ *
   * DOM references (resolved once, reused everywhere)
   * ------------------------------------------------------------------ */
  const el = {
    gallery: document.getElementById("gallery"),
    filters: document.getElementById("filters"),
    searchInput: document.getElementById("searchInput"),
    status: document.getElementById("status"),
    shuffleBtn: document.getElementById("shuffleBtn"),
    favFilterBtn: document.getElementById("favFilterBtn"),
    themeToggle: document.getElementById("themeToggle"),
    modal: document.getElementById("imageModal"),
    modalImg: document.getElementById("modalImg"),
    modalTitle: document.getElementById("modalTitle"),
    modalCategory: document.getElementById("modalCategory"),
    modalDesc: document.getElementById("modalDesc"),
    modalSourceLink: document.getElementById("modalSourceLink"),
    modalDownloadBtn: document.getElementById("modalDownloadBtn"),
    modalClose: document.getElementById("modalClose")
  };

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */
  const state = {
    activeCategory: ALL_CATEGORY,
    searchTerm: "",
    favouritesOnly: false,
    favourites: new Set(readJSON(STORAGE_KEYS.favourites, [])),
    lastFocused: null
  };

  /** Flat list of every photo, tagged with its category and a stable id. */
  const photos = GALLERY_COLLECTIONS.flatMap(function (group) {
    return group.items.map(function (item) {
      const [title, query, description] = item;
      return {
        id: slugify(title),
        title: title,
        query: query,
        description: description,
        category: group.category
      };
    });
  });

  /** Original order, kept so shuffle can be undone. */
  const originalOrder = photos.slice();

  /** query -> resolved image URL, so a photo is only fetched once. */
  const imageCache = new Map();

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  /** Read JSON from localStorage without throwing in private mode. */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  /** Write JSON to localStorage, silently ignoring quota / privacy errors. */
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* Storage is optional; the app keeps working without it. */
    }
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /** Trailing-edge debounce, used for the search box. */
  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }

  /** fetch() with a hard timeout so a slow network cannot hang a card. */
  function fetchWithTimeout(url, ms) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, ms);

    return fetch(url, { signal: controller.signal }).finally(function () {
      clearTimeout(timer);
    });
  }

  /* ------------------------------------------------------------------ *
   * Theme
   * ------------------------------------------------------------------ */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    el.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    el.themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  function initTheme() {
    const stored = readJSON(STORAGE_KEYS.theme, null);
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored || (prefersDark ? "dark" : "light"));

    el.themeToggle.addEventListener("click", function () {
      const next =
        document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      writeJSON(STORAGE_KEYS.theme, next);
    });
  }

  /* ------------------------------------------------------------------ *
   * Filters
   * ------------------------------------------------------------------ */

  function buildFilters() {
    const categories = [ALL_CATEGORY].concat(
      GALLERY_COLLECTIONS.map(function (group) {
        return group.category;
      })
    );

    el.filters.replaceChildren();

    categories.forEach(function (category) {
      const button = document.createElement("button");
      const isActive = !state.favouritesOnly && category === state.activeCategory;

      button.type = "button";
      button.className = "filter-btn" + (isActive ? " active" : "");
      button.textContent = category;
      button.setAttribute("aria-pressed", String(isActive));

      button.addEventListener("click", function () {
        state.favouritesOnly = false;
        state.activeCategory = category;
        el.favFilterBtn.classList.remove("active");
        el.favFilterBtn.setAttribute("aria-pressed", "false");
        buildFilters();
        render();
      });

      el.filters.appendChild(button);
    });
  }

  /* ------------------------------------------------------------------ *
   * Photo loading
   * ------------------------------------------------------------------ */

  /** Ask Wikimedia Commons for a thumbnail URL for one search phrase. */
  async function resolveImageUrl(photo) {
    if (imageCache.has(photo.query)) {
      return imageCache.get(photo.query);
    }

    const url = new URL(API_ENDPOINT);
    url.search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: photo.query,
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: String(THUMB_WIDTH),
      format: "json",
      origin: "*"
    }).toString();

    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      throw new Error("Image API responded with " + response.status);
    }

    const data = await response.json();
    const pages = Object.values((data.query && data.query.pages) || {});
    const match = pages.find(function (page) {
      const info = page.imageinfo && page.imageinfo[0];
      return Boolean(info && (info.thumburl || info.url));
    });

    if (!match) {
      throw new Error("No photo matched the search phrase");
    }

    const info = match.imageinfo[0];
    const imageUrl = info.thumburl || info.url;
    imageCache.set(photo.query, imageUrl);
    return imageUrl;
  }

  /** Load one photo into a card, swapping the placeholder for the image. */
  async function loadIntoCard(photo, img, placeholder) {
    try {
      const imageUrl = await resolveImageUrl(photo);
      img.src = imageUrl;
    } catch (error) {
      placeholder.classList.remove("hidden");
      placeholder.replaceChildren(
        buildPlaceholderContent("🌐", "Photo unavailable."),
        retryButton(photo, img, placeholder)
      );
      console.warn("Gallery: could not load " + photo.title, error);
    }
  }

  function retryButton(photo, img, placeholder) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "retry-btn";
    button.textContent = "Try again";
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      imageCache.delete(photo.query);
      placeholder.classList.add("hidden");
      placeholder.replaceChildren(buildPlaceholderContent("📷", "Loading photo..."));
      loadIntoCard(photo, img, placeholder);
    });
    return button;
  }

  function buildPlaceholderContent(symbol, label) {
    const fragment = document.createDocumentFragment();

    const icon = document.createElement("span");
    icon.className = "symbol";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = symbol;

    const text = document.createElement("span");
    text.textContent = label;

    fragment.append(icon, text);
    return fragment;
  }

  /* ------------------------------------------------------------------ *
   * Cards
   * ------------------------------------------------------------------ */

  function buildCard(photo, index) {
    const card = document.createElement("article");
    card.className = "card";
    card.style.animationDelay = (index % 8) * 50 + "ms";

    /* --- favourite toggle ------------------------------------------- */
    const isFavourite = state.favourites.has(photo.id);
    const favButton = document.createElement("button");
    favButton.type = "button";
    favButton.className = "fav-btn" + (isFavourite ? " active" : "");
    favButton.textContent = isFavourite ? "❤️" : "🤍";
    favButton.title = "Save to favourites";
    favButton.setAttribute("aria-pressed", String(isFavourite));
    favButton.setAttribute("aria-label", "Save " + photo.title + " to favourites");

    favButton.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleFavourite(photo.id, favButton);
    });

    /* --- image + placeholder ---------------------------------------- */
    const imageWrap = document.createElement("div");
    imageWrap.className = "image-wrap";

    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.append(buildPlaceholderContent("📷", "Loading photo..."));

    const img = document.createElement("img");
    img.alt = photo.title;
    img.loading = index < 8 ? "eager" : "lazy";
    img.decoding = "async";
    img.crossOrigin = "anonymous";

    img.addEventListener("load", function () {
      img.classList.add("loaded");
      placeholder.classList.add("hidden");
    });

    img.addEventListener("error", function () {
      img.classList.remove("loaded");
      placeholder.classList.remove("hidden");
      placeholder.replaceChildren(buildPlaceholderContent("🖼️", "Photo unavailable."));
    });

    imageWrap.append(img, placeholder);

    const open = function () {
      openModal(photo, img.src);
    };

    imageWrap.addEventListener("click", open);

    /* --- caption ----------------------------------------------------- */
    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("h3");
    title.textContent = photo.title;
    title.addEventListener("click", open);

    const category = document.createElement("span");
    category.className = "category";
    category.textContent = photo.category;

    info.append(title, category);
    card.append(favButton, imageWrap, info);

    loadIntoCard(photo, img, placeholder);

    return card;
  }

  function toggleFavourite(id, button) {
    const nowFavourite = !state.favourites.has(id);

    if (nowFavourite) {
      state.favourites.add(id);
    } else {
      state.favourites.delete(id);
    }

    button.classList.toggle("active", nowFavourite);
    button.textContent = nowFavourite ? "❤️" : "🤍";
    button.setAttribute("aria-pressed", String(nowFavourite));

    writeJSON(STORAGE_KEYS.favourites, Array.from(state.favourites));

    if (state.favouritesOnly) {
      render();
    }
  }

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */

  function visiblePhotos() {
    const term = state.searchTerm;

    return photos.filter(function (photo) {
      const inScope = state.favouritesOnly
        ? state.favourites.has(photo.id)
        : state.activeCategory === ALL_CATEGORY || photo.category === state.activeCategory;

      if (!inScope) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        photo.title.toLowerCase().includes(term) ||
        photo.category.toLowerCase().includes(term)
      );
    });
  }

  function render() {
    const list = visiblePhotos();

    if (list.length === 0) {
      el.gallery.replaceChildren(emptyState());
      el.status.textContent = "0 photos found";
      return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach(function (photo, index) {
      fragment.appendChild(buildCard(photo, index));
    });

    el.gallery.replaceChildren(fragment);
    el.status.textContent =
      "Showing " + list.length + " of " + photos.length + " photos";
  }

  function emptyState() {
    const box = document.createElement("div");
    box.className = "empty";

    if (state.favouritesOnly) {
      box.textContent = "No favourites yet. Tap the heart on a photo to save it here.";
    } else if (state.searchTerm) {
      box.textContent = 'No photos match "' + state.searchTerm + '". Try another search.';
    } else {
      box.textContent = "No photos in this category.";
    }

    return box;
  }

  /* ------------------------------------------------------------------ *
   * Lightbox
   * ------------------------------------------------------------------ */

  function openModal(photo, imageSrc) {
    state.lastFocused = document.activeElement;

    el.modalImg.src = imageSrc || "";
    el.modalImg.alt = photo.title;
    el.modalTitle.textContent = photo.title;
    el.modalCategory.textContent = photo.category;
    el.modalDesc.textContent = photo.description;

    el.modalSourceLink.href = SOURCE_SEARCH + encodeURIComponent(photo.query);
    el.modalDownloadBtn.href = imageSrc || "#";
    el.modalDownloadBtn.setAttribute("download", photo.id + ".jpg");

    el.modal.classList.add("open");
    el.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    el.modalClose.focus();
  }

  function closeModal() {
    el.modal.classList.remove("open");
    el.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (state.lastFocused && typeof state.lastFocused.focus === "function") {
      state.lastFocused.focus();
    }
  }

  /* ------------------------------------------------------------------ *
   * Wiring
   * ------------------------------------------------------------------ */

  function bindEvents() {
    el.searchInput.addEventListener(
      "input",
      debounce(function (event) {
        state.searchTerm = event.target.value.trim().toLowerCase();
        render();
      }, SEARCH_DEBOUNCE_MS)
    );

    el.favFilterBtn.addEventListener("click", function () {
      state.favouritesOnly = !state.favouritesOnly;
      el.favFilterBtn.classList.toggle("active", state.favouritesOnly);
      el.favFilterBtn.setAttribute("aria-pressed", String(state.favouritesOnly));

      if (state.favouritesOnly) {
        state.activeCategory = ALL_CATEGORY;
      }

      buildFilters();
      render();
    });

    el.shuffleBtn.addEventListener("click", function () {
      /* Fisher-Yates shuffle, in place on the working list. */
      for (let i = photos.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = photos[i];
        photos[i] = photos[j];
        photos[j] = temp;
      }
      render();
    });

    el.shuffleBtn.addEventListener("dblclick", function () {
      photos.splice.apply(photos, [0, photos.length].concat(originalOrder));
      render();
    });

    el.modalClose.addEventListener("click", closeModal);

    el.modal.addEventListener("click", function (event) {
      if (event.target === el.modal) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && el.modal.classList.contains("open")) {
        closeModal();
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  function init() {
    initTheme();
    buildFilters();
    bindEvents();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
