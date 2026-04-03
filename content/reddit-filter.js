"use strict";

// ---------------------------------------------------------------------------
// Default keyword list – loaded from storage on start, fully overridable
// ---------------------------------------------------------------------------
const DEFAULT_KEYWORDS = [
  // People
  "trump", "donald trump",
  "biden", "joe biden",
  "bernie sanders", "bernie",
  "kamala", "kamala harris",
  "elon musk",
  "epstein", "jeffrey epstein",
  "mike pence", "ron desantis", "desantis",
  "nancy pelosi", "pelosi",
  "pam bondi", "bondi",
  "aoc", "alexandria ocasio-cortez",
  "rand paul", "ted cruz",

  // Parties / movements
  "maga", "republican", "democrat", "gop",
  "far right", "far left", "alt right",

  // Institutions
  "congress", "senate", "senator",
  "house of representatives",
  "white house", "oval office",
  "supreme court", "electoral college",
  "cia", "fbi", "nsa", "tsa", "dea", "atf",
  "pentagon", "nato",
  "doge", "department of government efficiency",
  "federal reserve",

  // Country / geography (political context)
  "america", "american",
  "united states",
  "US",    // case-sensitive — only matches the country abbreviation, not the pronoun "us"
  "usa",   // matches "USA" — word-bounded so won't hit "kansas"
  "u.s.",  // matches "U.S." — period acts as natural delimiter
  "u.s.a.", // matches "U.S.A."

  // Countries / conflicts often in US political news
  "iran", "ukraine aid", "zelensky",

  // Policy topics
  "tariff", "tariffs", "sanctions",
  "border wall", "immigration ban",
  "gun control", "2nd amendment",
  "abortion", "roe v wade",
  "january 6", "capitol riot",
  "oil price", "gas price",
  "federal budget", "national debt",
  "obamacare", "affordable care act",
  "student loan", "student loans",
  "wall street bailout",
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let compiledPatterns = [];
let currentHideMode = "hide"; // "hide" | "dim"
let isEnabled = true;

// ---------------------------------------------------------------------------
// Pattern compilation
// ---------------------------------------------------------------------------
function compilePatterns(keywords) {
  compiledPatterns = keywords
    .map((kw) => kw.trim())
    .filter(Boolean)
    .map((kw) => {
      // Escape all regex special characters in the keyword
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Only add \b where the keyword starts/ends with a word character.
      // Keywords ending with punctuation (e.g. "u.s.") already have a
      // natural delimiter; adding \b after a non-word char is invalid.
      const leadBound  = /^\w/.test(kw) ? "\\b" : "";
      const trailBound = /\w$/.test(kw)  ? "\\b" : "";
      // Two-letter all-caps acronyms (e.g. "US", "UK") are compiled
      // case-sensitively so they don't match the pronoun "us" or similar.
      const flags = /^[A-Z]{2}$/.test(kw) ? "" : "i";
      try {
        return new RegExp(`${leadBound}${escaped}${trailBound}`, flags);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// DOM helpers — based on live Reddit structure confirmed in saved page:
//   <article data-post-id="t3_xxx" aria-label="Post title here">
//     <shreddit-post post-title="Post title here" ...>
// ---------------------------------------------------------------------------
function getPostText(article) {
  // aria-label on the article element is the fastest and most reliable source
  const ariaLabel = article.getAttribute("aria-label") || "";

  // post-title attribute on shreddit-post (same text, belt-and-braces)
  const postEl = article.querySelector("shreddit-post");
  const postTitle = postEl ? postEl.getAttribute("post-title") || "" : "";

  // Any visible flair text
  const flairEl = article.querySelector(".flair-content");
  const flair = flairEl ? flairEl.textContent : "";

  return `${ariaLabel} ${postTitle} ${flair}`;
}

function matchesAny(text) {
  return compiledPatterns.some((re) => re.test(text));
}

// ---------------------------------------------------------------------------
// Hide / dim
// ---------------------------------------------------------------------------
function applyBlock(article) {
  if (currentHideMode === "dim") {
    article.classList.add("ab-dimmed");
    article.classList.remove("ab-hidden");
  } else {
    article.classList.add("ab-hidden");
    article.classList.remove("ab-dimmed");
  }
  article.dataset.abBlocked = "1";
}

function removeBlock(article) {
  article.classList.remove("ab-hidden", "ab-dimmed");
  delete article.dataset.abBlocked;
}

// ---------------------------------------------------------------------------
// Process a single feed article; returns 1 if newly blocked, 0 otherwise
// ---------------------------------------------------------------------------
function processArticle(article) {
  if (article.dataset.abProcessed) return 0;
  article.dataset.abProcessed = "1";

  if (!isEnabled) return 0;

  const text = getPostText(article);
  if (!text.trim()) return 0;

  if (matchesAny(text)) {
    applyBlock(article);
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Community highlights carousel
// Each item: <li class="highlight-list-item">
//              <community-highlight-card id="highlight_card_t3_xxx">
//                <h2 slot="title">Post title here</h2>   ← light DOM, readable
// ---------------------------------------------------------------------------
function getHighlightText(li) {
  const h2 = li.querySelector('h2[slot="title"]');
  return h2 ? h2.textContent : "";
}

function processHighlight(li) {
  if (li.dataset.abProcessed) return 0;
  li.dataset.abProcessed = "1";

  if (!isEnabled) return 0;

  const text = getHighlightText(li);
  if (!text.trim()) return 0;

  if (matchesAny(text)) {
    applyBlock(li);
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// "Recent Posts" sidebar widget (and any other compact list-item view)
// Each post: <faceplate-tracker noun="recent_post">
//              <h3 class="i18n-list-item-post-title" title="Full title text">
// The title attribute holds the *full* untruncated title; the visible text
// may be cut off with "…" by CSS line-clamp.
// ---------------------------------------------------------------------------
function getListItemText(tracker) {
  const h3 = tracker.querySelector('h3[class*="i18n-list-item-post-title"]');
  if (!h3) return "";
  // Prefer the title attribute (full text), fall back to visible text content
  return h3.getAttribute("title") || h3.textContent;
}

function processListItem(tracker) {
  if (tracker.dataset.abProcessed) return 0;
  tracker.dataset.abProcessed = "1";

  if (!isEnabled) return 0;

  const text = getListItemText(tracker);
  if (!text.trim()) return 0;

  if (matchesAny(text)) {
    applyBlock(tracker);
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Search bar typeahead / trending dropdown
// <search-telemetry-tracker data-type="search-dropdown-item">
//   <span data-type="search-dropdown-item-label-text">Trump Iran War Address</span>
// These are freshly injected every time the dropdown opens, so processed
// markers reset naturally with the new DOM nodes.
// ---------------------------------------------------------------------------
function getDropdownItemText(tracker) {
  const el = tracker.querySelector('span[data-type="search-dropdown-item-label-text"]');
  return el ? el.textContent : "";
}

function processDropdownItem(tracker) {
  if (tracker.dataset.abProcessed) return 0;
  tracker.dataset.abProcessed = "1";

  if (!isEnabled) return 0;

  const text = getDropdownItemText(tracker);
  if (!text.trim()) return 0;

  if (matchesAny(text)) {
    applyBlock(tracker);
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Search results page
// Each item: <search-telemetry-tracker data-testid="search-sdui-post" data-thingid="t3_xxx">
//   <a data-testid="post-title" aria-label="Title">  ← aria-label has the title
//   <a data-testid="post-title-text">Title text</a>  ← visible title text
// ---------------------------------------------------------------------------
function getSearchPostText(tracker) {
  // aria-label on the invisible accessible link is the fastest source
  const titleLink = tracker.querySelector('a[data-testid="post-title"]');
  const ariaLabel = titleLink ? titleLink.getAttribute("aria-label") || "" : "";

  // Visible title text as fallback
  const titleText = tracker.querySelector('a[data-testid="post-title-text"]');
  const visibleText = titleText ? titleText.textContent : "";

  // Snippet / description preview — stored in the tracking-context JSON
  // as search.snippet.  This is reliable and avoids depending on fragile
  // utility-class selectors that Reddit could rename at any time.
  let snippet = "";
  try {
    const raw = tracker.getAttribute("data-faceplate-tracking-context");
    if (raw) snippet = JSON.parse(raw)?.search?.snippet ?? "";
  } catch { /* ignore malformed JSON */ }

  return `${ariaLabel} ${visibleText} ${snippet}`;
}

function processSearchPost(tracker) {
  if (tracker.dataset.abProcessed) return 0;
  tracker.dataset.abProcessed = "1";

  if (!isEnabled) return 0;

  const text = getSearchPostText(tracker);
  if (!text.trim()) return 0;

  if (matchesAny(text)) {
    applyBlock(tracker);
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Scan all unprocessed posts on the page
// (feed articles + highlights carousel + search results)
// ---------------------------------------------------------------------------
function scanAll() {
  if (!isEnabled) return;

  let newBlocked = 0;

  // Main feed: <article data-post-id="...">
  document
    .querySelectorAll("article[data-post-id]:not([data-ab-processed])")
    .forEach((a) => { newBlocked += processArticle(a); });

  // Community highlights carousel: <li class="highlight-list-item">
  document
    .querySelectorAll("li.highlight-list-item:not([data-ab-processed])")
    .forEach((li) => { newBlocked += processHighlight(li); });

  // "Recent Posts" sidebar / compact list view: <faceplate-tracker noun="recent_post">
  document
    .querySelectorAll('faceplate-tracker[noun="recent_post"]:not([data-ab-processed])')
    .forEach((t) => { newBlocked += processListItem(t); });

  // Search results — two formats both use view-events="search/view/post":
  //   Format 1: <search-telemetry-tracker data-testid="search-sdui-post" ...>
  //   Format 2: <search-telemetry-tracker view-events="search/view/post" ...>  (no data-testid)
  document
    .querySelectorAll('search-telemetry-tracker[view-events="search/view/post"]:not([data-ab-processed])')
    .forEach((t) => { newBlocked += processSearchPost(t); });

  // Search bar typeahead/trending — light DOM (search/results pages)
  document
    .querySelectorAll('search-telemetry-tracker[data-type="search-dropdown-item"]:not([data-ab-processed])')
    .forEach((t) => { newBlocked += processDropdownItem(t); });

  // Search bar typeahead — shadow DOM inside <reddit-search-large>
  // The entire search bar dropdown is inside that element's shadow root,
  // so document.querySelectorAll() can't reach it without piercing the root.
  newBlocked += scanSearchBarShadowRoot();

  if (newBlocked > 0) {
    // Fire-and-forget; service worker may be sleeping — ignore the error
    chrome.runtime.sendMessage({ type: "POSTS_BLOCKED", count: newBlocked }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Re-scan everything (used when settings change while page is open)
// ---------------------------------------------------------------------------
function rescanAll() {
  const lightDomSelector =
    'article[data-post-id], li.highlight-list-item, ' +
    'faceplate-tracker[noun="recent_post"], ' +
    'search-telemetry-tracker[view-events="search/view/post"], ' +
    'search-telemetry-tracker[data-type="search-dropdown-item"]';

  document.querySelectorAll(lightDomSelector).forEach((el) => {
    delete el.dataset.abProcessed;
    removeBlock(el);
  });

  // Also clear anything in the search bar shadow root
  const searchEl =
    document.querySelector("reddit-search-large") ||
    document.querySelector("reddit-search-small");
  if (searchEl && searchEl.shadowRoot) {
    searchEl.shadowRoot
      .querySelectorAll("search-telemetry-tracker[data-ab-processed]")
      .forEach((el) => {
        delete el.dataset.abProcessed;
        removeBlock(el);
      });
  }

  scanAll();
}

// ---------------------------------------------------------------------------
// Inject CSS classes into the page
// ---------------------------------------------------------------------------
function injectStyles() {
  if (document.getElementById("ab-styles")) return;
  const style = document.createElement("style");
  style.id = "ab-styles";
  style.textContent = `
    .ab-hidden { display: none !important; }
    .ab-dimmed  {
      opacity: 0.08 !important;
      filter: blur(4px) !important;
      pointer-events: none !important;
      user-select: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// ---------------------------------------------------------------------------
// Shadow-root scanning — reddit-search-large keeps its whole dropdown inside
// a shadow root, which document.querySelectorAll() cannot pierce.
// ---------------------------------------------------------------------------
let searchBarShadowObserverSet = false;

function scanSearchBarShadowRoot() {
  // Reddit uses reddit-search-large on desktop; reddit-search-small on mobile
  const searchEl =
    document.querySelector("reddit-search-large") ||
    document.querySelector("reddit-search-small");

  if (!searchEl || !searchEl.shadowRoot) return 0;

  // Lazily attach a MutationObserver to the shadow root the first time we find it
  if (!searchBarShadowObserverSet) {
    searchBarShadowObserverSet = true;
    const shadowObs = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanAll, 150);
    });
    shadowObs.observe(searchEl.shadowRoot, { childList: true, subtree: true });
  }

  let newBlocked = 0;
  searchEl.shadowRoot
    .querySelectorAll(
      'search-telemetry-tracker[data-type="search-dropdown-item"]:not([data-ab-processed])'
    )
    .forEach((t) => { newBlocked += processDropdownItem(t); });
  return newBlocked;
}

// ---------------------------------------------------------------------------
// MutationObserver — handles infinite scroll and SPA navigation
// ---------------------------------------------------------------------------
let debounceTimer = null;

function observeDOM() {
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanAll, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ---------------------------------------------------------------------------
// React to settings changes made in the options page while Reddit is open
// ---------------------------------------------------------------------------
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  let needsRescan = false;

  if (changes.keywords) {
    compilePatterns(changes.keywords.newValue ?? DEFAULT_KEYWORDS);
    needsRescan = true;
  }
  if (changes.hideMode) {
    currentHideMode = changes.hideMode.newValue ?? "hide";
    needsRescan = true;
  }
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue ?? true;
    if (!isEnabled) {
      // Reveal everything that was hidden (feed + carousel + search results + dropdown)
      const lightDomBlocked =
        'article[data-post-id][data-ab-blocked], ' +
        'li.highlight-list-item[data-ab-blocked], ' +
        'faceplate-tracker[noun="recent_post"][data-ab-blocked], ' +
        'search-telemetry-tracker[view-events="search/view/post"][data-ab-blocked], ' +
        'search-telemetry-tracker[data-type="search-dropdown-item"][data-ab-blocked]';

      document.querySelectorAll(lightDomBlocked).forEach((el) => {
        removeBlock(el);
        delete el.dataset.abProcessed;
      });

      // Also reveal shadow-root dropdown items
      const searchEl =
        document.querySelector("reddit-search-large") ||
        document.querySelector("reddit-search-small");
      if (searchEl && searchEl.shadowRoot) {
        searchEl.shadowRoot
          .querySelectorAll("search-telemetry-tracker[data-ab-blocked]")
          .forEach((el) => {
            removeBlock(el);
            delete el.dataset.abProcessed;
          });
      }
    } else {
      needsRescan = true;
    }
  }

  if (needsRescan && isEnabled) rescanAll();
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
chrome.storage.sync.get(
  { keywords: DEFAULT_KEYWORDS, hideMode: "hide", enabled: true },
  ({ keywords, hideMode, enabled }) => {
    isEnabled = enabled;
    currentHideMode = hideMode;
    compilePatterns(keywords);
    injectStyles();
    scanAll();
    observeDOM();
  }
);
