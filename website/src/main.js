const state = {
  manifest: null,
  items: [],
  sources: [],
  itemByAsset: new Map(),
  sourceByKey: new Map(),
  rateWeights: {},
  favorites: { items: [], sources: [] },
  activeTab: "items",
  detailCache: new Map(),
  currentLuck: 500,
  activeDetail: null,
};

const FAVORITES_KEY = "darkloot:favorites:v1";
const MAX_ROWS = 350;
const LUCK_500_SCALARS = [0.5, 0.5, 0.75, 1.0, 1.752, 2.584, 3.28, 3.705, 4.213];
const GRADE4_ANCHORS = [
  [0, 1.000],
  [13, 1.039],
  [30, 1.087],
  [50, 1.143],
  [75, 1.208],
  [100, 1.270],
  [125, 1.329],
  [157, 1.398],
  [200, 1.481],
  [250, 1.563],
  [300, 1.631],
  [350, 1.684],
  [400, 1.721],
  [450, 1.744],
  [500, 1.752],
];

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function terms(value) {
  return String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function matchesTerms(needle, haystack) {
  const parts = terms(needle);
  if (!parts.length) return true;
  const text = String(haystack || "").toLowerCase();
  return parts.every((part) => text.includes(part));
}

function sourceKey(source, kind) {
  return `${kind}::${source}`;
}

function clampLuck(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(500, parsed));
}

function luckScalar(luck, grade) {
  const safeLuck = clampLuck(luck);
  if (grade < 0 || grade >= LUCK_500_SCALARS.length) return 1;
  if (grade === 4) {
    if (safeLuck <= GRADE4_ANCHORS[0][0]) return GRADE4_ANCHORS[0][1];
    for (let index = 0; index < GRADE4_ANCHORS.length - 1; index += 1) {
      const [leftLuck, leftValue] = GRADE4_ANCHORS[index];
      const [rightLuck, rightValue] = GRADE4_ANCHORS[index + 1];
      if (leftLuck <= safeLuck && safeLuck <= rightLuck) {
        const span = rightLuck - leftLuck;
        return span <= 0 ? rightValue : leftValue + (rightValue - leftValue) * ((safeLuck - leftLuck) / span);
      }
    }
    return GRADE4_ANCHORS[GRADE4_ANCHORS.length - 1][1];
  }
  const target = LUCK_500_SCALARS[grade];
  return 1 + (target - 1) * (safeLuck / 500);
}

