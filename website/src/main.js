import {
  buildSearchIndex,
  clampLuck,
  escapeHtml,
  finalHealth,
  finalMemoryCapacity,
  interpolateCurve,
  isTwoHandedItem,
  loreMasteryKnowledgeBonus,
  maxHealthRating,
  matchesSearchGroups,
  normalizedStatEntryValue,
  slotContributesStats,
  sourceKey,
  sumEquippedGearScore,
  terms,
} from "./core.js";
import { detailSlug, readRoute, urlForState } from "./router.js";
import { createAppState } from "./state.js";
import {
  FAVORITES_KEY,
  SAVED_KITS_KEY,
  SHARED_KIT_BINARY_PREFIX,
  APP_BUILD_ID,
  SITE_UPDATED_AT,
  ROW_PAGE_SIZE,
  MAX_BUILDER_ITEMS,
  MAX_DETAIL_ROWS,
  RARITY_ORDER,
  SQUIRE_MAPS,
  SQUIRE_MAP_SET,
  BUILDER_PERK_LIMIT,
  BUILDER_WEAPON_MASTERY_PERK_ID,
  BUILDER_DEMON_ARMOR_PERK_ID,
  BUILDER_SPEAR_PROFICIENCY_PERK_ID,
  BUILDER_IRON_WILL_PERK_ID,
  BUILDER_LORE_MASTERY_PERK_ID,
  BUILDER_SAVAGE_PERK_ID,
  BUILDER_NO_STAT_PERK_SUMMARY,
  BUILDER_LORE_MASTERY_RESOURCEFULNESS_TO_KNOWLEDGE,
  BUILDER_PERK_STAT_OVERRIDES,
  BUILDER_PERK_SUMMARIES,
  PERK_ICON_ALIASES,
  BUILDER_DEFAULTS,
  DAMAGE_TARGET_DEFAULTS,
  DAMAGE_HIT_LOCATIONS,
  BUILDER_SLOTS,
  BUILDER_WEAPON_GRID,
  BUILDER_STAT_ROWS,
  BUILDER_STAT_ORDER,
  STAT_CONTRIBUTION_KEYS,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_DIFFICULTY,
  LUCK_500_SCALARS,
  GRADE4_ANCHORS,
} from "./config.js";

const state = createAppState();

const $ = (id) => document.getElementById(id);
const GRADE_RARITIES = ["", "Junk", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Unique", "Artifact"];
let builderShareStatusTimer = 0;
const secondaryOptionsCache = new WeakMap();
const emptySecondaryOptions = { options: [], byId: new Map() };
const scheduledRenders = new Map();
let routeSyncTimer = 0;
let routeApplying = false;
let toastTimer = 0;
let kitShareCodecPromise = null;
let kitPhotoPromise = null;

function scheduleRender(key, renderFn) {
  if (scheduledRenders.has(key)) return;
  scheduledRenders.set(key, requestAnimationFrame(() => {
    scheduledRenders.delete(key);
    renderFn();
  }));
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

function showToast(message) {
  const region = $("toastRegion");
  if (!region) return;
  window.clearTimeout(toastTimer);
  region.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  toastTimer = window.setTimeout(() => {
    region.innerHTML = "";
  }, 2600);
}

function currentRouteState() {
  return {
    view: state.activeTab,
    luck: state.currentLuck,
    itemSearch: $("itemSearch")?.value || "",
    itemRarity: $("itemRarity")?.value || "All",
    itemCategory: $("itemCategory")?.value || "All",
    itemMap: $("itemMap")?.value || "All",
    itemDiff: $("itemDiff")?.value || DEFAULT_DIFFICULTY,
    sourceSearch: $("sourceSearch")?.value || "",
    sourceMap: $("sourceMap")?.value || "All",
    sourceDiff: $("sourceDiff")?.value || DEFAULT_DIFFICULTY,
    sourceKind: $("sourceKind")?.value || "All",
  };
}

function currentDetailRoute() {
  if (!state.activeDetail?.routeRow) return null;
  return { type: state.activeDetail.type, row: state.activeDetail.routeRow };
}

function updateDocumentMeta(detail = null) {
  const title = detail?.row
    ? `${detail.row.item || detail.row.source} | DarkLoot`
    : state.activeTab === "builder"
      ? "Kit Builder | DarkLoot"
      : state.activeTab === "sources"
        ? "Loot Sources | DarkLoot"
        : state.activeTab === "favorites"
          ? "Favorites | DarkLoot"
          : "DarkLoot - Dark and Darker Loot Database & Kit Builder";
  document.title = title;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = new URL(window.location.pathname, window.location.origin).href;
}

function syncRoute({ replace = true, includeDetail = true } = {}) {
  if (routeApplying) return;
  const detail = includeDetail ? currentDetailRoute() : null;
  const target = urlForState(currentRouteState(), detail);
  const current = `${window.location.pathname}${window.location.search}`;
  if (target !== current) history[replace ? "replaceState" : "pushState"]({ darkloot: true }, "", target);
  updateDocumentMeta(detail);
}

function scheduleRouteSync() {
  if (routeApplying) return;
  window.clearTimeout(routeSyncTimer);
  routeSyncTimer = window.setTimeout(() => syncRoute({ replace: true }), 120);
}

function setRouteControl(id, value) {
  const control = $(id);
  if (!control || value == null) return;
  if (control.tagName === "SELECT") {
    if ([...control.options].some((option) => option.value === value)) control.value = value;
    return;
  }
  control.value = value;
}

function applyRouteControls(route) {
  routeApplying = true;
  state.currentLuck = clampLuck(route.luck || state.manifest?.luck || 0);
  setRouteControl("itemSearch", route.itemSearch);
  setRouteControl("itemRarity", route.itemRarity);
  setRouteControl("itemCategory", route.itemCategory);
  setRouteControl("itemDiff", route.itemDiff);
  syncMapSelectForDifficulty("itemMap", "itemDiff");
  setRouteControl("itemMap", route.itemMap);
  setRouteControl("sourceSearch", route.sourceSearch);
  setRouteControl("sourceDiff", route.sourceDiff);
  syncMapSelectForDifficulty("sourceMap", "sourceDiff");
  setRouteControl("sourceMap", route.sourceMap);
  setRouteControl("sourceKind", route.sourceKind);
  syncLuckInputs();
  setActiveTab(route.view, { render: false, keepConfirmation: true, syncRoute: false });
  routeApplying = false;
}

function itemForRoute(key) {
  return state.itemByAsset.get(key)
    || state.items.find((row) => detailSlug(row.detailPath) === key)
    || null;
}

function sourceForRoute(key) {
  return state.sourceByKey.get(key)
    || state.sources.find((row) => detailSlug(row.detailPath) === key)
    || null;
}

async function openRouteDetail(route) {
  if (route.detailType === "item") {
    const item = itemForRoute(route.detailKey);
    if (item) await openItem(item.itemAsset, { syncRoute: false });
  }
  if (route.detailType === "source") {
    const source = sourceForRoute(route.detailKey);
    if (source) await openSource(sourceKey(source.source, source.sourceKind), { syncRoute: false });
  }
  updateDocumentMeta(currentDetailRoute());
}

async function copyCurrentUrl(message = "Link copied") {
  syncRoute({ replace: true });
  await copyText(window.location.href);
  showToast(message);
}

function closeGlobalSearch() {
  const panel = $("globalSearchPanel");
  const input = $("globalSearch");
  if (panel) panel.hidden = true;
  input?.setAttribute("aria-expanded", "false");
}

function globalSourceMark(row) {
  const initials = String(row.source || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return `<span class="global-source-mark" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function renderGlobalSearch() {
  const input = $("globalSearch");
  const panel = $("globalSearchPanel");
  if (!input || !panel) return;
  state.globalSearch = input.value.trim();
  const search = terms(state.globalSearch);
  if (!search.length || !state.items.length) {
    closeGlobalSearch();
    return;
  }
  const items = state.items
    .filter((row) => matchesSearchGroups(search, state.itemSearchIndex.get(row)))
    .slice(0, 6);
  const sources = state.sources
    .filter((row) => matchesSearchGroups(search, state.sourceSearchIndex.get(row)))
    .slice(0, 6);
  const itemResults = items.map((row) => `
    <button class="global-result" type="button" data-open-item="${escapeHtml(row.itemAsset)}" role="option">
      ${itemThumbnail(row)}
      <span><strong>${escapeHtml(row.item)}</strong><small>${escapeHtml(row.category)} | ${row.sourceCount.toLocaleString()} sources</small></span>
      ${rarity(row.rarity)}
    </button>
  `).join("");
  const sourceResults = sources.map((row) => `
    <button class="global-result" type="button" data-open-source="${escapeHtml(sourceKey(row.source, row.sourceKind))}" role="option">
      ${globalSourceMark(row)}
      <span><strong>${escapeHtml(row.source)}</strong><small>${escapeHtml(row.sourceKind)} | ${Number(row.itemCount || 0).toLocaleString()} items</small></span>
      <span class="global-result-arrow" aria-hidden="true">&gt;</span>
    </button>
  `).join("");
  panel.innerHTML = items.length || sources.length
    ? `${items.length ? `<div class="global-result-group"><span class="global-result-label">Items</span>${itemResults}</div>` : ""}${sources.length ? `<div class="global-result-group"><span class="global-result-label">Sources</span>${sourceResults}</div>` : ""}`
    : `<div class="message-row">No items or sources match that search.</div>`;
  panel.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function showInfoPopover(button) {
  document.querySelector(".info-popover")?.remove();
  const popover = document.createElement("div");
  popover.className = "info-popover";
  popover.textContent = "Luck changes rarity pool odds. The main chance is for one kill, chest, or interaction; single-roll odds are shown only as the table math behind it.";
  document.body.appendChild(popover);
  const rect = button.getBoundingClientRect();
  popover.style.left = `${Math.min(window.innerWidth - popover.offsetWidth - 12, Math.max(12, rect.left - popover.offsetWidth + rect.width))}px`;
  popover.style.top = `${Math.min(window.innerHeight - popover.offsetHeight - 12, rect.bottom + 8)}px`;
}

function percentTextValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const parsed = Number.parseFloat(text.replace("%", ""));
  if (!Number.isFinite(parsed)) return 0;
  return parsed / 100;
}

function chanceValue(row, valueKey = "dynAtLeastOneValue") {
  const model = row.luckModel;
  if (!model) {
    if (state.currentLuck === 0) return Number(row.baseAtLeastOneValue || 0) || percentTextValue(row.baseAtLeastOne);
    return Number(row[valueKey] || row.chanceValue || row.bestDynValue || 0) || percentTextValue(row.dynAtLeastOne);
  }
  const weights = state.rateWeights[model.rateKey];
  if (!weights) return Number(row[valueKey] || row.chanceValue || row.bestDynValue || 0);
  const grade = Number(model.grade || 0);
  const rolls = Math.max(1, Number(model.rolls || 1));
  const choiceFraction = Number(model.choiceFraction || 0);
  const probs = gradeProbabilities(weights, state.currentLuck);
  const perRoll = Number(probs[grade] || 0) * choiceFraction;
  return 1 - Math.pow(Math.max(0, 1 - perRoll), rolls);
}

function perRollChanceValue(row) {
  const model = row.luckModel;
  if (!model) {
    if (state.currentLuck === 0) return Number(row.basePerRollValue || 0) || percentTextValue(row.basePerRoll);
    return Number(row.dynPerRollValue || row.basePerRollValue || 0) || percentTextValue(row.dynPerRoll || row.basePerRoll);
  }
  const weights = state.rateWeights[model.rateKey];
  if (!weights) return Number(row.dynPerRollValue || model.basePerRollValue || 0) || percentTextValue(row.dynPerRoll || row.basePerRoll);
  const grade = Number(model.grade || 0);
  if (!Number.isFinite(grade)) return Number(row.dynPerRollValue || model.basePerRollValue || 0) || percentTextValue(row.dynPerRoll || row.basePerRoll);
  const choiceFraction = Number(model.choiceFraction || 0);
  const probs = gradeProbabilities(weights, state.currentLuck);
  return Number(probs[grade] || 0) * choiceFraction;
}

function perRollChanceText(row) {
  return percent(perRollChanceValue(row));
}

function gradeChanceValue(row) {
  const model = row.luckModel;
  if (!model) return 0;
  const weights = state.rateWeights[model.rateKey];
  if (!weights) return 0;
  const grade = Number(model.grade || 0);
  const probs = gradeProbabilities(weights, state.currentLuck);
  return Number(probs[grade] || 0);
}

function gradeAtLeastOneValue(row) {
  const rolls = Math.max(1, Number(row.luckModel?.rolls || row.rolls || 1));
  const perRoll = gradeChanceValue(row);
  return 1 - Math.pow(Math.max(0, 1 - perRoll), rolls);
}

function chanceText(row, valueKey = "dynAtLeastOneValue", textKey = "dynAtLeastOne") {
  return row.luckModel ? percent(chanceValue(row, valueKey)) : row[textKey];
}

function plural(value, label) {
  return `${value} ${label}${Number(value) === 1 ? "" : "s"}`;
}

function gradeRarity(grade) {
  return GRADE_RARITIES[Number(grade)] || `Grade ${grade}`;
}

function sourceActionKind(kind) {
  const normalized = String(kind || "").toLowerCase();
  if (normalized === "boss" || normalized === "monster") return "kill";
  if (normalized === "prop") return "open";
  return "interaction";
}

function sourceActionLabel(kind) {
  return `one ${sourceActionKind(kind)}`;
}

function sourceDetailActionLabel(payload) {
  return sourceActionLabel(payload?.sourceKind);
}

function itemDetailActionLabel(row) {
  return sourceActionLabel(row?.sourceKind);
}

function sourceChanceHeader(payload) {
  return `Chance from ${sourceDetailActionLabel(payload)}`;
}

function bestChanceHeader(filters) {
  const kind = filters?.kind && filters.kind !== "All" ? filters.kind : "";
  return kind ? `Best chance from ${sourceActionLabel(kind)}` : "Best chance from source";
}

function chanceGuide(actionLabel) {
  return `
    <div class="chance-guide" aria-label="Drop chance labels">
      <div>
        <strong>Chance from ${escapeHtml(actionLabel)}</strong>
        <span>Main number. Combines all loot rolls for this exact item.</span>
      </div>
      <div>
        <strong>Single roll chance</strong>
        <span>Internal roll math for this exact item.</span>
      </div>
      <div>
        <strong>Any rarity pool</strong>
        <span>Chance to hit the rarity before the item is chosen.</span>
      </div>
    </div>
  `;
}

function choiceCountText(choiceFraction) {
  const value = Number(choiceFraction || 0);
  if (value <= 0) return "item choice";
  const inverse = 1 / value;
  const rounded = Math.round(inverse);
  if (Math.abs(inverse - rounded) < 0.000001) {
    return rounded === 1 ? "only item in pool" : `1 of ${rounded} items`;
  }
  return `${percent(value)} of pool`;
}

function chanceBreakdownText(row, includeRolls = true) {
  const model = row.luckModel;
  if (!model) return "";
  const pool = gradeChanceValue(row);
  const rolls = Math.max(1, Number(model.rolls || row.rolls || 1));
  const poolLabel = `${percent(pool)} ${gradeRarity(model.grade)} pool`;
  return [
    poolLabel,
    choiceCountText(model.choiceFraction),
    includeRolls ? plural(rolls, "roll") : "",
  ].filter(Boolean).join(" / ");
}

function chanceCell(row, label, breakdown = chanceBreakdownText(row)) {
  return `
    <span class="chance-cell">
      <strong>${escapeHtml(label)}</strong>
      ${breakdown ? `<small>${escapeHtml(breakdown)}</small>` : ""}
    </span>
  `;
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

function syncLuckInputs() {
  const value = String(state.currentLuck);
  ["luckInput", "detailLuckInput"].forEach((id) => {
    const input = $(id);
    if (input && input.value !== value) input.value = value;
  });
}

function setCurrentLuck(value) {
  state.currentLuck = clampLuck(value);
  syncLuckInputs();
  scheduleRouteSync();
  if (state.currentLuck > 0) {
    ensureRatesData().then(renderActiveDetail).catch((error) => {
      console.error(error);
      showToast("Luck data could not be loaded");
    });
    return;
  }
  renderActiveDetail();
}

function syncFavoriteSets() {
  state.favoriteItemSet = new Set(state.favorites.items);
  state.favoriteSourceSet = new Set(state.favorites.sources);
}

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "{}");
    state.favorites = {
      items: Array.isArray(parsed.items) ? [...new Set(parsed.items.map(String).filter(Boolean))] : [],
      sources: Array.isArray(parsed.sources) ? [...new Set(parsed.sources.map(String).filter(Boolean))] : [],
    };
  } catch {
    state.favorites = { items: [], sources: [] };
  }
  syncFavoriteSets();
}

function saveFavorites() {
  syncFavoriteSets();
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function savedKitId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `kit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSavedKit(raw) {
  if (!raw || typeof raw !== "object") return null;
  const equipped = {};
  Object.entries(plainObject(raw.equipped)).forEach(([slotId, asset]) => {
    if (BUILDER_SLOTS.some((slot) => slot.id === slotId) && typeof asset === "string") {
      equipped[slotId] = asset;
    }
  });
  return {
    id: String(raw.id || savedKitId()),
    name: String(raw.name || "Saved Kit").trim() || "Saved Kit",
    createdAt: String(raw.createdAt || raw.updatedAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString()),
    characterId: String(raw.characterId || ""),
    selectedSlot: String(raw.selectedSlot || "weapon1Primary"),
    activeWeaponSet: String(raw.activeWeaponSet || "1"),
    equipped,
    primaryValues: cloneJson(raw.primaryValues),
    bonuses: cloneJson(raw.bonuses),
    perks: Array.isArray(raw.perks) ? raw.perks.map(String).slice(0, BUILDER_PERK_LIMIT) : [],
    skinId: String(raw.skinId || ""),
  };
}

function loadSavedKits() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_KITS_KEY) || "[]");
    state.savedKits = Array.isArray(parsed) ? parsed.map(normalizeSavedKit).filter(Boolean) : [];
  } catch {
    state.savedKits = [];
  }
}

function saveSavedKits() {
  localStorage.setItem(SAVED_KITS_KEY, JSON.stringify(state.savedKits));
}

function currentBuilderKitName() {
  const input = $("builderKitName");
  return (input?.value || "").trim() || defaultSavedKitName();
}

function setBuilderShareStatus(message) {
  window.clearTimeout(builderShareStatusTimer);
  state.builder.shareStatus = message;
  renderBuilderShareStatus();
  if (message) {
    builderShareStatusTimer = window.setTimeout(() => {
      state.builder.shareStatus = "";
      renderBuilderShareStatus();
    }, 3200);
  }
}

function renderBuilderShareStatus() {
  const status = $("builderShareStatus");
  if (status) status.textContent = state.builder.shareStatus || "";
}

async function kitShareCodec() {
  if (!kitShareCodecPromise) {
    kitShareCodecPromise = import("./kit-share.js").then(({ createKitShareCodec }) => createKitShareCodec({
      slots: BUILDER_SLOTS,
      state,
      itemSlotId,
      defaultPrimaryValuesForItem,
      clampStatEntryValue,
      secondaryOptionsForItem,
      secondaryOptionForItem,
      defaultBonusesForItem,
      normalizeSavedKit,
      defaultSavedKitName,
    }));
  }
  return kitShareCodecPromise;
}

async function kitShareUrl(kit) {
  const codec = await kitShareCodec();
  return `${window.location.origin}/#${codec.encode(kit)}`;
}

async function decodeSharedKitPayload(value) {
  try {
    const codec = await kitShareCodec();
    return codec.decode(value);
  } catch {
    return null;
  }
}

