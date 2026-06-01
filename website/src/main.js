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
    characterSkins: [],
    skinById: new Map(),
    perks: [],
    perkById: new Map(),
  },
  kitReady: false,
  kitPromise: null,
  itemSearchIndex: new Map(),
  sourceSearchIndex: new Map(),
  kitSearchIndex: new Map(),
  builder: {
    characterId: "",
    selectedSlot: "weapon1Primary",
    activeWeaponSet: "1",
    search: "",
    rarity: "All",
    pickerOpen: false,
    pickerMode: "items",
    equipped: {},
    primaryValues: {},
    bonuses: {},
    perks: [],
    skinId: "",
    confirmAction: null,
    shareStatus: "",
  },
  damageTarget: {
    hand: "primary",
    hitLocation: "torso",
    hitZoneMultiplier: 110,
    pdr: -10,
    mdr: -10,
  },
  itemByAsset: new Map(),
  sourceByKey: new Map(),
  rateWeights: {},
  favorites: { items: [], sources: [] },
  favoriteItemSet: new Set(),
  favoriteSourceSet: new Set(),
  savedKits: [],
  chipPopover: { target: null, pinned: false },
  slotTooltip: { target: null },
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
const SAVED_KITS_KEY = "darkloot:builder-kits:v1";
const SHARED_KIT_PARAM = "k";
const SHARED_KIT_LEGACY_PARAM = "kit";
const SHARED_KIT_COMPRESSED_PREFIX = "z.";
const SHARED_KIT_BINARY_PREFIX = "d.";
const SHARED_KIT_VERSION = 4;
const SHARED_KIT_BINARY_VERSION = 5;
const SHARED_KIT_LEGACY_VERSION = 2;
const SHARED_ITEM_PREFIX = "Id_Item_";
const SHARED_PROPERTY_PREFIX = "Id_ItemPropertyType_Effect_";
const SHARED_PERK_PREFIX = "Id_Perk_";
const SHARED_SKIN_PREFIX = "Id_ActorStatusEffect_CharacterSkin_";
const APP_BUILD_ID = "20260601-2";
const SITE_UPDATED_AT = "2026-05-29T00:00:00+03:00";
const MAX_ROWS = 500;
const MAX_BUILDER_ITEMS = 180;
const MAX_DETAIL_ROWS = 500;
const TERMS_CACHE_LIMIT = 6000;
const RARITY_ORDER = ["Junk", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Unique", "Artifact"];
const SQUIRE_MAPS = ["Ruins", "Crypts", "Inferno"];
const SQUIRE_MAP_SET = new Set(SQUIRE_MAPS);
const BUILDER_PERK_LIMIT = 4;
const BUILDER_WEAPON_MASTERY_PERK_ID = "Id_Perk_WeaponMastery";
const BUILDER_DEMON_ARMOR_PERK_ID = "Id_Perk_DemonArmor";
const BUILDER_SPEAR_PROFICIENCY_PERK_ID = "Id_Perk_SpearProficiency";
const BUILDER_IRON_WILL_PERK_ID = "Id_Perk_IronWill";
const BUILDER_SAVAGE_PERK_ID = "Id_Perk_Savage";
const BUILDER_NO_STAT_PERK_SUMMARY = "This perk doesnt affect stats";
const BUILDER_PERK_STAT_OVERRIDES = {
  Id_Perk_DefenseMastery: [
    { statKey: "ItemArmorRatingMod", label: "Armor Rating Bonus", value: 15, unit: "%" },
  ],
  Id_Perk_ProjectileResistance: [
    { statKey: "ProjectileReduction", label: "Projectile Damage Reduction", value: 10, unit: "%" },
  ],
  Id_Perk_Swift: [
    { statKey: "MoveSpeedArmorPenaltyReduction", label: "Armor Move Speed Penalty Reduction", value: 20, unit: "%" },
  ],
  Id_Perk_Jokester: [
    { statKey: "Strength", label: "Strength", value: 2, unit: "" },
    { statKey: "Vigor", label: "Vigor", value: 2, unit: "" },
    { statKey: "Agility", label: "Agility", value: 2, unit: "" },
    { statKey: "Dexterity", label: "Dexterity", value: 2, unit: "" },
    { statKey: "Will", label: "Will", value: 2, unit: "" },
    { statKey: "Knowledge", label: "Knowledge", value: 2, unit: "" },
    { statKey: "Resourcefulness", label: "Resourcefulness", value: 2, unit: "" },
  ],
  Id_Perk_ManaFold: [
    { statKey: "SpellCastingSpeed", label: "Spell Casting Speed", value: -15, unit: "%" },
  ],
  Id_Perk_DemonArmor: [
    { statKey: "SpellCastingSpeed", label: "Spell Casting Speed", value: -10, unit: "%" },
  ],
  Id_Perk_InfernalPledge: [
    { statKey: "DemonDamageBonus", label: "Demon Damage Bonus", value: 15, unit: "%" },
    { statKey: "DemonDamageReduction", label: "Demon Damage Reduction", value: 10, unit: "%" },
    { statKey: "UndeadDamageBonus", label: "Undead Damage Bonus", value: 15, unit: "%" },
    { statKey: "UndeadDamageReduction", label: "Undead Damage Reduction", value: 10, unit: "%" },
  ],
  Id_Perk_Malice: [
    { statKey: "WillMod", label: "Will Bonus", value: 15, unit: "%" },
  ],
  Id_Perk_Vampirism: [
    { statKey: "MagicalHealingBonus", label: "Magical Healing Bonus", value: 20, unit: "%" },
  ],
  Id_Perk_QuickChant: [
    { statKey: "SpellCastingSpeed", label: "Spell Casting Speed", value: 15, unit: "%" },
  ],
  Id_Perk_ManaSurge: [
    { statKey: "MagicalDamageBonus", label: "Magical Damage Bonus", value: 10, unit: "%" },
  ],
  Id_Perk_Sage: [
    { statKey: "KnowledgeMod", label: "Knowledge Bonus", value: 15, unit: "%" },
  ],
  Id_Perk_SpellOverload: [
    { statKey: "KnowledgeMod", label: "Knowledge Reduction", value: -20, unit: "%" },
  ],
  Id_Perk_AdvancedHealer: [
    { statKey: "MagicalHealing", label: "Magical Healing", value: 5, unit: "" },
  ],
  Id_Perk_UndeadSlaying: [
    { statKey: "UndeadDamageBonus", label: "Undead Damage Bonus", value: 20, unit: "%" },
  ],
  Id_Perk_Fermata: [
    { statKey: "Resourcefulness", label: "Resourcefulness", value: 5, unit: "" },
  ],
  Id_Perk_LoreMastery: [
    { statKey: "RegularInteractionSpeed", label: "Regular Interaction Speed", value: 30, unit: "%" },
    { statKey: "MemoryCapacity", label: "Memory Capacity", value: 5, unit: "" },
  ],
  Id_Perk_WanderersLuck: [
    { statKey: "Luck", label: "Luck", value: 100, unit: "" },
  ],
  Id_Perk_Robust: [
    { statKey: "MaxHealthBonus", label: "Max Health Bonus", value: 8, unit: "%" },
  ],
  Id_Perk_IronWill: [
    { statKey: "MagicResistance", label: "Magic Resistance", value: 75, unit: "" },
  ],
  Id_Perk_Savage: [
    { statKey: "PhysicalDamageBonus", label: "Physical Damage Bonus", value: 10, unit: "%" },
    { statKey: "ImpactPower", label: "Impact Power", value: 1, unit: "" },
  ],
};
const BUILDER_PERK_SUMMARIES = {
  Id_Perk_Jokester: "All Attributes +2",
  Id_Perk_WeaponMastery: "Allows all weapons",
  Id_Perk_DemonArmor: "Spell Casting Speed -10%, allows plate armor",
  Id_Perk_IronWill: "Magic Resistance +75, Magical Damage Reduction cap 75%",
  Id_Perk_Savage: "Physical Damage Bonus 10%, Impact Power 1 when not wearing chest armor",
  Id_Perk_SpearProficiency: "Allows Spear",
};
const PERK_ICON_ALIASES = {
  Id_Perk_ComboAttack: "CombinationAttack",
  Id_Perk_HideMastery: "HideExpert",
};
const BUILDER_DEFAULTS = {
  headshotDamageBonus: 150,
  primaryUnarmedDamage: 8,
  primaryUnarmedImpactPower: 1,
};
const DAMAGE_TARGET_DEFAULTS = {
  name: "Training Dummy",
  hand: "primary",
  hitLocation: "torso",
  hitZoneMultiplier: 110,
  pdr: -10,
  mdr: -10,
};
const DAMAGE_HIT_LOCATIONS = [
  { value: "head", label: "Head", multiplier: null },
  { value: "torso", label: "Torso", multiplier: 1 },
  { value: "arms", label: "Arms", multiplier: 0.7 },
  { value: "hands", label: "Hands", multiplier: 0.7 },
  { value: "legs", label: "Legs", multiplier: 0.7 },
  { value: "feet", label: "Feet", multiplier: 0.7 },
];
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
const BUILDER_WEAPON_GRID = {
  weapon1Primary: { column: 1, row: 1 },
  weapon1Secondary: { column: 3, row: 1 },
  weapon2Primary: { column: 11, row: 1 },
  weapon2Secondary: { column: 13, row: 1 },
};
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
  { key: "ArmorRating", label: "Armor Rating" },
  { key: "MagicResistance", label: "Magic Resistance" },
  { key: "PhysicalWeaponDamage", label: "Physical Weapon Damage", slot: "activePrimaryWeapon", sourceKey: "PhysicalWeaponDamage" },
  { key: "MagicalWeaponDamage", label: "Magical Weapon Damage", slot: "activePrimaryWeapon", sourceKey: "MagicalWeaponDamage" },
  { key: "MagicalDamage", label: "Magical Damage", slot: "activePrimaryWeapon", sourceKey: "MagicalDamage" },
  { key: "PhysicalDamageAdd", label: "Additional Physical Damage" },
  { key: "MagicalDamageAdd", label: "Additional Magical Damage" },
  { key: "AdditionalWeaponDamage", label: "Additional Weapon Damage" },
  { key: "PhysicalDamageTrue", label: "True Physical Damage" },
  { key: "MagicalDamageTrue", label: "True Magical Damage" },
  { key: "PhysicalPower", label: "Physical Power" },
  { key: "MagicalPower", label: "Magical Power" },
  { key: "ImpactPower", label: "Impact Power", slot: "activePrimaryWeapon", sourceKey: "ImpactPower" },
  { key: "HealthRecoveryBonus", label: "Health Recovery Bonus", unit: "%" },
  { key: "SpellRecoveryBonus", label: "Spell Recovery Bonus", unit: "%" },
  { key: "MoveSpeed", label: "Move Speed" },
  { key: "MoveSpeedBonus", label: "Move Speed Bonus", unit: "%" },
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
  { key: "MaxHealthBonus", label: "Max Health Bonus", unit: "%" },
  { key: "MemoryCapacityBonus", label: "Memory Capacity Bonus", unit: "%" },
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
];
const BUILDER_STAT_ORDER = BUILDER_STAT_ROWS.map((row) => row.key);
const STAT_CONTRIBUTION_KEYS = {
  PhysicalWeaponDamage: ["PhysicalWeaponDamage", "AdditionalWeaponDamage", "PhysicalDamageBase"],
};
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
let builderShareStatusTimer = 0;
const termsCache = new Map();
const secondaryOptionsCache = new WeakMap();
const emptySecondaryOptions = { options: [], byId: new Map() };
const scheduledRenders = new Map();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function terms(value) {
  const text = String(value || "");
  const cached = termsCache.get(text);
  if (cached) return cached;
  const tokens = text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (termsCache.size >= TERMS_CACHE_LIMIT) termsCache.clear();
  termsCache.set(text, tokens);
  return tokens;
}