function gradeProbabilities(weights, luck) {
  const rates = Array.from({ length: 9 }, (_, index) => Math.max(0, Number(weights?.[index] || 0)));
  const weighted = rates.map((value, grade) => value * luckScalar(luck, grade));
  const total = weighted.reduce((sum, value) => sum + value, 0);
  return total ? weighted.map((value) => value / total) : rates.map(() => 0);
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(4)}%`;
}

function chanceValue(row, valueKey = "dynAtLeastOneValue") {
  const model = row.luckModel;
  if (!model) return Number(row[valueKey] || row.chanceValue || row.bestDynValue || 0);
  const weights = state.rateWeights[model.rateKey];
  if (!weights) return Number(row[valueKey] || row.chanceValue || row.bestDynValue || 0);
  const grade = Number(model.grade || 0);
  const rolls = Math.max(1, Number(model.rolls || 1));
  const choiceFraction = Number(model.choiceFraction || 0);
  const probs = gradeProbabilities(weights, state.currentLuck);
  const perRoll = Number(probs[grade] || 0) * choiceFraction;
  return 1 - Math.pow(Math.max(0, 1 - perRoll), rolls);
}

function chanceText(row, valueKey = "dynAtLeastOneValue", textKey = "dynAtLeastOne") {
  return row.luckModel ? percent(chanceValue(row, valueKey)) : row[textKey];
}

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "{}");
    state.favorites = {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };
  } catch {
    state.favorites = { items: [], sources: [] };
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
}

function isFavoriteItem(asset) {
  return state.favorites.items.includes(asset);
}

function isFavoriteSource(source, kind) {
  return state.favorites.sources.includes(sourceKey(source, kind));
}

function toggleFavoriteItem(asset) {
  const exists = isFavoriteItem(asset);
  state.favorites.items = exists
    ? state.favorites.items.filter((value) => value !== asset)
    : [...state.favorites.items, asset];
  saveFavorites();
  render();
}

function toggleFavoriteSource(source, kind) {
  const key = sourceKey(source, kind);
  const exists = state.favorites.sources.includes(key);
  state.favorites.sources = exists
    ? state.favorites.sources.filter((value) => value !== key)
    : [...state.favorites.sources, key];
  saveFavorites();
  render();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function optionHtml(values, label = "All") {
  return [`<option>${escapeHtml(label)}</option>`, ...values.map((value) => `<option>${escapeHtml(value)}</option>`)].join("");
}

function fillFilters() {
  const filters = state.manifest.filters || {};
  $("itemRarity").innerHTML = optionHtml(filters.rarities || []);
  $("itemCategory").innerHTML = optionHtml(filters.categories || []);
  $("itemMap").innerHTML = optionHtml(filters.maps || []);
  $("itemDiff").innerHTML = optionHtml(filters.diffs || []);
  $("sourceMap").innerHTML = optionHtml(filters.maps || []);
  $("sourceDiff").innerHTML = optionHtml(filters.diffs || []);
  const kinds = [...new Set(state.sources.map((row) => row.sourceKind).filter(Boolean))].sort();
  $("sourceKind").innerHTML = optionHtml(kinds);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function loadData() {
  loadFavorites();
  state.manifest = await fetchJson("/data/manifest.json");
  state.currentLuck = clampLuck(state.manifest.luck ?? 500);
  const [items, sources, rates] = await Promise.all([
    fetchJson(state.manifest.files.items),
    fetchJson(state.manifest.files.sources),
    fetchJson(state.manifest.files.rates),
  ]);
  state.items = items.rows || [];
  state.sources = sources.rows || [];
  state.rateWeights = rates.rows || {};
  state.itemByAsset = new Map(state.items.map((row) => [row.itemAsset, row]));
  state.sourceByKey = new Map(state.sources.map((row) => [sourceKey(row.source, row.sourceKind), row]));
  $("dataStatus").textContent = `Current data for darkloot.net`;
  $("itemTotal").textContent = state.items.length.toLocaleString();
  $("sourceTotal").textContent = state.sources.length.toLocaleString();
  $("luckInput").value = String(state.currentLuck);
  $("updatedAt").textContent = formatDate(state.manifest.generatedAt);
  fillFilters();
  render();
}

function selected(id) {
  return $(id).value || "All";
}

function itemSearchText(row) {
  return [
    row.item,
    row.itemAsset,
    row.rarity,
    row.category,
    row.source,
    row.sources?.join(" "),
    row.map,
    row.diff,
  ].join(" ");
}

function sourceSearchText(row) {
  return [
    row.source,
    row.sourceKind,
    row.topItem,
    row.maps,
    row.diffs,
    row.sourceValues?.join(" "),
  ].join(" ");
}

function filteredItems() {
  const search = $("itemSearch").value;
  const rarity = selected("itemRarity");
  const category = selected("itemCategory");
  const map = selected("itemMap");
  const diff = selected("itemDiff");
  return state.items.filter((row) => {
    if (!matchesTerms(search, itemSearchText(row))) return false;
    if (rarity !== "All" && row.rarity !== rarity) return false;
    if (category !== "All" && row.category !== category) return false;
    if (map !== "All" && !(row.maps || []).includes(map)) return false;
    if (diff !== "All" && !(row.diffs || []).includes(diff)) return false;
    return true;
  });
}

function filteredSources() {
  const search = $("sourceSearch").value;
  const map = selected("sourceMap");
  const diff = selected("sourceDiff");
  const kind = selected("sourceKind");
  return state.sources.filter((row) => {
    if (!matchesTerms(search, sourceSearchText(row))) return false;
    if (map !== "All" && !(row.mapValues || []).includes(map)) return false;
    if (diff !== "All" && !(row.diffValues || []).includes(diff)) return false;
    if (kind !== "All" && row.sourceKind !== kind) return false;
    return true;
  });
}

function rarity(value) {
  return `<span class="rarity ${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function favoriteButton(active, type, key, label) {
  return `<button class="favorite ${active ? "active" : ""}" data-fav-type="${type}" data-fav-key="${escapeHtml(key)}" title="${escapeHtml(label)}">&#9733;</button>`;
}

