const state = {
  manifest: null,
  items: [],
  sources: [],
  itemByAsset: new Map(),
  sourceByKey: new Map(),
  favorites: { items: [], sources: [] },
  activeTab: "items",
  detailCache: new Map(),
};

const FAVORITES_KEY = "darkloot:favorites:v1";
const MAX_ROWS = 350;

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
  const [items, sources] = await Promise.all([
    fetchJson(state.manifest.files.items),
    fetchJson(state.manifest.files.sources),
  ]);
  state.items = items.rows || [];
  state.sources = sources.rows || [];
  state.itemByAsset = new Map(state.items.map((row) => [row.itemAsset, row]));
  state.sourceByKey = new Map(state.sources.map((row) => [sourceKey(row.source, row.sourceKind), row]));
  $("dataStatus").textContent = `Current data for darkloot.net`;
  $("itemTotal").textContent = state.items.length.toLocaleString();
  $("sourceTotal").textContent = state.sources.length.toLocaleString();
  $("luckValue").textContent = String(state.manifest.luck ?? "-");
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
  return `<button class="favorite ${active ? "active" : ""}" data-fav-type="${type}" data-fav-key="${escapeHtml(key)}" title="${escapeHtml(label)}">★</button>`;
}

function renderItems() {
  const rows = filteredItems().sort((a, b) => b.dynAtLeastOneValue - a.dynAtLeastOneValue);
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
        <td class="num">${escapeHtml(row.dynAtLeastOne)}</td>
        <td class="num">${escapeHtml(row.sourceCount)}</td>
        <td><button data-open-item="${escapeHtml(row.itemAsset)}">Open</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="9">No items match these filters.</td></tr>`;
}

function renderSources() {
  const rows = filteredSources().sort((a, b) => b.bestDynValue - a.bestDynValue);
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
        <td class="num">${escapeHtml(row.bestDyn)}</td>
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
  const rows = payload.rows || [];
  const limited = rows.slice(0, 500);
  $("detailTitle").textContent = payload.source;
  $("detailMeta").textContent = `${payload.sourceKind} · ${Number(payload.total || rows.length).toLocaleString()} drop rows · ${payload.spawnLocationCount || 0} known spawns`;
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
      { label: "Chance", key: "dynAtLeastOne", num: true },
      { label: "Grade", key: "grade", num: true },
      { label: "Rolls", key: "rolls", num: true },
      { label: "Loot Table", key: "lootTable" },
    ])}
  `;
}

function renderItemDetail(payload) {
  const rows = payload.rows || [];
  const limited = rows.slice(0, 500);
  $("detailTitle").textContent = payload.item?.item || "Item";
  $("detailMeta").textContent = `${payload.item?.rarity || ""} ${payload.item?.category || ""} · ${rows.length.toLocaleString()} sources`;
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
      { label: "Best Chance", key: "chance", num: true },
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
  renderItemDetail(await detail(item.detailPath));
}

async function openSource(key) {
  const row = state.sourceByKey.get(key);
  if (!row) return;
  $("detailTitle").textContent = row.source;
  $("detailMeta").textContent = "Loading source drops...";
  $("detailContent").innerHTML = "";
  $("detailDialog").showModal();
  renderSourceDetail(await detail(row.detailPath));
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