function sharedKitValueFromLocation() {
  const hash = window.location.hash.slice(1);
  return hash.startsWith(SHARED_KIT_BINARY_PREFIX) ? hash : "";
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back to the hidden textarea path when clipboard permission is blocked.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy failed");
}

function builderConfirmKey(action, id = "") {
  return `${action}:${id}`;
}

function isBuilderConfirming(action, id = "") {
  return state.builder.confirmAction === builderConfirmKey(action, id);
}

function clearBuilderConfirmation() {
  state.builder.confirmAction = null;
}

function requestBuilderConfirmation(action, id = "") {
  state.builder.confirmAction = builderConfirmKey(action, id);
  renderBuilder();
}

function currentBuilderKit(name, existing = null) {
  const now = new Date().toISOString();
  return {
    id: existing?.id || savedKitId(),
    name,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    characterId: state.builder.characterId,
    selectedSlot: state.builder.selectedSlot,
    activeWeaponSet: state.builder.activeWeaponSet,
    equipped: cloneJson(state.builder.equipped),
    primaryValues: cloneJson(state.builder.primaryValues),
    bonuses: cloneJson(state.builder.bonuses),
    perks: [...state.builder.perks],
    skinId: state.builder.skinId,
  };
}

function defaultSavedKitName() {
  const character = selectedBuilderCharacter();
  return `${character?.name || "Kit"} ${state.savedKits.length + 1}`;
}

function savedPrimaryValuesForItem(item, values) {
  const defaults = defaultPrimaryValuesForItem(item);
  if (!Array.isArray(values)) return defaults;
  return defaults.map((defaultValue, index) => {
    const entry = item?.primary?.[index];
    return entry ? clampStatEntryValue(entry, values[index]) : defaultValue;
  });
}

function savedBonusesForItem(item, bonuses) {
  return (item?.secondaryPoolIds || []).map((poolId, index) => {
    const entry = Array.isArray(bonuses) ? bonuses[index] : null;
    const option = secondaryOptionForItem(item, poolId, entry?.propertyId);
    const value = entry?.value === "" || entry?.value === undefined || entry?.value === null
      ? Number(option?.max ?? option?.min ?? 0)
      : clampStatEntryValue(option, entry.value);
    return {
      poolId,
      propertyId: option ? entry.propertyId : "",
      value: option ? value : "",
    };
  });
}

function saveCurrentBuilderKit() {
  const input = $("builderKitName");
  const name = currentBuilderKitName();
  const existingIndex = state.savedKits.findIndex((kit) => kit.name.toLowerCase() === name.toLowerCase());
  const existing = existingIndex >= 0 ? state.savedKits[existingIndex] : null;
  const kit = currentBuilderKit(name, existing);
  state.savedKits = existing
    ? state.savedKits.map((row, index) => (index === existingIndex ? kit : row))
    : [kit, ...state.savedKits];
  clearBuilderConfirmation();
  saveSavedKits();
  if (input) input.value = name;
  renderBuilder();
}

function applyBuilderKit(kit) {
  if (!kit) return;
  clearBuilderConfirmation();
  state.builder.characterId = state.kit.characterById.has(kit.characterId)
    ? kit.characterId
    : state.kit.characters[0]?.id || "";
  state.builder.activeWeaponSet = kit.activeWeaponSet === "2" ? "2" : "1";
  state.builder.selectedSlot = BUILDER_SLOTS.some((slot) => slot.id === kit.selectedSlot)
    ? kit.selectedSlot
    : "weapon1Primary";
  state.builder.search = "";
  state.builder.rarity = "All";
  state.builder.pickerOpen = false;
  state.builder.pickerMode = "items";
  const character = selectedBuilderCharacter();
  const allowedPerks = new Set(character?.perks || []);
  state.builder.perks = (kit.perks || [])
    .filter((perkId) => allowedPerks.has(perkId) && state.kit.perkById.has(perkId))
    .slice(0, BUILDER_PERK_LIMIT);

  const equipped = {};
  const primaryValues = {};
  const bonuses = {};
  BUILDER_SLOTS.forEach((slot) => {
    const asset = kit.equipped?.[slot.id];
    const item = state.kit.itemByAsset.get(asset);
    if (!item || !slot.accepts.includes(itemSlotId(item)) || !builderClassAllowsItem(item)) return;
    if (slot.weaponRole === "secondary" && isTwoHandedItem(state.kit.itemByAsset.get(equipped[pairedWeaponSlotId(slot.id)]))) return;
    equipped[slot.id] = asset;
    primaryValues[slot.id] = savedPrimaryValuesForItem(item, kit.primaryValues?.[slot.id]);
    bonuses[slot.id] = savedBonusesForItem(item, kit.bonuses?.[slot.id]);
  });

  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
  state.builder.selectedSlot = builderItemOwnerSlotId(state.builder.selectedSlot);
  state.builder.skinId = state.kit.skinById.has(kit.skinId) ? kit.skinId : "";
  const input = $("builderKitName");
  if (input) input.value = kit.name;
  renderBuilder();
}

function loadBuilderKit(kitId) {
  applyBuilderKit(state.savedKits.find((row) => row.id === kitId));
}

async function shareBuilderKit(kit = currentBuilderKit(currentBuilderKitName())) {
  try {
    await copyText(await kitShareUrl(kit));
    setBuilderShareStatus("Link copied");
  } catch (error) {
    console.error(error);
    setBuilderShareStatus("Could not copy link");
  }
}

async function applySharedBuilderKitFromLocation() {
  const sharedValue = sharedKitValueFromLocation();
  if (!sharedValue) return false;
  await loadKitData();
  const kit = await decodeSharedKitPayload(sharedValue);
  if (!kit) {
    setActiveTab("builder", { render: false });
    state.builder.shareStatus = "Invalid kit link";
    return true;
  }
  setActiveTab("builder", { render: false });
  applyBuilderKit(kit);
  state.builder.shareStatus = "Shared kit loaded";
  return true;
}

function deleteSavedKit(kitId) {
  state.savedKits = state.savedKits.filter((kit) => kit.id !== kitId);
  clearBuilderConfirmation();
  saveSavedKits();
  renderBuilder();
}

function confirmOrDeleteSavedKit(kitId) {
  if (!isBuilderConfirming("delete", kitId)) {
    requestBuilderConfirmation("delete", kitId);
    return;
  }
  deleteSavedKit(kitId);
}

function isFavoriteItem(asset) {
  return state.favoriteItemSet.has(asset);
}

function isFavoriteSource(source, kind) {
  return state.favoriteSourceSet.has(sourceKey(source, kind));
}

function toggleFavoriteItem(asset) {
  const exists = isFavoriteItem(asset);
  state.favorites.items = exists
    ? state.favorites.items.filter((value) => value !== asset)
    : [...state.favorites.items, asset];
  saveFavorites();
  renderFavoriteState();
  renderActiveDetail();
}

function toggleFavoriteSource(source, kind) {
  const key = sourceKey(source, kind);
  const exists = state.favoriteSourceSet.has(key);
  state.favorites.sources = exists
    ? state.favorites.sources.filter((value) => value !== key)
    : [...state.favorites.sources, key];
  saveFavorites();
  renderFavoriteState();
  renderActiveDetail();
}

function versionedUrl(path, version) {
  if (!version) return path;
  const joiner = String(path).includes("?") ? "&" : "?";
  return `${path}${joiner}v=${encodeURIComponent(version)}`;
}