function renderItems() {
  const rows = filteredItems().sort((a, b) => chanceValue(b) - chanceValue(a));
  $("itemCount").textContent = `${rows.length.toLocaleString()} results`;
  const selectedRows = rows.slice(0, MAX_ROWS);
  $("itemRows").innerHTML = selectedRows.length
    ? selectedRows.map((row) => `
      <tr>
        <td>${favoriteButton(isFavoriteItem(row.itemAsset), "item", row.itemAsset, "Favorite item")}</td>
        <td>${escapeHtml(row.item)}</td>
        <td>${rarity(row.rarity)}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.map)}</td>
        <td>${escapeHtml(row.diff)}</td>
        <td class="num">${escapeHtml(chanceText(row))}</td>
        <td class="num">${escapeHtml(row.sourceCount)}</td>
        <td><button data-open-item="${escapeHtml(row.itemAsset)}">Open</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="9">No items match these filters.</td></tr>`;
}

function renderSources() {
  const rows = filteredSources().sort((a, b) => chanceValue(b, "bestDynValue") - chanceValue(a, "bestDynValue"));
  $("sourceCount").textContent = `${rows.length.toLocaleString()} results`;
  const selectedRows = rows.slice(0, MAX_ROWS);
  $("sourceRows").innerHTML = selectedRows.length
    ? selectedRows.map((row) => `
      <tr>
        <td>${favoriteButton(isFavoriteSource(row.source, row.sourceKind), "source", sourceKey(row.source, row.sourceKind), "Favorite source")}</td>
        <td>${escapeHtml(row.source)}</td>
        <td>${escapeHtml(row.sourceKind)}</td>
        <td>${escapeHtml(row.maps)}</td>
        <td>${escapeHtml(row.diffs)}</td>
        <td class="num">${escapeHtml(row.itemCount)}</td>
        <td class="num">${escapeHtml(chanceText(row, "bestDynValue", "bestDyn"))}</td>
        <td>${escapeHtml(row.topItem)}</td>
        <td><button data-open-source="${escapeHtml(sourceKey(row.source, row.sourceKind))}">Open</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="9">No sources match these filters.</td></tr>`;
}

function renderFavorites() {
  const favoriteItems = state.favorites.items.map((asset) => state.itemByAsset.get(asset)).filter(Boolean);
  $("favoriteItemRows").innerHTML = favoriteItems.length
    ? favoriteItems.map((row) => `
      <tr>
        <td>${escapeHtml(row.item)}</td>
        <td>${rarity(row.rarity)}</td>
        <td><button data-open-item="${escapeHtml(row.itemAsset)}">Open</button></td>
        <td><button data-fav-type="item" data-fav-key="${escapeHtml(row.itemAsset)}">Remove</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="4">No favorite items yet.</td></tr>`;

  const favoriteSources = state.favorites.sources.map((key) => state.sourceByKey.get(key)).filter(Boolean);
  $("favoriteSourceRows").innerHTML = favoriteSources.length
    ? favoriteSources.map((row) => `
      <tr>
        <td>${escapeHtml(row.source)}</td>
        <td>${escapeHtml(row.sourceKind)}</td>
        <td><button data-open-source="${escapeHtml(sourceKey(row.source, row.sourceKind))}">Open</button></td>
        <td><button data-fav-type="source" data-fav-key="${escapeHtml(sourceKey(row.source, row.sourceKind))}">Remove</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="4">No favorite sources yet.</td></tr>`;
}

function render() {
  renderItems();
  renderSources();
  renderFavorites();
}

async function detail(path) {
  if (!state.detailCache.has(path)) {
    state.detailCache.set(path, await fetchJson(path));
  }
  return state.detailCache.get(path);
}

function detailTable(rows, columns) {
  if (!rows.length) return `<div class="message-row">No detail rows found.</div>`;
  return `
    <div class="table-wrap compact">
      <table>
        <thead><tr>${columns.map((column) => `<th class="${column.num ? "num" : ""}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `<td class="${column.num ? "num" : ""}">${column.html ? column.html(row) : escapeHtml(row[column.key])}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSourceDetail(payload) {
  const rows = [...(payload.rows || [])].sort((a, b) => chanceValue(b) - chanceValue(a));
  const limited = rows.slice(0, 500);
  $("detailTitle").textContent = payload.source;
  $("detailMeta").textContent = `${payload.sourceKind} | ${Number(payload.total || rows.length).toLocaleString()} drop rows | ${payload.spawnLocationCount || 0} known spawns`;
  $("detailContent").innerHTML = `
    <div class="detail-toolbar">
      <span class="muted">Showing ${limited.length.toLocaleString()} of ${Number(payload.total || rows.length).toLocaleString()} highest-chance rows</span>
      <button data-fav-type="source" data-fav-key="${escapeHtml(sourceKey(payload.source, payload.sourceKind))}">
        ${isFavoriteSource(payload.source, payload.sourceKind) ? "Remove Favorite" : "Favorite Source"}
      </button>
    </div>
    ${detailTable(limited, [
      { label: "Item", key: "item" },
      { label: "Rarity", html: (row) => rarity(row.rarity) },
      { label: "Category", key: "category" },
      { label: "Maps", key: "map" },
      { label: "Difficulties", key: "diff" },
      { label: "Chance", html: (row) => escapeHtml(chanceText(row)), num: true },
      { label: "Grade", key: "grade", num: true },
      { label: "Rolls", key: "rolls", num: true },
      { label: "Loot Table", key: "lootTable" },
    ])}
  `;
}

function renderItemDetail(payload) {
  const rows = [...(payload.rows || [])].sort((a, b) => chanceValue(b, "chanceValue") - chanceValue(a, "chanceValue"));
  const limited = rows.slice(0, 500);
  $("detailTitle").textContent = payload.item?.item || "Item";
  $("detailMeta").textContent = `${payload.item?.rarity || ""} ${payload.item?.category || ""} | ${rows.length.toLocaleString()} sources`;
  $("detailContent").innerHTML = `
    <div class="detail-toolbar">
      <span class="muted">Showing ${limited.length.toLocaleString()} of ${rows.length.toLocaleString()} sources</span>
      <button data-fav-type="item" data-fav-key="${escapeHtml(payload.item?.itemAsset || "")}">
        ${isFavoriteItem(payload.item?.itemAsset) ? "Remove Favorite" : "Favorite Item"}
      </button>
    </div>
    ${detailTable(limited, [
      { label: "Source", key: "source" },
      { label: "Kind", key: "sourceKind" },
      { label: "Maps", key: "maps" },
      { label: "Difficulties", key: "diffs" },
      { label: "Best Chance", html: (row) => escapeHtml(chanceText(row, "chanceValue", "chance")), num: true },
      { label: "Spawns", key: "spawnLocationCount", num: true },
      { label: "Loot Table", key: "bestLootTable" },
    ])}
  `;
}

async function openItem(asset) {
  const item = state.itemByAsset.get(asset);
  if (!item) return;
  $("detailTitle").textContent = item.item;
  $("detailMeta").textContent = "Loading item details...";
  $("detailContent").innerHTML = "";
  $("detailDialog").showModal();
  const payload = await detail(item.detailPath);
  state.activeDetail = { type: "item", payload };
  renderItemDetail(payload);
}

async function openSource(key) {
  const row = state.sourceByKey.get(key);
  if (!row) return;
  $("detailTitle").textContent = row.source;
  $("detailMeta").textContent = "Loading source drops...";
  $("detailContent").innerHTML = "";
  $("detailDialog").showModal();
  const payload = await detail(row.detailPath);
  state.activeDetail = { type: "source", payload };
  renderSourceDetail(payload);
}

function renderActiveDetail() {
  if (!$("detailDialog").open || !state.activeDetail) return;
  if (state.activeDetail.type === "item") renderItemDetail(state.activeDetail.payload);
  if (state.activeDetail.type === "source") renderSourceDetail(state.activeDetail.payload);
}

function wireEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      $(`${state.activeTab}View`).classList.add("active");
      if (state.activeTab === "favorites") renderFavorites();
    });
  });

  ["itemSearch", "itemRarity", "itemCategory", "itemMap", "itemDiff", "sourceSearch", "sourceMap", "sourceDiff", "sourceKind"]
    .forEach((id) => $(id).addEventListener("input", render));

  $("luckInput").addEventListener("input", () => {
    const value = clampLuck($("luckInput").value);
    state.currentLuck = value;
    $("luckInput").value = String(value);
    render();
    renderActiveDetail();
  });

  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.openItem) openItem(button.dataset.openItem);
    if (button.dataset.openSource) openSource(button.dataset.openSource);
    if (button.dataset.favType === "item") toggleFavoriteItem(button.dataset.favKey);
    if (button.dataset.favType === "source") {
      const row = state.sourceByKey.get(button.dataset.favKey);
      if (row) toggleFavoriteSource(row.source, row.sourceKind);
    }
  });

  $("closeDetail").addEventListener("click", () => $("detailDialog").close());
  $("detailDialog").addEventListener("close", () => {
    state.activeDetail = null;
  });
  $("clearFavorites").addEventListener("click", () => {
    state.favorites = { items: [], sources: [] };
    saveFavorites();
    render();
  });
}

wireEvents();
loadData().catch((error) => {
  console.error(error);
  $("dataStatus").textContent = `Could not load website data: ${error.message}`;
});
