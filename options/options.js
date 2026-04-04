"use strict";

// Must match the default list in content/reddit-filter.js exactly
const DEFAULT_KEYWORDS = [
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
  "charlie kirk",
  "maga", "republican", "democrat", "gop",
  "far right", "far left", "alt right",
  "congress", "senate", "senator",
  "house of representatives",
  "white house", "oval office",
  "president",
  "supreme court", "electoral college",
  "cia", "fbi", "nsa", "tsa", "dea", "atf",
  "immigration and customs enforcement",
  "ICE",
  "ice raid",
  "ice agents",
  "pentagon", "nato",
  "doge", "department of government efficiency",
  "federal reserve",
  "america", "american",
  "united states",
  "US",
  "usa",
  "u.s.",
  "u.s.a.",
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
  "maine", "maryland", "massachusetts", "michigan", "minnesota",
  "mississippi", "missouri", "montana", "nebraska", "nevada",
  "new hampshire", "new jersey", "new mexico", "new york",
  "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
  "pennsylvania", "rhode island", "south carolina", "south dakota",
  "tennessee", "texas", "utah", "vermont", "virginia", "washington",
  "west virginia", "wisconsin", "wyoming",
  "district of columbia", "washington dc",
  "iran", "ukraine aid", "zelensky",
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
let currentKeywords = [...DEFAULT_KEYWORDS];

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const blockedCountEl    = document.getElementById("blockedCount");
const resetBtn          = document.getElementById("resetBtn");
const enabledToggle     = document.getElementById("enabledToggle");
const hideModeGroup     = document.getElementById("hideModeGroup");
const hideModeRadios    = document.querySelectorAll('input[name="hideMode"]');
const newKeywordInput   = document.getElementById("newKeyword");
const addBtn            = document.getElementById("addBtn");
const exportBtn         = document.getElementById("exportBtn");
const importBtn         = document.getElementById("importBtn");
const importFile        = document.getElementById("importFile");
const resetKeywordsBtn  = document.getElementById("resetKeywordsBtn");
const kwList            = document.getElementById("kwList");
const kwCount           = document.getElementById("kwCount");
const saveBtn           = document.getElementById("saveBtn");
const saveStatus        = document.getElementById("saveStatus");

// ---------------------------------------------------------------------------
// Load settings from storage
// ---------------------------------------------------------------------------
function loadSettings() {
  chrome.storage.sync.get(
    { keywords: DEFAULT_KEYWORDS, hideMode: "hide", enabled: true },
    ({ keywords, hideMode, enabled }) => {
      currentKeywords = [...keywords];
      enabledToggle.checked = enabled;
      setHideMode(hideMode);
      renderKeywordList();
    }
  );

  chrome.storage.local.get({ blockedCount: 0 }, ({ blockedCount }) => {
    blockedCountEl.textContent = blockedCount.toLocaleString();
  });
}

// ---------------------------------------------------------------------------
// Save settings to storage
// ---------------------------------------------------------------------------
function saveSettings() {
  const hideMode = document.querySelector('input[name="hideMode"]:checked').value;
  const enabled  = enabledToggle.checked;

  chrome.storage.sync.set(
    { keywords: currentKeywords, hideMode, enabled },
    () => {
      showSaveStatus();
    }
  );
}

function showSaveStatus() {
  saveStatus.classList.add("visible");
  setTimeout(() => saveStatus.classList.remove("visible"), 2500);
}

// ---------------------------------------------------------------------------
// Hide-mode radio UI
// ---------------------------------------------------------------------------
function setHideMode(mode) {
  hideModeRadios.forEach((r) => {
    r.checked = r.value === mode;
  });
  updateRadioStyles();
}

function updateRadioStyles() {
  const selected = document.querySelector('input[name="hideMode"]:checked')?.value;
  document.getElementById("opt-hide").classList.toggle("selected", selected === "hide");
  document.getElementById("opt-dim").classList.toggle("selected",  selected === "dim");
}

hideModeGroup.addEventListener("change", updateRadioStyles);

// ---------------------------------------------------------------------------
// Keyword list rendering
// ---------------------------------------------------------------------------
function renderKeywordList() {
  kwCount.textContent = `— ${currentKeywords.length} keyword${currentKeywords.length !== 1 ? "s" : ""}`;

  if (currentKeywords.length === 0) {
    kwList.innerHTML = '<div class="kw-empty">No keywords — posts won\'t be filtered.</div>';
    return;
  }

  kwList.innerHTML = "";
  // Show sorted copy; store original order for saving
  const sorted = [...currentKeywords].sort((a, b) => a.localeCompare(b));
  sorted.forEach((kw) => {
    const item = document.createElement("div");
    item.className = "kw-item";

    const span = document.createElement("span");
    span.textContent = kw;

    const del = document.createElement("button");
    del.textContent = "✕";
    del.title = `Remove "${kw}"`;
    del.addEventListener("click", () => {
      currentKeywords = currentKeywords.filter((k) => k !== kw);
      renderKeywordList();
    });

    item.appendChild(span);
    item.appendChild(del);
    kwList.appendChild(item);
  });
}

// ---------------------------------------------------------------------------
// Add keyword
// ---------------------------------------------------------------------------
function addKeyword() {
  const kw = newKeywordInput.value.trim().toLowerCase();
  if (!kw) return;
  if (currentKeywords.includes(kw)) {
    newKeywordInput.select();
    return;
  }
  currentKeywords.push(kw);
  newKeywordInput.value = "";
  renderKeywordList();
  // scroll the list to show the new item (it will be sorted, find its position)
  kwList.scrollTop = 0;
}

addBtn.addEventListener("click", addKeyword);
newKeywordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addKeyword();
});

// ---------------------------------------------------------------------------
// Export keywords as JSON
// ---------------------------------------------------------------------------
exportBtn.addEventListener("click", () => {
  const json = JSON.stringify(currentKeywords, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "reddit-america-blocker-keywords.json";
  a.click();
  URL.revokeObjectURL(url);
});

// ---------------------------------------------------------------------------
// Import keywords from JSON
// ---------------------------------------------------------------------------
importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      const cleaned = parsed
        .filter((x) => typeof x === "string")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
      // Merge: union of existing + imported, deduplicated
      const merged = [...new Set([...currentKeywords, ...cleaned])];
      currentKeywords = merged;
      renderKeywordList();
    } catch {
      alert("Could not import: the file must be a JSON array of strings.");
    }
    importFile.value = ""; // allow re-selecting same file
  };
  reader.readAsText(file);
});

// ---------------------------------------------------------------------------
// Restore default keywords
// ---------------------------------------------------------------------------
resetKeywordsBtn.addEventListener("click", () => {
  if (!confirm("Replace the current keyword list with the built-in defaults?")) return;
  currentKeywords = [...DEFAULT_KEYWORDS];
  renderKeywordList();
});

// ---------------------------------------------------------------------------
// Reset blocked counter
// ---------------------------------------------------------------------------
resetBtn.addEventListener("click", () => {
  if (!confirm("Reset the blocked post counter to zero?")) return;
  chrome.storage.local.set({ blockedCount: 0 }, () => {
    blockedCountEl.textContent = "0";
    chrome.runtime.sendMessage({ type: "RESET_COUNTER" }).catch(() => {});
  });
});

// ---------------------------------------------------------------------------
// Save button
// ---------------------------------------------------------------------------
saveBtn.addEventListener("click", saveSettings);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
loadSettings();