async function fetchJson(path, version = "", options = {}) {
  const response = await fetch(versionedUrl(path, version), options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function dataVersionToken() {
  return [
    state.manifest?.appVersion,
    state.manifest?.generatedAt,
    APP_BUILD_ID,
  ].filter(Boolean).join("-");
}

function optionHtml(values, label = "All") {
  return [`<option>${escapeHtml(label)}</option>`, ...values.map((value) => `<option>${escapeHtml(value)}</option>`)].join("");
}

function mapOptionsForDifficulty(values, diff) {
  const maps = Array.isArray(values) ? values : [];
  if (diff !== "Squire") return maps;
  return SQUIRE_MAPS.filter((map) => maps.includes(map));
}

function allowedMapsForDifficulty(diff) {
  return diff === "Squire" ? SQUIRE_MAP_SET : null;
}

function mapAllowedForDifficulty(map, diff) {
  const allowed = allowedMapsForDifficulty(diff);
  return !allowed || allowed.has(map);
}

function setSelectIfAvailable(id, value) {
  const select = $(id);
  if (!select) return;
  if ([...select.options].some((option) => option.value === value)) select.value = value;
}

function syncMapSelectForDifficulty(mapId, diffId) {
  const filters = state.manifest?.filters || {};
  const mapSelect = $(mapId);
  const diff = selected(diffId);
  if (!mapSelect) return;
  const current = mapSelect.value || "All";
  const maps = mapOptionsForDifficulty(filters.maps || [], diff);
  mapSelect.innerHTML = optionHtml(maps);
  mapSelect.value = current === "All" || maps.includes(current) ? current : "All";
}

function builderSlotById(id) {
  return BUILDER_SLOTS.find((slot) => slot.id === id) || BUILDER_SLOTS[0];
}

function activeWeaponSlotId(role) {
  const set = state.builder.activeWeaponSet || "1";
  return `weapon${set}${role === "secondary" ? "Secondary" : "Primary"}`;
}

function resolveBuilderSlotId(slotId) {
  if (slotId === "activePrimaryWeapon") return activeWeaponSlotId("primary");
  if (slotId === "activeSecondaryWeapon") return activeWeaponSlotId("secondary");
  return slotId;
}

function setSelectedBuilderSlot(slotId) {
  const previousSlot = state.builder.selectedSlot;
  const slot = builderSlotById(slotId);
  clearBuilderConfirmation();
  state.builder.selectedSlot = slot.id;
  if (slot.weaponSet) state.builder.activeWeaponSet = slot.weaponSet;
  if (previousSlot && previousSlot !== slot.id) state.builder.search = "";
}

function itemSlotId(item) {
  return item?.slot?.id || "";
}

function pairedWeaponSlotId(slotId) {
  const slot = builderSlotById(slotId);
  if (!slot.weaponSet) return "";
  return `weapon${slot.weaponSet}${slot.weaponRole === "primary" ? "Secondary" : "Primary"}`;
}

function equippedBuilderItem(slotId) {
  return state.kit.itemByAsset.get(state.builder.equipped[slotId]);
}

function twoHandedOwnerSlotId(slotId) {
  const slot = builderSlotById(slotId);
  if (slot.weaponRole !== "secondary") return "";
  const primarySlotId = pairedWeaponSlotId(slotId);
  return isTwoHandedItem(equippedBuilderItem(primarySlotId)) ? primarySlotId : "";
}

function builderItemOwnerSlotId(slotId) {
  return twoHandedOwnerSlotId(slotId) || slotId;
}

function displayedBuilderItem(slotId) {
  return equippedBuilderItem(builderItemOwnerSlotId(slotId));
}

function weaponSlotBlockReason(slotId) {
  const ownerSlotId = twoHandedOwnerSlotId(slotId);
  const primary = equippedBuilderItem(ownerSlotId);
  return primary ? `${primary.name} occupies both weapon slots` : "";
}

function slotStatsAreActive(slotId) {
  const slot = builderSlotById(slotId);
  return slotContributesStats(slot, state.builder.activeWeaponSet);
}

function itemFitsBuilderSlot(item, slotId) {
  const slot = builderSlotById(slotId);
  if (weaponSlotBlockReason(slot.id)) return false;
  return slot.accepts.includes(itemSlotId(item));
}

function firstBuilderSlotForItem(item) {
  const selectedSlot = state.builder.selectedSlot;
  if (selectedSlot && itemFitsBuilderSlot(item, selectedSlot)) return selectedSlot;
  const emptySlot = BUILDER_SLOTS.find((slot) => itemFitsBuilderSlot(item, slot.id) && !state.builder.equipped[slot.id]);
  if (emptySlot) return emptySlot.id;
  return BUILDER_SLOTS.find((slot) => itemFitsBuilderSlot(item, slot.id))?.id || "";
}

function selectedBuilderCharacter() {
  return state.kit.characterById.get(state.builder.characterId) || state.kit.characters[0] || null;
}

function builderHasPerk(perkId) {
  return state.builder.perks.includes(perkId);
}

function builderItemIsWeapon(item) {
  return item?.itemType === "Weapon" || ["Primary", "Secondary"].includes(itemSlotId(item));
}

function builderItemIsPlateArmor(item) {
  return item?.itemType === "Armor" && item.armorType === "Plate";
}

function builderItemIsSpear(item) {
  return builderItemIsWeapon(item) && /^Id_Item_.*Spear/i.test(item?.asset || "");
}

function builderPerkAllowsItem(item, character, allowedClasses) {
  if (character?.id === "Fighter" && builderHasPerk(BUILDER_WEAPON_MASTERY_PERK_ID) && builderItemIsWeapon(item)) {
    return true;
  }
  if (character?.id === "Warlock" && builderHasPerk(BUILDER_DEMON_ARMOR_PERK_ID) && builderItemIsPlateArmor(item)) {
    return true;
  }
  if (character?.id === "Ranger" && builderHasPerk(BUILDER_SPEAR_PROFICIENCY_PERK_ID) && builderItemIsSpear(item)) {
    return true;
  }
  return false;
}

function builderClassAllowsItem(item) {
  const allowed = item?.allowedClasses || [];
  const character = selectedBuilderCharacter();
  if (!allowed.length || !character) return true;
  return allowed.includes(character.id) || builderPerkAllowsItem(item, character, allowed);
}

function pruneBuilderEquipmentForCurrentRules() {
  const equipped = {};
  const primaryValues = {};
  const bonuses = {};
  BUILDER_SLOTS.forEach((slot) => {
    const asset = state.builder.equipped[slot.id];
    const item = state.kit.itemByAsset.get(asset);
    if (!item || !slot.accepts.includes(itemSlotId(item)) || !builderClassAllowsItem(item)) return;
    if (slot.weaponRole === "secondary" && isTwoHandedItem(state.kit.itemByAsset.get(equipped[pairedWeaponSlotId(slot.id)]))) return;
    equipped[slot.id] = asset;
    if (state.builder.primaryValues[slot.id]) primaryValues[slot.id] = state.builder.primaryValues[slot.id];
    if (state.builder.bonuses[slot.id]) bonuses[slot.id] = state.builder.bonuses[slot.id];
  });
  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
  state.builder.selectedSlot = builderItemOwnerSlotId(state.builder.selectedSlot);
}

function classNamesText(classes) {
  const values = (classes || []).filter(Boolean);
  return values.length ? values.join(", ") : "All classes";
}

function assetFileToken(value) {
  return String(value || "")
    .replace(/^Id_Perk_/, "")
    .replace(/^Id_PlayerCharacter_/, "")
    .replace(/^ClassIcon_[SLX]+_/, "")
    .replace(/[^a-z0-9]/gi, "");
}

function classIconUrl(row, size = "S") {
  if (row?.iconUrl) return row.iconUrl;
  const token = assetFileToken(row?.id || row?.name || "Common");
  return `/assets/class-icons/ClassIcon_${size}_${token || "Common"}.png`;
}

function perkIconUrl(perk) {
  if (perk?.iconUrl) return perk.iconUrl;
  const token = PERK_ICON_ALIASES[perk?.id] || assetFileToken(perk?.id || perk?.name);
  return `/assets/perk-icons/Icon_Perk_${token}.png`;
}

function iconImage(url, className, title) {
  return `
    <span class="${escapeHtml(className)}" title="${escapeHtml(title)}" aria-hidden="true">
      <img src="${escapeHtml(url)}" alt="" loading="lazy">
    </span>
  `;
}

function builderChestArmorEquipped() {
  return Boolean(state.kit.itemByAsset.get(state.builder.equipped.chest));
}

function builderPerkStatsArePassive(perk) {
  return perk && perk.id !== BUILDER_SAVAGE_PERK_ID;
}

function builderPerkStatEntries(perk) {
  if (!perk) return [];
  if (Object.prototype.hasOwnProperty.call(BUILDER_PERK_STAT_OVERRIDES, perk.id)) {
    if (perk.id === BUILDER_SAVAGE_PERK_ID && builderChestArmorEquipped()) return [];
    return BUILDER_PERK_STAT_OVERRIDES[perk.id];
  }
  return perk.stats || [];
}

function builderPerkSummary(perk) {
  if (!perk) return BUILDER_NO_STAT_PERK_SUMMARY;
  if (BUILDER_PERK_SUMMARIES[perk.id]) return BUILDER_PERK_SUMMARIES[perk.id];
  const entries = builderPerkStatEntries(perk);
  if (entries.length) return entries.map((stat) => `${stat.label} ${statValue(stat.value, stat.unit)}`).join(", ");
  return BUILDER_NO_STAT_PERK_SUMMARY;
}

function statLabel(key) {
  return String(key || "")
    .replace(/MagicRegistance/g, "MagicResistance")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function statRank(key) {
  const index = BUILDER_STAT_ORDER.indexOf(key);
  return index === -1 ? BUILDER_STAT_ORDER.length : index;
}

function statValue(value, unit = "") {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  const decimals = unit === "%" ? 1 : 2;
  const formatted = Math.abs(number % 1) < 0.0001
    ? number.toLocaleString()
    : number.toFixed(decimals).replace(/\.?0+$/, "");
  return `${formatted}${unit || ""}`;
}

function statRange(entry) {
  const min = Number(entry?.min ?? 0);
  const max = Number(entry?.max ?? min);
  if (Math.abs(min - max) < 0.0001) return statValue(max, entry?.unit);
  return `${statValue(min, entry?.unit)}-${statValue(max, entry?.unit)}`;
}

function statStep(entry) {
  return entry?.unit === "%" ? "0.1" : "1";
}

function clampStatEntryValue(entry, value) {
  return normalizedStatEntryValue(entry, value);
}

function defaultPrimaryValuesForItem(item) {
  return (item?.primary || []).map((entry) => Number(entry.max ?? entry.min ?? 0));
}

function selectedPrimaryEntry(slotId, index) {
  const item = equippedBuilderItem(slotId);
  const entry = item?.primary?.[index];
  if (!entry) return null;
  const stored = state.builder.primaryValues[slotId]?.[index];
  const value = stored === "" || stored == null
    ? Number(entry.max ?? entry.min ?? 0)
    : clampStatEntryValue(entry, stored);
  return { ...entry, value };
}

function statIdentity(entry) {
  return entry?.statKey || entry?.propertyId || "";
}

function primaryStatIdentitiesForItem(item) {
  return new Set((item?.primary || []).map((entry) => entry?.propertyId).filter(Boolean));
}

function bonusOptionText(option) {
  return option?.label || statLabel(statIdentity(option));
}

function bonusOptionSearchText(option) {
  return [
    bonusOptionText(option),
    statRange(option),
    option?.statKey,
    option?.propertyId,
  ].filter(Boolean).join(" ");
}

function cachedSecondaryOptions(item, poolId) {
  if (!item || typeof item !== "object") return emptySecondaryOptions;
  let itemCache = secondaryOptionsCache.get(item);
  if (!itemCache) {
    itemCache = new Map();
    secondaryOptionsCache.set(item, itemCache);
  }
  const cacheKey = String(poolId || "");
  const cached = itemCache.get(cacheKey);
  if (cached) return cached;
  const pool = state.kit.secondaryPools[poolId];
  const primaryStats = primaryStatIdentitiesForItem(item);
  const options = (pool?.options || [])
    .filter((option) => !primaryStats.has(statIdentity(option)))
    .sort((a, b) => {
      const labelCompare = bonusOptionText(a).localeCompare(bonusOptionText(b), undefined, { sensitivity: "base" });
      if (labelCompare) return labelCompare;
      return String(a.propertyId || "").localeCompare(String(b.propertyId || ""));
    });
  const result = {
    options,
    byId: new Map(options.map((option) => [option.propertyId, option])),
  };
  itemCache.set(cacheKey, result);
  return result;
}

function secondaryOptionsForItem(item, poolId) {
  return cachedSecondaryOptions(item, poolId).options;
}

function secondaryOptionForItem(item, poolId, propertyId) {
  return cachedSecondaryOptions(item, poolId).byId.get(propertyId) || null;
}

function addBuilderStat(totals, entry, source) {
  const value = Number(entry?.value ?? entry?.max ?? entry?.min ?? 0);
  if (!Number.isFinite(value) || value === 0) return;
  const key = entry.statKey || entry.propertyId || "Unknown";
  const current = totals.get(key) || { key, label: entry.label || statLabel(key), value: 0, unit: entry.unit || "", sources: [] };
  current.value += value;
  current.sources.push({ source, value, label: entry.label || statLabel(key) });
  totals.set(key, current);
}

function addItemStats(totals, slotId, item) {
  if (!item) return;
  (item.primary || []).forEach((entry, index) => {
    addBuilderStat(totals, selectedPrimaryEntry(slotId, index) || { ...entry, value: entry.max ?? entry.min }, item.name);
  });
  (item.secondaryPoolIds || []).forEach((_poolId, index) => {
    const entry = selectedBonusEntry(slotId, index);
    if (entry) addBuilderStat(totals, entry, item.name);
  });
}

function selectedBonusEntry(slotId, index) {
  const entry = state.builder.bonuses[slotId]?.[index];
  if (!entry?.propertyId) return null;
  const item = equippedBuilderItem(slotId);
  const poolId = entry.poolId || item?.secondaryPoolIds?.[index];
  const option = secondaryOptionForItem(item, poolId, entry.propertyId);
  if (!option) return null;
  const value = Number(entry.value);
  return {
    ...option,
    value: Number.isFinite(value) ? value : Number(option.max ?? option.min ?? 0),
  };
}

function addActivePerkStats(totals) {
  state.builder.perks.forEach((perkId) => {
    const perk = state.kit.perkById.get(perkId);
    builderPerkStatEntries(perk).forEach((entry) => addBuilderStat(totals, entry, perk?.name || "Perk"));
  });
}

function selectedBuilderSkin() {
  return state.kit.skinById.get(state.builder.skinId) || null;
}

function addActiveSkinStats(totals) {
  const skin = selectedBuilderSkin();
  (skin?.stats || []).forEach((entry) => addBuilderStat(totals, entry, skin.name || "Skin"));
}

function addDynamicPerkStats(totals) {
  if (builderHasPerk(BUILDER_LORE_MASTERY_PERK_ID)) {
    addBuilderStat(totals, {
      statKey: "Knowledge",
      label: "Knowledge",
      value: loreMasteryKnowledgeBonus(
        directStatValue(totals, "Resourcefulness"),
        BUILDER_LORE_MASTERY_RESOURCEFULNESS_TO_KNOWLEDGE,
      ),
    }, "Lore Mastery");
  }
}

function builderStatMap() {
  const totals = new Map();
  const character = selectedBuilderCharacter();
  (character?.baseStats || []).forEach((entry) => addBuilderStat(totals, entry, character.name));
  Object.entries(state.builder.equipped).forEach(([slotId, asset]) => {
    if (!slotStatsAreActive(slotId)) return;
    const item = state.kit.itemByAsset.get(asset);
    addItemStats(totals, slotId, item);
  });
  addActivePerkStats(totals);
  addActiveSkinStats(totals);
  addDynamicPerkStats(totals);
  const armorMoveSpeedPenalty = activeArmorMoveSpeedPenalty();
  const armorMoveSpeedPenaltyReduction = directStatValue(totals, "MoveSpeedArmorPenaltyReduction");
  if (armorMoveSpeedPenalty < 0 && armorMoveSpeedPenaltyReduction > 0) {
    addBuilderStat(totals, {
      statKey: "MoveSpeed",
      label: "Move Speed",
      value: Math.abs(armorMoveSpeedPenalty) * (armorMoveSpeedPenaltyReduction / 100),
    }, "Swift");
  }
  return totals;
}

function itemStatTotal(slotId, statKey) {
  const resolvedSlotId = resolveBuilderSlotId(slotId);
  const item = state.kit.itemByAsset.get(state.builder.equipped[resolvedSlotId]);
  if (!item || !statKey) return { value: defaultSlotStatValue(resolvedSlotId, statKey), unit: "" };
  const totals = new Map();
  addItemStats(totals, resolvedSlotId, item);
  const keys = STAT_CONTRIBUTION_KEYS[statKey] || [statKey];
  const matching = keys.map((key) => totals.get(key)).filter(Boolean);
  if (!matching.length) return { value: 0, unit: "" };
  return {
    ...matching[0],
    key: statKey,
    value: directStatValue(totals, ...keys),
  };
}

function activeWeaponStatValue(slotId, statKey) {
  const resolvedSlotId = resolveBuilderSlotId(slotId);
  const item = state.kit.itemByAsset.get(state.builder.equipped[resolvedSlotId]);
  if (!item || !statKey) return defaultSlotStatValue(resolvedSlotId, statKey);
  const totals = new Map();
  addItemStats(totals, resolvedSlotId, item);
  return directStatValue(totals, statKey);
}

function defaultSlotStatValue(slotId, statKey) {
  if (builderSlotById(slotId).weaponRole !== "primary") return 0;
  if (statKey === "PhysicalWeaponDamage") return BUILDER_DEFAULTS.primaryUnarmedDamage;
  if (statKey === "ImpactPower") return BUILDER_DEFAULTS.primaryUnarmedImpactPower;
  return 0;
}

function directStatValue(totals, ...keys) {
  return keys.reduce((sum, key) => sum + Number(totals.get(key)?.value || 0), 0);
}

function statValueWithPercentMod(totals, statKey, modKey) {
  return directStatValue(totals, statKey) * (1 + (directStatValue(totals, modKey) / 100));
}

function activeArmorMoveSpeedPenalty() {
  return Object.entries(state.builder.equipped).reduce((sum, [slotId, asset]) => {
    if (!slotStatsAreActive(slotId)) return sum;
    const item = state.kit.itemByAsset.get(asset);
    if (item?.itemType !== "Armor") return sum;
    const primaryPenalty = (item.primary || []).reduce((primarySum, _entry, index) => {
      const selected = selectedPrimaryEntry(slotId, index);
      return selected?.statKey === "MoveSpeed" && Number(selected.value) < 0
        ? primarySum + Number(selected.value)
        : primarySum;
    }, 0);
    const secondaryPenalty = (item.secondaryPoolIds || []).reduce((secondarySum, _poolId, index) => {
      const selected = selectedBonusEntry(slotId, index);
      return selected?.statKey === "MoveSpeed" && Number(selected.value) < 0
        ? secondarySum + Number(selected.value)
        : secondarySum;
    }, 0);
    return sum + primaryPenalty + secondaryPenalty;
  }, 0);
}

function curveKeys(tableName, rowName) {
  const keys = state.kit.curveTables?.[tableName]?.[rowName];
  return Array.isArray(keys) ? keys : [];
}

function curveValue(tableName, rowName, input, fallback = 0) {
  return interpolateCurve(curveKeys(tableName, rowName), input, fallback);
}

function curvePercent(tableName, rowName, input) {
  return curveValue(tableName, rowName, input) * 100;
}

function builderDerivedStatValues(totals, character) {
  const values = new Map();
  BUILDER_STAT_ROWS.forEach((row) => {
    if (row.type !== "text") values.set(row.key, directStatValue(totals, row.sourceKey || row.key));
  });

  const strength = directStatValue(totals, "Strength");
  const vigor = directStatValue(totals, "Vigor");
  const agility = directStatValue(totals, "Agility");
  const dexterity = directStatValue(totals, "Dexterity");
  const will = statValueWithPercentMod(totals, "Will", "WillMod");
  const knowledge = statValueWithPercentMod(totals, "Knowledge", "KnowledgeMod");
  const resourcefulness = directStatValue(totals, "Resourcefulness");
  values.set("Will", will);
  values.set("Knowledge", knowledge);

  const healthRating = maxHealthRating(strength, vigor);
  const baseHealth = curveValue(
    "CT_MaxHealthBase",
    "MaxHealthBase",
    healthRating,
    character ? 70 : 0,
  );
  values.set("Health", finalHealth(
    baseHealth,
    directStatValue(totals, "MaxHealthBaseAdd"),
    directStatValue(totals, "MaxHealthBonus"),
    directStatValue(totals, "Health"),
  ));
  const magicalHealing = directStatValue(totals, "MagicalHealing") * (1 + (directStatValue(totals, "MagicalHealingBonus", "MagicalHealMod") / 100));
  values.set("MagicalHealing", magicalHealing);

  const moveSpeed = (directStatValue(totals, "MoveSpeed") + curveValue("CT_Agility", "MoveSpeedBase", agility))
    * (1 + (directStatValue(totals, "MoveSpeedBonus") / 100));
  values.set("MoveSpeed", Math.round(moveSpeed));

  const actionSpeedInput = (dexterity * 0.75) + (agility * 0.25);
  values.set("ActionSpeed", curvePercent("CT_ActionSpeed", "ActionSpeed", actionSpeedInput) + directStatValue(totals, "ActionSpeed", "ActionSpeedBonus"));
  values.set("ManualDexterity", curvePercent("CT_Dexterity", "ManualDexterity", dexterity) + directStatValue(totals, "ManualDexterity", "ManualDexterityBonus"));
  values.set("SpellCastingSpeed", curvePercent("CT_Knowledge", "SpellCastingSpeed", knowledge) + directStatValue(totals, "SpellCastingSpeed", "SpellCastingSpeedBonus"));
  values.set("EquipSpeed", curvePercent("CT_Dexterity", "ItemEquipSpeed", dexterity) + directStatValue(totals, "EquipSpeed", "EquipSpeedBonus"));
  values.set("RegularInteractionSpeed", curvePercent("CT_RegularInteractionSpeedBase", "RegularInteractionSpeed", resourcefulness) + directStatValue(totals, "RegularInteractionSpeed", "RegularInteractionSpeedBonus"));
  values.set("MagicalInteractionSpeed", curvePercent("CT_Will", "MagicalInteractionSpeed", will) + directStatValue(totals, "MagicalInteractionSpeed", "MagicalInteractionSpeedBonus"));
  values.set("HealthRecoveryBonus", curvePercent("CT_RecoveryMod", "HealthRecoveryMod", vigor) + directStatValue(totals, "HealthRecoveryBonus"));
  values.set("SpellRecoveryBonus", curvePercent("CT_RecoveryMod", "MemoryRecoveryMod", knowledge) + directStatValue(totals, "SpellRecoveryBonus"));
  values.set("MemoryCapacity", finalMemoryCapacity(
    curveValue("CT_Knowledge", "MemoryCapacity", knowledge),
    directStatValue(totals, "MemoryCapacityBonus"),
    directStatValue(totals, "MemoryCapacity"),
  ));
  values.set("Persuasiveness", curveValue("CT_Resourcefulness", "Persuasiveness", resourcefulness) + directStatValue(totals, "Persuasiveness"));
  values.set("BuffDurationBonus", curvePercent("CT_Will", "BuffDurationMod", will) + directStatValue(totals, "BuffDurationBonus"));
  values.set("DebuffDurationBonus", curvePercent("CT_Will", "DebuffDurationMod", will) + directStatValue(totals, "DebuffDurationBonus"));
  values.set("CooldownReductionBonus", curvePercent("CT_Resourcefulness", "CooldownReduction", resourcefulness) + directStatValue(totals, "CooldownReductionBonus"));

  const physicalPower = curveValue("CT_Strength", "PhysicalPower", strength) + directStatValue(totals, "PhysicalPower");
  const physicalDamageFromPower = curvePercent("CT_PhysicalPower", "PhysicalDamageMod", physicalPower);
  const physicalDamageFromBonuses = directStatValue(totals, "PhysicalDamageBonus");
  values.set("PhysicalDamageBonus", physicalDamageFromPower + physicalDamageFromBonuses);
  values.set("PhysicalDamageBonusFromPower", physicalDamageFromPower);
  values.set("PhysicalDamageBonusFromBonuses", physicalDamageFromBonuses);

  const magicalPower = curveValue("CT_Will", "MagicalPower", will) + directStatValue(totals, "MagicalPower");
  const magicalDamageFromPower = curvePercent("CT_MagicalPower", "MagicalDamageMod", magicalPower);
  const magicalDamageFromBonuses = directStatValue(totals, "MagicalDamageBonus");
  values.set("MagicalDamageBonus", magicalDamageFromPower + magicalDamageFromBonuses);
  values.set("MagicalDamageBonusFromPower", magicalDamageFromPower);
  values.set("MagicalDamageBonusFromBonuses", magicalDamageFromBonuses);

  const armorRating = statValueWithPercentMod(totals, "ArmorRating", "ItemArmorRatingMod");
  values.set("ArmorRating", armorRating);
  const physicalReductionFromArmor = curvePercent("CT_ArmorRating", "PhysicalReduction", armorRating);
  const physicalReductionFromBonuses = directStatValue(totals, "PhysicalArmorReduction", "PhysicalArmorReductionBonus");
  values.set("PhysicalArmorReduction", physicalReductionFromArmor + physicalReductionFromBonuses);
  values.set("PhysicalArmorReductionFromArmor", physicalReductionFromArmor);
  values.set("PhysicalArmorReductionBonus", physicalReductionFromBonuses);

  const magicResistance = curveValue("CT_Will", "MagicResistance", will) + directStatValue(totals, "MagicResistance", "MagicalResistance");
  values.set("MagicResistance", magicResistance);
  const magicalReductionFromResistance = curvePercent("CT_MagicResistance", "MagicalReduction", magicResistance);
  const magicalReductionFromBonuses = directStatValue(totals, "MagicalDamageReduction", "MagicalDamageReductionBonus");
  const magicalReductionCap = builderHasPerk(BUILDER_IRON_WILL_PERK_ID) ? 75 : 65;
  values.set("MagicalDamageReduction", Math.min(magicalReductionCap, magicalReductionFromResistance + magicalReductionFromBonuses));
  values.set("MagicalDamageReductionFromResistance", Math.min(magicalReductionCap, magicalReductionFromResistance));
  values.set("MagicalDamageReductionBonus", magicalReductionFromBonuses);
  values.set("HeadshotDamageBonus", BUILDER_DEFAULTS.headshotDamageBonus + directStatValue(totals, "HeadshotDamageBonus"));

  return values;
}

function builderStatRows() {
  const totals = builderStatMap();
  const character = selectedBuilderCharacter();
  const derived = builderDerivedStatValues(totals, character);
  return BUILDER_STAT_ROWS.map((row) => {
    const slotId = row.slot ? resolveBuilderSlotId(row.slot) : "";
    if (row.type === "text") {
      const item = state.kit.itemByAsset.get(state.builder.equipped[slotId]);
      const fallback = builderSlotById(slotId).weaponRole === "primary" ? "Bare Hands" : "None";
      return { ...row, value: item?.name || fallback };
    }
    const source = row.slot && row.sourceKey
      ? itemStatTotal(slotId, row.sourceKey)
      : totals.get(row.sourceKey || row.key);
    const value = row.slot && row.sourceKey
      ? Number(source?.value || 0)
      : Number(derived.get(row.key) ?? source?.value ?? 0);
    return {
      ...row,
      value,
      unit: row.unit ?? source?.unit ?? "",
    };
  });
}

function builderStatTotals(rows = builderStatRows()) {
  return rows
    .filter((row) => row.type !== "text" && Number(row.value) !== 0)
    .sort((left, right) => {
      const rank = statRank(left.key) - statRank(right.key);
      if (rank) return rank;
      return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
    });
}

function clampPercentInput(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(-100, Math.min(100, parsed));
}

function clampNumberInput(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function damageNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return Math.abs(number % 1) < 0.0001
    ? number.toLocaleString()
    : number.toFixed(2).replace(/\.?0+$/, "");
}

function damageOutputNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return Math.round(number).toLocaleString();
}

function effectiveTargetReductionMultiplier(targetReduction, penetration) {
  const effectiveReduction = clampPercentInput(targetReduction, 0) * (1 - (clampNumberInput(penetration, 0, 0, 100) / 100));
  return (100 - effectiveReduction) / 100;
}

function damageHandRole() {
  return state.damageTarget.hand === "secondary" ? "secondary" : "primary";
}

function damageWeaponSet() {
  return state.damageTarget.weaponSet === "2" ? "2" : "1";
}

function damageHandSlotId() {
  return `weapon${damageWeaponSet()}${damageHandRole() === "secondary" ? "Secondary" : "Primary"}`;
}

function damageHandLabel() {
  return damageHandRole() === "secondary" ? "Secondary" : "Primary";
}

function damageWeaponSetLabel() {
  return damageWeaponSet() === "2" ? "Set 2" : "Set 1";
}

function damageHitLocation() {
  const value = String(state.damageTarget.hitLocation || DAMAGE_TARGET_DEFAULTS.hitLocation);
  return DAMAGE_HIT_LOCATIONS.find((location) => location.value === value) || DAMAGE_HIT_LOCATIONS[1];
}

function damageHitLocationMultiplier(derived) {
  const location = damageHitLocation();
  if (location.value === "head") {
    return Math.max(0, Number(derived.get("HeadshotDamageBonus") || BUILDER_DEFAULTS.headshotDamageBonus) / 100);
  }
  return Number(location.multiplier ?? 1);
}

function damageStatMap(handSlotId) {
  const totals = builderStatMap();
  const item = state.kit.itemByAsset.get(state.builder.equipped[handSlotId]);
  if (item) addItemStats(totals, handSlotId, item);
  return totals;
}

function builderDamageOutput() {
  const handSlotId = damageHandSlotId();
  const totals = damageStatMap(handSlotId);
  const derived = builderDerivedStatValues(totals, selectedBuilderCharacter());
  const handItem = state.kit.itemByAsset.get(state.builder.equipped[handSlotId]);
  const physicalWeaponBase = activeWeaponStatValue(handSlotId, "PhysicalWeaponDamage");
  const additionalWeapon = activeWeaponStatValue(handSlotId, "AdditionalWeaponDamage");
  const physicalWeapon = physicalWeaponBase + additionalWeapon;
  const magicalWeapon = activeWeaponStatValue(handSlotId, "MagicalWeaponDamage");
  const magicalBase = activeWeaponStatValue(handSlotId, "MagicalDamage");
  const physicalAdd = directStatValue(totals, "PhysicalDamageAdd");
  const magicalAdd = directStatValue(totals, "MagicalDamageAdd");
  const truePhysical = directStatValue(totals, "PhysicalDamageTrue");
  const trueMagical = directStatValue(totals, "MagicalDamageTrue");
  const physicalBonus = Number(derived.get("PhysicalDamageBonus") || 0);
  const magicalBonus = Number(derived.get("MagicalDamageBonus") || 0);
  const armorPenetration = directStatValue(totals, "ArmorPenetration");
  const magicPenetration = directStatValue(totals, "MagicPenetration");
  const hitLocation = damageHitLocation();
  const locationMultiplier = damageHitLocationMultiplier(derived);
  const locationModifier = locationMultiplier - 1;
  const comboMultiplier = clampNumberInput(state.damageTarget.comboMultiplier, DAMAGE_TARGET_DEFAULTS.comboMultiplier, -1, 10);
  const pdr = clampPercentInput(state.damageTarget.pdr, DAMAGE_TARGET_DEFAULTS.pdr);
  const mdr = clampPercentInput(state.damageTarget.mdr, DAMAGE_TARGET_DEFAULTS.mdr);
  const physicalComboBase = physicalWeaponBase * (1 + comboMultiplier);
  const physicalEnchantedBase = physicalComboBase + additionalWeapon;
  const physicalHitBase = physicalEnchantedBase * (1 + (physicalBonus / 100)) + physicalAdd;
  const magicalHitBase = magicalWeapon + magicalBase + magicalAdd;
  const physicalBeforeReduction = physicalHitBase * (1 + locationModifier);
  const magicalBeforeReduction = magicalHitBase * locationMultiplier * (1 + (magicalBonus / 100));
  const physicalMitigationMultiplier = effectiveTargetReductionMultiplier(pdr, armorPenetration);
  const magicalMitigationMultiplier = effectiveTargetReductionMultiplier(mdr, magicPenetration);
  const physicalAfterReduction = Math.max(0, physicalBeforeReduction * physicalMitigationMultiplier) + truePhysical;
  const magicalAfterReduction = Math.max(0, magicalBeforeReduction * magicalMitigationMultiplier) + trueMagical;
  return {
    handLabel: damageHandLabel(),
    handName: handItem?.name || (damageHandRole() === "primary" ? "Bare Hands" : "None"),
    physical: {
      weaponBase: physicalWeaponBase,
      additionalWeapon,
      weapon: physicalWeapon,
      comboMultiplier,
      enchantedBase: physicalEnchantedBase,
      add: physicalAdd,
      hitBase: physicalHitBase,
      locationLabel: hitLocation.label,
      locationMultiplier,
      locationModifier,
      bonus: physicalBonus,
      trueDamage: truePhysical,
      targetReduction: pdr,
      penetration: armorPenetration,
      mitigationMultiplier: physicalMitigationMultiplier,
      beforeReduction: physicalBeforeReduction,
      afterReduction: physicalAfterReduction,
    },
    magical: {
      weapon: magicalWeapon,
      base: magicalBase,
      add: magicalAdd,
      hitBase: magicalHitBase,
      locationLabel: hitLocation.label,
      locationMultiplier,
      bonus: magicalBonus,
      trueDamage: trueMagical,
      targetReduction: mdr,
      penetration: magicPenetration,
      mitigationMultiplier: magicalMitigationMultiplier,
      beforeReduction: magicalBeforeReduction,
      afterReduction: magicalAfterReduction,
    },
    total: physicalAfterReduction + magicalAfterReduction,
  };
}

function damageBreakdownRows(section) {
  const additionalLabel = section.weaponBase == null ? "Additional Magical Damage" : "Additional Physical Damage";
  const baseRows = section.weaponBase == null && section.base != null
    ? [
      ["Magical Weapon Damage", section.weapon],
      ["Magical Damage", section.base],
    ]
    : section.weaponBase == null
      ? [["Base", section.weapon]]
      : [
      ["Base Damage", section.weaponBase],
      ["Combo Multiplier", `${damageNumber((section.comboMultiplier || 0) * 100)}%`],
      ["Weapon Damage Enchants", section.additionalWeapon],
      ["Weapon Damage After Combo", section.enchantedBase],
    ];
  return [
    ...baseRows,
    ["Power Bonus", `${damageNumber(section.bonus)}%`],
    [additionalLabel, section.add],
    ["Weapon Hit", section.hitBase],
    [section.locationLabel || "Hit Location", `${damageNumber(((section.locationModifier ?? ((section.locationMultiplier || 1) - 1)) * 100))}%`],
    ["Before Mitigation", section.beforeReduction],
    ["Target Reduction", `${damageNumber(section.targetReduction)}%`],
    ["Penetration", `${damageNumber(section.penetration || 0)}%`],
    ["Mitigation Multiplier", `${damageNumber((section.mitigationMultiplier || 1) * 100)}%`],
    ["True Damage", section.trueDamage],
    ["Output", damageOutputNumber(section.afterReduction)],
  ];
}

function damageBreakdownHtml(title, section) {
  return `
    <section class="damage-card">
      <h3>${escapeHtml(title)}</h3>
      <strong>${escapeHtml(damageOutputNumber(section.afterReduction))}</strong>
      <div class="damage-breakdown">
        ${damageBreakdownRows(section).map(([label, value]) => `
          <span>${escapeHtml(label)}</span>
          <b>${escapeHtml(typeof value === "string" ? value : damageNumber(value))}</b>
        `).join("")}
      </div>
    </section>
  `;
}

function damageHandOptions() {
  const weaponSet = damageWeaponSet();
  const primary = state.kit.itemByAsset.get(state.builder.equipped[`weapon${weaponSet}Primary`]);
  const secondary = state.kit.itemByAsset.get(state.builder.equipped[`weapon${weaponSet}Secondary`]);
  const secondaryBlocked = isTwoHandedItem(primary);
  return [
    {
      value: "primary",
      label: `Primary - ${primary?.name || "Bare Hands"}`,
      disabled: false,
    },
    {
      value: "secondary",
      label: secondaryBlocked ? "Secondary - blocked by two-handed weapon" : `Secondary - ${secondary?.name || "None"}`,
      disabled: secondaryBlocked,
    },
  ];
}

function renderDamageChecker(focusKey = "") {
  const target = $("damageCheckerContent");
  if (!target) return;
  if (!state.damageTarget.weaponSet) {
    state.damageTarget = { ...state.damageTarget, weaponSet: state.builder.activeWeaponSet === "2" ? "2" : "1" };
  }
  if (damageHandOptions().find((option) => option.value === damageHandRole())?.disabled) {
    state.damageTarget = { ...state.damageTarget, hand: "primary" };
  }
  const output = builderDamageOutput();
  $("damageDialogMeta").textContent = `${DAMAGE_TARGET_DEFAULTS.name} target, ${damageWeaponSetLabel()}: ${output.handLabel} (${output.handName})`;
  const handOptions = damageHandOptions();
  target.innerHTML = `
    <div class="damage-target-controls">
      <label>Set
        <select data-damage-weapon-set>
          <option value="1" ${damageWeaponSet() === "1" ? "selected" : ""}>Weapon Set 1</option>
          <option value="2" ${damageWeaponSet() === "2" ? "selected" : ""}>Weapon Set 2</option>
        </select>
      </label>
      <label>Hand
        <select data-damage-hand>
          ${handOptions.map((option) => `
            <option value="${escapeHtml(option.value)}" ${option.value === damageHandRole() ? "selected" : ""} ${option.disabled ? "disabled" : ""}>
              ${escapeHtml(option.label)}
            </option>
          `).join("")}
        </select>
      </label>
      <label>Body Part
        <select data-damage-location>
          ${DAMAGE_HIT_LOCATIONS.map((location) => `
            <option value="${escapeHtml(location.value)}" ${location.value === damageHitLocation().value ? "selected" : ""}>
              ${escapeHtml(location.label)}
            </option>
          `).join("")}
        </select>
      </label>
      <label>Combo
        <input type="number" min="-1" max="10" step="0.01" value="${escapeHtml(state.damageTarget.comboMultiplier)}" data-damage-target="comboMultiplier">
      </label>
      <label>PDR
        <input type="number" min="-100" max="100" step="0.1" value="${escapeHtml(state.damageTarget.pdr)}" data-damage-target="pdr">
      </label>
      <label>MDR
        <input type="number" min="-100" max="100" step="0.1" value="${escapeHtml(state.damageTarget.mdr)}" data-damage-target="mdr">
      </label>
      <button type="button" data-reset-damage-target>Reset Dummy</button>
    </div>
    <div class="damage-total">
      <span>Total Output</span>
      <strong>${escapeHtml(damageOutputNumber(output.total))}</strong>
    </div>
    <div class="damage-grid">
      ${damageBreakdownHtml("Physical", output.physical)}
      ${damageBreakdownHtml("Magical", output.magical)}
    </div>
  `;
  if (focusKey) {
    const input = target.querySelector(`[data-damage-target="${CSS.escape(focusKey)}"]`);
    if (input) {
      input.focus();
      if (typeof input.setSelectionRange === "function" && input.type !== "number") {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }
}

function openDamageChecker() {
  renderDamageChecker();
  $("damageDialog")?.showModal();
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
  syncMapSelectForDifficulty("itemMap", "itemDiff");
  syncMapSelectForDifficulty("sourceMap", "sourceDiff");
}

function fillBuilderFilters() {
  const builderRarities = [...new Set(state.kit.items.map((row) => row.rarity).filter(Boolean))]
    .sort((left, right) => rarityRank(left) - rarityRank(right));
  $("builderRarity").innerHTML = optionHtml(builderRarities);
  $("builderCharacter").innerHTML = state.kit.characters.length
    ? state.kit.characters.map((character) => `<option value="${escapeHtml(character.id)}">${escapeHtml(character.name)}</option>`).join("")
    : `<option value="">No character data</option>`;
  $("builderSkin").innerHTML = [
    `<option value="">No skin</option>`,
    ...state.kit.characterSkins.map((skin) => `<option value="${escapeHtml(skin.id)}">${escapeHtml(skin.name)}</option>`),
  ].join("");
  setSelectIfAvailable("builderRarity", state.builder.rarity);
  setSelectIfAvailable("builderCharacter", state.builder.characterId);
  setSelectIfAvailable("builderSkin", state.builder.skinId);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function loadData() {
  loadFavorites();
  loadSavedKits();
  state.manifest = await fetchJson("/data/manifest.json", `${APP_BUILD_ID}-${Date.now()}`, { cache: "no-store" });
  state.currentLuck = clampLuck(state.manifest.luck ?? 0);
  const dataVersion = dataVersionToken();
  const [items, sources] = await Promise.all([
    fetchJson(state.manifest.files.items, dataVersion),
    fetchJson(state.manifest.files.sources, dataVersion),
  ]);
  state.items = items.rows || [];
  state.sources = sources.rows || [];
  state.itemSearchIndex = buildSearchIndex(state.items, itemSearchGroups);
  state.sourceSearchIndex = buildSearchIndex(state.sources, sourceSearchGroups);
  state.itemByAsset = new Map(state.items.map((row) => [row.itemAsset, row]));
  state.sourceByKey = new Map(state.sources.map((row) => [sourceKey(row.source, row.sourceKind), row]));
  $("dataStatus").textContent = `${state.items.length.toLocaleString()} items indexed`;
  $("datasetSummary").textContent = `${state.sources.length.toLocaleString()} sources | Hotfix #120`;
  $("updatedAt").textContent = formatDate(SITE_UPDATED_AT);
  fillFilters();
  const initialRoute = readRoute();
  applyRouteControls(initialRoute);
  const sharedKitApplied = await applySharedBuilderKitFromLocation();
  render();
  if (!sharedKitApplied) await openRouteDetail(initialRoute);
  if (state.currentLuck > 0) ensureRatesData().then(renderActiveDetail).catch(console.error);
  document.querySelector(".seo-route-summary")?.remove();
  $("appLoading").classList.add("ready");
}

async function ensureRatesData() {
  if (Object.keys(state.rateWeights).length) return state.rateWeights;
  if (!state.ratesPromise) {
    state.ratesPromise = fetchJson(state.manifest.files.rates, dataVersionToken())
      .then((rates) => {
        state.rateWeights = rates.rows || {};
        return state.rateWeights;
      })
      .catch((error) => {
        state.ratesPromise = null;
        throw error;
      });
  }
  return state.ratesPromise;
}

async function loadKitData() {
  if (state.kitReady) return state.kit;
  if (!state.kitPromise) {
    state.kitPromise = (async () => {
      const kit = state.manifest.files.kit ? await fetchJson(state.manifest.files.kit, dataVersionToken()) : {};
      const kitItems = kit.items || [];
      const kitCharacters = kit.characters || [];
      const kitSkins = kit.characterSkins || [];
      const kitPerks = kit.perks || [];
      state.kit = {
        items: kitItems,
        itemByAsset: new Map(kitItems.map((row) => [row.asset, row])),
        secondaryPools: kit.secondaryPools || {},
        curveTables: kit.curveTables || {},
        characters: kitCharacters,
        characterById: new Map(kitCharacters.map((row) => [row.id, row])),
        characterSkins: kitSkins,
        skinById: new Map(kitSkins.map((row) => [row.id, row])),
        perks: kitPerks,
        perkById: new Map(kitPerks.map((row) => [row.id, row])),
      };
      state.kitSearchIndex = buildSearchIndex(kitItems, builderItemSearchGroups);
      state.builder.characterId = state.builder.characterId || kitCharacters[0]?.id || "";
      state.kitReady = true;
      fillBuilderFilters();
      return state.kit;
    })().catch((error) => {
      state.kitPromise = null;
      throw error;
    });
  }
  return state.kitPromise;
}

function loadKitDataForBuilder() {
  loadKitData()
    .then(() => {
      if (state.activeTab === "builder") renderBuilder();
    })
    .catch((error) => {
      console.error(error);
      if ($("builderItemList")) {
        $("builderItemList").innerHTML = `<div class="builder-empty">Could not load kit data: ${escapeHtml(error.message)}</div>`;
      }
    });
}

function selected(id) {
  return $(id).value || "All";
}

function scopedChipValues(value, selectedValue) {
  const values = splitValues(value);
  return selectedValue !== "All" && values.includes(selectedValue)
    ? [selectedValue]
    : values;
}

function mapChipValues(value, selectedValue, diff) {
  return scopedChipValues(value, selectedValue).filter((map) => mapAllowedForDifficulty(map, diff));
}

function itemDetailFiltersFromMainPage() {
  return {
    kind: "All",
    map: state.activeTab === "items" ? selected("itemMap") : "All",
    diff: state.activeTab === "items" ? selected("itemDiff") : DEFAULT_DIFFICULTY,
  };
}

function sourceDetailFiltersFromMainPage() {
  const filters = {
    rarity: "All",
    category: "All",
    map: "All",
    diff: DEFAULT_DIFFICULTY,
  };
  if (state.activeDetail?.type === "item") {
    const itemFilters = selectedItemDetailFilters();
    filters.map = itemFilters.map;
    filters.diff = itemFilters.diff;
    return filters;
  }
  if (state.activeTab === "sources") {
    filters.map = selected("sourceMap");
    filters.diff = selected("sourceDiff");
    return filters;
  }
  return filters;
}

function itemSearchGroups(row) {
  return [
    [row.item, row.itemAsset, row.rarity, row.category],
    [row.maps?.join(" "), row.diffs?.join(" ")],
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
    [row.grade, row.grades?.join(" "), row.rolls, row.itemCount, row.amountRolls?.join(" ")],
  ];
}

function itemDetailSearchGroups(row) {
  return [
    [row.source, row.sourceKind, row.sourceValues?.join(" ")],
    [row.bestLootTable, row.bestRateTable, row.bestGroup],
    [row.maps, row.mapValues?.join(" "), row.diffs, row.diffValues?.join(" "), row.bestMap, row.bestDiff],
  ];
}

function builderItemSearchGroups(item) {
  return [
    [item.name, item.asset, item.rarity, item.slot?.label, item.hand, item.weaponTypes?.join(" "), item.armorType],
    [(item.allowedClasses || []).join(" ")],
    (item.primary || []).map((entry) => entry.label),
  ];
}

function filteredItems() {
  const search = terms($("itemSearch").value);
  const rarity = selected("itemRarity");
  const category = selected("itemCategory");
  const map = selected("itemMap");
  const diff = selected("itemDiff");
  return state.items.filter((row) => {
    if (!matchesSearchGroups(search, state.itemSearchIndex.get(row))) return false;
    if (rarity !== "All" && row.rarity !== rarity) return false;
    if (category !== "All" && row.category !== category) return false;
    if (map !== "All" && !mapAllowedForDifficulty(map, diff)) return false;
    if (map !== "All" && !(row.maps || []).includes(map)) return false;
    if (map === "All" && allowedMapsForDifficulty(diff) && !(row.maps || []).some((rowMap) => mapAllowedForDifficulty(rowMap, diff))) return false;
    if (diff !== "All" && !(row.diffs || []).includes(diff)) return false;
    return true;
  });
}

function filteredSources() {
  const search = terms($("sourceSearch").value);
  const map = selected("sourceMap");
  const diff = selected("sourceDiff");
  const kind = selected("sourceKind");
  return state.sources.filter((row) => {
    if (!matchesSearchGroups(search, state.sourceSearchIndex.get(row))) return false;
    if (map !== "All" && !mapAllowedForDifficulty(map, diff)) return false;
    if (map !== "All" && !(row.mapValues || []).includes(map)) return false;
    if (map === "All" && allowedMapsForDifficulty(diff) && !(row.mapValues || []).some((rowMap) => mapAllowedForDifficulty(rowMap, diff))) return false;
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

function itemAssetKey(row) {
  return row?.itemAsset || row?.asset || "";
}

function itemDisplayName(row) {
  return row?.item || row?.name || "Item";
}

function itemArt(row) {
  if (!row) return null;
  return row.art
    || state.itemByAsset.get(itemAssetKey(row))?.art
    || state.kit.itemByAsset.get(itemAssetKey(row))?.art
    || null;
}

function itemInitials(row) {
  return itemDisplayName(row)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function itemThumbStyle(row) {
  const art = itemArt(row);
  const width = Math.max(1, Number(row?.inventory?.width || 1));
  const height = Math.max(1, Number(row?.inventory?.height || 1));
  const iconWidth = Math.max(1, Number(art?.iconSize?.width || width));
  const iconHeight = Math.max(1, Number(art?.iconSize?.height || height));
  const listScale = Math.min(52 / iconWidth, 58 / iconHeight);
  const listWidth = Math.max(16, Math.min(52, iconWidth * listScale));
  const listHeight = Math.max(34, Math.min(58, iconHeight * listScale));
  return [
    `--item-inventory-width:${width}`,
    `--item-inventory-height:${height}`,
    `--item-icon-aspect:${(iconWidth / iconHeight).toFixed(4)}`,
    `--item-list-thumb-width:${listWidth.toFixed(1)}px`,
    `--item-list-thumb-height:${listHeight.toFixed(1)}px`,
  ].join(";");
}

function builderWeaponSizeClass(item) {
  if (!builderItemIsWeapon(item)) return "";
  const art = itemArt(item);
  const inventoryHeight = Number(item?.inventory?.height || 1);
  const iconWidth = Math.max(1, Number(art?.iconSize?.width || item?.inventory?.width || 1));
  const iconHeight = Math.max(1, Number(art?.iconSize?.height || inventoryHeight));
  const aspect = iconWidth / iconHeight;
  if (inventoryHeight >= 5 || aspect <= 0.28) return "weapon-extra-tall";
  if (inventoryHeight >= 4 || aspect <= 0.56) return "weapon-tall";
  return "weapon-compact";
}

function builderWeaponGridStyle(slot, item) {
  const anchor = BUILDER_WEAPON_GRID[slot.id];
  if (!anchor) return `grid-area: ${slot.area}`;
  const art = item ? itemArt(item) : null;
  const inventoryHeight = item ? Number(item?.inventory?.height || 4) : 4;
  const iconHeight = item ? Number(art?.iconSize?.height || inventoryHeight * 110) : 440;
  const weaponRows = item ? Math.max(inventoryHeight, Math.ceil(iconHeight / 110)) : 4;
  const rowSpan = Math.max(4, Math.min(6, Math.round(weaponRows)));
  return [
    "grid-area: auto",
    `grid-column: ${anchor.column} / span 2`,
    `grid-row: ${anchor.row} / span ${rowSpan}`,
  ].join(";");
}

function itemThumbnail(row, variant = "") {
  const art = itemArt(row);
  const iconUrl = row?.iconUrl || art?.iconUrl || "";
  const name = itemDisplayName(row);
  const variantClasses = String(variant || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => `item-thumb-${value}`);
  const classes = [
    "item-thumb",
    ...variantClasses,
    row?.rarity ? `item-thumb-${chipClass(row.rarity)}` : "",
    iconUrl ? "has-image" : "placeholder",
  ].filter(Boolean).join(" ");
  const style = itemThumbStyle(row);
  if (iconUrl) {
    return `<span class="${classes}" style="${escapeHtml(style)}" title="${escapeHtml(name)}"><img src="${escapeHtml(iconUrl)}" alt=""></span>`;
  }
  return `<span class="${classes}" style="${escapeHtml(style)}" title="${escapeHtml(art?.iconAsset || art?.artAsset || name)}"><span>${escapeHtml(itemInitials(row))}</span></span>`;
}

function itemNameCell(row) {
  return `
    <span class="item-name-cell">
      ${itemThumbnail(row)}
      <span>${escapeHtml(itemDisplayName(row))}</span>
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

function amountRollBreakdownSort(left, right) {
  const leftAmount = Number(left.amount);
  const rightAmount = Number(right.amount);
  if (Number.isFinite(leftAmount) && Number.isFinite(rightAmount) && leftAmount !== rightAmount) {
    return leftAmount - rightAmount;
  }
  const amountSort = compareSortValues(String(left.amount || ""), String(right.amount || ""));
  if (amountSort) return amountSort;
  const leftGrade = Number(left.grade);
  const rightGrade = Number(right.grade);
  if (Number.isFinite(leftGrade) && Number.isFinite(rightGrade) && leftGrade !== rightGrade) {
    return leftGrade - rightGrade;
  }
  return compareSortValues(String(left.grade || ""), String(right.grade || ""));
}

function amountRollBreakdownChanceValue(entry) {
  if (state.currentLuck === 0) {
    return Number(entry.basePerRollValue || 0) || percentTextValue(entry.basePerRoll);
  }
  return Number(entry.dynPerRollValue ?? entry.basePerRollValue ?? 0)
    || percentTextValue(entry.dynPerRoll || entry.basePerRoll);
}

function amountRollBreakdownText(row) {
  const entries = Array.isArray(row.amountRollBreakdown) ? [...row.amountRollBreakdown] : [];
  if (entries.length <= 1) return "";
  return entries
    .sort(amountRollBreakdownSort)
    .map((entry) => `${entry.amount}: ${percent(amountRollBreakdownChanceValue(entry))}`)
    .join(", ");
}

function amountCell(row) {
  const amount = escapeHtml(amountText(row.itemCounts || row.amountRolls || row.itemCount));
  const breakdown = amountRollBreakdownText(row);
  if (!breakdown) return amount;
  return `
    <div class="amount-cell-main">${amount}</div>
    <div class="amount-breakdown">${escapeHtml(breakdown)}</div>
  `;
}

function amountSortValue(value) {
  const numbers = splitValues(value)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
  return numbers.length ? Math.min(...numbers) : 0;
}

function addAmountRollBreakdown(target, row) {
  if (!Array.isArray(row.amountRollBreakdown)) return;
  row.amountRollBreakdown.forEach((entry) => {
    const key = `${entry.amount}|${entry.grade}`;
    const existing = target.get(key) || {
      amount: entry.amount,
      grade: entry.grade,
      basePerRollValue: 0,
      dynPerRollValue: 0,
    };
    existing.basePerRollValue += Number(entry.basePerRollValue || 0) || percentTextValue(entry.basePerRoll);
    existing.dynPerRollValue += Number(entry.dynPerRollValue || 0) || percentTextValue(entry.dynPerRoll);
    existing.basePerRoll = percent(existing.basePerRollValue);
    existing.dynPerRoll = percent(existing.dynPerRollValue);
    target.set(key, existing);
  });
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
        _amountRollBreakdown: new Map(),
      };
      grouped.set(key, entry);
    }
    splitValues(row.maps || row.map).forEach((value) => entry._maps.add(value));
    splitValues(row.diffs || row.diff).forEach((value) => entry._diffs.add(value));
    splitValues(row.itemCounts || row.amountRolls || row.itemCount).forEach((value) => entry._itemCounts.add(value));
    splitValues(row.rateTables || row.rateTable).forEach((value) => entry._rateTables.add(value));
    addAmountRollBreakdown(entry._amountRollBreakdown, row);
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
      amountRollBreakdown: [...row._amountRollBreakdown.values()].sort(amountRollBreakdownSort),
    };
  });
}

function scopedSourceDetailRows(rows, filters) {
  return (rows || [])
    .filter((row) => sourceDetailFilterMatches(row, { ...filters, rarity: "All", category: "All" }))
    .map((row) => {
      const maps = mapChipValues(row.maps || row.map, filters.map, filters.diff);
      const diffs = scopedChipValues(row.diffs || row.diff, filters.diff);
      return {
        ...row,
        maps,
        map: maps.join(", "),
        diffs,
        diff: diffs.join(", "),
      };
    });
}

function sourceDetailModel(payload) {
  const cacheKey = String(state.currentLuck);
  if (payload._sourceDetailModel?.cacheKey === cacheKey) return payload._sourceDetailModel;
  const groupedRows = groupedSourceDetailRows(payload.rows || []);
  const model = {
    cacheKey,
    groupedRows,
    filterOptions: sourceDetailFilterOptions(groupedRows),
    searchIndex: buildSearchIndex(groupedRows, sourceDetailSearchGroups),
  };
  payload._sourceDetailModel = model;
  return model;
}

function sourceDetailScopedModel(payload, filters) {
  const cacheKey = JSON.stringify([state.currentLuck, filters.map, filters.diff]);
  if (payload._sourceDetailScopedModel?.cacheKey === cacheKey) return payload._sourceDetailScopedModel;
  const groupedRows = groupedSourceDetailRows(scopedSourceDetailRows(payload.rows || [], filters));
  const model = {
    cacheKey,
    groupedRows,
    searchIndex: buildSearchIndex(groupedRows, sourceDetailSearchGroups),
  };
  payload._sourceDetailScopedModel = model;
  return model;
}

function itemDetailModel(payload) {
  if (payload._itemDetailModel) return payload._itemDetailModel;
  const baseRows = payload.rows || [];
  const model = {
    baseRows,
    filterOptions: itemDetailFilterOptions(baseRows),
  };
  payload._itemDetailModel = model;
  return model;
}

function itemDetailScopedModel(payload, filters) {
  const cacheKey = JSON.stringify([filters.kind, filters.map, filters.diff]);
  if (payload._itemDetailScopedModel?.cacheKey === cacheKey) return payload._itemDetailScopedModel;
  const { baseRows } = itemDetailModel(payload);
  const scopedRows = baseRows
    .filter((row) => itemDetailFilterMatches(row, filters))
    .map((row) => scopedItemDetailRow(row, filters));
  const model = {
    cacheKey,
    scopedRows,
    searchIndex: buildSearchIndex(scopedRows, itemDetailSearchGroups),
  };
  payload._itemDetailScopedModel = model;
  return model;
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
  if (filters.map !== "All" && !mapAllowedForDifficulty(filters.map, filters.diff)) return false;
  if (filters.map === "All" && allowedMapsForDifficulty(filters.diff) && !splitValues(row.maps || row.map).some((map) => mapAllowedForDifficulty(map, filters.diff))) return false;
  if (filters.map !== "All" && !splitValues(row.maps || row.map).includes(filters.map)) return false;
  if (filters.diff !== "All" && !splitValues(row.diffs || row.diff).includes(filters.diff)) return false;
  return true;
}

function scopedItemDetailRow(row, filters) {
  const maps = mapChipValues(row.mapValues || row.maps, filters.map, filters.diff);
  const diffs = scopedChipValues(row.diffValues || row.diffs, filters.diff);
  return {
    ...row,
    mapValues: maps,
    maps,
    diffValues: diffs,
    diffs,
  };
}

function itemDetailScenarioMatches(row, filters) {
  if (filters.map !== "All" && !mapAllowedForDifficulty(filters.map, filters.diff)) return false;
  if (filters.map === "All" && !mapAllowedForDifficulty(row.map, filters.diff)) return false;
  if (filters.map !== "All" && row.map !== filters.map) return false;
  if (filters.diff !== "All" && row.diff !== filters.diff) return false;
  return true;
}

function itemDetailBestScenario(row, filters, metric = "chance") {
  const scenarios = Array.isArray(row.scenarioBests) ? row.scenarioBests : [];
  let best = null;
  let bestValue = -1;
  scenarios.forEach((scenario) => {
    if (!itemDetailScenarioMatches(scenario, filters)) return;
    const value = metric === "base"
      ? baseChanceValue(scenario)
      : metric === "perRoll"
        ? perRollChanceValue(scenario)
        : chanceValue(scenario, "chanceValue");
    if (!best || value > bestValue) {
      best = scenario;
      bestValue = value;
    }
  });
  return best || row;
}

function itemDetailBestLuckChanceValue(row, filters) {
  return chanceValue(itemDetailBestScenario(row, filters, "chance"), "chanceValue");
}

function itemDetailBestPerRollChanceValue(row, filters) {
  return perRollChanceValue(itemDetailBestScenario(row, filters, "perRoll"));
}

function itemDetailFilterMatches(row, filters) {
  if (filters.kind !== "All" && row.sourceKind !== filters.kind) return false;
  const scenarios = Array.isArray(row.scenarioBests) ? row.scenarioBests : [];
  if (scenarios.length && (filters.map !== "All" || filters.diff !== "All")) {
    return scenarios.some((scenario) => itemDetailScenarioMatches(scenario, filters));
  }
  if (filters.map !== "All" && !mapAllowedForDifficulty(filters.map, filters.diff)) return false;
  if (filters.map === "All" && allowedMapsForDifficulty(filters.diff) && !splitValues(row.mapValues || row.maps).some((map) => mapAllowedForDifficulty(map, filters.diff))) return false;
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
      return amountSortValue(row.amountRolls || row.itemCount);
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
    case "perRoll":
      return perRollChanceValue(row);
    case "amount":
      return amountSortValue(row.itemCounts || row.amountRolls || row.itemCount);
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
  updateSortButtons();
  if (list === "items") renderItems();
  if (list === "sources") renderSources();
}

function setSourceDetailSort(key) {
  if (state.activeDetail?.type !== "source") return;
  const current = state.activeDetail.sort || { key: "chance", direction: "desc" };
  const defaultDirection = key === "chance" || key === "baseChance" || key === "perRoll" ? "desc" : "asc";
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

function tableMeta(rows, selectedRows, list) {
  const hidden = Math.max(0, rows.length - selectedRows.length);
  const hiddenLabel = hidden > 0 ? `${hidden.toLocaleString()} more` : "none";
  const shownLabel = selectedRows.length.toLocaleString();
  return [
    metaPill("Matches", rows.length.toLocaleString()),
    metaPill("Shown", shownLabel),
    metaPill("Not shown", hiddenLabel),
    metaPill("All items", state.items.length.toLocaleString()),
    metaPill("All sources", state.sources.length.toLocaleString()),
    hidden > 0 ? `<button type="button" class="load-more" data-load-more="${escapeHtml(list)}">Load ${Math.min(ROW_PAGE_SIZE, hidden).toLocaleString()} more</button>` : "",
  ].join("");
}

function favoriteButton(active, type, key, label) {
  return `<button class="favorite ${active ? "active" : ""}" data-fav-type="${type}" data-fav-key="${escapeHtml(key)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" aria-pressed="${active ? "true" : "false"}">&#9733;</button>`;
}

function renderItems() {
  const mapFilter = selected("itemMap");
  const diffFilter = selected("itemDiff");
  const rows = sortedRows(filteredItems(), "items");
  const selectedRows = rows.slice(0, state.visibleRows.items);
  $("itemTableMeta").innerHTML = tableMeta(rows, selectedRows, "items");
  $("itemRows").innerHTML = selectedRows.length
    ? selectedRows.map((row) => `
      <tr class="clickable-row" data-open-item="${escapeHtml(row.itemAsset)}" tabindex="0" role="button">
        <td>${favoriteButton(isFavoriteItem(row.itemAsset), "item", row.itemAsset, "Favorite item")}</td>
        <td>${itemNameCell(row)}</td>
        <td>${rarity(row.rarity)}</td>
        <td>${categoryChip(row.category)}</td>
        <td>${chips(mapChipValues(row.maps || row.map, mapFilter, diffFilter), "map-chip")}</td>
        <td>${chips(scopedChipValues(row.diffs || row.diff, diffFilter), "diff-chip")}</td>
        <td class="num">${escapeHtml(row.sourceCount)}</td>
        <td class="action-cell"><button data-open-item="${escapeHtml(row.itemAsset)}">Sources</button></td>
      </tr>
    `).join("")
    : `<tr><td class="message-row" colspan="8">No items match these filters.</td></tr>`;
}

function renderSources() {
  const mapFilter = selected("sourceMap");
  const diffFilter = selected("sourceDiff");
  const rows = sortedRows(filteredSources(), "sources");
  const selectedRows = rows.slice(0, state.visibleRows.sources);
  $("sourceTableMeta").innerHTML = tableMeta(rows, selectedRows, "sources");
  $("sourceRows").innerHTML = selectedRows.length
    ? selectedRows.map((row) => `
      <tr class="clickable-row" data-open-source="${escapeHtml(sourceKey(row.source, row.sourceKind))}" tabindex="0" role="button">
        <td>${favoriteButton(isFavoriteSource(row.source, row.sourceKind), "source", sourceKey(row.source, row.sourceKind), "Favorite source")}</td>
        <td>${escapeHtml(row.source)}</td>
        <td>${kindChip(row.sourceKind)}</td>
        <td>${chips(mapChipValues(row.mapValues || row.maps, mapFilter, diffFilter), "map-chip")}</td>
        <td>${chips(scopedChipValues(row.diffValues || row.diffs, diffFilter), "diff-chip")}</td>
        <td class="num">${amountCell(row)}</td>
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
        <td>${itemNameCell(row)}</td>
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

function filteredBuilderItems() {
  const search = terms(state.builder.search);
  const rarityFilter = state.builder.rarity;
  const selectedSlot = state.builder.selectedSlot;
  return state.kit.items
    .filter((item) => {
      if (rarityFilter !== "All" && item.rarity !== rarityFilter) return false;
      if (!builderClassAllowsItem(item)) return false;
      if (selectedSlot && !itemFitsBuilderSlot(item, selectedSlot)) return false;
      return matchesSearchGroups(search, state.kitSearchIndex.get(item));
    })
    .sort((left, right) => {
      const rarityResult = rarityRank(right.rarity) - rarityRank(left.rarity);
      if (rarityResult) return rarityResult;
      return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
    });
}

function renderBuilderPerks() {
  const character = selectedBuilderCharacter();
  const perks = (character?.perks || []).map((id) => state.kit.perkById.get(id)).filter(Boolean);
  $("builderPerkCount").textContent = `${state.builder.perks.length} / ${BUILDER_PERK_LIMIT}`;
  $("builderPerks").innerHTML = perks.length
    ? perks.map((perk) => {
      const active = state.builder.perks.includes(perk.id);
      const disabled = !active && state.builder.perks.length >= BUILDER_PERK_LIMIT;
      const conditional = !builderPerkStatsArePassive(perk);
      return `
        <button
          type="button"
          class="builder-perk ${active ? "active" : ""} ${conditional ? "conditional" : ""}"
          data-builder-perk="${escapeHtml(perk.id)}"
          aria-pressed="${active ? "true" : "false"}"
          ${disabled ? "disabled" : ""}>
          <span class="builder-perk-title">
            ${iconImage(perkIconUrl(perk), "builder-perk-icon", perk.name)}
            <span>${escapeHtml(perk.name)}</span>
          </span>
          <small>${escapeHtml(builderPerkSummary(perk))}</small>
        </button>
      `;
    }).join("")
    : `<div class="builder-empty">No perks found for this character.</div>`;
}

function renderBuilderCharacter() {
  const target = $("builderCharacterCurrent");
  if (!target) return;
  const character = selectedBuilderCharacter();
  const skin = selectedBuilderSkin();
  const skinStats = (skin?.stats || [])
    .map((entry) => `${entry.label} ${statValue(entry.value, entry.unit)}`)
    .join(", ");
  target.innerHTML = character
    ? `
      ${iconImage(classIconUrl(character), "builder-class-icon", character.name)}
      <div>
        <strong>${escapeHtml(character.name)}</strong>
        <span>${escapeHtml((character.perks || []).length.toLocaleString())} perks${skin ? ` | ${escapeHtml(skin.name)}${skinStats ? `: ${escapeHtml(skinStats)}` : ""}` : ""}</span>
      </div>
    `
    : "";
}

function savedKitEquippedCount(kit) {
  return Object.values(kit.equipped || {}).filter(Boolean).length;
}

function savedKitCharacterName(kit) {
  return state.kit.characterById.get(kit.characterId)?.name || kit.characterId || "Unknown";
}

function renderBuilderSavedKits() {
  if (!$("builderSavedKits")) return;
  renderBuilderShareStatus();
  $("builderSavedKitCount").textContent = state.savedKits.length.toLocaleString();
  $("builderSavedKits").innerHTML = state.savedKits.length
    ? state.savedKits.map((kit) => {
      const confirmingDelete = isBuilderConfirming("delete", kit.id);
      return `
        <article class="builder-saved-kit">
          <div class="builder-saved-kit-main">
            ${iconImage(classIconUrl({ id: kit.characterId, name: savedKitCharacterName(kit) }), "builder-class-icon small", savedKitCharacterName(kit))}
            <div>
              <h4>${escapeHtml(kit.name)}</h4>
              <p>${escapeHtml(savedKitCharacterName(kit))} | ${savedKitEquippedCount(kit)} items | ${escapeHtml(formatDate(kit.updatedAt))}</p>
            </div>
          </div>
          <div class="builder-saved-kit-actions">
            <button type="button" data-load-builder-kit="${escapeHtml(kit.id)}">Load</button>
            <button type="button" data-share-builder-kit="${escapeHtml(kit.id)}">Share</button>
            <button
              type="button"
              class="danger ${confirmingDelete ? "confirming" : ""}"
              data-delete-builder-kit="${escapeHtml(kit.id)}"
              aria-pressed="${confirmingDelete ? "true" : "false"}">
              ${confirmingDelete ? "Confirm Delete" : "Delete"}
            </button>
          </div>
        </article>
      `;
    }).join("")
    : `<div class="builder-empty">No saved kits yet.</div>`;
}

function slotSecondarySummary(slotId, item) {
  const selected = (item?.secondaryPoolIds || [])
    .map((_poolId, index) => selectedBonusEntry(slotId, index))
    .filter(Boolean)
    .map((entry) => `${entry.label} ${statValue(entry.value, entry.unit)}`);
  if (selected.length) return selected;
  return item?.secondaryPoolIds?.length ? ["No secondary bonuses selected"] : [];
}

function slotPrimarySummary(slotId, item, limit = Infinity) {
  const entries = item?.primary || [];
  const limited = Number.isFinite(limit) ? entries.slice(0, limit) : entries;
  return limited.map((entry, index) => {
    const selected = selectedPrimaryEntry(slotId, index);
    return `${entry.label} ${statValue(selected?.value ?? entry.max ?? entry.min, entry.unit)}`;
  });
}

function itemSpecialEffectSummary(item) {
  return (item?.specialEffects || [])
    .map((effect) => effect?.description || "")
    .filter(Boolean);
}

function builderSlotAriaLabel(slot, item, blockReason, linkedTwoHanded = false) {
  if (item) {
    const handState = isTwoHandedItem(item) ? ", two-handed and occupying both weapon slots" : "";
    const linkedState = linkedTwoHanded ? ", linked to the primary slot" : "";
    return `${slot.label}: ${item.name}, ${item.rarity}, ${item.gearScore || 0} gear score${handState}${linkedState}`;
  }
  return `${slot.label}: ${blockReason ? `blocked, ${blockReason}` : "empty"}`;
}

function builderSlotTooltipElement() {
  let tooltip = $("builderSlotTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "builderSlotTooltip";
    tooltip.className = "builder-slot-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function builderSlotTooltipHtml(slotId) {
  const slot = builderSlotById(slotId);
  const ownerSlotId = builderItemOwnerSlotId(slot.id);
  const item = equippedBuilderItem(ownerSlotId);
  const blockReason = weaponSlotBlockReason(slot.id);
  if (!item) {
    return `
      <div class="builder-slot-tooltip-empty">
        <strong>${escapeHtml(slot.label)}</strong>
        <span>${escapeHtml(blockReason || slot.accepts.join(" / "))}</span>
      </div>
    `;
  }
  const primary = slotPrimarySummary(ownerSlotId, item);
  const secondary = slotSecondarySummary(ownerSlotId, item);
  const specialEffects = itemSpecialEffectSummary(item);
  return `
    <div class="builder-slot-tooltip-head">
      ${itemThumbnail(item, "tooltip")}
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${rarity(item.rarity)} <span>${escapeHtml(item.slot?.label || slot.label)}</span> <span>${escapeHtml(item.gearScore || 0)} GS</span></p>
      </div>
    </div>
    ${isTwoHandedItem(item) ? `<div class="builder-slot-tooltip-hand">Two-handed weapon | occupies both slots</div>` : ""}
    <div class="builder-slot-tooltip-section">
      <b>Primary</b>
      ${primary.length
        ? primary.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")
        : `<span>None</span>`}
    </div>
    ${secondary.length ? `
      <div class="builder-slot-tooltip-section secondary">
        <b>Secondary</b>
        ${secondary.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")}
      </div>
    ` : ""}
    ${specialEffects.length ? `
      <div class="builder-slot-tooltip-section special">
        <b>Effect</b>
        ${specialEffects.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")}
      </div>
    ` : ""}
    <div class="builder-slot-tooltip-meta">
      <span><b>Slot</b>${escapeHtml(item.slot?.label || slot.label)}</span>
      <span><b>Classes</b>${escapeHtml(classNamesText(item.allowedClasses))}</span>
    </div>
  `;
}

function positionBuilderSlotTooltip(target, tooltip) {
  const margin = 12;
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const roomRight = window.innerWidth - rect.right;
  const roomLeft = rect.left;
  const placeRight = roomRight >= tooltipRect.width + margin || roomRight >= roomLeft;
  const rawLeft = placeRight
    ? rect.right + margin
    : rect.left - tooltipRect.width - margin;
  const left = Math.min(
    Math.max(margin, rawLeft),
    Math.max(margin, window.innerWidth - tooltipRect.width - margin),
  );
  const rawTop = rect.top + ((rect.height - tooltipRect.height) / 2);
  const top = Math.min(
    Math.max(margin, rawTop),
    Math.max(margin, window.innerHeight - tooltipRect.height - margin),
  );
  tooltip.dataset.side = placeRight ? "right" : "left";
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showBuilderSlotTooltip(target) {
  const slotId = target?.dataset?.builderSlot;
  if (!slotId || !$("builderView")?.classList.contains("active")) return;
  const tooltip = builderSlotTooltipElement();
  tooltip.innerHTML = builderSlotTooltipHtml(slotId);
  tooltip.hidden = false;
  target.setAttribute("aria-describedby", "builderSlotTooltip");
  state.slotTooltip = { target };
  requestAnimationFrame(() => positionBuilderSlotTooltip(target, tooltip));
}

function syncBuilderSlotTooltip(event) {
  const slot = event.target?.closest?.("button[data-builder-slot]");
  if (!slot) {
    if (state.slotTooltip.target) hideBuilderSlotTooltip(true);
    return;
  }
  const tooltip = builderSlotTooltipElement();
  if (state.slotTooltip.target !== slot || tooltip.hidden) {
    showBuilderSlotTooltip(slot);
    return;
  }
  positionBuilderSlotTooltip(slot, tooltip);
}

function hideBuilderSlotTooltip(force = false) {
  const target = state.slotTooltip.target;
  if (!force && target?.matches(":hover, :focus-visible")) return;
  target?.removeAttribute("aria-describedby");
  state.slotTooltip = { target: null };
  const tooltip = $("builderSlotTooltip");
  if (tooltip) tooltip.hidden = true;
}

function renderBuilderEquipment() {
  hideBuilderSlotTooltip(true);
  $("builderEquipment").innerHTML = BUILDER_SLOTS.map((slot) => {
    const ownerSlotId = builderItemOwnerSlotId(slot.id);
    const linkedTwoHanded = ownerSlotId !== slot.id;
    const item = equippedBuilderItem(ownerSlotId);
    const blockReason = weaponSlotBlockReason(slot.id);
    const sizeClass = slot.kind === "weapon" && item ? builderWeaponSizeClass(item) : "";
    const rarityClass = slot.kind === "weapon" && item?.rarity ? `slot-rarity-${chipClass(item.rarity)}` : "";
    const slotStyle = slot.kind === "weapon"
      ? builderWeaponGridStyle(slot, item)
      : `grid-area: ${slot.area}`;
    const art = item
      ? itemThumbnail(item, slot.kind === "weapon" ? "equipment weapon-equipment" : "equipment")
      : `<span class="equipment-ghost equipment-ghost-${escapeHtml(slot.id)}" aria-hidden="true"></span>`;
    return `
      <button
        type="button"
        class="builder-slot builder-slot-${escapeHtml(slot.id)} ${slot.kind || ""} ${sizeClass} ${rarityClass} ${state.builder.selectedSlot === ownerSlotId ? "active" : ""} ${slot.weaponSet === state.builder.activeWeaponSet ? "active-set" : ""} ${item ? "filled" : ""} ${isTwoHandedItem(item) ? "two-handed" : ""} ${linkedTwoHanded ? "two-handed-linked" : ""}"
        style="${escapeHtml(slotStyle)}"
        data-builder-slot="${escapeHtml(slot.id)}"
        aria-pressed="${state.builder.selectedSlot === ownerSlotId ? "true" : "false"}"
        aria-label="${escapeHtml(builderSlotAriaLabel(slot, item, blockReason, linkedTwoHanded))}"
        ${blockReason ? `title="${escapeHtml(blockReason)}"` : ""}>
        ${slot.marker ? `<span class="builder-slot-marker">${escapeHtml(slot.marker)}</span>` : ""}
        ${isTwoHandedItem(item) ? `<span class="builder-slot-hand-badge" aria-hidden="true">2H</span>` : ""}
        <span class="builder-slot-art">${art}</span>
        <span class="builder-slot-label">${escapeHtml(slot.label)}</span>
      </button>
    `;
  }).join("");
}

function bonusSelect(slotId, item, poolId, index) {
  const selectedEntry = state.builder.bonuses[slotId]?.[index] || {};
  const options = secondaryOptionsForItem(item, poolId);
  const selectedOption = options.find((option) => option.propertyId === selectedEntry.propertyId);
  const selectedPropertyIds = new Set((state.builder.bonuses[slotId] || [])
    .map((entry, entryIndex) => (entryIndex === index ? "" : entry?.propertyId))
    .filter(Boolean));
  const value = Number.isFinite(Number(selectedEntry.value))
    ? Number(selectedEntry.value)
    : Number(selectedOption?.max ?? selectedOption?.min ?? 0);
  const selectId = `builder-bonus-select-${slotId}-${index}`;
  const searchId = `builder-bonus-search-${slotId}-${index}`;
  const menuId = `builder-bonus-menu-${slotId}-${index}`;
  const selectedText = selectedOption ? `${bonusOptionText(selectedOption)} (${statRange(selectedOption)})` : "";
  return `
    <div class="builder-bonus-row">
      <div class="builder-bonus-pick">
        <label for="${escapeHtml(searchId)}">Bonus ${index + 1}</label>
        <input
          id="${escapeHtml(searchId)}"
          class="builder-bonus-search"
          type="search"
          autocomplete="off"
          placeholder="Search stats"
          value="${escapeHtml(selectedText)}"
          role="combobox"
          aria-expanded="false"
          aria-controls="${escapeHtml(menuId)}"
          aria-label="Search bonus ${index + 1} stats"
          data-builder-bonus-search="${escapeHtml(slotId)}"
          data-selected-text="${escapeHtml(selectedText)}"
          data-bonus-index="${index}">
        <select
          id="${escapeHtml(selectId)}"
          class="builder-bonus-native-select"
          data-builder-bonus-select="${escapeHtml(slotId)}"
          data-bonus-index="${index}"
          aria-hidden="true"
          tabindex="-1">
          <option value="" ${selectedOption ? "" : "selected"}>None</option>
          ${options.map((option) => {
            const optionLabel = bonusOptionText(option);
            const optionText = `${optionLabel} (${statRange(option)})`;
            const searchText = bonusOptionSearchText(option);
            const duplicate = selectedPropertyIds.has(option.propertyId);
            return `
              <option
                value="${escapeHtml(option.propertyId)}"
                data-search-text="${escapeHtml(searchText.toLowerCase())}"
                ${option.propertyId === selectedEntry.propertyId ? "selected" : ""}
                ${duplicate ? "disabled" : ""}>
                ${escapeHtml(optionText)}
              </option>
            `;
          }).join("")}
        </select>
        <div id="${escapeHtml(menuId)}" class="builder-bonus-menu" data-builder-bonus-menu hidden>
          <button
            type="button"
            class="builder-bonus-option ${selectedOption ? "" : "selected"}"
            data-builder-bonus-option="${escapeHtml(slotId)}"
            data-bonus-index="${index}"
            data-property-id=""
            data-search-text="none">
            <span>None</span>
          </button>
          ${options.map((option) => {
            const optionLabel = bonusOptionText(option);
            const searchText = bonusOptionSearchText(option);
            const duplicate = selectedPropertyIds.has(option.propertyId);
            return `
              <button
                type="button"
                class="builder-bonus-option ${option.propertyId === selectedEntry.propertyId ? "selected" : ""}"
                data-builder-bonus-option="${escapeHtml(slotId)}"
                data-bonus-index="${index}"
                data-property-id="${escapeHtml(option.propertyId)}"
                data-search-text="${escapeHtml(searchText.toLowerCase())}"
                ${duplicate ? "disabled" : ""}>
                <span>${escapeHtml(optionLabel)}</span>
                <small>${escapeHtml(statRange(option))}</small>
              </button>
            `;
          }).join("")}
        </div>
        <small data-builder-bonus-search-empty hidden>No matching stats.</small>
      </div>
      <label>Value
        <input
          type="number"
          step="${escapeHtml(statStep(selectedOption))}"
          ${selectedOption ? `min="${escapeHtml(selectedOption.min)}" max="${escapeHtml(selectedOption.max)}"` : ""}
          value="${Number.isFinite(Number(value)) ? escapeHtml(value) : ""}"
          data-builder-bonus-value="${escapeHtml(slotId)}"
          data-bonus-index="${index}"
          ${selectedOption ? "" : "disabled"}>
      </label>
    </div>
  `;
}

function primaryValueControl(slotId, entry, index) {
  const selected = selectedPrimaryEntry(slotId, index) || { ...entry, value: entry.max ?? entry.min };
  const min = Number(entry.min ?? selected.value ?? 0);
  const max = Number(entry.max ?? min);
  const hasRange = Math.abs(max - min) >= 0.0001;
  if (!hasRange) {
    return `<span><b>${escapeHtml(entry.label)}</b>${escapeHtml(statValue(selected.value, entry.unit))}</span>`;
  }
  return `
    <label class="builder-primary-row">
      <span>
        <b>${escapeHtml(entry.label)}</b>
        <small>${escapeHtml(statRange(entry))}</small>
      </span>
      <input
        type="number"
        step="${escapeHtml(statStep(entry))}"
        min="${escapeHtml(min)}"
        max="${escapeHtml(max)}"
        value="${escapeHtml(selected.value)}"
        data-builder-primary-value="${escapeHtml(slotId)}"
        data-primary-index="${index}">
    </label>
  `;
}

function renderBuilderBonusPanel() {
  const slotId = state.builder.selectedSlot;
  const slot = builderSlotById(slotId);
  const item = state.kit.itemByAsset.get(state.builder.equipped[slotId]);
  if (!item) {
    $("builderBonusPanel").innerHTML = `
      <div class="builder-bonus-empty">
        <strong>${escapeHtml(slot.label)}</strong>
        <span>Pick an item for this slot.</span>
      </div>
    `;
    return;
  }
  const primary = (item.primary || []).map((entry, index) => primaryValueControl(slotId, entry, index)).join("");
  const secondary = (item.secondaryPoolIds || []).map((poolId, index) => bonusSelect(slotId, item, poolId, index)).join("");
  const specialEffects = itemSpecialEffectSummary(item);
  $("builderBonusPanel").innerHTML = `
    <div class="builder-bonus-title">
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${rarity(item.rarity)} ${escapeHtml(item.slot?.label || "")} | ${escapeHtml(classNamesText(item.allowedClasses))}</p>
      </div>
      <div class="builder-bonus-actions">
        <button type="button" data-change-builder-item="${escapeHtml(slotId)}">Change Item</button>
        <button type="button" data-unequip-slot="${escapeHtml(slotId)}">Remove</button>
      </div>
    </div>
    <div class="builder-primary-list">${primary || `<span><b>Primary</b>None</span>`}</div>
    ${specialEffects.length ? `
      <div class="builder-special-list">
        <b>Effect</b>
        ${specialEffects.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")}
      </div>
    ` : ""}
    <div class="builder-secondary-list">${secondary || `<div class="builder-empty">No secondary bonus slots.</div>`}</div>
  `;
}

function renderBuilderPicker() {
  const picker = $("builderPicker");
  const slot = builderSlotById(state.builder.selectedSlot);
  const blockReason = weaponSlotBlockReason(slot.id);
  const item = equippedBuilderItem(slot.id);
  const mode = state.builder.pickerMode === "stats" && item ? "stats" : "items";
  state.builder.pickerMode = mode;
  picker.hidden = !state.builder.pickerOpen;
  picker.classList.toggle("builder-picker-items", mode === "items");
  picker.classList.toggle("builder-picker-stats", mode === "stats");
  $("builderPickerTitle").textContent = mode === "stats" ? "Secondary Stats" : `Pick ${slot.label}`;
  $("builderPickerMeta").textContent = mode === "stats"
    ? `${item.name} | ${slot.label}`
    : blockReason || slot.accepts.join(" / ");
}

function positionBuilderPicker() {
  const picker = $("builderPicker");
  const equipment = $("builderEquipment");
  const panel = picker?.closest(".builder-equipment-panel");
  if (!picker || picker.hidden || !equipment || !panel) return;
  const slot = [...equipment.querySelectorAll("button[data-builder-slot]")]
    .find((button) => button.dataset.builderSlot === state.builder.selectedSlot);
  if (!slot) return;
  const panelRect = panel.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const margin = 12;
  const gap = 10;
  const pickerWidth = Math.min(430, Math.max(280, panelRect.width - margin * 2));
  const slotLeft = slotRect.left - panelRect.left;
  const slotRight = slotRect.right - panelRect.left;
  const slotTop = slotRect.top - panelRect.top;
  const slotBottom = slotRect.bottom - panelRect.top;
  let left = slotRight + gap;
  let top = slotTop;

  if (left + pickerWidth > panelRect.width - margin) {
    left = slotLeft - pickerWidth - gap;
  }
  if (left < margin) {
    left = Math.min(Math.max(margin, slotLeft), Math.max(margin, panelRect.width - pickerWidth - margin));
    top = slotBottom + gap;
  }

  const maxTop = Math.max(margin, panelRect.height - 260);
  top = Math.max(margin, Math.min(top, maxTop));
  picker.style.left = `${Math.round(left)}px`;
  picker.style.right = "auto";
  picker.style.top = `${Math.round(top)}px`;
  picker.style.width = `${Math.round(pickerWidth)}px`;
  picker.style.maxHeight = `min(560px, calc(100% - ${Math.round(top + margin)}px))`;
}

function renderBuilderItems() {
  const rows = filteredBuilderItems();
  const limited = rows.slice(0, MAX_BUILDER_ITEMS);
  $("builderItemList").innerHTML = limited.length
    ? limited.map((item) => {
      const targetSlot = firstBuilderSlotForItem(item);
      const disabled = !targetSlot;
      const classes = classNamesText(item.allowedClasses);
      const primary = (item.primary || []).slice(0, 3).map((entry) => `${entry.label} ${statRange(entry)}`).join(", ");
      return `
        <article class="builder-item">
          ${itemThumbnail(item)}
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${rarity(item.rarity)} <span>${escapeHtml(item.slot?.label || "")}</span> ${isTwoHandedItem(item) ? `<span>Two-handed</span>` : ""} <span>${escapeHtml(item.gearScore || 0)} GS</span></p>
            <small>${escapeHtml(primary || classes)}</small>
          </div>
          <button type="button" data-equip-item="${escapeHtml(item.asset)}" ${disabled ? "disabled" : ""}>
            Equip
          </button>
        </article>
      `;
    }).join("")
    : `<div class="builder-empty">${escapeHtml(weaponSlotBlockReason(state.builder.selectedSlot) || "No kit items match these filters for this character.")}</div>`;
}

async function saveBuilderPhoto() {
  if (!kitPhotoPromise) {
    kitPhotoPromise = import("./kit-photo.js").then(({ createKitPhoto }) => createKitPhoto({
      state,
      slots: BUILDER_SLOTS,
      perkLimit: BUILDER_PERK_LIMIT,
      slotPrimarySummary,
      slotSecondarySummary,
      itemSpecialEffectSummary,
      builderPerkSummary,
      statLabel,
      statValue,
      closeBuilderBonusMenus,
      hideBuilderSlotTooltip,
      builderStatRows,
      selectedBuilderCharacter,
      builderItemOwnerSlotId,
      displayedBuilderItem,
      perkIconUrl,
      selectedBuilderSkin,
      currentBuilderKitName,
    }));
  }
  const savePhoto = await kitPhotoPromise;
  return savePhoto();
}

function renderBuilderStats(stats = builderStatRows()) {
  const gearScore = sumEquippedGearScore(state.builder.equipped, state.kit.itemByAsset);
  $("builderGearScore").textContent = `${gearScore.toLocaleString()} GS`;
  $("builderStats").innerHTML = stats.map((row) => {
    const numeric = row.type !== "text";
    const value = numeric ? Number(row.value || 0) : row.value;
    return `
      <div class="builder-stat ${row.indent ? "indent" : ""} ${numeric && value < 0 ? "negative" : numeric && value > 0 ? "positive" : ""}">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(numeric ? statValue(value, row.unit) : value)}</strong>
      </div>
    `;
  }).join("");
}

function renderBuilderSummary(stats = builderStatRows()) {
  const equippedCount = BUILDER_SLOTS.filter((slot) => displayedBuilderItem(slot.id)).length;
  const character = selectedBuilderCharacter();
  const statTotals = builderStatTotals(stats);
  $("builderSummary").innerHTML = [
    metaPill("Character", character?.name || "None"),
    metaPill("Equipped", `${equippedCount} / ${BUILDER_SLOTS.length}`),
    metaPill("Stats", statTotals.length.toLocaleString()),
  ].join("");
}

function renderBuilderActionStates() {
  const clearButton = $("clearBuilder");
  if (!clearButton) return;
  const confirmingClear = isBuilderConfirming("clear");
  clearButton.textContent = confirmingClear ? "Confirm Clear" : "Clear";
  clearButton.classList.toggle("confirming", confirmingClear);
  clearButton.setAttribute("aria-pressed", confirmingClear ? "true" : "false");
  if (confirmingClear) {
    clearButton.title = "Click again to clear the builder";
  } else {
    clearButton.removeAttribute("title");
  }
}

function renderBuilder() {
  if (!$("builderView")) return;
  renderBuilderActionStates();
  $("builderSearch").value = state.builder.search;
  $("builderRarity").value = state.builder.rarity;
  if (state.builder.characterId) $("builderCharacter").value = state.builder.characterId;
  if ($("builderSkin")) $("builderSkin").value = state.builder.skinId || "";
  if (!state.kitReady) {
    const message = state.kitPromise ? "Loading kit data..." : "Kit data is not loaded yet.";
    $("builderSummary").innerHTML = metaPill("Status", state.kitPromise ? "Loading" : "Idle");
    $("builderCharacterCurrent").innerHTML = "";
    $("builderPerkCount").textContent = `0 / ${BUILDER_PERK_LIMIT}`;
    $("builderPerks").innerHTML = `<div class="builder-empty">${escapeHtml(message)}</div>`;
    renderBuilderEquipment();
    renderBuilderPicker();
    renderBuilderBonusPanel();
    $("builderItemList").innerHTML = `<div class="builder-empty">${escapeHtml(message)}</div>`;
    renderBuilderStats();
    renderBuilderSavedKits();
    if ($("damageDialog")?.open) renderDamageChecker();
    positionBuilderPicker();
    return;
  }
  const stats = builderStatRows();
  renderBuilderSummary(stats);
  renderBuilderCharacter();
  renderBuilderPerks();
  renderBuilderEquipment();
  renderBuilderPicker();
  renderBuilderBonusPanel();
  renderBuilderItems();
  renderBuilderStats(stats);
  renderBuilderSavedKits();
  if ($("damageDialog")?.open) renderDamageChecker();
  positionBuilderPicker();
}

function render() {
  updateSortButtons();
  renderItems();
  renderSources();
  renderFavorites();
  if (state.activeTab === "builder") renderBuilder();
}

function renderActiveTab() {
  updateSortButtons();
  if (state.activeTab === "items") renderItems();
  if (state.activeTab === "sources") renderSources();
  if (state.activeTab === "favorites") renderFavorites();
  if (state.activeTab === "builder") {
    if (!state.kitReady) loadKitDataForBuilder();
    renderBuilder();
  }
}

function setActiveTab(tabId, options = {}) {
  if (!$(`${tabId}View`)) return;
  state.activeTab = tabId;
  if (!options.keepConfirmation) clearBuilderConfirmation();
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  $(`${tabId}View`).classList.add("active");
  if (options.render !== false) renderActiveTab();
  if (options.syncRoute !== false && !routeApplying) syncRoute({ replace: options.replaceRoute !== false, includeDetail: false });
}

function renderFavoriteState() {
  renderFavorites();
  if (state.activeTab === "items") renderItems();
  if (state.activeTab === "sources") renderSources();
}

async function detail(path) {
  if (!state.detailCache.has(path)) {
    state.detailCache.set(path, await fetchJson(path, dataVersionToken()));
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
          const className = [column.num ? "num" : "", column.className || ""].filter(Boolean).join(" ");
          return `<th class="${className}"${ariaSort}>${label}</th>`;
        }).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => {
            const attrs = rowAttrs(row);
            return `
            <tr${attrs ? ` ${attrs}` : ""}>
              ${columns.map((column) => {
                const className = [column.num ? "num" : "", column.className || ""].filter(Boolean).join(" ");
                return `<td class="${className}">${column.html ? column.html(row) : escapeHtml(row[column.key])}</td>`;
              }).join("")}
            </tr>
          `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function sourceRollSummaryRows(rows) {
  const grouped = new Map();
  (rows || []).forEach((row) => {
    if (!row.luckModel) return;
    const gradePerRoll = gradeChanceValue(row);
    const gradeAtLeastOne = gradeAtLeastOneValue(row);
    const key = JSON.stringify([
      row.grade,
      row.rolls,
      row.lootTable,
      row.rateTable,
      gradePerRoll.toFixed(14),
      gradeAtLeastOne.toFixed(14),
    ]);
    let entry = grouped.get(key);
    if (!entry) {
      entry = {
        grade: row.grade,
        rolls: row.rolls,
        lootTable: row.lootTable,
        rateTable: row.rateTable,
        gradePerRoll,
        gradeAtLeastOne,
        maps: new Set(),
        diffs: new Set(),
      };
      grouped.set(key, entry);
    }
    splitValues(row.maps || row.map).forEach((value) => entry.maps.add(value));
    splitValues(row.diffs || row.diff).forEach((value) => entry.diffs.add(value));
  });
  return [...grouped.values()]
    .sort((left, right) => {
      const chanceSort = right.gradeAtLeastOne - left.gradeAtLeastOne;
      if (chanceSort) return chanceSort;
      return compareSortValues(String(left.lootTable || ""), String(right.lootTable || ""));
    })
    .slice(0, 40)
    .map((row) => ({
      ...row,
      maps: sourceDetailOrderedValues([...row.maps], "map"),
      diffs: sourceDetailOrderedValues([...row.diffs], "diff"),
    }));
}

function sourceRollSummaryTable(rows, payload) {
  const summaryRows = sourceRollSummaryRows(rows);
  if (!summaryRows.length) return "";
  const action = sourceDetailActionLabel(payload);
  return `
    <div class="roll-summary">
      <div class="roll-summary-head">
        <strong>Rarity Pool Chances</strong>
        <span class="muted">Chance to hit a rarity pool before one item is chosen.</span>
      </div>
      ${detailTable(summaryRows, [
        { label: "Pool", html: (row) => rarity(gradeRarity(row.grade)) },
        { label: "Internal Rolls", html: (row) => escapeHtml(row.rolls), num: true },
        { label: "Loot Table", html: (row) => escapeHtml(row.lootTable || "") },
        { label: "Rate Table", html: (row) => escapeHtml(row.rateTable || "") },
      { label: "Pool per Roll", html: (row) => chanceCell(row, percent(row.gradePerRoll), `${gradeRarity(row.grade)} pool`), num: true },
      { label: `Pool chance from ${action}`, html: (row) => chanceCell(row, percent(row.gradeAtLeastOne), plural(row.rolls, "roll")), num: true },
      ])}
    </div>
  `;
}

function renderSourceDetail(payload) {
  const search = state.activeDetail?.type === "source" ? state.activeDetail.search || "" : "";
  const searchParts = terms(search);
  const filters = selectedSourceDetailFilters();
  if (filters.map !== "All" && !mapAllowedForDifficulty(filters.map, filters.diff)) filters.map = "All";
  const sort = state.activeDetail?.type === "source" ? state.activeDetail.sort || { key: "chance", direction: "desc" } : { key: "chance", direction: "desc" };
  const model = sourceDetailModel(payload);
  const scopedModel = sourceDetailScopedModel(payload, filters);
  const { groupedRows, searchIndex } = scopedModel;
  const { filterOptions } = model;
  const rows = groupedRows
    .filter((row) => matchesSearchGroups(searchParts, searchIndex.get(row)))
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
  const limited = rows.slice(0, MAX_DETAIL_ROWS);
  const loadedRows = Number(payload.rows?.length || payload.rowsLimited || model.groupedRows.length);
  const totalRows = Number(payload.total || loadedRows);
  const loadedText = loadedRows < totalRows
    ? `Loaded top ${loadedRows.toLocaleString()} of ${totalRows.toLocaleString()} grouped rows`
    : `${model.groupedRows.length.toLocaleString()} grouped rows`;
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
        ${sourceDetailFilterSelect("sourceDetailMap", "map", "Map", filters.map, mapOptionsForDifficulty(filterOptions.map, filters.diff))}
        ${sourceDetailFilterSelect("sourceDetailDiff", "diff", "Difficulty", filters.diff, filterOptions.diff)}
      </div>
      <span class="muted detail-result-count">${escapeHtml(showingText)}</span>
      <button
        class="detail-favorite ${isFavoriteSource(payload.source, payload.sourceKind) ? "active" : ""}"
        data-fav-type="source"
        data-fav-key="${escapeHtml(sourceKey(payload.source, payload.sourceKind))}"
        aria-pressed="${isFavoriteSource(payload.source, payload.sourceKind) ? "true" : "false"}">
        ${isFavoriteSource(payload.source, payload.sourceKind) ? "Remove Favorite" : "Favorite Source"}
      </button>
    </div>
    ${chanceGuide(sourceDetailActionLabel(payload))}
    ${sourceRollSummaryTable(rows, payload)}
    ${detailTable(limited, [
      { label: "Item", sortKey: "item", html: (row) => itemNameCell(row) },
      { label: "Amount", sortKey: "amount", html: (row) => amountCell(row), num: true },
      { label: "Rarity", sortKey: "rarity", html: (row) => rarity(row.rarity) },
      { label: "Category", sortKey: "category", html: (row) => categoryChip(row.category) },
      { label: "Maps", sortKey: "maps", html: (row) => chips(mapChipValues(row.maps || row.map, filters.map, filters.diff), "map-chip") },
      { label: "Difficulties", sortKey: "difficulties", html: (row) => chips(scopedChipValues(row.diffs || row.diff, filters.diff), "diff-chip") },
      { label: "Internal Rolls", sortKey: "rolls", html: (row) => escapeHtml(row.rolls), num: true },
      { label: "Single Roll Chance", sortKey: "perRoll", html: (row) => chanceCell(row, perRollChanceText(row), chanceBreakdownText(row, false)), num: true },
      { label: sourceChanceHeader(payload), sortKey: "chance", html: (row) => chanceCell(row, chanceText(row), chanceBreakdownText(row)), num: true },
    ])}
    ${payload.nextPage ? `<div class="detail-paging"><button type="button" data-load-source-page>Load more drop rows</button></div>` : ""}
  `;
}

async function loadMoreSourceDetail() {
  const payload = state.activeDetail?.type === "source" ? state.activeDetail.payload : null;
  if (!payload?.nextPage || payload._loadingNextPage) return;
  payload._loadingNextPage = true;
  const button = document.querySelector("[data-load-source-page]");
  if (button) {
    button.disabled = true;
    button.textContent = "Loading drop rows...";
  }
  try {
    const page = await fetchJson(payload.nextPage, dataVersionToken());
    payload.rows = [...(payload.rows || []), ...(page.rows || [])];
    payload.nextPage = page.nextPage || null;
    payload.rowsLimited = payload.rows.length;
    delete payload._sourceDetailModel;
    delete payload._sourceDetailScopedModel;
    renderSourceDetail(payload);
  } catch (error) {
    console.error(error);
    showToast("More drop rows could not be loaded");
    if (button) {
      button.disabled = false;
      button.textContent = "Try loading again";
    }
  } finally {
    payload._loadingNextPage = false;
  }
}

function renderItemDetail(payload) {
  const search = state.activeDetail?.type === "item" ? state.activeDetail.search || "" : "";
  const searchParts = terms(search);
  const filters = selectedItemDetailFilters();
  if (filters.map !== "All" && !mapAllowedForDifficulty(filters.map, filters.diff)) filters.map = "All";
  const { baseRows, filterOptions } = itemDetailModel(payload);
  const { scopedRows, searchIndex } = itemDetailScopedModel(payload, filters);
  const rows = scopedRows
    .filter((row) => matchesSearchGroups(searchParts, searchIndex.get(row)))
    .sort((a, b) => itemDetailBestLuckChanceValue(b, filters) - itemDetailBestLuckChanceValue(a, filters));
  const limited = rows.slice(0, MAX_DETAIL_ROWS);
  $("detailTitle").textContent = payload.item?.item || "Item";
  $("detailMeta").textContent = `${payload.item?.rarity || ""} ${payload.item?.category || ""} | ${baseRows.length.toLocaleString()} sources`;
  $("detailContent").innerHTML = `
    <div class="item-detail-hero">
      ${itemThumbnail(payload.item, "large")}
      <div>
        <strong>${escapeHtml(payload.item?.item || "Item")}</strong>
        <span>${rarity(payload.item?.rarity || "")} ${categoryChip(payload.item?.category || "")}</span>
      </div>
    </div>
    <div class="detail-toolbar item-detail-toolbar">
      <label class="detail-search">Search item sources
        <input id="itemDetailSearch" autocomplete="off" placeholder="Source, kind, map, difficulty, loot table..." value="${escapeHtml(search)}">
      </label>
      <div class="detail-filters item-detail-filters">
        ${itemDetailFilterSelect("itemDetailKind", "kind", "Kind", filters.kind, filterOptions.kind)}
        ${itemDetailFilterSelect("itemDetailMap", "map", "Map", filters.map, mapOptionsForDifficulty(filterOptions.map, filters.diff))}
        ${itemDetailFilterSelect("itemDetailDiff", "diff", "Difficulty", filters.diff, filterOptions.diff)}
      </div>
      <span class="muted detail-result-count">Showing ${limited.length.toLocaleString()} of ${rows.length.toLocaleString()} matching sources | ${baseRows.length.toLocaleString()} total</span>
      <button
        class="detail-favorite ${isFavoriteItem(payload.item?.itemAsset) ? "active" : ""}"
        data-fav-type="item"
        data-fav-key="${escapeHtml(payload.item?.itemAsset || "")}"
        aria-pressed="${isFavoriteItem(payload.item?.itemAsset) ? "true" : "false"}">
        ${isFavoriteItem(payload.item?.itemAsset) ? "Remove Favorite" : "Favorite Item"}
      </button>
    </div>
    ${chanceGuide(filters.kind && filters.kind !== "All" ? sourceActionLabel(filters.kind) : "one source")}
    ${detailTable(limited, [
      { label: "Source", key: "source" },
      { label: "Kind", html: (row) => kindChip(row.sourceKind) },
      { label: "Maps", html: (row) => chips(mapChipValues(row.mapValues || row.maps, filters.map, filters.diff), "map-chip") },
      { label: "Difficulties", html: (row) => chips(scopedChipValues(row.diffValues || row.diffs, filters.diff), "diff-chip") },
      { label: "Internal Rolls", html: (row) => escapeHtml(row.luckModel?.rolls || row.bestRolls || ""), num: true },
      { label: "Amount", html: (row) => amountCell(row), num: true },
      { label: "Best Single Roll", html: (row) => chanceCell(row, percent(itemDetailBestPerRollChanceValue(row, filters))), num: true },
      { label: bestChanceHeader(filters), html: (row) => chanceCell(row, percent(itemDetailBestLuckChanceValue(row, filters))), num: true },
      { label: "Open", className: "detail-action-cell", html: (row) => `<button data-open-source="${escapeHtml(sourceLookupKey(row))}">Open</button>` },
    ], (row) => `class="clickable-row" data-open-source="${escapeHtml(sourceLookupKey(row))}" tabindex="0" role="button"`)}
  `;
}

function filterBuilderBonusSelect(input, showAll = false) {
  const row = input.closest(".builder-bonus-row");
  const menu = row?.querySelector("[data-builder-bonus-menu]");
  if (!menu) return;
  const query = showAll ? "" : input.value.trim().toLowerCase();
  let visibleCount = 0;
  menu.hidden = false;
  input.setAttribute("aria-expanded", "true");
  [...menu.querySelectorAll("[data-builder-bonus-option]")].forEach((option) => {
    const matches = !query || (option.dataset.searchText || option.textContent || "").toLowerCase().includes(query);
    option.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  const empty = row.querySelector("[data-builder-bonus-search-empty]");
  if (empty) empty.hidden = !query || visibleCount > 0;
}

function closeBuilderBonusMenus() {
  document.querySelectorAll("[data-builder-bonus-menu]").forEach((menu) => {
    menu.hidden = true;
  });
  document.querySelectorAll("[data-builder-bonus-search]").forEach((input) => {
    input.value = input.dataset.selectedText || "";
    input.setAttribute("aria-expanded", "false");
  });
}

async function openItem(asset, options = {}) {
  const item = state.itemByAsset.get(asset);
  if (!item) return;
  closeGlobalSearch();
  $("detailTitle").textContent = item.item;
  $("detailMeta").textContent = "Loading item details...";
  $("detailContent").innerHTML = "";
  syncLuckInputs();
  if (!$("detailDialog").open) $("detailDialog").showModal();
  try {
    const payload = await detail(item.detailPath);
    state.activeDetail = {
      type: "item",
      payload,
      routeRow: item,
      search: "",
      filters: itemDetailFiltersFromMainPage(),
    };
    renderItemDetail(payload);
    if (options.syncRoute !== false) syncRoute({ replace: false });
    else updateDocumentMeta(currentDetailRoute());
  } catch (error) {
    console.error(error);
    $("detailMeta").textContent = "Item details could not be loaded";
    $("detailContent").innerHTML = `<div class="message-row">${escapeHtml(error.message)}</div>`;
  }
}

async function openSource(key, options = {}) {
  const row = state.sourceByKey.get(key);
  if (!row) return;
  closeGlobalSearch();
  $("detailTitle").textContent = row.source;
  $("detailMeta").textContent = "Loading source drops...";
  $("detailContent").innerHTML = "";
  syncLuckInputs();
  if (!$("detailDialog").open) $("detailDialog").showModal();
  try {
    const payload = await detail(row.detailPath);
    state.activeDetail = {
      type: "source",
      payload,
      routeRow: row,
      search: "",
      filters: sourceDetailFiltersFromMainPage(),
      sort: { key: "chance", direction: "desc" },
    };
    renderSourceDetail(payload);
    if (options.syncRoute !== false) syncRoute({ replace: false });
    else updateDocumentMeta(currentDetailRoute());
  } catch (error) {
    console.error(error);
    $("detailMeta").textContent = "Source details could not be loaded";
    $("detailContent").innerHTML = `<div class="message-row">${escapeHtml(error.message)}</div>`;
  }
}

function renderActiveDetail() {
  if (!$("detailDialog").open || !state.activeDetail) return;
  syncLuckInputs();
  if (state.activeDetail.type === "item") renderItemDetail(state.activeDetail.payload);
  if (state.activeDetail.type === "source") renderSourceDetail(state.activeDetail.payload);
}

function defaultBonusesForItem(item) {
  return (item?.secondaryPoolIds || []).map((poolId) => ({ poolId, propertyId: "", value: "" }));
}

function equipBuilderItem(asset) {
  const item = state.kit.itemByAsset.get(asset);
  if (!item || !builderClassAllowsItem(item)) return;
  const slotId = firstBuilderSlotForItem(item);
  if (!slotId) return;
  clearBuilderConfirmation();
  const slot = builderSlotById(slotId);
  const equipped = { ...state.builder.equipped, [slotId]: asset };
  const bonuses = { ...state.builder.bonuses, [slotId]: defaultBonusesForItem(item) };
  const primaryValues = { ...state.builder.primaryValues, [slotId]: defaultPrimaryValuesForItem(item) };
  if (slot.weaponRole === "primary" && isTwoHandedItem(item)) {
    const pairedSlotId = pairedWeaponSlotId(slotId);
    delete equipped[pairedSlotId];
    delete bonuses[pairedSlotId];
    delete primaryValues[pairedSlotId];
  }
  setSelectedBuilderSlot(slotId);
  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
  state.builder.pickerOpen = true;
  state.builder.pickerMode = "stats";
  renderBuilder();
}

function unequipBuilderSlot(slotId) {
  clearBuilderConfirmation();
  const ownerSlotId = builderItemOwnerSlotId(slotId);
  const { [ownerSlotId]: _removed, ...equipped } = state.builder.equipped;
  const { [ownerSlotId]: _removedPrimaryValues, ...primaryValues } = state.builder.primaryValues;
  const { [ownerSlotId]: _removedBonuses, ...bonuses } = state.builder.bonuses;
  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
  if (state.builder.selectedSlot === ownerSlotId) state.builder.pickerMode = "items";
  renderBuilder();
}

function clearBuilder() {
  clearBuilderConfirmation();
  state.builder.equipped = {};
  state.builder.primaryValues = {};
  state.builder.bonuses = {};
  state.builder.perks = [];
  state.builder.skinId = "";
  state.builder.pickerOpen = false;
  state.builder.pickerMode = "items";
  renderBuilder();
}

function confirmOrClearBuilder() {
  if (!isBuilderConfirming("clear")) {
    requestBuilderConfirmation("clear");
    return;
  }
  clearBuilder();
}

function closeBuilderPicker() {
  clearBuilderConfirmation();
  state.builder.pickerOpen = false;
  renderBuilder();
}

function toggleBuilderPerk(perkId) {
  clearBuilderConfirmation();
  const active = state.builder.perks.includes(perkId);
  state.builder.perks = active
    ? state.builder.perks.filter((id) => id !== perkId)
    : state.builder.perks.length < BUILDER_PERK_LIMIT
      ? [...state.builder.perks, perkId]
      : state.builder.perks;
  pruneBuilderEquipmentForCurrentRules();
  renderBuilder();
}

function setBuilderBonusProperty(slotId, index, propertyId) {
  const item = state.kit.itemByAsset.get(state.builder.equipped[slotId]);
  if (!item) return;
  clearBuilderConfirmation();
  const bonuses = state.builder.bonuses[slotId] || defaultBonusesForItem(item);
  const entry = bonuses[index];
  const poolId = entry?.poolId || item.secondaryPoolIds[index];
  if (propertyId && bonuses.some((bonus, bonusIndex) => bonusIndex !== index && bonus?.propertyId === propertyId)) {
    renderBuilder();
    return;
  }
  const option = secondaryOptionForItem(item, poolId, propertyId);
  bonuses[index] = {
    poolId,
    propertyId: option ? option.propertyId : "",
    value: option ? option.max : "",
  };
  state.builder.bonuses = { ...state.builder.bonuses, [slotId]: bonuses };
  renderBuilder();
}

function setBuilderBonusValue(slotId, index, value) {
  const bonuses = state.builder.bonuses[slotId];
  if (!bonuses?.[index]) return;
  clearBuilderConfirmation();
  const item = equippedBuilderItem(slotId);
  const poolId = bonuses[index].poolId || item?.secondaryPoolIds?.[index];
  const option = secondaryOptionForItem(item, poolId, bonuses[index].propertyId);
  const parsed = Number(value);
  const nextValue = option && Number.isFinite(parsed)
    ? Math.max(Number(option.min), Math.min(Number(option.max), parsed))
    : value;
  bonuses[index] = { ...bonuses[index], value: nextValue };
  state.builder.bonuses = { ...state.builder.bonuses, [slotId]: bonuses };
  renderBuilder();
}

function setBuilderPrimaryValue(slotId, index, value) {
  const item = equippedBuilderItem(slotId);
  const entry = item?.primary?.[index];
  if (!entry) return;
  clearBuilderConfirmation();
  const values = state.builder.primaryValues[slotId] || defaultPrimaryValuesForItem(item);
  values[index] = clampStatEntryValue(entry, value);
  state.builder.primaryValues = { ...state.builder.primaryValues, [slotId]: values };
  renderBuilder();
}

function openClickableRow(row) {
  if (row.dataset.openItem) {
    openItem(row.dataset.openItem);
    return;
  }
  if (row.dataset.openSource) openSource(row.dataset.openSource);
}

function wireEvents() {
  document.body.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) event.target.hidden = true;
  }, true);

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab, { replaceRoute: false });
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const tabs = [...document.querySelectorAll(".tab")];
      const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(tabs.indexOf(button) + direction + tabs.length) % tabs.length];
      next.focus();
      setActiveTab(next.dataset.tab, { replaceRoute: false });
    });
  });

  ["itemSearch", "itemRarity", "itemCategory", "itemMap", "itemDiff"]
    .forEach((id) => $(id).addEventListener("input", () => {
      if (id === "itemDiff") syncMapSelectForDifficulty("itemMap", "itemDiff");
      state.visibleRows.items = ROW_PAGE_SIZE;
      scheduleRender("items", renderItems);
      scheduleRouteSync();
    }));

  ["sourceSearch", "sourceMap", "sourceDiff", "sourceKind"]
    .forEach((id) => $(id).addEventListener("input", () => {
      if (id === "sourceDiff") syncMapSelectForDifficulty("sourceMap", "sourceDiff");
      state.visibleRows.sources = ROW_PAGE_SIZE;
      scheduleRender("sources", renderSources);
      scheduleRouteSync();
    }));

  $("globalSearch").addEventListener("input", () => scheduleRender("global-search", renderGlobalSearch));
  $("globalSearch").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeGlobalSearch();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      $("globalSearchPanel").querySelector("button")?.focus();
      return;
    }
    if (event.key !== "Enter") return;
    const first = $("globalSearchPanel").querySelector("button");
    if (first) {
      event.preventDefault();
      first.click();
    }
  });

  $("builderSearch").addEventListener("input", () => {
    clearBuilderConfirmation();
    state.builder.search = $("builderSearch").value;
    renderBuilderActionStates();
    scheduleRender("builder-items", renderBuilderItems);
  });
  $("builderRarity").addEventListener("input", () => {
    clearBuilderConfirmation();
    state.builder.rarity = $("builderRarity").value || "All";
    renderBuilderActionStates();
    scheduleRender("builder-items", renderBuilderItems);
  });
  $("builderCharacter").addEventListener("change", () => {
    clearBuilderConfirmation();
    state.builder.characterId = $("builderCharacter").value;
    const character = selectedBuilderCharacter();
    const allowedPerks = new Set(character?.perks || []);
    state.builder.perks = state.builder.perks.filter((perkId) => allowedPerks.has(perkId));
    pruneBuilderEquipmentForCurrentRules();
    renderBuilder();
  });
  $("builderSkin").addEventListener("change", () => {
    clearBuilderConfirmation();
    const skinId = $("builderSkin").value;
    state.builder.skinId = state.kit.skinById.has(skinId) ? skinId : "";
    renderBuilder();
  });

  ["luckInput", "detailLuckInput"].forEach((id) => {
    $(id).addEventListener("input", () => setCurrentLuck($(id).value));
  });

  document.body.addEventListener("click", (event) => {
    const infoButton = event.target.closest("[data-info]");
    if (infoButton) {
      event.stopPropagation();
      showInfoPopover(infoButton);
      return;
    }
    if (!event.target.closest(".info-popover")) document.querySelector(".info-popover")?.remove();
    if (!event.target.closest(".global-search-shell")) closeGlobalSearch();
    const button = event.target.closest("button");
    if (button?.dataset.moreValues) {
      event.stopPropagation();
      toggleChipPopover(button);
      return;
    }
    if (!event.target.closest("#chipPopover")) hideChipPopover(true);
    if (!event.target.closest(".builder-bonus-pick")) closeBuilderBonusMenus();
    const bonusSearch = event.target.closest("[data-builder-bonus-search]");
    if (bonusSearch) {
      bonusSearch.select();
      filterBuilderBonusSelect(bonusSearch, true);
      return;
    }
    if (button) {
      if (button.dataset.loadMore) {
        const list = button.dataset.loadMore;
        if (list === "items" || list === "sources") {
          state.visibleRows[list] += ROW_PAGE_SIZE;
          if (list === "items") renderItems();
          if (list === "sources") renderSources();
        }
        return;
      }
      if (button.dataset.loadSourcePage != null) {
        loadMoreSourceDetail();
        return;
      }
      if (button.dataset.builderBonusOption) {
        setBuilderBonusProperty(
          button.dataset.builderBonusOption,
          Number(button.dataset.bonusIndex || 0),
          button.getAttribute("data-property-id") || "",
        );
        return;
      }
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
      if (button.dataset.builderSlot) {
        setSelectedBuilderSlot(builderItemOwnerSlotId(button.dataset.builderSlot));
        state.builder.pickerOpen = true;
        state.builder.pickerMode = equippedBuilderItem(state.builder.selectedSlot) ? "stats" : "items";
        renderBuilder();
        return;
      }
      if (button.dataset.equipItem) {
        equipBuilderItem(button.dataset.equipItem);
        return;
      }
      if (button.dataset.changeBuilderItem) {
        setSelectedBuilderSlot(button.dataset.changeBuilderItem);
        state.builder.pickerOpen = true;
        state.builder.pickerMode = "items";
        renderBuilder();
        return;
      }
      if (button.dataset.unequipSlot) {
        unequipBuilderSlot(button.dataset.unequipSlot);
        return;
      }
      if (button.dataset.builderPerk) {
        toggleBuilderPerk(button.dataset.builderPerk);
        return;
      }
      if (button.dataset.loadBuilderKit) {
        loadBuilderKit(button.dataset.loadBuilderKit);
        return;
      }
      if (button.dataset.shareBuilderKit) {
        const kit = state.savedKits.find((row) => row.id === button.dataset.shareBuilderKit);
        if (kit) shareBuilderKit(kit);
        return;
      }
      if (button.dataset.deleteBuilderKit) {
        confirmOrDeleteSavedKit(button.dataset.deleteBuilderKit);
        return;
      }
      if (button.dataset.resetDamageTarget != null) {
        state.damageTarget = {
          ...state.damageTarget,
          weaponSet: state.builder.activeWeaponSet === "2" ? "2" : DAMAGE_TARGET_DEFAULTS.weaponSet,
          pdr: DAMAGE_TARGET_DEFAULTS.pdr,
          mdr: DAMAGE_TARGET_DEFAULTS.mdr,
          comboMultiplier: DAMAGE_TARGET_DEFAULTS.comboMultiplier,
        };
        renderDamageChecker();
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
    const slot = event.target.closest("button[data-builder-slot]");
    if (slot && !slot.contains(event.relatedTarget)) showBuilderSlotTooltip(slot);
    const button = event.target.closest("button[data-more-values]");
    if (!button || button.contains(event.relatedTarget)) return;
    showChipPopover(button);
  });

  document.body.addEventListener("mouseout", (event) => {
    const slot = event.target.closest("button[data-builder-slot]");
    if (slot && !slot.contains(event.relatedTarget)) hideBuilderSlotTooltip(true);
    const button = event.target.closest("button[data-more-values]");
    if (!button || button.contains(event.relatedTarget)) return;
    hideChipPopover();
  });

  document.body.addEventListener("pointerover", (event) => {
    const slot = event.target.closest("button[data-builder-slot]");
    if (slot && !slot.contains(event.relatedTarget)) showBuilderSlotTooltip(slot);
  });

  document.body.addEventListener("pointerout", (event) => {
    const slot = event.target.closest("button[data-builder-slot]");
    if (slot && !slot.contains(event.relatedTarget)) hideBuilderSlotTooltip(true);
  });

  document.body.addEventListener("mousemove", syncBuilderSlotTooltip);
  document.body.addEventListener("pointermove", syncBuilderSlotTooltip);

  document.body.addEventListener("focusin", (event) => {
    const slot = event.target.closest("button[data-builder-slot]");
    if (slot) showBuilderSlotTooltip(slot);
    if (event.target.dataset?.builderBonusSearch) {
      event.target.select();
      filterBuilderBonusSelect(event.target, true);
    }
    const button = event.target.closest("button[data-more-values]");
    if (button) showChipPopover(button);
  });

  document.body.addEventListener("focusout", (event) => {
    if (event.target.closest("button[data-builder-slot]")) hideBuilderSlotTooltip(true);
    if (event.target.closest("button[data-more-values]")) hideChipPopover();
  });

  document.body.addEventListener("input", (event) => {
    const input = event.target;
    if (input.dataset?.damageTarget) {
      const key = input.dataset.damageTarget;
      const value = key === "comboMultiplier"
        ? clampNumberInput(input.value, DAMAGE_TARGET_DEFAULTS.comboMultiplier, -1, 10)
        : clampPercentInput(input.value, DAMAGE_TARGET_DEFAULTS[key] ?? 0);
      state.damageTarget = {
        ...state.damageTarget,
        [key]: value,
      };
      renderDamageChecker(key);
      return;
    }
    if (input.dataset?.damageHand != null) {
      state.damageTarget = {
        ...state.damageTarget,
        hand: input.value === "secondary" ? "secondary" : "primary",
      };
      renderDamageChecker();
      return;
    }
    if (input.dataset?.damageWeaponSet != null) {
      state.damageTarget = {
        ...state.damageTarget,
        weaponSet: input.value === "2" ? "2" : "1",
      };
      renderDamageChecker();
      return;
    }
    if (input.dataset?.damageLocation != null) {
      state.damageTarget = {
        ...state.damageTarget,
        hitLocation: DAMAGE_HIT_LOCATIONS.some((location) => location.value === input.value)
          ? input.value
          : DAMAGE_TARGET_DEFAULTS.hitLocation,
      };
      renderDamageChecker();
      return;
    }
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
    if (input.dataset?.builderBonusSearch) {
      filterBuilderBonusSelect(input);
      return;
    }
  });

  document.body.addEventListener("change", (event) => {
    const input = event.target;
    if (input.dataset?.sourceDetailFilter && state.activeDetail?.type === "source") {
      const filters = {
        ...selectedSourceDetailFilters(),
        [input.dataset.sourceDetailFilter]: input.value,
      };
      if (input.dataset.sourceDetailFilter === "diff" && filters.map !== "All" && !mapAllowedForDifficulty(filters.map, filters.diff)) {
        filters.map = "All";
      }
      state.activeDetail.filters = filters;
      renderSourceDetail(state.activeDetail.payload);
      $(input.id)?.focus();
      return;
    }
    if (input.dataset?.itemDetailFilter && state.activeDetail?.type === "item") {
      const filters = {
        ...selectedItemDetailFilters(),
        [input.dataset.itemDetailFilter]: input.value,
      };
      if (input.dataset.itemDetailFilter === "diff" && filters.map !== "All" && !mapAllowedForDifficulty(filters.map, filters.diff)) {
        filters.map = "All";
      }
      state.activeDetail.filters = filters;
      renderItemDetail(state.activeDetail.payload);
      $(input.id)?.focus();
      return;
    }
    if (input.dataset?.builderBonusSelect) {
      setBuilderBonusProperty(input.dataset.builderBonusSelect, Number(input.dataset.bonusIndex || 0), input.value);
      return;
    }
    if (input.dataset?.builderBonusValue) {
      setBuilderBonusValue(input.dataset.builderBonusValue, Number(input.dataset.bonusIndex || 0), input.value);
      return;
    }
    if (input.dataset?.builderPrimaryValue) {
      setBuilderPrimaryValue(input.dataset.builderPrimaryValue, Number(input.dataset.primaryIndex || 0), input.value);
      return;
    }
    if (input.dataset?.damageTarget) {
      const key = input.dataset.damageTarget;
      const value = key === "comboMultiplier"
        ? clampNumberInput(input.value, DAMAGE_TARGET_DEFAULTS.comboMultiplier, -1, 10)
        : clampPercentInput(input.value, DAMAGE_TARGET_DEFAULTS[key] ?? 0);
      state.damageTarget = {
        ...state.damageTarget,
        [key]: value,
      };
      renderDamageChecker(key);
      return;
    }
    if (input.dataset?.damageHand != null) {
      state.damageTarget = {
        ...state.damageTarget,
        hand: input.value === "secondary" ? "secondary" : "primary",
      };
      renderDamageChecker();
      return;
    }
    if (input.dataset?.damageWeaponSet != null) {
      state.damageTarget = {
        ...state.damageTarget,
        weaponSet: input.value === "2" ? "2" : "1",
      };
      renderDamageChecker();
      return;
    }
    if (input.dataset?.damageLocation != null) {
      state.damageTarget = {
        ...state.damageTarget,
        hitLocation: DAMAGE_HIT_LOCATIONS.some((location) => location.value === input.value)
          ? input.value
          : DAMAGE_TARGET_DEFAULTS.hitLocation,
      };
      renderDamageChecker();
    }
  });

  $("resetItemFilters").addEventListener("click", () => {
    $("itemSearch").value = "";
    $("itemRarity").value = "All";
    $("itemCategory").value = "All";
    $("itemDiff").value = DEFAULT_DIFFICULTY;
    syncMapSelectForDifficulty("itemMap", "itemDiff");
    $("itemMap").value = "All";
    state.visibleRows.items = ROW_PAGE_SIZE;
    renderItems();
    syncRoute({ replace: true, includeDetail: false });
  });
  $("resetSourceFilters").addEventListener("click", () => {
    $("sourceSearch").value = "";
    $("sourceDiff").value = DEFAULT_DIFFICULTY;
    syncMapSelectForDifficulty("sourceMap", "sourceDiff");
    $("sourceMap").value = "All";
    $("sourceKind").value = "All";
    state.visibleRows.sources = ROW_PAGE_SIZE;
    renderSources();
    syncRoute({ replace: true, includeDetail: false });
  });
  $("copyItemView").addEventListener("click", () => copyCurrentUrl("Item view copied").catch(console.error));
  $("copySourceView").addEventListener("click", () => copyCurrentUrl("Source view copied").catch(console.error));
  $("shareDetail").addEventListener("click", () => copyCurrentUrl("Detail link copied").catch(console.error));
  $("closeDetail").addEventListener("click", () => $("detailDialog").close());
  $("detailDialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) $("detailDialog").close();
  });
  $("detailDialog").addEventListener("close", () => {
    state.activeDetail = null;
    hideChipPopover(true);
    syncRoute({ replace: true, includeDetail: false });
  });
  $("openDamageChecker").addEventListener("click", openDamageChecker);
  $("closeDamageChecker").addEventListener("click", () => $("damageDialog").close());
  $("damageDialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) $("damageDialog").close();
  });
  $("clearFavorites").addEventListener("click", () => {
    state.favorites = { items: [], sources: [] };
    saveFavorites();
    renderFavoriteState();
  });
  $("clearBuilder").addEventListener("click", confirmOrClearBuilder);
  $("closeBuilderPicker").addEventListener("click", closeBuilderPicker);
  $("saveBuilderKit").addEventListener("click", saveCurrentBuilderKit);
  $("shareBuilderKit").addEventListener("click", () => shareBuilderKit());
  $("builderPhotoMode").addEventListener("click", () => {
    saveBuilderPhoto().catch((error) => {
      console.error(error);
      setBuilderShareStatus("Photo failed");
    });
  });
  $("builderKitName").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    saveCurrentBuilderKit();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest("input, select, textarea, [contenteditable='true']")) {
      event.preventDefault();
      $("globalSearch").focus();
      return;
    }
    if (event.key === "Escape") {
      closeBuilderBonusMenus();
      closeGlobalSearch();
      document.querySelector(".info-popover")?.remove();
      hideChipPopover(true);
      hideBuilderSlotTooltip(true);
      if (state.builder.pickerOpen) closeBuilderPicker();
    }
  });
  document.addEventListener("scroll", () => {
    hideChipPopover(true);
    hideBuilderSlotTooltip(true);
  }, true);
  window.addEventListener("resize", () => {
    hideChipPopover(true);
    hideBuilderSlotTooltip(true);
  });
  window.addEventListener("popstate", async () => {
    const route = readRoute();
    applyRouteControls(route);
    renderActiveTab();
    if (route.detailType) {
      await openRouteDetail(route);
    } else if ($("detailDialog").open) {
      $("detailDialog").close();
    }
  });
}

wireEvents();
loadData().catch((error) => {
  console.error(error);
  $("dataStatus").textContent = `Could not load website data: ${error.message}`;
  $("appLoading").classList.add("ready");
  showToast("DarkLoot data could not be loaded");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
}