function searchGroupTokens(groups) {
  return groups.map((group) => terms((Array.isArray(group) ? group : [group]).filter(Boolean).join(" ")));
}

function buildSearchIndex(rows, groupFn) {
  return new Map(rows.map((row) => [row, searchGroupTokens(groupFn(row))]));
}

function matchesSearchParts(parts, haystack) {
  return parts.every((part) => haystack.some((textPart) => textPart.startsWith(part)));
}

function matchesSearchGroups(parts, groups) {
  if (!parts.length) return true;
  return (groups || []).some((group) => matchesSearchParts(parts, group));
}

function scheduleRender(key, renderFn) {
  if (scheduledRenders.has(key)) return;
  scheduledRenders.set(key, requestAnimationFrame(() => {
    scheduledRenders.delete(key);
    renderFn();
  }));
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

function base64UrlEncodeBytes(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecodeBytes(value) {
  const normalized = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlEncode(text) {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

function base64UrlDecode(value) {
  const bytes = base64UrlDecodeBytes(value);
  return new TextDecoder().decode(bytes);
}

async function compressedSharedKitPayload(text) {
  if (!globalThis.CompressionStream || !globalThis.DecompressionStream) return "";
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return `${SHARED_KIT_COMPRESSED_PREFIX}${base64UrlEncodeBytes(bytes)}`;
  } catch {
    return "";
  }
}

async function decompressedSharedKitPayload(value) {
  if (!globalThis.DecompressionStream) throw new Error("Compressed kit links are not supported in this browser.");
  const bytes = base64UrlDecodeBytes(String(value).slice(SHARED_KIT_COMPRESSED_PREFIX.length));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
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

function compactSlotIndex(slotId) {
  const index = BUILDER_SLOTS.findIndex((slot) => slot.id === slotId);
  return index >= 0 ? index : 0;
}

function sharedSlotId(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return BUILDER_SLOTS[value]?.id || "";
  }
  return String(value || "");
}

function stripKnownPrefix(value, prefix) {
  const text = String(value || "");
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

function restoreKnownPrefix(value, prefix) {
  const text = String(value || "");
  if (!text || text.startsWith(prefix)) return text;
  return `${prefix}${text}`;
}

function primaryValuesMatchDefaults(asset, values) {
  const item = state.kit.itemByAsset.get(asset);
  const defaults = defaultPrimaryValuesForItem(item);
  return Array.isArray(values)
    && values.length === defaults.length
    && values.every((value, index) => String(value) === String(defaults[index]));
}

function compactSharedKit(kit) {
  const equipped = BUILDER_SLOTS
    .map((slot, index) => {
      const asset = kit.equipped?.[slot.id];
      return typeof asset === "string" && asset ? [index, stripKnownPrefix(asset, SHARED_ITEM_PREFIX)] : null;
    })
    .filter(Boolean);
  const equippedBySlot = new Map(
    equipped.map(([index, asset]) => [BUILDER_SLOTS[index]?.id, restoreKnownPrefix(asset, SHARED_ITEM_PREFIX)]),
  );
  const primaryValues = Object.entries(plainObject(kit.primaryValues))
    .map(([slotId, values]) => {
      const asset = equippedBySlot.get(slotId);
      if (!asset || !Array.isArray(values) || !values.length || primaryValuesMatchDefaults(asset, values)) return null;
      return [compactSlotIndex(slotId), values];
    })
    .filter(Boolean);
  const bonuses = [];
  Object.entries(plainObject(kit.bonuses)).forEach(([slotId, entries]) => {
    if (!equippedBySlot.has(slotId) || !Array.isArray(entries)) return;
    entries.forEach((entry, index) => {
      if (!entry?.propertyId) return;
      const item = state.kit.itemByAsset.get(equippedBySlot.get(slotId));
      const poolId = entry.poolId || item?.secondaryPoolIds?.[index];
      const option = secondaryOptionForItem(item, poolId, entry.propertyId);
      const row = [compactSlotIndex(slotId), index, stripKnownPrefix(entry.propertyId, SHARED_PROPERTY_PREFIX)];
      const defaultValue = Number(option?.max ?? option?.min ?? 0);
      const selectedValue = entry.value === "" || entry.value === undefined || entry.value === null
        ? defaultValue
        : clampStatEntryValue(option, entry.value);
      if (Number.isFinite(selectedValue) && Math.abs(selectedValue - defaultValue) > 0.0001) row.push(selectedValue);
      bonuses.push(row);
    });
  });
  return [
    SHARED_KIT_VERSION,
    kit.name || "",
    kit.characterId || "",
    kit.activeWeaponSet === "2" ? 2 : 1,
    compactSlotIndex(kit.selectedSlot),
    equipped,
    primaryValues,
    bonuses,
    Array.isArray(kit.perks) ? kit.perks.filter(Boolean).map((perkId) => stripKnownPrefix(perkId, SHARED_PERK_PREFIX)) : [],
    stripKnownPrefix(kit.skinId || "", SHARED_SKIN_PREFIX),
  ];
}

function expandLegacyCompactSharedKit(payload) {
  if (!Array.isArray(payload) || payload[0] !== SHARED_KIT_LEGACY_VERSION) return null;
  const [, name, characterId, activeWeaponSet, selectedSlot, equippedRows = [], primaryRows = [], bonusRows = [], perks = [], skinId = ""] = payload;
  const equipped = {};
  (Array.isArray(equippedRows) ? equippedRows : []).forEach((row) => {
    const slotId = sharedSlotId(row?.[0]);
    const asset = row?.[1];
    if (slotId && typeof asset === "string") equipped[slotId] = asset;
  });
  const primaryValues = {};
  (Array.isArray(primaryRows) ? primaryRows : []).forEach((row) => {
    const slotId = sharedSlotId(row?.[0]);
    const values = row?.[1];
    if (slotId && Array.isArray(values) && values.length) primaryValues[slotId] = values;
  });
  const bonuses = {};
  (Array.isArray(bonusRows) ? bonusRows : []).forEach((row) => {
    const slotId = sharedSlotId(row?.[0]);
    const index = Number(row?.[1]);
    const propertyId = row?.[2];
    if (!slotId || !Number.isInteger(index) || !propertyId) return;
    if (!Array.isArray(bonuses[slotId])) bonuses[slotId] = [];
    bonuses[slotId][index] = {
      propertyId: String(propertyId),
      value: row.length > 3 ? row[3] : "",
    };
  });
  return normalizeSavedKit({
    name,
    characterId,
    activeWeaponSet: String(activeWeaponSet || "1"),
    selectedSlot: sharedSlotId(selectedSlot) || "weapon1Primary",
    equipped,
    primaryValues,
    bonuses,
    perks: Array.isArray(perks) ? perks : [],
  });
}

function expandCompactSharedKit(payload) {
  if (!Array.isArray(payload)) return null;
  if (payload[0] === SHARED_KIT_LEGACY_VERSION) return expandLegacyCompactSharedKit(payload);
  if (payload[0] !== SHARED_KIT_VERSION) return null;
  const [, name, characterId, activeWeaponSet, selectedSlot, equippedRows = [], primaryRows = [], bonusRows = [], perks = [], skinId = ""] = payload;
  const equipped = {};
  (Array.isArray(equippedRows) ? equippedRows : []).forEach((row) => {
    const slotId = sharedSlotId(row?.[0]);
    const asset = restoreKnownPrefix(row?.[1], SHARED_ITEM_PREFIX);
    if (slotId && asset) equipped[slotId] = asset;
  });
  const primaryValues = {};
  (Array.isArray(primaryRows) ? primaryRows : []).forEach((row) => {
    const slotId = sharedSlotId(row?.[0]);
    const values = row?.[1];
    if (slotId && Array.isArray(values) && values.length) primaryValues[slotId] = values;
  });
  const bonuses = {};
  (Array.isArray(bonusRows) ? bonusRows : []).forEach((row) => {
    const slotId = sharedSlotId(row?.[0]);
    const index = Number(row?.[1]);
    const propertyId = restoreKnownPrefix(row?.[2], SHARED_PROPERTY_PREFIX);
    if (!slotId || !Number.isInteger(index) || !propertyId) return;
    if (!Array.isArray(bonuses[slotId])) bonuses[slotId] = [];
    bonuses[slotId][index] = {
      propertyId,
      value: row.length > 3 ? row[3] : "",
    };
  });
  return normalizeSavedKit({
    name,
    characterId,
    activeWeaponSet: String(activeWeaponSet || "1"),
    selectedSlot: sharedSlotId(selectedSlot) || "weapon1Primary",
    equipped,
    primaryValues,
    bonuses,
    perks: Array.isArray(perks) ? perks.map((perkId) => restoreKnownPrefix(perkId, SHARED_PERK_PREFIX)) : [],
    skinId: restoreKnownPrefix(skinId, SHARED_SKIN_PREFIX),
  });
}

function sharedKitDictionary() {
  const propertyIds = Object.keys(state.kit.propertyTypes || {}).sort();
  return {
    itemIds: state.kit.items.map((item) => item.asset),
    itemIndexById: new Map(state.kit.items.map((item, index) => [item.asset, index])),
    characterIds: state.kit.characters.map((character) => character.id),
    characterIndexById: new Map(state.kit.characters.map((character, index) => [character.id, index])),
    propertyIds,
    propertyIndexById: new Map(propertyIds.map((propertyId, index) => [propertyId, index])),
    perkIds: state.kit.perks.map((perk) => perk.id),
    perkIndexById: new Map(state.kit.perks.map((perk, index) => [perk.id, index])),
    skinIds: state.kit.characterSkins.map((skin) => skin.id),
    skinIndexById: new Map(state.kit.characterSkins.map((skin, index) => [skin.id, index])),
  };
}

function writeSharedVarint(bytes, value) {
  let next = Math.max(0, Math.floor(Number(value) || 0));
  while (next >= 0x80) {
    bytes.push((next & 0x7f) | 0x80);
    next = Math.floor(next / 0x80);
  }
  bytes.push(next);
}

function readSharedVarint(reader) {
  let value = 0;
  let shift = 0;
  while (reader.offset < reader.bytes.length) {
    const byte = reader.bytes[reader.offset];
    reader.offset += 1;
    value += (byte & 0x7f) * (2 ** shift);
    if ((byte & 0x80) === 0) return value;
    shift += 7;
  }
  throw new Error("Invalid shared kit payload");
}

function writeSharedSigned(bytes, value) {
  const next = Math.round(Number(value) || 0);
  writeSharedVarint(bytes, next < 0 ? ((Math.abs(next) * 2) - 1) : next * 2);
}

function readSharedSigned(reader) {
  const value = readSharedVarint(reader);
  return value % 2 ? -((value + 1) / 2) : value / 2;
}

function scaledSharedStatValue(value) {
  return Math.round(Number(value || 0) * 10);
}

function unscaledSharedStatValue(value) {
  return Math.abs(value % 10) < 0.0001 ? value / 10 : value / 10;
}

function encodeBinarySharedKit(kit) {
  const dict = sharedKitDictionary();
  const bytes = [0x44, SHARED_KIT_BINARY_VERSION];
  writeSharedVarint(bytes, (dict.characterIndexById.get(kit.characterId) ?? -1) + 1);
  writeSharedVarint(bytes, kit.activeWeaponSet === "2" ? 2 : 1);
  writeSharedVarint(bytes, compactSlotIndex(kit.selectedSlot));
  writeSharedVarint(bytes, (dict.skinIndexById.get(kit.skinId) ?? -1) + 1);

  const equippedRows = BUILDER_SLOTS
    .map((slot, slotIndex) => {
      const itemIndex = dict.itemIndexById.get(kit.equipped?.[slot.id]);
      return Number.isInteger(itemIndex) ? [slotIndex, itemIndex] : null;
    })
    .filter(Boolean);
  writeSharedVarint(bytes, equippedRows.length);
  equippedRows.forEach(([slotIndex, itemIndex]) => {
    writeSharedVarint(bytes, slotIndex);
    writeSharedVarint(bytes, itemIndex + 1);
  });

  const primaryRows = [];
  Object.entries(plainObject(kit.primaryValues)).forEach(([slotId, values]) => {
    const asset = kit.equipped?.[slotId];
    const item = state.kit.itemByAsset.get(asset);
    const defaults = defaultPrimaryValuesForItem(item);
    if (!item || !Array.isArray(values)) return;
    values.forEach((value, index) => {
      const entry = item.primary?.[index];
      if (!entry) return;
      const selectedValue = clampStatEntryValue(entry, value);
      if (Math.abs(Number(selectedValue) - Number(defaults[index])) < 0.0001) return;
      primaryRows.push([compactSlotIndex(slotId), index, scaledSharedStatValue(selectedValue)]);
    });
  });
  writeSharedVarint(bytes, primaryRows.length);
  primaryRows.forEach(([slotIndex, index, value]) => {
    writeSharedVarint(bytes, slotIndex);
    writeSharedVarint(bytes, index);
    writeSharedSigned(bytes, value);
  });

  const bonusRows = [];
  Object.entries(plainObject(kit.bonuses)).forEach(([slotId, entries]) => {
    const asset = kit.equipped?.[slotId];
    const item = state.kit.itemByAsset.get(asset);
    if (!item || !Array.isArray(entries)) return;
    entries.forEach((entry, index) => {
      if (!entry?.propertyId) return;
      const propertyIndex = dict.propertyIndexById.get(entry.propertyId);
      if (!Number.isInteger(propertyIndex)) return;
      const poolId = entry.poolId || item.secondaryPoolIds?.[index];
      const option = secondaryOptionForItem(item, poolId, entry.propertyId);
      const defaultValue = Number(option?.max ?? option?.min ?? 0);
      const selectedValue = entry.value === "" || entry.value == null
        ? defaultValue
        : clampStatEntryValue(option, entry.value);
      const valueChanged = Number.isFinite(selectedValue) && Math.abs(selectedValue - defaultValue) > 0.0001;
      bonusRows.push([compactSlotIndex(slotId), index, propertyIndex, valueChanged ? scaledSharedStatValue(selectedValue) : null]);
    });
  });
  writeSharedVarint(bytes, bonusRows.length);
  bonusRows.forEach(([slotIndex, index, propertyIndex, value]) => {
    writeSharedVarint(bytes, slotIndex);
    writeSharedVarint(bytes, index);
    writeSharedVarint(bytes, propertyIndex + 1);
    bytes.push(value == null ? 0 : 1);
    if (value != null) writeSharedSigned(bytes, value);
  });

  const perkRows = (Array.isArray(kit.perks) ? kit.perks : [])
    .map((perkId) => dict.perkIndexById.get(perkId))
    .filter((index) => Number.isInteger(index));
  writeSharedVarint(bytes, perkRows.length);
  perkRows.forEach((index) => writeSharedVarint(bytes, index + 1));
  return `${SHARED_KIT_BINARY_PREFIX}${base64UrlEncodeBytes(Uint8Array.from(bytes))}`;
}

function decodeBinarySharedKit(value) {
  const bytes = base64UrlDecodeBytes(String(value || "").slice(SHARED_KIT_BINARY_PREFIX.length));
  const reader = { bytes, offset: 0 };
  if (readSharedVarint(reader) !== 0x44 || readSharedVarint(reader) !== SHARED_KIT_BINARY_VERSION) return null;
  const dict = sharedKitDictionary();
  const characterId = dict.characterIds[readSharedVarint(reader) - 1] || "";
  const activeWeaponSet = readSharedVarint(reader) === 2 ? "2" : "1";
  const selectedSlot = sharedSlotId(readSharedVarint(reader)) || "weapon1Primary";
  const skinId = dict.skinIds[readSharedVarint(reader) - 1] || "";
  const equipped = {};
  const equippedCount = readSharedVarint(reader);
  for (let row = 0; row < equippedCount; row += 1) {
    const slotId = sharedSlotId(readSharedVarint(reader));
    const asset = dict.itemIds[readSharedVarint(reader) - 1];
    if (slotId && asset) equipped[slotId] = asset;
  }
  const primaryValues = {};
  const primaryCount = readSharedVarint(reader);
  for (let row = 0; row < primaryCount; row += 1) {
    const slotId = sharedSlotId(readSharedVarint(reader));
    const index = readSharedVarint(reader);
    const value = unscaledSharedStatValue(readSharedSigned(reader));
    const item = state.kit.itemByAsset.get(equipped[slotId]);
    if (!slotId || !item?.primary?.[index]) continue;
    if (!Array.isArray(primaryValues[slotId])) primaryValues[slotId] = defaultPrimaryValuesForItem(item);
    primaryValues[slotId][index] = clampStatEntryValue(item.primary[index], value);
  }
  const bonuses = {};
  const bonusCount = readSharedVarint(reader);
  for (let row = 0; row < bonusCount; row += 1) {
    const slotId = sharedSlotId(readSharedVarint(reader));
    const index = readSharedVarint(reader);
    const propertyId = dict.propertyIds[readSharedVarint(reader) - 1] || "";
    const hasValue = bytes[reader.offset] === 1;
    reader.offset += 1;
    const item = state.kit.itemByAsset.get(equipped[slotId]);
    const poolId = item?.secondaryPoolIds?.[index] || "";
    const option = secondaryOptionForItem(item, poolId, propertyId);
    const value = hasValue ? clampStatEntryValue(option, unscaledSharedStatValue(readSharedSigned(reader))) : Number(option?.max ?? option?.min ?? 0);
    if (!slotId || !item || !option) continue;
    if (!Array.isArray(bonuses[slotId])) bonuses[slotId] = defaultBonusesForItem(item);
    bonuses[slotId][index] = { poolId, propertyId, value };
  }
  const perks = [];
  const perkCount = readSharedVarint(reader);
  for (let row = 0; row < perkCount; row += 1) {
    const perkId = dict.perkIds[readSharedVarint(reader) - 1];
    if (perkId) perks.push(perkId);
  }
  return normalizeSavedKit({
    name: defaultSavedKitName(),
    characterId,
    activeWeaponSet,
    selectedSlot,
    equipped,
    primaryValues,
    bonuses,
    perks,
    skinId,
  });
}

async function sharedKitPayload(kit) {
  return encodeBinarySharedKit(kit);
}

async function kitShareUrl(kit) {
  const url = new URL(window.location.href);
  url.search = "";
  const payload = await sharedKitPayload(kit);
  url.searchParams.delete(SHARED_KIT_LEGACY_PARAM);
  url.searchParams.delete(SHARED_KIT_PARAM);
  url.hash = payload;
  return url.toString();
}

async function decodeSharedKitPayload(value) {
  try {
    if (String(value || "").startsWith(SHARED_KIT_BINARY_PREFIX)) return decodeBinarySharedKit(value);
    const text = String(value || "").startsWith(SHARED_KIT_COMPRESSED_PREFIX)
      ? await decompressedSharedKitPayload(value)
      : base64UrlDecode(value);
    const parsed = JSON.parse(text);
    return expandCompactSharedKit(parsed) || normalizeSavedKit(parsed?.kit || parsed);
  } catch {
    return null;
  }
}

function sharedKitValueFromLocation() {
  const url = new URL(window.location.href);
  const hash = url.hash.slice(1);
  if (hash.startsWith(SHARED_KIT_BINARY_PREFIX)) return hash;
  if (hash.startsWith(SHARED_KIT_COMPRESSED_PREFIX)) return hash;
  if (hash.startsWith(`${SHARED_KIT_PARAM}=`)) return hash.slice(SHARED_KIT_PARAM.length + 1);
  if (hash.startsWith(`${SHARED_KIT_LEGACY_PARAM}=`)) return hash.slice(SHARED_KIT_LEGACY_PARAM.length + 1);
  return url.searchParams.get(SHARED_KIT_PARAM) || url.searchParams.get(SHARED_KIT_LEGACY_PARAM);
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
    if (slot.weaponRole === "secondary" && itemIsTwoHanded(state.kit.itemByAsset.get(equipped[pairedWeaponSlotId(slot.id)]))) return;
    equipped[slot.id] = asset;
    primaryValues[slot.id] = savedPrimaryValuesForItem(item, kit.primaryValues?.[slot.id]);
    bonuses[slot.id] = savedBonusesForItem(item, kit.bonuses?.[slot.id]);
  });

  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
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
  return !slot.weaponSet;
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
  return allowed.some((entry) => entry.id === character.id) || builderPerkAllowsItem(item, character, allowed);
}

function pruneBuilderEquipmentForCurrentRules() {
  const equipped = {};
  const primaryValues = {};
  const bonuses = {};
  BUILDER_SLOTS.forEach((slot) => {
    const asset = state.builder.equipped[slot.id];
    const item = state.kit.itemByAsset.get(asset);
    if (!item || !slot.accepts.includes(itemSlotId(item)) || !builderClassAllowsItem(item)) return;
    if (slot.weaponRole === "secondary" && itemIsTwoHanded(state.kit.itemByAsset.get(equipped[pairedWeaponSlotId(slot.id)]))) return;
    equipped[slot.id] = asset;
    if (state.builder.primaryValues[slot.id]) primaryValues[slot.id] = state.builder.primaryValues[slot.id];
    if (state.builder.bonuses[slot.id]) bonuses[slot.id] = state.builder.bonuses[slot.id];
  });
  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
}

function classNamesText(classes) {
  const values = (classes || []).map((entry) => entry.name).filter(Boolean);
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
      <img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.hidden=true">
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
  return [];
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

function statIdentity(entry) {
  return entry?.statKey || entry?.rawKey || entry?.propertyId || "";
}

function primaryStatIdentitiesForItem(item) {
  return new Set((item?.primary || []).map(statIdentity).filter(Boolean));
}

function bonusOptionText(option) {
  return option?.label || statLabel(statIdentity(option));
}

function bonusOptionSearchText(option) {
  return [
    bonusOptionText(option),
    statRange(option),
    option?.statKey,
    option?.rawKey,
    option?.propertyLabel,
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

function itemExactStatValue(slotId, statKey) {
  const resolvedSlotId = resolveBuilderSlotId(slotId);
  const item = state.kit.itemByAsset.get(state.builder.equipped[resolvedSlotId]);
  if (!item || !statKey) return defaultSlotStatValue(resolvedSlotId, statKey);
  const totals = new Map();
  addItemStats(totals, resolvedSlotId, item);
  return directStatValue(totals, statKey);
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
  const will = statValueWithPercentMod(totals, "Will", "WillMod");
  const knowledge = statValueWithPercentMod(totals, "Knowledge", "KnowledgeMod");
  const resourcefulness = directStatValue(totals, "Resourcefulness");
  values.set("Will", will);
  values.set("Knowledge", knowledge);

  const maxHealthRating = (strength * 0.25) + (vigor * 0.75);
  const baseHealth = curveValue(
    "CT_MaxHealthBase",
    "MaxHealthBase",
    maxHealthRating,
    character ? 80 : 0,
  );
  const health = (baseHealth * (1 + (directStatValue(totals, "MaxHealthBonus") / 100))) + directStatValue(totals, "Health");
  values.set("Health", Math.ceil(health));
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

function targetMitigationMultiplier(percent) {
  return 1 - (clampPercentInput(percent, 0) / 100);
}

function damageHandRole() {
  return state.damageTarget.hand === "secondary" ? "secondary" : "primary";
}

function damageHandSlotId() {
  return activeWeaponSlotId(damageHandRole());
}

function damageHandLabel() {
  return damageHandRole() === "secondary" ? "Secondary" : "Primary";
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
  const hitLocation = damageHitLocation();
  const locationMultiplier = damageHitLocationMultiplier(derived);
  const hitZoneMultiplier = clampNumberInput(
    state.damageTarget.hitZoneMultiplier,
    DAMAGE_TARGET_DEFAULTS.hitZoneMultiplier,
    0,
    500,
  ) / 100;
  const pdr = clampPercentInput(state.damageTarget.pdr, DAMAGE_TARGET_DEFAULTS.pdr);
  const mdr = clampPercentInput(state.damageTarget.mdr, DAMAGE_TARGET_DEFAULTS.mdr);
  const physicalHitBase = physicalWeapon + physicalAdd;
  const magicalHitBase = magicalWeapon + magicalBase + magicalAdd;
  const physicalBeforeReduction = physicalHitBase * hitZoneMultiplier * locationMultiplier * (1 + (physicalBonus / 100));
  const magicalBeforeReduction = magicalHitBase * hitZoneMultiplier * locationMultiplier * (1 + (magicalBonus / 100));
  const physicalAfterReduction = Math.max(0, physicalBeforeReduction * targetMitigationMultiplier(pdr)) + truePhysical;
  const magicalAfterReduction = Math.max(0, magicalBeforeReduction * targetMitigationMultiplier(mdr)) + trueMagical;
  return {
    handLabel: damageHandLabel(),
    handName: handItem?.name || (damageHandRole() === "primary" ? "Bare Hands" : "None"),
    physical: {
      weaponBase: physicalWeaponBase,
      additionalWeapon,
      weapon: physicalWeapon,
      add: physicalAdd,
      hitBase: physicalHitBase,
      hitZoneMultiplier,
      locationLabel: hitLocation.label,
      locationMultiplier,
      bonus: physicalBonus,
      trueDamage: truePhysical,
      targetReduction: pdr,
      beforeReduction: physicalBeforeReduction,
      afterReduction: physicalAfterReduction,
    },
    magical: {
      weapon: magicalWeapon,
      base: magicalBase,
      add: magicalAdd,
      hitBase: magicalHitBase,
      hitZoneMultiplier,
      locationLabel: hitLocation.label,
      locationMultiplier,
      bonus: magicalBonus,
      trueDamage: trueMagical,
      targetReduction: mdr,
      beforeReduction: magicalBeforeReduction,
      afterReduction: magicalAfterReduction,
    },
    total: physicalAfterReduction + magicalAfterReduction,
  };
}

function damageBreakdownRows(section) {
  const baseRows = section.weaponBase == null && section.base != null
    ? [
      ["Magical Weapon Damage", section.weapon],
      ["Magical Damage", section.base],
    ]
    : section.weaponBase == null
      ? [["Base", section.weapon]]
    : [
      ["Weapon Damage", section.weaponBase],
      ["Additional Weapon Damage", section.additionalWeapon],
    ];
  return [
    ...baseRows,
    ["Additional", section.add],
    ["Weapon Hit", section.hitBase],
    ["Hit Zone", `${damageNumber((section.hitZoneMultiplier || 1) * 100)}%`],
    [section.locationLabel || "Hit Location", `${damageNumber((section.locationMultiplier || 1) * 100)}%`],
    ["Power Bonus", `${damageNumber(section.bonus)}%`],
    ["Before Mitigation", section.beforeReduction],
    ["Target Reduction", `${damageNumber(section.targetReduction)}%`],
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
  const primary = state.kit.itemByAsset.get(state.builder.equipped[activeWeaponSlotId("primary")]);
  const secondary = state.kit.itemByAsset.get(state.builder.equipped[activeWeaponSlotId("secondary")]);
  const secondaryBlocked = itemIsTwoHanded(primary);
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
  if (damageHandOptions().find((option) => option.value === damageHandRole())?.disabled) {
    state.damageTarget = { ...state.damageTarget, hand: "primary" };
  }
  const output = builderDamageOutput();
  $("damageDialogMeta").textContent = `${DAMAGE_TARGET_DEFAULTS.name} target, active hand: ${output.handLabel} (${output.handName})`;
  const handOptions = damageHandOptions();
  target.innerHTML = `
    <div class="damage-target-controls">
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
      <label>Hit Zone
        <input type="number" min="0" max="500" step="0.1" value="${escapeHtml(state.damageTarget.hitZoneMultiplier)}" data-damage-target="hitZoneMultiplier">
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
      input.setSelectionRange(input.value.length, input.value.length);
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
  const [items, sources, rates] = await Promise.all([
    fetchJson(state.manifest.files.items, dataVersion),
    fetchJson(state.manifest.files.sources, dataVersion),
    fetchJson(state.manifest.files.rates, dataVersion),
  ]);
  state.items = items.rows || [];
  state.sources = sources.rows || [];
  state.rateWeights = rates.rows || {};
  state.itemSearchIndex = buildSearchIndex(state.items, itemSearchGroups);
  state.sourceSearchIndex = buildSearchIndex(state.sources, sourceSearchGroups);
  state.itemByAsset = new Map(state.items.map((row) => [row.itemAsset, row]));
  state.sourceByKey = new Map(state.sources.map((row) => [sourceKey(row.source, row.sourceKind), row]));
  $("dataStatus").textContent = "";
  syncLuckInputs();
  $("updatedAt").textContent = formatDate(SITE_UPDATED_AT);
  fillFilters();
  await applySharedBuilderKitFromLocation();
  render();
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
        propertyTypes: kit.propertyTypes || {},
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
    [row.source, row.sources?.join(" "), row.sourceKind, row.sourceKinds?.join(" "), row.spawner],
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
    [item.name, item.asset, item.rarity, item.slot?.label, item.weaponTypes?.join(" "), item.armorType],
    [(item.allowedClasses || []).map((entry) => entry.name).join(" ")],
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

function itemDetailBestBaseChanceValue(row, filters) {
  return baseChanceValue(itemDetailBestScenario(row, filters, "base"));
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
  const mapFilter = selected("itemMap");
  const diffFilter = selected("itemDiff");
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
  const selectedRows = rows.slice(0, MAX_ROWS);
  $("sourceTableMeta").innerHTML = tableMeta(rows, selectedRows);
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

function builderSlotAriaLabel(slot, item, blockReason) {
  if (item) return `${slot.label}: ${item.name}, ${item.rarity}, ${item.gearScore || 0} gear score`;
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
  const item = state.kit.itemByAsset.get(state.builder.equipped[slot.id]);
  const blockReason = weaponSlotBlockReason(slot.id);
  if (!item) {
    return `
      <div class="builder-slot-tooltip-empty">
        <strong>${escapeHtml(slot.label)}</strong>
        <span>${escapeHtml(blockReason || slot.accepts.join(" / "))}</span>
      </div>
    `;
  }
  const primary = slotPrimarySummary(slot.id, item);
  const secondary = slotSecondarySummary(slot.id, item);
  return `
    <div class="builder-slot-tooltip-head">
      ${itemThumbnail(item, "tooltip")}
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${rarity(item.rarity)} <span>${escapeHtml(item.slot?.label || slot.label)}</span> <span>${escapeHtml(item.gearScore || 0)} GS</span></p>
      </div>
    </div>
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
    const item = state.kit.itemByAsset.get(state.builder.equipped[slot.id]);
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
        class="builder-slot builder-slot-${escapeHtml(slot.id)} ${slot.kind || ""} ${sizeClass} ${rarityClass} ${state.builder.selectedSlot === slot.id ? "active" : ""} ${slot.weaponSet === state.builder.activeWeaponSet ? "active-set" : ""} ${item ? "filled" : ""} ${blockReason ? "blocked" : ""}"
        style="${escapeHtml(slotStyle)}"
        data-builder-slot="${escapeHtml(slot.id)}"
        aria-pressed="${state.builder.selectedSlot === slot.id ? "true" : "false"}"
        aria-label="${escapeHtml(builderSlotAriaLabel(slot, item, blockReason))}"
        ${blockReason ? `title="${escapeHtml(blockReason)}"` : ""}>
        ${slot.marker ? `<span class="builder-slot-marker">${escapeHtml(slot.marker)}</span>` : ""}
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

function photoItemLines(slotId, item) {
  if (!item) return [];
  const primary = slotPrimarySummary(slotId, item, 6);
  const secondary = slotSecondarySummary(slotId, item)
    .filter((line) => !/^No secondary/i.test(line));
  return [...primary, ...secondary].slice(0, 9);
}

function photoLoadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function photoDrawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = word;
      if (lines >= maxLines - 1) break;
    } else {
      line = next;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function photoRarityTheme(rarityValue) {
  const key = String(rarityValue || "").toLowerCase();
  const themes = {
    junk: { title: "#9d9d9d", line: "rgba(150, 150, 150, .76)", top: "rgba(55, 55, 55, .92)", bottom: "rgba(20, 20, 20, .96)" },
    common: { title: "#d8d4c8", line: "rgba(202, 198, 185, .78)", top: "rgba(66, 64, 58, .92)", bottom: "rgba(22, 21, 19, .96)" },
    uncommon: { title: "#57c66b", line: "rgba(87, 198, 107, .8)", top: "rgba(28, 70, 36, .92)", bottom: "rgba(12, 28, 16, .96)" },
    rare: { title: "#5d94ff", line: "rgba(93, 148, 255, .82)", top: "rgba(28, 48, 86, .92)", bottom: "rgba(11, 19, 35, .96)" },
    epic: { title: "#c783ff", line: "rgba(182, 117, 226, .78)", top: "rgba(78, 45, 94, .92)", bottom: "rgba(18, 13, 22, .96)" },
    legendary: { title: "#ff8f3d", line: "rgba(255, 143, 61, .86)", top: "rgba(92, 48, 18, .92)", bottom: "rgba(32, 18, 8, .96)" },
    unique: { title: "#ffe071", line: "rgba(255, 224, 113, .86)", top: "rgba(94, 72, 23, .92)", bottom: "rgba(32, 24, 8, .96)" },
    artifact: { title: "#ff6666", line: "rgba(235, 91, 91, .86)", top: "rgba(92, 22, 24, .92)", bottom: "rgba(30, 8, 10, .96)" },
  };
  return themes[key] || themes.common;
}

function photoDrawCard(ctx, item, slotId, x, y, width) {
  const lines = photoItemLines(slotId, item);
  const theme = photoRarityTheme(item?.rarity);
  const lineHeight = 17;
  const headerHeight = 42;
  const height = Math.max(112, 60 + (lines.length * lineHeight));
  const gradient = ctx.createLinearGradient(x, y, x, y + headerHeight);
  gradient.addColorStop(0, theme.top);
  gradient.addColorStop(.56, "rgba(30, 24, 34, .94)");
  gradient.addColorStop(1, theme.bottom);
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, .64)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "rgba(4, 5, 7, .88)";
  ctx.fillRect(x, y, width, height);
  ctx.restore();
  ctx.fillStyle = "rgba(4, 5, 7, .88)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, headerHeight);
  ctx.save();
  ctx.globalAlpha = .16;
  ctx.strokeStyle = "#ffffff";
  for (let offset = -height; offset < width; offset += 14) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + height);
    ctx.lineTo(x + offset + height, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.beginPath();
  ctx.moveTo(x, y + headerHeight);
  ctx.lineTo(x + width, y + headerHeight);
  ctx.strokeStyle = theme.line;
  ctx.stroke();
  ctx.font = "22px Georgia, serif";
  ctx.fillStyle = theme.title;
  ctx.textAlign = "center";
  photoDrawWrappedText(ctx, item?.name || "Empty", x + width / 2, y + 28, width - 22, 22, 1);
  ctx.font = "13px Segoe UI, Arial";
  lines.forEach((line, index) => {
    const lineY = y + 64 + (index * lineHeight);
    ctx.fillStyle = "rgba(238, 241, 242, .88)";
    ctx.fillText("-", x + 20, lineY);
    ctx.fillText("-", x + width - 20, lineY);
    ctx.fillStyle = line.includes("%") || line.includes("+") ? "#18bdf4" : "#f1f3f4";
    ctx.fillText(line, x + width / 2, lineY);
  });
  ctx.textAlign = "left";
  return height;
}

function photoStatRows(rows) {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const physicalBonus = byKey.get("PhysicalDamageBonus");
  const magicalBonus = byKey.get("MagicalDamageBonus");
  const skipKeys = new Set([
    "PhysicalDamageBonus",
    "PhysicalDamageBonusFromPower",
    "PhysicalDamageBonusFromBonuses",
    "MagicalDamageBonus",
    "MagicalDamageBonusFromPower",
    "MagicalDamageBonusFromBonuses",
  ]);
  return rows
    .map((row) => {
      if (row.key === "PhysicalPower" && physicalBonus) {
        return { ...physicalBonus, key: "PhotoPhysicalPowerBonus", label: "Physical Power Bonus" };
      }
      if (row.key === "MagicalPower" && magicalBonus) {
        return { ...magicalBonus, key: "PhotoMagicalPowerBonus", label: "Magic Power Bonus" };
      }
      return row;
    })
    .filter((row) => !skipKeys.has(row.key));
}

function photoDrawStats(ctx, rows, character) {
  const x = 54;
  const y = 30;
  const width = 430;
  const height = 1018;
  const lineHeight = 17;
  const topPadding = 52;
  ctx.fillStyle = "rgba(23, 25, 27, .86)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(184, 168, 148, .32)";
  ctx.strokeRect(x, y, width, height);
  ctx.font = "22px Georgia, serif";
  ctx.fillStyle = "#d7a16d";
  ctx.textAlign = "center";
  ctx.fillText(character?.name || "Kit", x + width / 2, y + 28);
  ctx.font = "14px Segoe UI, Arial";
  photoStatRows(rows).forEach((row, index) => {
    const rowY = y + topPadding + (index * lineHeight);
    if (rowY > y + height - 12) return;
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.beginPath();
    ctx.moveTo(x + 8, rowY + 5);
    ctx.lineTo(x + width - 8, rowY + 5);
    ctx.stroke();
    ctx.fillStyle = "#bfb8ad";
    ctx.textAlign = "left";
    ctx.fillText(row.label, x + 8, rowY);
    const value = row.type === "text" ? row.value : statValue(row.value, row.unit);
    ctx.fillStyle = Number(row.value) > 0 ? "#a7d637" : Number(row.value) < 0 ? "#dd3948" : "#d8d2c8";
    ctx.textAlign = "right";
    ctx.fillText(value, x + width - 10, rowY);
  });
  ctx.textAlign = "left";
}

async function saveBuilderPhoto() {
  if (!state.kitReady) return;
  closeBuilderBonusMenus();
  hideBuilderSlotTooltip(true);
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, 1920, 1080);
  bg.addColorStop(0, "#3b2810");
  bg.addColorStop(.28, "#08090b");
  bg.addColorStop(.56, "#4d0508");
  bg.addColorStop(1, "#1e1d1b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.filter = "blur(34px)";
  ["#d59a32", "#a00010", "#b7b0a4", "#74210b"].forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = .45;
    ctx.beginPath();
    ctx.ellipse(240 + (index * 420), 170 + ((index % 2) * 560), 210, 170, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.fillRect(0, 0, 1920, 1080);

  const stats = builderStatRows();
  photoDrawStats(ctx, stats, selectedBuilderCharacter());

  const equipmentRect = { x: 640, y: 210, width: 800, height: 700 };
  const equipmentGradient = ctx.createRadialGradient(
    equipmentRect.x + equipmentRect.width / 2,
    equipmentRect.y + equipmentRect.height / 2,
    40,
    equipmentRect.x + equipmentRect.width / 2,
    equipmentRect.y + equipmentRect.height / 2,
    390,
  );
  equipmentGradient.addColorStop(0, "rgba(52, 53, 54, .96)");
  equipmentGradient.addColorStop(.62, "rgba(22, 22, 24, .96)");
  equipmentGradient.addColorStop(1, "rgba(10, 10, 12, .98)");
  ctx.fillStyle = equipmentGradient;
  ctx.fillRect(equipmentRect.x, equipmentRect.y, equipmentRect.width, equipmentRect.height);
  ctx.strokeStyle = "rgba(202, 202, 202, .32)";
  ctx.lineWidth = 2;
  ctx.strokeRect(equipmentRect.x, equipmentRect.y, equipmentRect.width, equipmentRect.height);
  ctx.save();
  ctx.globalAlpha = .14;
  ctx.strokeStyle = "#ffffff";
  for (let offset = -equipmentRect.height; offset < equipmentRect.width; offset += 12) {
    ctx.beginPath();
    ctx.moveTo(equipmentRect.x + offset, equipmentRect.y + equipmentRect.height);
    ctx.lineTo(equipmentRect.x + offset + equipmentRect.height, equipmentRect.y);
    ctx.stroke();
  }
  ctx.restore();
  const grid = {
    x: equipmentRect.x + 46,
    y: equipmentRect.y + 42,
    width: equipmentRect.width - 92,
    height: equipmentRect.height - 84,
    columns: 12,
    rows: 9,
    gap: 7,
  };
  grid.cellWidth = (grid.width - ((grid.columns - 1) * grid.gap)) / grid.columns;
  grid.cellHeight = (grid.height - ((grid.rows - 1) * grid.gap)) / grid.rows;
  const slotRects = {
    weapon1Primary: [0, 0, 2, 3],
    weapon1Secondary: [2, 0, 2, 3],
    head: [5, 0, 2, 2],
    weapon2Primary: [8, 0, 2, 3],
    weapon2Secondary: [10, 0, 2, 3],
    necklace: [7, 1, 1.15, 1.15],
    chest: [5, 2, 2, 3],
    cloak: [7, 2, 2, 3],
    ring1: [4, 5, 1.15, 1.15],
    ring2: [6.85, 5, 1.15, 1.15],
    legs: [5, 5, 2, 4],
    hands: [2, 7, 2, 2],
    feet: [8, 7, 2, 2],
  };
  const imageEntries = await Promise.all(BUILDER_SLOTS.map(async (slot) => {
    const item = state.kit.itemByAsset.get(state.builder.equipped[slot.id]);
    return [slot, item, await photoLoadImage(item?.iconUrl)];
  }));
  imageEntries.forEach(([slot, item, image]) => {
    const rectDef = slotRects[slot.id];
    if (!rectDef) return;
    const [cx, cy, cw, ch] = rectDef;
    const x = grid.x + (cx * (grid.cellWidth + grid.gap));
    const y = grid.y + (cy * (grid.cellHeight + grid.gap));
    const w = cw * grid.cellWidth + ((cw - 1) * grid.gap);
    const h = ch * grid.cellHeight + ((ch - 1) * grid.gap);
    ctx.fillStyle = "rgba(36, 36, 38, .72)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = item ? "rgba(185, 185, 188, .62)" : "rgba(185, 185, 188, .26)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = "rgba(255, 255, 255, .16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    if (image) {
      const scale = Math.min((w - 16) / image.width, (h - 16) / image.height);
      const iw = image.width * scale;
      const ih = image.height * scale;
      ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    }
  });

  const cardSlots = [
    ["weapon1Primary", 666, 76, 284],
    ["head", 995, 58, 236],
    ["weapon2Primary", 1248, 118, 236],
    ["weapon1Secondary", 488, 247, 286],
    ["necklace", 1346, 293, 286],
    ["chest", 602, 413, 224],
    ["cloak", 1314, 459, 232],
    ["ring1", 540, 645, 288],
    ["ring2", 1305, 638, 288],
    ["hands", 727, 810, 220],
    ["legs", 978, 807, 236],
    ["feet", 1238, 807, 246],
  ];
  cardSlots.forEach(([slotId, x, y, w]) => {
    const item = state.kit.itemByAsset.get(state.builder.equipped[slotId]);
    if (item) photoDrawCard(ctx, item, slotId, x, y, w);
  });

  const link = document.createElement("a");
  const name = currentBuilderKitName().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "darkloot-kit";
  link.download = `${name.toLowerCase()}-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function renderBuilderStats(stats = builderStatRows()) {
  const gearScore = Object.entries(state.builder.equipped)
    .filter(([slotId]) => slotStatsAreActive(slotId))
    .map(([, asset]) => Number(state.kit.itemByAsset.get(asset)?.gearScore || 0))
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

function renderBuilderSummary(stats = builderStatRows()) {
  const equippedCount = Object.values(state.builder.equipped).filter(Boolean).length;
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
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  $(`${tabId}View`).classList.add("active");
  if (options.render !== false) renderActiveTab();
}

function renderFavoriteState() {
  renderFavorites();
  if (state.activeTab === "items") renderItems();
  if (state.activeTab === "sources") renderSources();
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

function sourceRollSummaryTable(rows) {
  const summaryRows = sourceRollSummaryRows(rows);
  if (!summaryRows.length) return "";
  return `
    <div class="roll-summary">
      <div class="roll-summary-head">
        <strong>Loot Roll Chances</strong>
        <span class="muted">Grade chance before the individual item is selected.</span>
      </div>
      ${detailTable(summaryRows, [
        { label: "Grade", html: (row) => escapeHtml(`G${row.grade}`), num: true },
        { label: "Rolls", html: (row) => escapeHtml(row.rolls), num: true },
        { label: "Loot Table", html: (row) => escapeHtml(row.lootTable || "") },
        { label: "Rate Table", html: (row) => escapeHtml(row.rateTable || "") },
        { label: "Grade Per Roll", html: (row) => escapeHtml(percent(row.gradePerRoll)), num: true },
        { label: "Grade Per Kill/Interaction", html: (row) => escapeHtml(percent(row.gradeAtLeastOne)), num: true },
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
  const loadedRows = Number(payload.rowsLimited || payload.rows?.length || model.groupedRows.length);
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
    ${sourceRollSummaryTable(rows)}
    ${detailTable(limited, [
      { label: "Item", sortKey: "item", html: (row) => itemNameCell(row) },
      { label: "Amount", sortKey: "amount", html: (row) => amountCell(row), num: true },
      { label: "Rarity", sortKey: "rarity", html: (row) => rarity(row.rarity) },
      { label: "Category", sortKey: "category", html: (row) => categoryChip(row.category) },
      { label: "Maps", sortKey: "maps", html: (row) => chips(mapChipValues(row.maps || row.map, filters.map, filters.diff), "map-chip") },
      { label: "Difficulties", sortKey: "difficulties", html: (row) => chips(scopedChipValues(row.diffs || row.diff, filters.diff), "diff-chip") },
      { label: "Rolls", sortKey: "rolls", html: (row) => escapeHtml(row.rolls), num: true },
      { label: "Per Item", sortKey: "perRoll", html: (row) => escapeHtml(perRollChanceText(row)), num: true },
      { label: "Per Kill/Interaction", sortKey: "chance", html: (row) => escapeHtml(chanceText(row)), num: true },
    ])}
  `;
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
    ${detailTable(limited, [
      { label: "Source", key: "source" },
      { label: "Kind", html: (row) => kindChip(row.sourceKind) },
      { label: "Maps", html: (row) => chips(mapChipValues(row.mapValues || row.maps, filters.map, filters.diff), "map-chip") },
      { label: "Difficulties", html: (row) => chips(scopedChipValues(row.diffValues || row.diffs, filters.diff), "diff-chip") },
      { label: "Rolls", html: (row) => escapeHtml(row.luckModel?.rolls || row.bestRolls || ""), num: true },
      { label: "Amount", html: (row) => amountCell(row), num: true },
      { label: "Best Per Item", html: (row) => escapeHtml(percent(itemDetailBestPerRollChanceValue(row, filters))), num: true },
      { label: "Best Per Kill/Interaction", html: (row) => escapeHtml(percent(itemDetailBestLuckChanceValue(row, filters))), num: true },
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

async function openItem(asset) {
  const item = state.itemByAsset.get(asset);
  if (!item) return;
  $("detailTitle").textContent = item.item;
  $("detailMeta").textContent = "Loading item details...";
  $("detailContent").innerHTML = "";
  syncLuckInputs();
  if (!$("detailDialog").open) $("detailDialog").showModal();
  const payload = await detail(item.detailPath);
  state.activeDetail = {
    type: "item",
    payload,
    search: "",
    filters: itemDetailFiltersFromMainPage(),
  };
  renderItemDetail(payload);
}

async function openSource(key) {
  const row = state.sourceByKey.get(key);
  if (!row) return;
  $("detailTitle").textContent = row.source;
  $("detailMeta").textContent = "Loading source drops...";
  $("detailContent").innerHTML = "";
  syncLuckInputs();
  if (!$("detailDialog").open) $("detailDialog").showModal();
  const payload = await detail(row.detailPath);
  state.activeDetail = {
    type: "source",
    payload,
    search: "",
    filters: sourceDetailFiltersFromMainPage(),
    sort: { key: "chance", direction: "desc" },
  };
  renderSourceDetail(payload);
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
  state.builder.pickerOpen = true;
  state.builder.pickerMode = "stats";
  renderBuilder();
}

function unequipBuilderSlot(slotId) {
  clearBuilderConfirmation();
  const { [slotId]: _removed, ...equipped } = state.builder.equipped;
  const { [slotId]: _removedPrimaryValues, ...primaryValues } = state.builder.primaryValues;
  const { [slotId]: _removedBonuses, ...bonuses } = state.builder.bonuses;
  state.builder.equipped = equipped;
  state.builder.primaryValues = primaryValues;
  state.builder.bonuses = bonuses;
  if (state.builder.selectedSlot === slotId) state.builder.pickerMode = "items";
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
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);
    });
  });

  ["itemSearch", "itemRarity", "itemCategory", "itemMap", "itemDiff"]
    .forEach((id) => $(id).addEventListener("input", () => {
      if (id === "itemDiff") syncMapSelectForDifficulty("itemMap", "itemDiff");
      scheduleRender("items", renderItems);
    }));

  ["sourceSearch", "sourceMap", "sourceDiff", "sourceKind"]
    .forEach((id) => $(id).addEventListener("input", () => {
      if (id === "sourceDiff") syncMapSelectForDifficulty("sourceMap", "sourceDiff");
      scheduleRender("sources", renderSources);
    }));

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
        setSelectedBuilderSlot(button.dataset.builderSlot);
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
          hitZoneMultiplier: DAMAGE_TARGET_DEFAULTS.hitZoneMultiplier,
          pdr: DAMAGE_TARGET_DEFAULTS.pdr,
          mdr: DAMAGE_TARGET_DEFAULTS.mdr,
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
      const value = key === "hitZoneMultiplier"
        ? clampNumberInput(input.value, DAMAGE_TARGET_DEFAULTS.hitZoneMultiplier, 0, 500)
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
      const value = key === "hitZoneMultiplier"
        ? clampNumberInput(input.value, DAMAGE_TARGET_DEFAULTS.hitZoneMultiplier, 0, 500)
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

  $("closeDetail").addEventListener("click", () => $("detailDialog").close());
  $("detailDialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) $("detailDialog").close();
  });
  $("detailDialog").addEventListener("close", () => {
    state.activeDetail = null;
    hideChipPopover(true);
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
    if (event.key === "Escape") {
      closeBuilderBonusMenus();
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
}

wireEvents();
loadData().catch((error) => {
  console.error(error);
  $("dataStatus").textContent = `Could not load website data: ${error.message}`;
});
