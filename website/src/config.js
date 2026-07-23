export const FAVORITES_KEY = "darkloot:favorites:v1";
export const SAVED_KITS_KEY = "darkloot:builder-kits:v1";
export const SHARED_KIT_BINARY_PREFIX = "~";
export const APP_BUILD_ID = "20260723-6";
export const SITE_UPDATED_AT = "2026-07-23T00:00:00+03:00";
export const ROW_PAGE_SIZE = 160;
export const MAX_BUILDER_ITEMS = 180;
export const MAX_DETAIL_ROWS = 500;
export const RARITY_ORDER = ["Junk", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Unique", "Artifact"];
export const SQUIRE_MAPS = ["Ruins", "Crypts", "Inferno"];
export const SQUIRE_MAP_SET = new Set(SQUIRE_MAPS);
export const BUILDER_PERK_LIMIT = 4;
export const BUILDER_WEAPON_MASTERY_PERK_ID = "Id_Perk_WeaponMastery";
export const BUILDER_DEMON_ARMOR_PERK_ID = "Id_Perk_DemonArmor";
export const BUILDER_SPEAR_PROFICIENCY_PERK_ID = "Id_Perk_SpearProficiency";
export const BUILDER_IRON_WILL_PERK_ID = "Id_Perk_IronWill";
export const BUILDER_LORE_MASTERY_PERK_ID = "Id_Perk_LoreMastery";
export const BUILDER_SAVAGE_PERK_ID = "Id_Perk_Savage";
export const BUILDER_NO_STAT_PERK_SUMMARY = "This perk doesnt affect stats";
export const BUILDER_LORE_MASTERY_RESOURCEFULNESS_TO_KNOWLEDGE = 0.5;
export const BUILDER_PERK_STAT_OVERRIDES = {
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
  Id_Perk_GlassCannon: [
    { statKey: "MagicalPower", label: "Magical Power", value: 20, unit: "" },
    { statKey: "MaxHealthBonus", label: "Max Health Bonus", value: -10, unit: "%" },
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
  Id_Perk_LoreMastery: [
    { statKey: "RegularInteractionSpeed", label: "Regular Interaction Speed", value: 30, unit: "%" },
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
export const BUILDER_PERK_SUMMARIES = {
  Id_Perk_Fermata: "Music buff effect 1.5x",
  Id_Perk_Jokester: "All Attributes +2",
  Id_Perk_LoreMastery: "Regular Interaction Speed +30%, Knowledge +50% of Resourcefulness",
  Id_Perk_WeaponMastery: "Allows all weapons",
  Id_Perk_DemonArmor: "Spell Casting Speed -10%, allows plate armor",
  Id_Perk_IronWill: "Magic Resistance +75, Magical Damage Reduction cap 75%",
  Id_Perk_Savage: "Physical Damage Bonus 10%, Impact Power 1 when not wearing chest armor",
  Id_Perk_SpearProficiency: "Allows Spear",
};
export const PERK_ICON_ALIASES = {
  Id_Perk_ComboAttack: "CombinationAttack",
  Id_Perk_HideMastery: "HideExpert",
};
export const BUILDER_DEFAULTS = {
  headshotDamageBonus: 150,
  primaryUnarmedDamage: 8,
  primaryUnarmedImpactPower: 1,
};
export const DAMAGE_TARGET_DEFAULTS = {
  name: "Training Dummy",
  weaponSet: "1",
  hand: "primary",
  hitLocation: "torso",
  pdr: -22,
  mdr: -22,
  comboMultiplier: 0,
};
export const DAMAGE_HIT_LOCATIONS = [
  { value: "head", label: "Head", multiplier: null },
  { value: "torso", label: "Torso", multiplier: 1 },
  { value: "arms", label: "Arms", multiplier: 0.7 },
  { value: "hands", label: "Hands", multiplier: 0.7 },
  { value: "legs", label: "Legs", multiplier: 0.7 },
  { value: "feet", label: "Feet", multiplier: 0.7 },
];
export const BUILDER_SLOTS = [
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
export const BUILDER_WEAPON_GRID = {
  weapon1Primary: { column: 1, row: 1 },
  weapon1Secondary: { column: 3, row: 1 },
  weapon2Primary: { column: 11, row: 1 },
  weapon2Secondary: { column: 13, row: 1 },
};
export const BUILDER_STAT_ROWS = [
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
export const BUILDER_STAT_ORDER = BUILDER_STAT_ROWS.map((row) => row.key);
export const STAT_CONTRIBUTION_KEYS = {
  PhysicalWeaponDamage: ["PhysicalWeaponDamage", "AdditionalWeaponDamage", "PhysicalDamageBase"],
};
export const DEFAULT_SORT_DIRECTION = {
  sources: "desc",
  items: "desc",
};
export const DEFAULT_DIFFICULTY = "High Roller";
export const LUCK_500_SCALARS = [0.5, 0.5, 0.75, 1.0, 1.752, 2.584, 3.28, 3.705, 4.213];
export const GRADE4_ANCHORS = [
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
