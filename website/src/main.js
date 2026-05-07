const state = {
  manifest: null,
  items: [],
  sources: [],
  kit: {
    items: [],
    itemByAsset: new Map(),
    secondaryPools: {},
    propertyTypes: {},
    curveTables: {},
    characters: [],
    characterById: new Map(),
    perks: [],
    perkById: new Map(),
  },
  builder: {
    characterId: "",
    selectedSlot: "weapon1Primary",
    activeWeaponSet: "1",
    search: "",
    rarity: "All",
    slotFilter: "Selected",
    pickerOpen: false,
    characterCollapsed: false,
    equipped: {},
    primaryValues: {},
    bonuses: {},
    perks: [],
  },
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
const BUILDER_PERK_LIMIT = 4;
const BUILDER_DEFAULTS = {
  headshotDamageBonus: 150,
  primaryUnarmedDamage: 8,
  primaryUnarmedImpactPower: 1,
};
const BUILDER_SLOTS = [
  { id: "weapon1Primary", label: "Primary", marker: "1", accepts: ["Primary"], area: "weapon1Primary", kind: "weapon", weaponSet: "1", weaponRole: "primary" },
  { id: "weapon1Secondary", label: "Secondary", accepts: ["Secondary"], area: "weapon1Secondary", kind: "weapon", weaponSet: "1", weaponRole: "secondary" },
  { id: "weapon2Primary", label: "Primary", marker: "2", accepts: ["Primary"], area: "weapon2Primary", kind: "weapon", weaponSet: "2", weaponRole: "primary" },
  { id: "weapon2Secondary", label: "Secondary", accepts: ["Secondary"], area: "weapon2Secondary", kind: "weapon", weaponSet: "2", weaponRole: "secondary" },
  { id: "head", label: "Head", accepts: ["Head"], area: "head", kind: "medium" },
  { id: "chest", label: "Chest", accepts: ["Chest"], area: "chest", kind: "tall" },
  { id: "hands", label: "Hands", accepts: ["Hands"], area: "hands", kind: "medium" },
  { id: "legs", label: "Legs", accepts: ["Legs", "Leg"], area: "legs", kind: "tall" },
  { id: "feet", label: "Feet", accepts: ["Foot", "Feet"], area: "feet", kind: "medium" },
  { id: "cloak", label: "Cloak", accepts: ["Back", "Cloak"], area: "cloak", kind: "medium" },
  { id: "necklace", label: "Necklace", accepts: ["Necklace"], area: "necklace", kind: "small" },
  { id: "ring1", label: "Ring 1", accepts: ["Ring"], area: "ring1", kind: "small" },
  { id: "ring2", label: "Ring 2", accepts: ["Ring"], area: "ring2", kind: "small" },
];
const BUILDER_STAT_ROWS = [
  { key: "Strength", label: "Strength" },
  { key: "Vigor", label: "Vigor" },
  { key: "Agility", label: "Agility" },
  { key: "Dexterity", label: "Dexterity" },
  { key: "Will", label: "Will" },
  { key: "Knowledge", label: "Knowledge" },
  { key: "Resourcefulness", label: "Resourcefulness" },
  { key: "Health", label: "Health" },
  { key: "PhysicalHealing", label: "Physical Healing" },
  { key: "MagicalHealing", label: "Magical Healing" },
  { key: "MemoryCapacity", label: "Memory Capacity" },
  { key: "MemorySpellPayload", label: "Memory Spell Payload" },
  { key: "MemoryMusicPayload", label: "Memory Music Payload" },
  { key: "UtilityEffectiveness", label: "Utility Effectiveness" },
  { key: "Luck", label: "Luck" },
  { key: "HealthRecoveryBonus", label: "Health Recovery Bonus", unit: "%" },
  { key: "SpellRecoveryBonus", label: "Spell Recovery Bonus", unit: "%" },
  { key: "MoveSpeed", label: "Move Speed" },
  { key: "ActionSpeed", label: "Action Speed", unit: "%" },
  { key: "ManualDexterity", label: "Manual Dexterity", unit: "%" },
  { key: "SpellCastingSpeed", label: "Spell Casting Speed", unit: "%" },
  { key: "EquipSpeed", label: "Equip Speed", unit: "%" },
  { key: "RegularInteractionSpeed", label: "Regular Interaction Speed", unit: "%" },
  { key: "MagicalInteractionSpeed", label: "Magical Interaction Speed", unit: "%" },
  { key: "Persuasiveness", label: "Persuasiveness" },
  { key: "BuffDurationBonus", label: "Buff Duration Bonus", unit: "%" },
  { key: "DebuffDurationBonus", label: "Debuff Duration Bonus", unit: "%" },
  { key: "CooldownReductionBonus", label: "Cooldown Reduction Bonus", unit: "%" },
  { key: "ArmorPenetration", label: "Armor Penetration", unit: "%" },
  { key: "MagicPenetration", label: "Magic Penetration", unit: "%" },
  { key: "HeadshotReduction", label: "Headshot Damage Reduction", unit: "%" },
  { key: "ProjectileReduction", label: "Projectile Damage Reduction", unit: "%" },
  { key: "PhysicalArmorReduction", label: "Physical Armor Reduction", unit: "%" },
  { key: "PhysicalArmorReductionFromArmor", label: "From Armor Rating", indent: true, unit: "%" },
  { key: "PhysicalArmorReductionBonus", label: "From Bonuses", indent: true, unit: "%" },
  { key: "MagicalDamageReduction", label: "Magical Damage Reduction", unit: "%" },
  { key: "MagicalDamageReductionFromResistance", label: "From Magic Resistance", indent: true, unit: "%" },
  { key: "MagicalDamageReductionBonus", label: "From Bonuses", indent: true, unit: "%" },
  { key: "UndeadDamageReduction", label: "Undead Damage Reduction", unit: "%" },
  { key: "DemonDamageReduction", label: "Demon Damage Reduction", unit: "%" },
  { key: "HeadshotDamageBonus", label: "Headshot Damage Bonus", unit: "%" },
  { key: "PhysicalDamageBonus", label: "Physical Power Bonus", unit: "%" },
  { key: "PhysicalDamageBonusFromPower", label: "From Physical Power", indent: true, unit: "%" },
  { key: "PhysicalDamageBonusFromBonuses", label: "From Bonuses", indent: true, unit: "%" },
  { key: "MagicalDamageBonus", label: "Magic Power Bonus", unit: "%" },
  { key: "MagicalDamageBonusFromPower", label: "From Magic Power", indent: true, unit: "%" },
  { key: "MagicalDamageBonusFromBonuses", label: "From Bonuses", indent: true, unit: "%" },
  { key: "UndeadDamageBonus", label: "Undead Damage Bonus", unit: "%" },
  { key: "DemonDamageBonus", label: "Demon Damage Bonus", unit: "%" },
  { key: "PrimaryWeapon", label: "Primary Weapon", type: "text", slot: "activePrimaryWeapon" },
  { key: "PrimaryWeaponAttack1", label: "Attack 1", sourceKey: "PhysicalWeaponDamage", slot: "activePrimaryWeapon" },
  { key: "PrimaryWeaponAttack2", label: "Attack 2", sourceKey: "MagicalWeaponDamage", slot: "activePrimaryWeapon" },
  { key: "SecondaryWeapon", label: "Secondary Weapon", type: "text", slot: "activeSecondaryWeapon" },
  { key: "ImpactPower", label: "Impact Power" },
  { key: "PrimaryWeaponImpactPower", label: "Primary Weapon Impact Power", sourceKey: "ImpactPower", slot: "activePrimaryWeapon" },
  { key: "SecondaryWeaponImpactPower", label: "Secondary Weapon Impact Power", sourceKey: "ImpactPower", slot: "activeSecondaryWeapon" },
];
const BUILDER_STAT_ORDER = BUILDER_STAT_ROWS.map((row) => row.key);
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
  renderActiveDetail();
}

