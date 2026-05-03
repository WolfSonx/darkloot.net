const state = {
  manifest: null,
  items: [],
  sources: [],
  itemByAsset: new Map(),
  sourceByKey: new Map(),
  rateWeights: {},
  favorites: { items: [], sources: [] },
  chipPopover: { target: null, pinned: false },
  activeTab: "items",
  detailCache: new Map(),
  currentLuck: 0,
  activeDetail: null,
  sort: {
    items: { key: "item", direction: "asc" },
    sources: { key: "source", direction: "asc" },
  },
};

const FAVORITES_KEY = "darkloot:favorites:v1";
const MAX_ROWS = 500;
const RARITY_ORDER = ["Junk", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Unique", "Artifact"];
const DEFAULT_SORT_DIRECTION = {
  sources: "desc",
  items: "desc",
};
const DEFAULT_DIFFICULTY = "High Roller";
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
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function matchesSearchParts(parts, haystack) {
  const textParts = terms(haystack);
  return parts.every((part) => textParts.some((textPart) => textPart.startsWith(part)));
}

function matchesAnySearchGroup(needle, groups) {
  const parts = terms(needle);
  if (!parts.length) return true;
  return groups.some((group) => {
    const text = group.filter(Boolean).join(" ");
    return matchesSearchParts(parts, text);
  });
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

function baseChanceValue(row) {
  return Number(
    row.luckModel?.baseAtLeastOneValue
    ?? row.baseAtLeastOneValue
    ?? row.chanceValue
    ?? row.dynAtLeastOneValue
    ?? row.bestDynValue
    ?? 0
  );
}

function baseChanceText(row) {
  return percent(baseChanceValue(row));
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

function setSelectIfAvailable(id, value) {
  const select = $(id);
  if ([...select.options].some((option) => option.value === value)) select.value = value;
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
  setSelectIfAvailable("itemDiff", DEFAULT_DIFFICULTY);
  setSelectIfAvailable("sourceDiff", DEFAULT_DIFFICULTY);
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
  state.currentLuck = clampLuck(state.manifest.luck ?? 0);
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
  $("dataStatus").textContent = "";
  $("luckInput").value = String(state.currentLuck);
  $("updatedAt").textContent = formatDate(state.manifest.generatedAt);
  fillFilters();
  render();
}

function selected(id) {
  return $(id).value || "All";
}

function itemSearchGroups(row) {
  return [
    [row.item, row.itemAsset, row.rarity, row.category],
    [row.source, row.sources?.join(" ")],
    [row.map, row.maps?.join(" "), row.diff, row.diffs?.join(" ")],
  ];
}

function sourceSearchGroups(row) {
  return [
    [row.source, row.sourceKind, row.sourceValues?.join(" ")],
    [row.topItem],
    [row.maps, row.mapValues?.join(" "), row.diffs, row.diffValues?.join(" ")],
  ];
}

function sourceDetailSearchGroups(row) {
  return [
    [row.item, row.itemAsset, row.rarity, row.category],
    [row.map, row.maps?.join(" "), row.diff, row.diffs?.join(" ")],
    [row.lootTable, row.rateTable, row.rateTables?.join(" ")],
    [row.grade, row.rolls, row.itemCount],
  ];
}

function itemDetailSearchGroups(row) {
  return [
    [row.source, row.sourceKind, row.sourceValues?.join(" ")],
    [row.bestLootTable, row.bestRateTable, row.bestGroup],
    [row.maps, row.mapValues?.join(" "), row.diffs, row.diffValues?.join(" "), row.bestMap, row.bestDiff],
  ];
}

function filteredItems() {
  const search = $("itemSearch").value;
  const rarity = selected("itemRarity");
  const category = selected("itemCategory");
  const map = selected("itemMap");
  const diff = selected("itemDiff");
  return state.items.filter((row) => {
    if (!matchesAnySearchGroup(search, itemSearchGroups(row))) return false;
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
    if (!matchesAnySearchGroup(search, sourceSearchGroups(row))) return false;
    if (map !== "All" && !(row.mapValues || []).includes(map)) return false;
    if (diff !== "All" && !(row.diffValues || []).includes(diff)) return false;
    if (kind !== "All" && row.sourceKind !== kind) return false;
    return true;
  });
}

function rarity(value) {
  return `<span class="rarity ${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function splitValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function chipClass(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function encodedChipValues(values) {
  return encodeURIComponent(JSON.stringify(values));
}

function chips(value, className, limit = 5) {
  const values = splitValues(value);
  if (!values.length) return "";
  const visible = values.slice(0, limit);
  const hidden = values.slice(limit);
  const hiddenLabel = hidden.join(", ");
  return `
    <span class="chip-list">
      ${visible.map((item) => `<span class="chip ${className} ${className}-${chipClass(item)}">${escapeHtml(item)}</span>`).join("")}
      ${hidden.length > 0 ? `<button type="button" class="chip more-chip" data-more-values="${escapeHtml(encodedChipValues(hidden))}" title="${escapeHtml(hiddenLabel)}" aria-label="${escapeHtml(`Show ${hidden.length} more: ${hiddenLabel}`)}">+${hidden.length}</button>` : ""}
    </span>
  `;
}

function chipPopoverElement() {
  let popover = $("chipPopover");
  if (!popover) {
    popover = document.createElement("div");
    popover.id = "chipPopover";
    popover.className = "chip-popover";
    popover.setAttribute("role", "tooltip");
    popover.hidden = true;
    document.body.appendChild(popover);
  }
  return popover;
}

function chipPopoverValues(target) {
  try {
    const values = JSON.parse(decodeURIComponent(target.dataset.moreValues || "[]"));
    return Array.isArray(values) ? values.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function positionChipPopover(target, popover) {
  const margin = 8;
  const rect = target.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  let top = rect.bottom + margin;
  if (top + popoverRect.height > window.innerHeight - margin) {
    top = rect.top - popoverRect.height - margin;
  }
  const left = Math.min(
    Math.max(margin, rect.left),
    Math.max(margin, window.innerWidth - popoverRect.width - margin),
  );
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.max(margin, top)}px`;
}

function showChipPopover(target, pinned = false) {
  const values = chipPopoverValues(target);
  if (!values.length) return;
  hideChipPopover(true);
  const popover = chipPopoverElement();
  popover.innerHTML = values.map((value) => `<span>${escapeHtml(value)}</span>`).join("");
  popover.hidden = false;
  target.classList.add("open");
  state.chipPopover = { target, pinned };
  requestAnimationFrame(() => positionChipPopover(target, popover));
}

function hideChipPopover(force = false) {
  if (state.chipPopover.pinned && !force) return;
  state.chipPopover.target?.classList.remove("open");
  state.chipPopover = { target: null, pinned: false };
  const popover = $("chipPopover");
  if (popover) popover.hidden = true;
}

function toggleChipPopover(target) {
  if (state.chipPopover.target === target && state.chipPopover.pinned) {
    hideChipPopover(true);
    return;
  }
  showChipPopover(target, true);
}

function kindChip(value) {
  return chips([value], "kind-chip", 1);
}

function categoryChip(value) {
  return chips([value], "category-chip", 1);
}

function sourceLookupKey(row) {
  const direct = sourceKey(row.source, row.sourceKind);
  if (state.sourceByKey.has(direct)) return direct;
  for (const source of row.sourceValues || []) {
    const key = sourceKey(source, row.sourceKind);
    if (state.sourceByKey.has(key)) return key;
  }
  return direct;
}

function listText(value) {
  return splitValues(value).join(", ");
}

function orderedValues(values, order = []) {
  const rank = new Map((order || []).map((value, index) => [String(value), index]));
  return [...new Set(values.flatMap((value) => splitValues(value)))]
    .sort((left, right) => {
      const leftRank = rank.has(left) ? rank.get(left) : Number.MAX_SAFE_INTEGER;
      const rightRank = rank.has(right) ? rank.get(right) : Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
    });
}

function sourceDetailOrderedValues(values, key) {
  const filters = state.manifest?.filters || {};
  const order = key === "map"
    ? filters.maps
    : key === "diff"
      ? filters.diffs
      : key === "rarity"
        ? filters.rarities
        : key === "category"
          ? filters.categories
          : [];
  return orderedValues(values, order);
}

function summarizedValues(values, limit = 3) {
  const ordered = orderedValues(values);
  if (ordered.length <= limit) return ordered.join(", ");
  return `${ordered.slice(0, limit).join(", ")} +${ordered.length - limit}`;
}

function amountText(value) {
  const values = orderedValues(splitValues(value));
  const numbers = values
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .sort((left, right) => left - right);
  if (numbers.length && numbers.length === values.length) {
    const ranges = [];
    let start = numbers[0];
    let previous = numbers[0];
    for (const number of numbers.slice(1)) {
      if (number === previous + 1) {
        previous = number;
        continue;
      }
      ranges.push(start === previous ? String(start) : `${start}-${previous}`);
      start = number;
      previous = number;
    }
    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
    return ranges.join(", ");
  }
  return summarizedValues(values, 3);
}

function amountSortValue(value) {
  const numbers = splitValues(value)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
  return numbers.length ? Math.min(...numbers) : 0;
}

function sourceDetailGroupKey(row) {
  return JSON.stringify([
    row.itemAsset,
    row.item,
    row.rarity,
    row.category,
    row.grade,
    row.rolls,
    row.lootTable,
    baseChanceValue(row).toFixed(14),
    chanceValue(row).toFixed(14),
  ]);
}

function groupedSourceDetailRows(rows) {
  const grouped = new Map();
  (rows || []).forEach((row, index) => {
    const key = sourceDetailGroupKey(row);
    let entry = grouped.get(key);
    if (!entry) {
      entry = {
        ...row,
        maps: [],
        diffs: [],
        itemCounts: [],
        rateTables: [],
        _firstIndex: index,
        _maps: new Set(),
        _diffs: new Set(),
        _itemCounts: new Set(),
        _rateTables: new Set(),
      };
      grouped.set(key, entry);
    }
    splitValues(row.maps || row.map).forEach((value) => entry._maps.add(value));
    splitValues(row.diffs || row.diff).forEach((value) => entry._diffs.add(value));
    splitValues(row.itemCounts || row.itemCount).forEach((value) => entry._itemCounts.add(value));
    splitValues(row.rateTables || row.rateTable).forEach((value) => entry._rateTables.add(value));
  });

  return [...grouped.values()].map((row) => {
    const maps = sourceDetailOrderedValues([...row._maps], "map");
    const diffs = sourceDetailOrderedValues([...row._diffs], "diff");
    const itemCounts = orderedValues([...row._itemCounts]);
    const rateTables = orderedValues([...row._rateTables]);
    return {
      ...row,
      maps,
      diffs,
      map: maps.join(", "),
      diff: diffs.join(", "),
      itemCounts,
      itemCount: summarizedValues(itemCounts, 3),
      rateTables,
      rateTable: summarizedValues(rateTables, 3),
    };
  });
}

function selectedSourceDetailFilters() {
  return {
    rarity: "All",
    category: "All",
    map: "All",
    diff: DEFAULT_DIFFICULTY,
    ...(state.activeDetail?.filters || {}),
  };
}

function selectedItemDetailFilters() {
  return {
    kind: "All",
    map: "All",
    diff: DEFAULT_DIFFICULTY,
    ...(state.activeDetail?.filters || {}),
  };
}

function sourceDetailFilterMatches(row, filters) {
  if (filters.rarity !== "All" && row.rarity !== filters.rarity) return false;
  if (filters.category !== "All" && row.category !== filters.category) return false;
  if (filters.map !== "All" && !splitValues(row.maps || row.map).includes(filters.map)) return false;
  if (filters.diff !== "All" && !splitValues(row.diffs || row.diff).includes(filters.diff)) return false;
  return true;
}

function itemDetailFilterMatches(row, filters) {
  if (filters.kind !== "All" && row.sourceKind !== filters.kind) return false;
  if (filters.map !== "All" && !splitValues(row.mapValues || row.maps).includes(filters.map)) return false;
  if (filters.diff !== "All" && !splitValues(row.diffValues || row.diffs).includes(filters.diff)) return false;
  return true;
}

function sourceDetailFilterOptions(rows) {
  return {
    rarity: sourceDetailOrderedValues(rows.map((row) => row.rarity), "rarity"),
    category: sourceDetailOrderedValues(rows.map((row) => row.category), "category"),
    map: sourceDetailOrderedValues(rows.flatMap((row) => row.maps || row.map), "map"),
    diff: sourceDetailOrderedValues(rows.flatMap((row) => row.diffs || row.diff), "diff"),
  };
}

function itemDetailFilterOptions(rows) {
  return {
    kind: orderedValues(rows.map((row) => row.sourceKind)),
    map: sourceDetailOrderedValues(rows.flatMap((row) => row.mapValues || row.maps), "map"),
    diff: sourceDetailOrderedValues(rows.flatMap((row) => row.diffValues || row.diffs), "diff"),
  };
}

function selectOptions(values, selectedValue, allLabel = "All") {
  const valuesWithAll = [allLabel, ...values];
  if (selectedValue && !valuesWithAll.includes(selectedValue)) valuesWithAll.push(selectedValue);
  return valuesWithAll
    .map((value) => `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(value)}</option>`)
    .join("");
}

function detailFilterSelect(id, dataName, key, label, selectedValue, values) {
  return `
    <label class="detail-filter">
      <span>${escapeHtml(label)}</span>
      <select id="${escapeHtml(id)}" data-${escapeHtml(dataName)}="${escapeHtml(key)}">
        ${selectOptions(values, selectedValue)}
      </select>
    </label>
  `;
}

function sourceDetailFilterSelect(id, key, label, selectedValue, values) {
  return detailFilterSelect(id, "source-detail-filter", key, label, selectedValue, values);
}

function itemDetailFilterSelect(id, key, label, selectedValue, values) {
  return detailFilterSelect(id, "item-detail-filter", key, label, selectedValue, values);
}

function rarityRank(value) {
  const index = RARITY_ORDER.indexOf(value);
  return index === -1 ? RARITY_ORDER.length : index;
}

function compareSortValues(left, right) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function itemSortValue(row, key) {
  switch (key) {
    case "item":
      return row.item;
    case "rarity":
      return rarityRank(row.rarity);
    case "category":
      return row.category;
    case "maps":
      return listText(row.maps || row.map);
    case "difficulties":
      return listText(row.diffs || row.diff);
    case "sources":
      return Number(row.sourceCount || 0);
    default:
      return row.item;
  }
}

function sourceSortValue(row, key) {
  switch (key) {
    case "source":
      return row.source;
    case "kind":
      return row.sourceKind;
    case "maps":
      return listText(row.mapValues || row.maps);
    case "difficulties":
      return listText(row.diffValues || row.diffs);
    case "items":
      return Number(row.itemCount || 0);
    default:
      return row.source;
  }
}

function sourceDetailSortValue(row, key) {
  switch (key) {
    case "item":
      return row.item;
    case "rarity":
      return rarityRank(row.rarity);
    case "category":
      return row.category;
    case "maps":
      return listText(row.maps || row.map);
    case "difficulties":
      return listText(row.diffs || row.diff);
    case "baseChance":
      return baseChanceValue(row);
    case "amount":
      return amountSortValue(row.itemCounts || row.itemCount);
    case "rolls":
      return Number(row.rolls || 0);
    case "lootTable":
      return row.lootTable;
    case "chance":
    default:
      return chanceValue(row);
  }
}

function sortedRows(rows, list) {
  const sort = state.sort[list];
  const getter = list === "items" ? itemSortValue : sourceSortValue;
  const direction = sort.direction === "desc" ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const result = compareSortValues(getter(left.row, sort.key), getter(right.row, sort.key));
      if (result) return result * direction;
      return left.index - right.index;
    })
    .map((entry) => entry.row);
}

function setSort(list, key) {
  const current = state.sort[list];
  const direction = current.key === key
    ? (current.direction === "asc" ? "desc" : "asc")
    : (DEFAULT_SORT_DIRECTION[key] || "asc");
  state.sort[list] = { key, direction };
  render();
}

function setSourceDetailSort(key) {
  if (state.activeDetail?.type !== "source") return;
  const current = state.activeDetail.sort || { key: "chance", direction: "desc" };
  const defaultDirection = key === "chance" || key === "baseChance" ? "desc" : "asc";
  const direction = current.key === key
    ? (current.direction === "asc" ? "desc" : "asc")
    : defaultDirection;
  state.activeDetail.sort = { key, direction };
  renderSourceDetail(state.activeDetail.payload);
}

function updateSortButtons() {
  document.querySelectorAll(".sort-button[data-sort-list]").forEach((button) => {
    const sort = state.sort[button.dataset.sortList];
    const active = sort?.key === button.dataset.sortKey;
    button.classList.toggle("active", active);
    button.dataset.direction = active ? sort.direction : "";
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.closest("th")?.setAttribute("aria-sort", active ? (sort.direction === "asc" ? "ascending" : "descending") : "none");
  });
}

function metaPill(label, value) {
  return `<span><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`;
}

function tableMeta(rows, selectedRows) {
  const hidden = Math.max(0, rows.length - selectedRows.length);
  const hiddenLabel = hidden > 0 ? `${hidden.toLocaleString()} more` : "none";
  const shownLabel = hidden > 0 ? `top ${selectedRows.length.toLocaleString()}` : selectedRows.length.toLocaleString();
  return [
    metaPill("Matches", rows.length.toLocaleString()),
    metaPill("Shown", shownLabel),
    metaPill("Not shown", hiddenLabel),
    metaPill("All items", state.items.length.toLocaleString()),
    metaPill("All sources", state.sources.length.toLocaleString()),
    hidden > 0 ? `<span class="limit-note">Only the top ${MAX_ROWS.toLocaleString()} rows are shown right now.</span>` : "",
  ].join("");
}

function favoriteButton(active, type, key, label) {
  return `<button class="favorite ${active ? "active" : ""}" data-fav-type="${type}" data-fav-key="${escapeHtml(key)}" title="${escapeHtml(label)}">&#9733;</button>`;
}

function renderItems() {
  const rows = sortedRows(filteredItems(), "items");
  const selectedRows = rows.slice(0, MAX_ROWS);
  $("itemTableMeta").innerHTML = tableMeta(rows, selectedRows);
  $("itemRows").innerHTML = selectedRows.length
    ? selectedRows.map((row) => `
      <tr class="clickable-row" data-open-item="${escapeHtml(row.itemAsset)}" tabindex="0" role="button">
        <td>${favoriteButton(isFavoriteItem(row.itemAsset), "item", row.itemAsset, "Favorite item")}</td>
        <td>${escapeHtml(row.item)}</td>
        <td>${rarity(row.rarity)}</td>
        <td>${categoryChip(row.category)}</td>
        <td>${chips(row.maps || row.map, "map-chip")}</td>
        <td>${chips(row.diffs || row.diff, "diff-chip")}</td>
        <td class="num">${escapeHtml(row.sourceCount)}</td>
        <td class="action-cell"><button data-open-item="${escapeHtml(row.itemAsset)}">Sources</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="8">No items match these filters.</td></tr>`;
}

function renderSources() {
  const rows = sortedRows(filteredSources(), "sources");
  const selectedRows = rows.slice(0, MAX_ROWS);
  $("sourceTableMeta").innerHTML = tableMeta(rows, selectedRows);
  $("sourceRows").innerHTML = selectedRows.length
    ? selectedRows.map((row) => `
      <tr class="clickable-row" data-open-source="${escapeHtml(sourceKey(row.source, row.sourceKind))}" tabindex="0" role="button">
        <td>${favoriteButton(isFavoriteSource(row.source, row.sourceKind), "source", sourceKey(row.source, row.sourceKind), "Favorite source")}</td>
        <td>${escapeHtml(row.source)}</td>
        <td>${kindChip(row.sourceKind)}</td>
        <td>${chips(row.mapValues || row.maps, "map-chip")}</td>
        <td>${chips(row.diffValues || row.diffs, "diff-chip")}</td>
        <td class="num">${escapeHtml(row.itemCount)}</td>
        <td class="action-cell"><button data-open-source="${escapeHtml(sourceKey(row.source, row.sourceKind))}">Open</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="7">No sources match these filters.</td></tr>`;
}

function renderFavorites() {
  const favoriteItems = state.favorites.items.map((asset) => state.itemByAsset.get(asset)).filter(Boolean);
  $("favoriteItemRows").innerHTML = favoriteItems.length
    ? favoriteItems.map((row) => `
      <tr class="clickable-row" data-open-item="${escapeHtml(row.itemAsset)}" tabindex="0" role="button">
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
      <tr class="clickable-row" data-open-source="${escapeHtml(sourceKey(row.source, row.sourceKind))}" tabindex="0" role="button">
        <td>${escapeHtml(row.source)}</td>
        <td>${kindChip(row.sourceKind)}</td>
        <td><button data-open-source="${escapeHtml(sourceKey(row.source, row.sourceKind))}">Open</button></td>
        <td><button data-fav-type="source" data-fav-key="${escapeHtml(sourceKey(row.source, row.sourceKind))}">Remove</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="4">No favorite sources yet.</td></tr>`;
}

function render() {
  updateSortButtons();
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

function detailSortButton(key, label, num = false) {
  const sort = state.activeDetail?.type === "source" ? state.activeDetail.sort : null;
  const active = sort?.key === key;
  return `<button class="sort-button detail-sort-button ${num ? "num" : ""} ${active ? "active" : ""}" data-detail-sort-key="${escapeHtml(key)}" data-direction="${active ? escapeHtml(sort.direction) : ""}" aria-pressed="${active ? "true" : "false"}">${escapeHtml(label)}</button>`;
}

function detailTable(rows, columns, rowAttrs = () => "") {
  if (!rows.length) return `<div class="message-row">No detail rows found.</div>`;
  return `
    <div class="table-wrap compact">
      <table>
        <thead><tr>${columns.map((column) => {
          const sort = state.activeDetail?.type === "source" ? state.activeDetail.sort : null;
          const active = column.sortKey && sort?.key === column.sortKey;
          const ariaSort = column.sortKey ? ` aria-sort="${active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}"` : "";
          const label = column.sortKey ? detailSortButton(column.sortKey, column.label, column.num) : escapeHtml(column.label);
          return `<th class="${column.num ? "num" : ""}"${ariaSort}>${label}</th>`;
        }).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => {
            const attrs = rowAttrs(row);
            return `
            <tr${attrs ? ` ${attrs}` : ""}>
              ${columns.map((column) => `<td class="${column.num ? "num" : ""}">${column.html ? column.html(row) : escapeHtml(row[column.key])}</td>`).join("")}
            </tr>
          `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSourceDetail(payload) {
  const search = state.activeDetail?.type === "source" ? state.activeDetail.search || "" : "";
  const filters = selectedSourceDetailFilters();
  const sort = state.activeDetail?.type === "source" ? state.activeDetail.sort || { key: "chance", direction: "desc" } : { key: "chance", direction: "desc" };
  const groupedRows = groupedSourceDetailRows(payload.rows || []);
  const filterOptions = sourceDetailFilterOptions(groupedRows);
  const rows = groupedRows
    .filter((row) => matchesAnySearchGroup(search, sourceDetailSearchGroups(row)))
    .filter((row) => sourceDetailFilterMatches(row, filters))
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const direction = sort.direction === "desc" ? -1 : 1;
      const result = compareSortValues(sourceDetailSortValue(left.row, sort.key), sourceDetailSortValue(right.row, sort.key));
      if (result) return result * direction;
      const chanceResult = compareSortValues(chanceValue(left.row), chanceValue(right.row));
      if (chanceResult) return chanceResult * -1;
      return left.index - right.index;
    })
    .map((entry) => entry.row);
  const limited = rows.slice(0, 500);
  const loadedRows = Number(payload.rowsLimited || payload.rows?.length || groupedRows.length);
  const totalRows = Number(payload.total || loadedRows);
  const loadedText = loadedRows < totalRows
    ? `Loaded top ${loadedRows.toLocaleString()} of ${totalRows.toLocaleString()} grouped rows`
    : `${groupedRows.length.toLocaleString()} grouped rows`;
  const showingText = `Showing ${limited.length.toLocaleString()} of ${rows.length.toLocaleString()} matching rows | ${loadedText}`;
  $("detailTitle").textContent = payload.source;
  $("detailMeta").textContent = `${payload.sourceKind} | ${totalRows.toLocaleString()} drop rows | ${payload.spawnLocationCount || 0} known spawns`;
  $("detailContent").innerHTML = `
    <div class="detail-toolbar source-detail-toolbar">
      <label class="detail-search">Search source results
        <input id="sourceDetailSearch" autocomplete="off" placeholder="Item, rarity, map, difficulty, loot table..." value="${escapeHtml(search)}">
      </label>
      <div class="detail-filters">
        ${sourceDetailFilterSelect("sourceDetailRarity", "rarity", "Rarity", filters.rarity, filterOptions.rarity)}
        ${sourceDetailFilterSelect("sourceDetailCategory", "category", "Category", filters.category, filterOptions.category)}
        ${sourceDetailFilterSelect("sourceDetailMap", "map", "Map", filters.map, filterOptions.map)}
        ${sourceDetailFilterSelect("sourceDetailDiff", "diff", "Difficulty", filters.diff, filterOptions.diff)}
      </div>
      <span class="muted detail-result-count">${escapeHtml(showingText)}</span>
      <button data-fav-type="source" data-fav-key="${escapeHtml(sourceKey(payload.source, payload.sourceKind))}">
        ${isFavoriteSource(payload.source, payload.sourceKind) ? "Remove Favorite" : "Favorite Source"}
      </button>
    </div>
    ${detailTable(limited, [
      { label: "Item", sortKey: "item", key: "item" },
      { label: "Amount", sortKey: "amount", html: (row) => escapeHtml(amountText(row.itemCounts || row.itemCount)), num: true },
      { label: "Rarity", sortKey: "rarity", html: (row) => rarity(row.rarity) },
      { label: "Category", sortKey: "category", html: (row) => categoryChip(row.category) },
      { label: "Maps", sortKey: "maps", html: (row) => chips(row.maps || row.map, "map-chip") },
      { label: "Difficulties", sortKey: "difficulties", html: (row) => chips(row.diffs || row.diff, "diff-chip") },
      { label: "Base Chance", sortKey: "baseChance", html: (row) => escapeHtml(baseChanceText(row)), num: true },
      { label: "Luck Chance", sortKey: "chance", html: (row) => escapeHtml(chanceText(row)), num: true },
    ])}
  `;
}

function renderItemDetail(payload) {
  const search = state.activeDetail?.type === "item" ? state.activeDetail.search || "" : "";
  const filters = selectedItemDetailFilters();
  const baseRows = payload.rows || [];
  const filterOptions = itemDetailFilterOptions(baseRows);
  const rows = baseRows
    .filter((row) => matchesAnySearchGroup(search, itemDetailSearchGroups(row)))
    .filter((row) => itemDetailFilterMatches(row, filters))
    .sort((a, b) => chanceValue(b, "chanceValue") - chanceValue(a, "chanceValue"));
  const limited = rows.slice(0, 500);
  $("detailTitle").textContent = payload.item?.item || "Item";
  $("detailMeta").textContent = `${payload.item?.rarity || ""} ${payload.item?.category || ""} | ${baseRows.length.toLocaleString()} sources`;
  $("detailContent").innerHTML = `
    <div class="detail-toolbar item-detail-toolbar">
      <label class="detail-search">Search item sources
        <input id="itemDetailSearch" autocomplete="off" placeholder="Source, kind, map, difficulty, loot table..." value="${escapeHtml(search)}">
      </label>
      <div class="detail-filters item-detail-filters">
        ${itemDetailFilterSelect("itemDetailKind", "kind", "Kind", filters.kind, filterOptions.kind)}
        ${itemDetailFilterSelect("itemDetailMap", "map", "Map", filters.map, filterOptions.map)}
        ${itemDetailFilterSelect("itemDetailDiff", "diff", "Difficulty", filters.diff, filterOptions.diff)}
      </div>
      <span class="muted detail-result-count">Showing ${limited.length.toLocaleString()} of ${rows.length.toLocaleString()} matching sources | ${baseRows.length.toLocaleString()} total</span>
      <button data-fav-type="item" data-fav-key="${escapeHtml(payload.item?.itemAsset || "")}">
        ${isFavoriteItem(payload.item?.itemAsset) ? "Remove Favorite" : "Favorite Item"}
      </button>
    </div>
    ${detailTable(limited, [
      { label: "Source", key: "source" },
      { label: "Kind", html: (row) => kindChip(row.sourceKind) },
      { label: "Maps", html: (row) => chips(row.mapValues || row.maps, "map-chip") },
      { label: "Difficulties", html: (row) => chips(row.diffValues || row.diffs, "diff-chip") },
      { label: "Best Base Chance", html: (row) => escapeHtml(baseChanceText(row)), num: true },
      { label: "Best Chance With Luck", html: (row) => escapeHtml(chanceText(row, "chanceValue", "chance")), num: true },
      { label: "Open", html: (row) => `<button data-open-source="${escapeHtml(sourceLookupKey(row))}">Open</button>` },
    ], (row) => `class="clickable-row" data-open-source="${escapeHtml(sourceLookupKey(row))}" tabindex="0" role="button"`)}
  `;
}

async function openItem(asset) {
  const item = state.itemByAsset.get(asset);
  if (!item) return;
  $("detailTitle").textContent = item.item;
  $("detailMeta").textContent = "Loading item details...";
  $("detailContent").innerHTML = "";
  if (!$("detailDialog").open) $("detailDialog").showModal();
  const payload = await detail(item.detailPath);
  state.activeDetail = {
    type: "item",
    payload,
    search: "",
    filters: { kind: "All", map: "All", diff: DEFAULT_DIFFICULTY },
  };
  renderItemDetail(payload);
}

async function openSource(key) {
  const row = state.sourceByKey.get(key);
  if (!row) return;
  $("detailTitle").textContent = row.source;
  $("detailMeta").textContent = "Loading source drops...";
  $("detailContent").innerHTML = "";
  if (!$("detailDialog").open) $("detailDialog").showModal();
  const payload = await detail(row.detailPath);
  state.activeDetail = {
    type: "source",
    payload,
    search: "",
    filters: { rarity: "All", category: "All", map: "All", diff: DEFAULT_DIFFICULTY },
    sort: { key: "chance", direction: "desc" },
  };
  renderSourceDetail(payload);
}

function renderActiveDetail() {
  if (!$("detailDialog").open || !state.activeDetail) return;
  if (state.activeDetail.type === "item") renderItemDetail(state.activeDetail.payload);
  if (state.activeDetail.type === "source") renderSourceDetail(state.activeDetail.payload);
}

function openClickableRow(row) {
  if (row.dataset.openItem) {
    openItem(row.dataset.openItem);
    return;
  }
  if (row.dataset.openSource) openSource(row.dataset.openSource);
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
    if (button?.dataset.moreValues) {
      event.stopPropagation();
      toggleChipPopover(button);
      return;
    }
    if (!event.target.closest("#chipPopover")) hideChipPopover(true);
    if (button) {
      if (button.dataset.sortList && button.dataset.sortKey) {
        setSort(button.dataset.sortList, button.dataset.sortKey);
        return;
      }
      if (button.dataset.detailSortKey) {
        setSourceDetailSort(button.dataset.detailSortKey);
        return;
      }
      if (button.dataset.openItem) {
        openItem(button.dataset.openItem);
        return;
      }
      if (button.dataset.openSource) {
        openSource(button.dataset.openSource);
        return;
      }
      if (button.dataset.favType === "item") {
        toggleFavoriteItem(button.dataset.favKey);
        return;
      }
      if (button.dataset.favType === "source") {
        const row = state.sourceByKey.get(button.dataset.favKey);
        if (row) toggleFavoriteSource(row.source, row.sourceKind);
        return;
      }
      return;
    }

    const row = event.target.closest("tr[data-open-item], tr[data-open-source]");
    if (row) openClickableRow(row);
  });

  document.body.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button, input, select, textarea, a")) return;
    const row = event.target.closest("tr[data-open-item], tr[data-open-source]");
    if (!row) return;
    event.preventDefault();
    openClickableRow(row);
  });

  document.body.addEventListener("mouseover", (event) => {
    const button = event.target.closest("button[data-more-values]");
    if (!button || button.contains(event.relatedTarget)) return;
    showChipPopover(button);
  });

  document.body.addEventListener("mouseout", (event) => {
    const button = event.target.closest("button[data-more-values]");
    if (!button || button.contains(event.relatedTarget)) return;
    hideChipPopover();
  });

  document.body.addEventListener("focusin", (event) => {
    const button = event.target.closest("button[data-more-values]");
    if (button) showChipPopover(button);
  });

  document.body.addEventListener("focusout", (event) => {
    if (event.target.closest("button[data-more-values]")) hideChipPopover();
  });

  document.body.addEventListener("input", (event) => {
    const input = event.target;
    if (input.id === "sourceDetailSearch" && state.activeDetail?.type === "source") {
      const position = input.selectionStart ?? input.value.length;
      state.activeDetail.search = input.value;
      renderSourceDetail(state.activeDetail.payload);
      const restored = $("sourceDetailSearch");
      if (restored) {
        restored.focus();
        restored.setSelectionRange(position, position);
      }
      return;
    }
    if (input.id === "itemDetailSearch" && state.activeDetail?.type === "item") {
      const position = input.selectionStart ?? input.value.length;
      state.activeDetail.search = input.value;
      renderItemDetail(state.activeDetail.payload);
      const restored = $("itemDetailSearch");
      if (restored) {
        restored.focus();
        restored.setSelectionRange(position, position);
      }
    }
  });

  document.body.addEventListener("change", (event) => {
    const input = event.target;
    if (input.dataset?.sourceDetailFilter && state.activeDetail?.type === "source") {
      state.activeDetail.filters = {
        ...selectedSourceDetailFilters(),
        [input.dataset.sourceDetailFilter]: input.value,
      };
      renderSourceDetail(state.activeDetail.payload);
      $(input.id)?.focus();
      return;
    }
    if (input.dataset?.itemDetailFilter && state.activeDetail?.type === "item") {
      state.activeDetail.filters = {
        ...selectedItemDetailFilters(),
        [input.dataset.itemDetailFilter]: input.value,
      };
      renderItemDetail(state.activeDetail.payload);
      $(input.id)?.focus();
    }
  });

  $("closeDetail").addEventListener("click", () => $("detailDialog").close());
  $("detailDialog").addEventListener("close", () => {
    state.activeDetail = null;
    hideChipPopover(true);
  });
  $("clearFavorites").addEventListener("click", () => {
    state.favorites = { items: [], sources: [] };
    saveFavorites();
    render();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideChipPopover(true);
  });
  document.addEventListener("scroll", () => hideChipPopover(true), true);
  window.addEventListener("resize", () => hideChipPopover(true));
}

wireEvents();
loadData().catch((error) => {
  console.error(error);
  $("dataStatus").textContent = `Could not load website data: ${error.message}`;
});