function toggleFavoriteSource(source, kind) {
  const key = sourceKey(source, kind);
  const exists = state.favorites.sources.includes(key);
  state.favorites.sources = exists
    ? state.favorites.sources.filter((value) => value !== key)
    : [...state.favorites.sources, key];
  saveFavorites();
  render();
  renderActiveDetail();
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
  const slot = builderSlotById(slotId);
  state.builder.selectedSlot = slot.id;
  if (slot.weaponSet) state.builder.activeWeaponSet = slot.weaponSet;
}

function itemSlotId(item) {
  return item?.slot?.id || "";
}

function itemIsTwoHanded(item) {
  return String(item?.hand || "").toLowerCase() === "twohanded";
}

function pairedWeaponSlotId(slotId) {
  const slot = builderSlotById(slotId);
  if (!slot.weaponSet) return "";
  return `weapon${slot.weaponSet}${slot.weaponRole === "primary" ? "Secondary" : "Primary"}`;
}

function equippedBuilderItem(slotId) {
  return state.kit.itemByAsset.get(state.builder.equipped[slotId]);
}

function weaponSlotBlockReason(slotId) {
  const slot = builderSlotById(slotId);
  if (slot.weaponRole !== "secondary") return "";
  const primary = equippedBuilderItem(pairedWeaponSlotId(slotId));
  return itemIsTwoHanded(primary) ? `${primary.name} is two-handed` : "";
}

function slotStatsAreActive(slotId) {
  const slot = builderSlotById(slotId);
  return !slot.weaponSet || slot.weaponSet === state.builder.activeWeaponSet;
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

function builderClassAllowsItem(item) {
  const allowed = item?.allowedClasses || [];
  const character = selectedBuilderCharacter();
  if (!allowed.length || !character) return true;
  return allowed.some((entry) => entry.id === character.id);
}

function classNamesText(classes) {
  const values = (classes || []).map((entry) => entry.name).filter(Boolean);
  return values.length ? values.join(", ") : "All classes";
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
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number(entry?.max ?? entry?.min ?? 0);
  const min = Number(entry?.min ?? parsed);
  const max = Number(entry?.max ?? parsed);
  return Math.max(min, Math.min(max, parsed));
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

function addBuilderStat(totals, entry, source) {
  const value = Number(entry?.value ?? entry?.max ?? entry?.min ?? 0);
  if (!Number.isFinite(value) || value === 0) return;
  const key = entry.statKey || entry.rawKey || entry.propertyId || "Unknown";
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
  const pool = state.kit.secondaryPools[entry.poolId];
  const option = pool?.options?.find((row) => row.propertyId === entry.propertyId);
  if (!option) return null;
  const value = Number(entry.value);
  return {
    ...option,
    value: Number.isFinite(value) ? value : Number(option.max ?? option.min ?? 0),
  };
}

function builderStatMap() {
  const totals = new Map();
  const character = selectedBuilderCharacter();
  (character?.baseStats || []).forEach((entry) => addBuilderStat(totals, entry, character.name));
  state.builder.perks.forEach((perkId) => {
    const perk = state.kit.perkById.get(perkId);
    (perk?.stats || []).forEach((entry) => addBuilderStat(totals, entry, perk.name));
  });
  Object.entries(state.builder.equipped).forEach(([slotId, asset]) => {
    if (!slotStatsAreActive(slotId)) return;
    const item = state.kit.itemByAsset.get(asset);
    addItemStats(totals, slotId, item);
  });
  return totals;
}

function itemStatTotal(slotId, statKey) {
  const resolvedSlotId = resolveBuilderSlotId(slotId);
  const item = state.kit.itemByAsset.get(state.builder.equipped[resolvedSlotId]);
  if (!item || !statKey) return { value: defaultSlotStatValue(resolvedSlotId, statKey), unit: "" };
  const totals = new Map();
  addItemStats(totals, resolvedSlotId, item);
  return totals.get(statKey) || { value: 0, unit: "" };
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

function curveKeys(tableName, rowName) {
  const keys = state.kit.curveTables?.[tableName]?.[rowName];
  return Array.isArray(keys) ? keys : [];
}

function curveValue(tableName, rowName, input, fallback = 0) {
  const keys = curveKeys(tableName, rowName);
  const x = Number(input || 0);
  if (!keys.length || !Number.isFinite(x)) return fallback;
  if (x <= Number(keys[0][0])) return Number(keys[0][1] || 0);
  for (let index = 1; index < keys.length; index += 1) {
    const previous = keys[index - 1];
    const next = keys[index];
    const x1 = Number(previous[0]);
    const y1 = Number(previous[1]);
    const x2 = Number(next[0]);
    const y2 = Number(next[1]);
    if (x <= x2) {
      if (Math.abs(x2 - x1) < 0.0001) return y2;
      const ratio = (x - x1) / (x2 - x1);
      return y1 + ((y2 - y1) * ratio);
    }
  }
  return Number(keys[keys.length - 1][1] || 0);
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
  const will = directStatValue(totals, "Will");
  const knowledge = directStatValue(totals, "Knowledge");
  const resourcefulness = directStatValue(totals, "Resourcefulness");

  const baseHealth = curveValue(
    "CT_MaxHealthBase",
    "MaxHealthBase",
    vigor,
    character ? 80 : 0,
  );
  const health = (baseHealth + directStatValue(totals, "Health")) * (1 + (directStatValue(totals, "MaxHealthBonus") / 100));
  values.set("Health", Math.ceil(health));

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
  values.set("MemoryCapacity", curveValue("CT_Knowledge", "MemoryCapacity", knowledge) + directStatValue(totals, "MemoryCapacity"));
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

  const armorRating = directStatValue(totals, "ArmorRating");
  const physicalReductionFromArmor = curvePercent("CT_ArmorRating", "PhysicalReduction", armorRating);
  const physicalReductionFromBonuses = directStatValue(totals, "PhysicalArmorReduction", "PhysicalArmorReductionBonus");
  values.set("PhysicalArmorReduction", physicalReductionFromArmor + physicalReductionFromBonuses);
  values.set("PhysicalArmorReductionFromArmor", physicalReductionFromArmor);
  values.set("PhysicalArmorReductionBonus", physicalReductionFromBonuses);

  const magicResistance = curveValue("CT_Will", "MagicResistance", will) + directStatValue(totals, "MagicResistance", "MagicalResistance");
  const magicalReductionFromResistance = curvePercent("CT_MagicResistance", "MagicalReduction", magicResistance);
  const magicalReductionFromBonuses = directStatValue(totals, "MagicalDamageReduction", "MagicalDamageReductionBonus");
  values.set("MagicalDamageReduction", magicalReductionFromResistance + magicalReductionFromBonuses);
  values.set("MagicalDamageReductionFromResistance", magicalReductionFromResistance);
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

function builderStatTotals() {
  return builderStatRows()
    .filter((row) => row.type !== "text" && Number(row.value) !== 0)
    .sort((left, right) => {
      const rank = statRank(left.key) - statRank(right.key);
      if (rank) return rank;
      return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
    });
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
  const builderRarities = [...new Set(state.kit.items.map((row) => row.rarity).filter(Boolean))]
    .sort((left, right) => rarityRank(left) - rarityRank(right));
  $("builderRarity").innerHTML = optionHtml(builderRarities);
  if ($("builderSlotFilter")) {
    $("builderSlotFilter").innerHTML = [
      `<option>Selected</option>`,
      `<option>All</option>`,
      ...BUILDER_SLOTS.map((slot) => `<option value="${escapeHtml(slot.id)}">${escapeHtml(slot.label)}</option>`),
    ].join("");
  }
  $("builderCharacter").innerHTML = state.kit.characters.length
    ? state.kit.characters.map((character) => `<option value="${escapeHtml(character.id)}">${escapeHtml(character.name)}</option>`).join("")
    : `<option value="">No character data</option>`;
  setSelectIfAvailable("itemDiff", DEFAULT_DIFFICULTY);
  setSelectIfAvailable("sourceDiff", DEFAULT_DIFFICULTY);
  if ($("builderSlotFilter")) setSelectIfAvailable("builderSlotFilter", state.builder.slotFilter);
  setSelectIfAvailable("builderRarity", state.builder.rarity);
  setSelectIfAvailable("builderCharacter", state.builder.characterId);
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
  const [items, sources, rates, kit] = await Promise.all([
    fetchJson(state.manifest.files.items),
    fetchJson(state.manifest.files.sources),
    fetchJson(state.manifest.files.rates),
    state.manifest.files.kit ? fetchJson(state.manifest.files.kit) : Promise.resolve({}),
  ]);
  state.items = items.rows || [];
  state.sources = sources.rows || [];
  state.rateWeights = rates.rows || {};
  const kitItems = kit.items || [];
  const kitCharacters = kit.characters || [];
  const kitPerks = kit.perks || [];
  state.kit = {
    items: kitItems,
    itemByAsset: new Map(kitItems.map((row) => [row.asset, row])),
    secondaryPools: kit.secondaryPools || {},
    propertyTypes: kit.propertyTypes || {},
    curveTables: kit.curveTables || {},
    characters: kitCharacters,
    characterById: new Map(kitCharacters.map((row) => [row.id, row])),
    perks: kitPerks,
    perkById: new Map(kitPerks.map((row) => [row.id, row])),
  };
  state.builder.characterId = state.builder.characterId || kitCharacters[0]?.id || "";
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

function itemThumbnail(row, variant = "") {
  const art = itemArt(row);
  const iconUrl = row?.iconUrl || art?.iconUrl || "";
  const name = itemDisplayName(row);
  const classes = [
    "item-thumb",
    variant ? `item-thumb-${variant}` : "",
    row?.rarity ? `item-thumb-${chipClass(row.rarity)}` : "",
    iconUrl ? "has-image" : "placeholder",
  ].filter(Boolean).join(" ");
  if (iconUrl) {
    return `<span class="${classes}" title="${escapeHtml(name)}"><img src="${escapeHtml(iconUrl)}" alt=""></span>`;
  }
  return `<span class="${classes}" title="${escapeHtml(art?.iconAsset || art?.artAsset || name)}"><span>${escapeHtml(itemInitials(row))}</span></span>`;
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
        <td>${itemNameCell(row)}</td>
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
  const search = state.builder.search;
  const rarityFilter = state.builder.rarity;
  const selectedSlot = state.builder.selectedSlot;
  return state.kit.items
    .filter((item) => {
      if (rarityFilter !== "All" && item.rarity !== rarityFilter) return false;
      if (!builderClassAllowsItem(item)) return false;
      if (selectedSlot && !itemFitsBuilderSlot(item, selectedSlot)) return false;
      return matchesAnySearchGroup(search, [
        [item.name, item.asset, item.rarity, item.slot?.label, item.weaponTypes?.join(" "), item.armorType],
        [(item.allowedClasses || []).map((entry) => entry.name).join(" ")],
        (item.primary || []).map((entry) => entry.label),
      ]);
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
      const stats = (perk.stats || []).map((stat) => `${stat.label} ${statValue(stat.value, stat.unit)}`).join(", ");
      return `
        <button
          type="button"
          class="builder-perk ${active ? "active" : ""}"
          data-builder-perk="${escapeHtml(perk.id)}"
          aria-pressed="${active ? "true" : "false"}"
          ${disabled ? "disabled" : ""}>
          <span>${escapeHtml(perk.name)}</span>
          <small>${escapeHtml(stats || "No direct stat modifier")}</small>
        </button>
      `;
    }).join("")
    : `<div class="builder-empty">No perks found for this character.</div>`;
}

function renderBuilderEquipment() {
  $("builderEquipment").innerHTML = BUILDER_SLOTS.map((slot) => {
    const item = state.kit.itemByAsset.get(state.builder.equipped[slot.id]);
    const blockReason = weaponSlotBlockReason(slot.id);
    const primary = (item?.primary || []).slice(0, 2).map((entry, index) => {
      const selected = selectedPrimaryEntry(slot.id, index);
      return `${entry.label} ${statValue(selected?.value ?? entry.max ?? entry.min, entry.unit)}`;
    }).join(", ");
    const art = item
      ? itemThumbnail(item, "equipment")
      : `<span class="equipment-ghost equipment-ghost-${escapeHtml(slot.id)}" aria-hidden="true"></span>`;
    return `
      <button
        type="button"
        class="builder-slot builder-slot-${escapeHtml(slot.id)} ${slot.kind || ""} ${state.builder.selectedSlot === slot.id ? "active" : ""} ${slot.weaponSet === state.builder.activeWeaponSet ? "active-set" : ""} ${item ? "filled" : ""} ${blockReason ? "blocked" : ""}"
        style="grid-area: ${escapeHtml(slot.area)}"
        data-builder-slot="${escapeHtml(slot.id)}"
        aria-pressed="${state.builder.selectedSlot === slot.id ? "true" : "false"}"
        ${blockReason ? `title="${escapeHtml(blockReason)}"` : ""}>
        ${slot.marker ? `<span class="builder-slot-marker">${escapeHtml(slot.marker)}</span>` : ""}
        <span class="builder-slot-art">${art}</span>
        <span class="builder-slot-label">${escapeHtml(slot.label)}</span>
        ${item ? `
          <span class="builder-slot-info">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${rarity(item.rarity)} ${escapeHtml(item.gearScore || 0)} GS</span>
            <small>${escapeHtml(primary)}</small>
          </span>
        ` : `
          <span class="builder-slot-info empty">
            <strong>${blockReason ? "Blocked" : "Empty"}</strong>
            <span>${escapeHtml(blockReason || slot.accepts.join(" / "))}</span>
          </span>
        `}
      </button>
    `;
  }).join("");
}

function bonusSelect(slotId, item, poolId, index) {
  const pool = state.kit.secondaryPools[poolId];
  const selectedEntry = state.builder.bonuses[slotId]?.[index] || {};
  const options = pool?.options || [];
  const selectedOption = options.find((option) => option.propertyId === selectedEntry.propertyId);
  const value = Number.isFinite(Number(selectedEntry.value))
    ? Number(selectedEntry.value)
    : Number(selectedOption?.max ?? selectedOption?.min ?? 0);
  return `
    <div class="builder-bonus-row">
      <label>Bonus ${index + 1}
        <select data-builder-bonus-select="${escapeHtml(slotId)}" data-bonus-index="${index}">
          <option value="">None</option>
          ${options.map((option) => `
            <option value="${escapeHtml(option.propertyId)}" ${option.propertyId === selectedEntry.propertyId ? "selected" : ""}>
              ${escapeHtml(option.label)} (${escapeHtml(statRange(option))})
            </option>
          `).join("")}
        </select>
      </label>
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
  $("builderBonusPanel").innerHTML = `
    <div class="builder-bonus-title">
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${rarity(item.rarity)} ${escapeHtml(item.slot?.label || "")} | ${escapeHtml(classNamesText(item.allowedClasses))}</p>
      </div>
      <button type="button" data-unequip-slot="${escapeHtml(slotId)}">Remove</button>
    </div>
    <div class="builder-primary-list">${primary || `<span><b>Primary</b>None</span>`}</div>
    <div class="builder-secondary-list">${secondary || `<div class="builder-empty">No secondary bonus slots.</div>`}</div>
  `;
}

function renderBuilderPicker() {
  const picker = $("builderPicker");
  const slot = builderSlotById(state.builder.selectedSlot);
  const blockReason = weaponSlotBlockReason(slot.id);
  picker.hidden = !state.builder.pickerOpen;
  $("builderPickerTitle").textContent = slot ? `Pick ${slot.label}` : "Pick Item";
  $("builderPickerMeta").textContent = blockReason || (slot ? slot.accepts.join(" / ") : "");
}

function renderBuilderItems() {
  const rows = filteredBuilderItems();
  const limited = rows.slice(0, 180);
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
            <p>${rarity(item.rarity)} <span>${escapeHtml(item.slot?.label || "")}</span> <span>${escapeHtml(item.gearScore || 0)} GS</span></p>
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

function renderBuilderStats() {
  const stats = builderStatRows();
  const gearScore = Object.values(state.builder.equipped)
    .map((asset) => Number(state.kit.itemByAsset.get(asset)?.gearScore || 0))
    .reduce((sum, value) => sum + value, 0);
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

function renderBuilderSummary() {
  const equippedCount = Object.values(state.builder.equipped).filter(Boolean).length;
  const character = selectedBuilderCharacter();
  const stats = builderStatTotals();
  $("builderSummary").innerHTML = [
    metaPill("Character", character?.name || "None"),
    metaPill("Equipped", `${equippedCount} / ${BUILDER_SLOTS.length}`),
    metaPill("Stats", stats.length.toLocaleString()),
  ].join("");
}

function renderBuilder() {
  if (!$("builderView")) return;
  $("builderSearch").value = state.builder.search;
  $("builderRarity").value = state.builder.rarity;
  if ($("builderSlotFilter")) $("builderSlotFilter").value = state.builder.slotFilter;
  if (state.builder.characterId) $("builderCharacter").value = state.builder.characterId;
  $("builderCharacterPanel").classList.toggle("collapsed", state.builder.characterCollapsed);
  $("builderCharacterToggle").setAttribute("aria-expanded", state.builder.characterCollapsed ? "false" : "true");
  renderBuilderSummary();
  renderBuilderPerks();
  renderBuilderEquipment();
  renderBuilderPicker();
  renderBuilderBonusPanel();
  renderBuilderItems();
  renderBuilderStats();
}

function render() {
  updateSortButtons();
  renderItems();
  renderSources();
  renderFavorites();
  renderBuilder();
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
      <button
        class="detail-favorite ${isFavoriteSource(payload.source, payload.sourceKind) ? "active" : ""}"
        data-fav-type="source"
        data-fav-key="${escapeHtml(sourceKey(payload.source, payload.sourceKind))}"
        aria-pressed="${isFavoriteSource(payload.source, payload.sourceKind) ? "true" : "false"}">
        ${isFavoriteSource(payload.source, payload.sourceKind) ? "Remove Favorite" : "Favorite Source"}
      </button>
    </div>
    ${detailTable(limited, [
      { label: "Item", sortKey: "item", html: (row) => itemNameCell(row) },
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
        ${itemDetailFilterSelect("itemDetailMap", "map", "Map", filters.map, filterOptions.map)}
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
    ${detailTable(limited, [
      { label: "Source", key: "source" },
      { label: "Kind", html: (row) => kindChip(row.sourceKind) },
      { label: "Maps", html: (row) => chips(row.mapValues || row.maps, "map-chip") },
      { label: "Difficulties", html: (row) => chips(row.diffValues || row.diffs, "diff-chip") },
      { label: "Best Base Chance", html: (row) => escapeHtml(baseChanceText(row)), num: true },
      { label: "Best Chance With Luck", html: (row) => escapeHtml(chanceText(row, "chanceValue", "chance")), num: true },
      { label: "Open", className: "detail-action-cell", html: (row) => `<button data-open-source="${escapeHtml(sourceLookupKey(row))}">Open</button>` },
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

function defaultBonusesForItem(item) {
  return (item?.secondaryPoolIds || []).map((poolId) => ({ poolId, propertyId: "", value: "" }));
}

function equipBuilderItem(asset) {
  const item = state.kit.itemByAsset.get(asset);
  if (!item || !builderClassAllowsItem(item)) return;
  const slotId = firstBuilderSlotForItem(item);
  if (!slotId) return;
  const slot = builderSlotById(slotId);
  const equipped = { ...state.builder.equipped, [slotId]: asset };
  const bonuses = { ...state.builder.bonuses, [slotId]: defaultBonusesForItem(item) };
  const primaryValues = { ...state.builder.primaryValues, [slotId]: defaultPrimaryValuesForItem(item) };
  if (slot.weaponRole === "primary" && itemIsTwoHanded(item)) {
    const pairedSlotId = pairedWeaponSlotId(slotId);
    delete equipped[pairedSlotId];
    delete bonuses[pairedSlotId];
    delete primaryValues[pairedSlotId];
  }
  setSelectedBuilderSlot(slotId);
  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
  renderBuilder();
}

function unequipBuilderSlot(slotId) {
  const { [slotId]: _removed, ...equipped } = state.builder.equipped;
  const { [slotId]: _removedPrimaryValues, ...primaryValues } = state.builder.primaryValues;
  const { [slotId]: _removedBonuses, ...bonuses } = state.builder.bonuses;
  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
  renderBuilder();
}

function clearBuilder() {
  state.builder.equipped = {};
  state.builder.primaryValues = {};
  state.builder.bonuses = {};
  state.builder.perks = [];
  state.builder.pickerOpen = false;
  renderBuilder();
}

function closeBuilderPicker() {
  state.builder.pickerOpen = false;
  renderBuilder();
}

function toggleBuilderPerk(perkId) {
  const active = state.builder.perks.includes(perkId);
  state.builder.perks = active
    ? state.builder.perks.filter((id) => id !== perkId)
    : state.builder.perks.length < BUILDER_PERK_LIMIT
      ? [...state.builder.perks, perkId]
      : state.builder.perks;
  renderBuilder();
}

function setBuilderBonusProperty(slotId, index, propertyId) {
  const item = state.kit.itemByAsset.get(state.builder.equipped[slotId]);
  if (!item) return;
  const bonuses = state.builder.bonuses[slotId] || defaultBonusesForItem(item);
  const entry = bonuses[index];
  const poolId = entry?.poolId || item.secondaryPoolIds[index];
  const pool = state.kit.secondaryPools[poolId];
  const option = pool?.options?.find((row) => row.propertyId === propertyId);
  bonuses[index] = {
    poolId,
    propertyId,
    value: option ? option.max : "",
  };
  state.builder.bonuses = { ...state.builder.bonuses, [slotId]: bonuses };
  renderBuilder();
}

function setBuilderBonusValue(slotId, index, value) {
  const bonuses = state.builder.bonuses[slotId];
  if (!bonuses?.[index]) return;
  const pool = state.kit.secondaryPools[bonuses[index].poolId];
  const option = pool?.options?.find((row) => row.propertyId === bonuses[index].propertyId);
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
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      $(`${state.activeTab}View`).classList.add("active");
      if (state.activeTab === "favorites") renderFavorites();
      if (state.activeTab === "builder") renderBuilder();
    });
  });

  ["itemSearch", "itemRarity", "itemCategory", "itemMap", "itemDiff", "sourceSearch", "sourceMap", "sourceDiff", "sourceKind"]
    .forEach((id) => $(id).addEventListener("input", render));

  $("builderSearch").addEventListener("input", () => {
    state.builder.search = $("builderSearch").value;
    renderBuilder();
  });
  $("builderRarity").addEventListener("input", () => {
    state.builder.rarity = $("builderRarity").value || "All";
    renderBuilder();
  });
  $("builderSlotFilter")?.addEventListener("input", () => {
    state.builder.slotFilter = $("builderSlotFilter").value || "Selected";
    renderBuilder();
  });
  $("builderCharacter").addEventListener("change", () => {
    state.builder.characterId = $("builderCharacter").value;
    const character = selectedBuilderCharacter();
    const allowedPerks = new Set(character?.perks || []);
    state.builder.perks = state.builder.perks.filter((perkId) => allowedPerks.has(perkId));
    const equipped = {};
    const primaryValues = {};
    const bonuses = {};
    Object.entries(state.builder.equipped).forEach(([slotId, asset]) => {
      const item = state.kit.itemByAsset.get(asset);
      if (!item || !builderClassAllowsItem(item)) return;
      equipped[slotId] = asset;
      if (state.builder.primaryValues[slotId]) primaryValues[slotId] = state.builder.primaryValues[slotId];
      if (state.builder.bonuses[slotId]) bonuses[slotId] = state.builder.bonuses[slotId];
    });
    state.builder.equipped = equipped;
    state.builder.primaryValues = primaryValues;
    state.builder.bonuses = bonuses;
    renderBuilder();
  });

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
      if (button.dataset.builderSlot) {
        setSelectedBuilderSlot(button.dataset.builderSlot);
        state.builder.pickerOpen = true;
        renderBuilder();
        return;
      }
      if (button.dataset.equipItem) {
        equipBuilderItem(button.dataset.equipItem);
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
  $("clearBuilder").addEventListener("click", clearBuilder);
  $("closeBuilderPicker").addEventListener("click", closeBuilderPicker);
  $("builderCharacterToggle").addEventListener("click", () => {
    state.builder.characterCollapsed = !state.builder.characterCollapsed;
    renderBuilder();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideChipPopover(true);
      if (state.builder.pickerOpen) closeBuilderPicker();
    }
  });
  document.addEventListener("scroll", () => hideChipPopover(true), true);
  window.addEventListener("resize", () => hideChipPopover(true));
}

wireEvents();
loadData().catch((error) => {
  console.error(error);
  $("dataStatus").textContent = `Could not load website data: ${error.message}`;
});
