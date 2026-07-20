from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from loot_spawn_web import (
    APP_VERSION,
    AppState,
    compact_row,
    detail_summary,
    filter_exact_source_rows,
    filter_item_source_rows,
    item_source_summary,
    merge_amount_roll_rows,
    difficulty_sort_key,
    map_sort_key,
    rows_with_luck,
    scan_luck,
    sort_detail_rows,
    sort_item_source_rows,
    source_pair_summary,
)


DATA_VERSION = 2
MAX_SOURCE_DETAIL_ROWS = 12000
SOURCE_DETAIL_PAGE_SIZE = 300
BASE_STAT_KEYS = {
    "Strength",
    "Vigor",
    "Agility",
    "Dexterity",
    "Will",
    "Knowledge",
    "Resourcefulness",
}
STAT_KEY_ALIASES = {
    "ArmorRatingAdd": "ArmorRating",
    "ActionSpeedMod": "ActionSpeedBonus",
    "BuffDurationMod": "BuffDurationBonus",
    "CooldownReductionMod": "CooldownReductionBonus",
    "DebuffDurationMod": "DebuffDurationBonus",
    "DemonDamageMod": "DemonDamageBonus",
    "DemonReductionMod": "DemonDamageReduction",
    "HeadshotReductionMod": "HeadshotReduction",
    "HeadshotDamageMod": "HeadshotDamageBonus",
    "HealthRecoveryMod": "HealthRecoveryBonus",
    "ItemEquipSpeed": "EquipSpeed",
    "MagicRegistance": "MagicResistance",
    "MagicalRegistance": "MagicalResistance",
    "MagicalDamageMod": "MagicalDamageBonus",
    "MagicalHealBase": "MagicalHealing",
    "MagicalReduction": "MagicalDamageReduction",
    "MaxHealthAdd": "Health",
    "MaxHealthMod": "MaxHealthBonus",
    "MemoryCapacityAdd": "MemoryCapacity",
    "MemoryCapacityMod": "MemoryCapacity",
    "MemoryRecoveryMod": "SpellRecoveryBonus",
    "MoveSpeedAdd": "MoveSpeed",
    "MoveSpeedBase": "MoveSpeed",
    "MoveSpeedMod": "MoveSpeedBonus",
    "PhysicalDamageMod": "PhysicalDamageBonus",
    "PhysicalDamageReduction": "PhysicalArmorReduction",
    "PhysicalHealBase": "PhysicalHealing",
    "PhysicalReduction": "PhysicalArmorReduction",
    "PhysicalWeaponDamageAdd": "PhysicalWeaponDamage",
    "ProjectileReductionMod": "ProjectileReduction",
    "UndeadDamageMod": "UndeadDamageBonus",
    "UndeadReductionMod": "UndeadDamageReduction",
    "UtilityEffectivenessAdd": "UtilityEffectiveness",
    "UtilityEffectivenessMod": "UtilityEffectiveness",
}
PERCENT_STAT_KEYS = {
    "ActionSpeed",
    "ActionSpeedBonus",
    "ArmorPenetration",
    "BuffDurationBonus",
    "CooldownReductionBonus",
    "DebuffDurationBonus",
    "DemonDamageBonus",
    "DemonDamageReduction",
    "EquipSpeed",
    "EquipSpeedBonus",
    "HeadshotDamageBonus",
    "HeadshotReduction",
    "HealthRecoveryBonus",
    "MagicPenetration",
    "MagicalDamageReduction",
    "MagicalDamageBonus",
    "MagicalInteractionSpeed",
    "MagicalInteractionSpeedBonus",
    "MemoryCapacityBonus",
    "ManualDexterity",
    "ManualDexterityBonus",
    "MaxHealthBonus",
    "MoveSpeedBonus",
    "PhysicalDamageBonus",
    "PhysicalArmorReduction",
    "ProjectileReduction",
    "RegularInteractionSpeed",
    "RegularInteractionSpeedBonus",
    "SpellRecoveryBonus",
    "SpellCastingSpeed",
    "SpellCastingSpeedBonus",
    "UndeadDamageBonus",
    "UndeadDamageReduction",
}
FALLBACK_CLASS_PERKS = {
    "Barbarian": (
        "Id_Perk_AxeSpecialization",
        "Id_Perk_Berserker",
        "Id_Perk_Carnage",
        "Id_Perk_Executioner",
        "Id_Perk_HeavySwing",
        "Id_Perk_IronWill",
        "Id_Perk_MoraleBoost",
        "Id_Perk_PotionChugger",
        "Id_Perk_Savage",
        "Id_Perk_SkullSplitter",
        "Id_Perk_Crush",
        "Id_Perk_Robust",
        "Id_Perk_TreacherousLungs",
        "Id_Perk_TwoHander",
    ),
    "Bard": (
        "Id_Perk_CharismaticPerformance",
        "Id_Perk_DancingFeet",
        "Id_Perk_Fermata",
        "Id_Perk_JollyTime",
        "Id_Perk_LoreMastery",
        "Id_Perk_MelodicProtection",
        "Id_Perk_RapierMastery",
        "Id_Perk_ReinforcedInstruments",
        "Id_Perk_StoryTeller",
        "Id_Perk_SuperiorDexterity",
        "Id_Perk_WanderersLuck",
        "Id_Perk_WarSong",
    ),
    "Cleric": (
        "Id_Perk_AdvancedHealer",
        "Id_Perk_BluntWeaponMastery",
        "Id_Perk_Brewmaster",
        "Id_Perk_Faithfulness",
        "Id_Perk_HolyAura",
        "Id_Perk_HolyWater",
        "Id_Perk_Kindness",
        "Id_Perk_OverHealing",
        "Id_Perk_Perseverance",
        "Id_Perk_ProtectionfromEvil",
        "Id_Perk_Requiem",
        "Id_Perk_UndeadSlaying",
        "Id_Perk_QuickChant",
    ),
    "Druid": (
        "Id_Perk_Dreamwalk",
        "Id_Perk_EnhancedWildness",
        "Id_Perk_ForceOfNature",
        "Id_Perk_HerbalSensing",
        "Id_Perk_NaturalHealing",
        "Id_Perk_ShapeshiftMastery",
        "Id_Perk_SpiritBond",
        "Id_Perk_SpiritMagicMastery",
        "Id_Perk_SunAndMoon",
        "Id_Perk_ThornCoat",
        "Id_Perk_LifebloomAura",
    ),
    "Fighter": (
        "Id_Perk_AdrenalineSpike",
        "Id_Perk_Barricade",
        "Id_Perk_CombinationAttack",
        "Id_Perk_Counterattack",
        "Id_Perk_DefenseMastery",
        "Id_Perk_DualWield",
        "Id_Perk_LastBastion",
        "Id_Perk_ProjectileResistance",
        "Id_Perk_ShieldMastery",
        "Id_Perk_Slayer",
        "Id_Perk_Swift",
        "Id_Perk_SwordMastery",
        "Id_Perk_VeteranInstinct",
        "Id_Perk_WeaponGuard",
        "Id_Perk_WeaponMastery",
    ),
    "Ranger": (
        "Id_Perk_Chase",
        "Id_Perk_CripplingShot",
        "Id_Perk_CrossbowMastery",
        "Id_Perk_FirstAid",
        "Id_Perk_Kinesthesia",
        "Id_Perk_LongshotExpert",
        "Id_Perk_NimbleHands",
        "Id_Perk_PointBlankExpert",
        "Id_Perk_PurgeShot",
        "Id_Perk_QuickReload",
        "Id_Perk_RangedWeaponsMastery",
        "Id_Perk_Sharpshooter",
        "Id_Perk_SpearProficiency",
        "Id_Perk_WindFletch",
    ),
    "Rogue": (
        "Id_Perk_Ambush",
        "Id_Perk_BackAttack",
        "Id_Perk_Creep",
        "Id_Perk_DaggerMastery",
        "Id_Perk_DoubleJump",
        "Id_Perk_HideExpert",
        "Id_Perk_Pickpocket",
        "Id_Perk_PoisonedWeapon",
        "Id_Perk_Stealth",
        "Id_Perk_Thrust",
        "Id_Perk_TrapsandLocks",
        "Id_Perk_Trickster",
        "Id_Perk_VeilOfShadows",
    ),
    "Sorcerer": (
        "Id_Perk_ApexOfSorcery",
        "Id_Perk_ManaFold",
        "Id_Perk_SpellSculpting",
        "Id_Perk_SpellStride",
        "Id_Perk_TimeDistortion",
        "Id_Perk_MergedMight",
        "Id_Perk_InnateTalent",
        "Id_Perk_ElementalFury",
        "Id_Perk_ManaFlow",
        "Id_Perk_LightningMastery",
        "Id_Perk_AirMastery",
        "Id_Perk_QuickChant",
    ),
    "Warlock": (
        "Id_Perk_Antimagic",
        "Id_Perk_CurseMastery",
        "Id_Perk_DarkEnhancement",
        "Id_Perk_DarkReflection",
        "Id_Perk_DemonArmor",
        "Id_Perk_ImmortalLament",
        "Id_Perk_InfernalPledge",
        "Id_Perk_Malice",
        "Id_Perk_ShadowTouch",
        "Id_Perk_SoulCollector",
        "Id_Perk_TortureMastery",
        "Id_Perk_Vampirism",
        "Id_Perk_QuickChant",
    ),
    "Wizard": (
        "Id_Perk_ArcaneFeedback",
        "Id_Perk_ArcaneMastery",
        "Id_Perk_FireMastery",
        "Id_Perk_IceMastery",
        "Id_Perk_IceShield",
        "Id_Perk_ManaSurge",
        "Id_Perk_Melt",
        "Id_Perk_QuickChant",
        "Id_Perk_ReactiveShield",
        "Id_Perk_Sage",
        "Id_Perk_SpellOverload",
        "Id_Perk_StaffMastery",
    ),
}
FALLBACK_CHARACTER_SKINS = (
    ("Demon", "Demon"),
    ("Dwarf", "Dwarf"),
    ("Ifrit", "Ifrit"),
    ("NightmareMummy", "Nightmare Mummy"),
    ("NecroticImp", "Necrotic Imp"),
    ("Seawalker", "Seawalker"),
    ("SkeletonMage", "Skeleton Mage"),
)
ITEM_PROPERTY_EXCLUDED_STAT_KEYS = {"Primitive"}
ITEM_PROPERTY_STAT_KEY_OVERRIDES = {
    "Id_ItemPropertyType_Effect_PhysicalWeaponDamageAdd": "AdditionalWeaponDamage",
}
ITEM_PROPERTY_VALUE_SCALE_OVERRIDES = {
    "ArmorPenetration": lambda value: value * 0.1,
    "MagicPenetration": lambda value: value * 0.1,
}
STAT_EXPORT_SUFFIXES = (
    "Base",
    "Add",
    "Mod",
    "Bonus",
    "Reduction",
    "Resistance",
    "Registance",
    "Penetration",
    "Power",
    "Damage",
    "Healing",
    "Speed",
    "Dexterity",
    "Luck",
    "Capacity",
    "Rating",
    "Health",
    "Effectiveness",
    "Persuasiveness",
)
STAT_EXPORT_EXCLUDED_PREFIXES = ("Exec",)
STAT_EXPORT_EXCLUDED_KEYS = {
    "AdvPoint",
    "EnchantMaxValue",
    "EnchantMinValue",
    "EnchantOrder",
    "GearScore",
    "InventoryHeight",
    "InventoryWidth",
    "MaxCount",
    "PrimaryTooltipPriority",
    "PropertyRate",
    "PropertyTypeGroupId",
    "Radius",
    "WearingDelayTime",
}
EQUIPMENT_SLOT_LABELS = {
    "Head": "Head",
    "Chest": "Chest",
    "Legs": "Legs",
    "Leg": "Legs",
    "Hands": "Hands",
    "Foot": "Feet",
    "Feet": "Feet",
    "Back": "Cloak",
    "Necklace": "Necklace",
    "Ring": "Ring",
    "Primary": "Primary",
    "Secondary": "Secondary",
    "Utility": "Utility",
}
RARITY_ALIASES = {
    "Poor": "Junk",
    "Normal": "Common",
    "Legend": "Legendary",
}
CONDITIONAL_STAT_PERK_IDS = {
    "Id_Perk_Trickster",
}
PERK_ICON_ALIASES = {
    "Id_Perk_ComboAttack": "CombinationAttack",
    "Id_Perk_HideMastery": "HideExpert",
}
ITEM_ICON_ALIASES = {
    "RingOfSurvival": "Item_Icon_BasicRing01",
    "RingOfQuickness": "Item_Icon_BasicRing02",
    "RingOfCourage": "Item_Icon_BasicRing03",
    "RingOfResolve": "Item_Icon_BasicRing04",
}


def slug_for(*parts: object) -> str:
    raw = "|".join(str(part or "") for part in parts)
    slug = re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")
    slug = slug[:72].strip("-") or "entry"
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:10]
    return f"{slug}-{digest}.json"


def json_default(value):
    if isinstance(value, set):
        return sorted(value)
    if isinstance(value, Path):
        return str(value)
    raise TypeError(f"{type(value).__name__} is not JSON serializable")


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, separators=(",", ":"), default=json_default)


def output_path_for_public_data(output_dir: Path, public_path: str) -> Path:
    relative = public_path.lstrip("/")
    if relative.startswith("data/"):
        relative = relative[len("data/") :]
    return output_dir / relative


def reset_generated_details(output_dir: Path) -> None:
    output_root = output_dir.resolve()
    for generated_dir in (output_dir / "details", output_dir / "data"):
        resolved = generated_dir.resolve()
        if resolved.exists():
            if output_root not in resolved.parents:
                raise RuntimeError(f"Refusing to remove generated data outside output directory: {resolved}")
            shutil.rmtree(resolved)
    (output_dir / "details" / "items").mkdir(parents=True, exist_ok=True)
    (output_dir / "details" / "sources").mkdir(parents=True, exist_ok=True)


def read_asset(path: Path) -> dict | None:
    try:
        with path.open("r", encoding="utf-8-sig") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return data[0]
    if isinstance(data, dict):
        return data
    return None


def asset_name(value: object) -> str:
    if isinstance(value, dict):
        for key in ("PrimaryAssetName", "AssetPathName", "ObjectName", "ObjectPath"):
            name = asset_name(value.get(key))
            if name:
                return name
        return ""
    if value is None:
        return ""
    text = str(value)
    quoted = re.search(r"'([^']+)'", text)
    if quoted:
        return quoted.group(1)
    if "." in text:
        tail = text.rsplit(".", 1)[-1]
    else:
        tail = text.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    return tail.strip()


def asset_reference_path(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get("AssetPathName") or value.get("ObjectPath") or "")
    return str(value or "")


def exported_content_asset_path(content_root: Path, reference: str) -> Path | None:
    text = str(reference or "").replace("\\", "/")
    if not text:
        return None
    if text.startswith("/Game/DungeonCrawler/"):
        relative = text[len("/Game/DungeonCrawler/") :]
    elif "DungeonCrawler/Content/DungeonCrawler/" in text:
        relative = text.split("DungeonCrawler/Content/DungeonCrawler/", 1)[1]
    elif text.startswith("Content/DungeonCrawler/"):
        relative = text[len("Content/DungeonCrawler/") :]
    else:
        return None
    relative = relative.split(".", 1)[0].strip("/")
    if not relative:
        return None
    return content_root / Path(*relative.split("/")).with_suffix(".json")


def icon_raster_url(icon_json_path: Path | None, icon_asset: str, output_dir: Path) -> str:
    if not icon_json_path:
        return ""
    candidates = []
    for extension in (".png", ".webp", ".jpg", ".jpeg"):
        candidates.append(icon_json_path.with_suffix(extension))
        if icon_asset:
            candidates.append(icon_json_path.parent / f"{icon_asset}{extension}")
    source = next((path for path in candidates if path.exists()), None)
    if not source:
        return ""
    target_dir = output_dir.parent / "assets" / "item-icons"
    target_dir.mkdir(parents=True, exist_ok=True)
    target_name = slug_for(icon_asset or icon_json_path.stem, source.suffix).removesuffix(".json")
    target = target_dir / f"{target_name}{source.suffix.lower()}"
    shutil.copy2(source, target)
    return f"/assets/item-icons/{target.name}"


def item_icon_from_art_path(art_json_path: Path | None, art_asset: str, output_dir: Path) -> str:
    if not art_json_path or not art_asset:
        return ""
    icon_dirs = []
    for candidate in (
        art_json_path.with_suffix("").parent / "Icon",
        art_json_path.parent / "Icon",
        art_json_path.parent.parent / "Icon",
    ):
        if candidate.exists() and candidate not in icon_dirs:
            icon_dirs.append(candidate)
    if not icon_dirs:
        return ""
    tokens = [art_asset]
    if ITEM_ICON_ALIASES.get(art_asset):
        tokens.insert(0, ITEM_ICON_ALIASES[art_asset])
    tokens.append(art_asset.replace("Of", "of"))
    tokens.append(art_asset.replace("of", "Of"))
    if re.search(r"_1001$", art_asset):
        tokens.append(re.sub(r"_1001$", "_0001", art_asset))
    tokens.append(re.sub(r"_[0-9]{4}$", "", art_asset))
    candidates = []
    for token in dict.fromkeys(token for token in tokens if token):
        compact_token = re.sub(r"[^a-z0-9]", "", token.lower())
        for icon_dir in icon_dirs:
            for extension in (".png", ".webp", ".jpg", ".jpeg"):
                candidates.extend(
                    path
                    for path in sorted(icon_dir.glob(f"*{extension}"))
                    if compact_token and compact_token in re.sub(r"[^a-z0-9]", "", path.stem.lower())
                )
    source = next((path for path in candidates if path.exists()), None)
    if not source:
        ring_dir = next((path for path in icon_dirs if path.parent.name.lower() == "ring"), None)
        if ring_dir:
            source = next((path for path in sorted(ring_dir.glob("Item_Icon_BasicRing*.png")) if path.exists()), None)
    if not source:
        source = next((path for icon_dir in icon_dirs for path in sorted(icon_dir.glob("*.png")) if path.exists()), None)
    if not source:
        return ""
    return public_asset_url_from_source(source, output_dir, "item-icons")


def public_asset_url_from_source(source: Path, output_dir: Path, asset_folder: str) -> str:
    if not source.exists():
        return ""
    target_dir = output_dir.parent / "assets" / asset_folder
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / source.name
    shutil.copy2(source, target)
    return f"/assets/{asset_folder}/{target.name}"


def class_icon_url(generated_root: Path, output_dir: Path, class_id: str, size: str = "S") -> str:
    if not class_id:
        return ""
    content_root = generated_root.parents[2]
    source = content_root / "UI" / "Resources" / "IconClass" / f"ClassIcon_{size}_{class_id}.png"
    return public_asset_url_from_source(source, output_dir, "class-icons")


def class_portrait_url(generated_root: Path, output_dir: Path, class_id: str) -> str:
    if not class_id:
        return ""
    content_root = generated_root.parents[2]
    icon_dirs = [
        content_root / "UI" / "Resources" / "PortraitClass",
        content_root / "UI" / "Resources" / "PortraitClasses",
        content_root / "UI" / "Resources" / "IconClass",
    ]
    tokens = [
        class_id,
        f"Portrait_{class_id}_HUD_Man",
        f"Portrait_{class_id}_HUD_Woman",
        f"PortraitClass_{class_id}",
        f"ClassPortrait_{class_id}",
        f"ClassIcon_XL_{class_id}",
    ]
    compact_tokens = [re.sub(r"[^a-z0-9]", "", token.lower()) for token in tokens]
    for icon_dir in icon_dirs:
        if not icon_dir.exists():
            continue
        candidates = []
        for extension in (".png", ".webp", ".jpg", ".jpeg"):
            candidates.extend(sorted(icon_dir.glob(f"*{extension}")))
        source = next((
            path
            for path in candidates
            if any(token and token == re.sub(r"[^a-z0-9]", "", path.stem.lower()) for token in compact_tokens)
        ), None)
        if not source:
            source = next((
            path
            for path in candidates
            if any(token and token in re.sub(r"[^a-z0-9]", "", path.stem.lower()) for token in compact_tokens)
            ), None)
        if source:
            return public_asset_url_from_source(source, output_dir, "class-portraits")
    return ""


def perk_icon_url(generated_root: Path, output_dir: Path, perk_id: str) -> str:
    token = PERK_ICON_ALIASES.get(str(perk_id or ""), str(perk_id or "").removeprefix("Id_Perk_"))
    if not token:
        return ""
    content_root = generated_root.parents[2]
    source = content_root / "UI" / "Resources" / "IconPerk" / f"Icon_Perk_{token}.png"
    return public_asset_url_from_source(source, output_dir, "perk-icons")


def skin_icon_url(generated_root: Path, output_dir: Path, token: str, folder: str = "") -> str:
    content_root = generated_root.parents[2]
    icon_dirs = [
        content_root / "UI" / "Resources" / "Skin",
        content_root / "UI" / "Resources" / "Skins",
        content_root / "UI" / "Resources" / "IconSkin",
        content_root / "UI" / "Resources" / "IconSkins",
    ]
    tokens = [
        token,
        folder,
        f"Icon_{token}",
        f"Icon_Skin_{token}",
        f"Skin_{token}",
        f"Skin_Character_{token}",
        f"Skin_Character_{token}Man",
        f"Skin_Character_{token}Woman",
        f"Skin_Character_{token}_S",
        f"Skin_Character_{token}Man_S",
        f"Skin_Character_{token}Woman_S",
    ]
    if folder:
        tokens.extend([
            f"Icon_{folder}",
            f"Icon_Skin_{folder}",
            f"Skin_{folder}",
            f"Skin_Character_{folder}",
            f"Skin_Character_{folder}Man",
            f"Skin_Character_{folder}Woman",
            f"Skin_Character_{folder}_S",
            f"Skin_Character_{folder}Man_S",
            f"Skin_Character_{folder}Woman_S",
        ])
    compact_tokens = [
        re.sub(r"[^a-z0-9]", "", value.lower())
        for value in dict.fromkeys(tokens)
        if value
    ]
    for icon_dir in icon_dirs:
        if not icon_dir.exists():
            continue
        candidates = []
        for extension in (".png", ".webp", ".jpg", ".jpeg"):
            candidates.extend(sorted(icon_dir.glob(f"*{extension}")))
        source = next((
            path
            for path in candidates
            if "preview" not in path.stem.lower()
            and any(token and token == re.sub(r"[^a-z0-9]", "", path.stem.lower()) for token in compact_tokens)
        ), None)
        if not source:
            source = next((
            path
            for path in candidates
            if "preview" not in path.stem.lower()
            and any(token and token in re.sub(r"[^a-z0-9]", "", path.stem.lower()) for token in compact_tokens)
            ), None)
        if source:
            return public_asset_url_from_source(source, output_dir, "skin-icons")
    return ""


def item_art_from_reference(generated_root: Path, output_dir: Path, art_reference: object) -> dict:
    art_path = asset_reference_path(art_reference)
    art_asset = asset_name(art_reference)
    if not art_path and not art_asset:
        return {}
    content_root = generated_root.parents[2]
    art_json_path = exported_content_asset_path(content_root, art_path)
    icon_ref = ""
    icon_asset = ""
    icon_size = {}
    icon_json_path = None
    if art_json_path and art_json_path.exists():
        art = read_asset(art_json_path)
        props = (art or {}).get("Properties") or {}
        icon = props.get("ItemIconTexture") or props.get("LowViolenceItemIconTexture")
        icon_ref = asset_reference_path(icon)
        icon_asset = asset_name(icon)
        icon_json_path = exported_content_asset_path(content_root, icon_ref)
        if icon_json_path and icon_json_path.exists():
            texture = read_asset(icon_json_path) or {}
            imported_size = ((texture.get("Properties") or {}).get("ImportedSize") or {})
            width = texture.get("SizeX") or imported_size.get("X")
            height = texture.get("SizeY") or imported_size.get("Y")
            if isinstance(width, (int, float)) and isinstance(height, (int, float)):
                icon_size = {"width": int(width), "height": int(height)}
    result = {
        "artAsset": art_asset,
        "artPath": art_path,
    }
    if icon_asset or icon_ref:
        result.update({
            "iconAsset": icon_asset,
            "iconPath": icon_ref,
            "iconSize": icon_size,
        })
        icon_url = icon_raster_url(icon_json_path, icon_asset, output_dir)
        if icon_url:
            result["iconUrl"] = icon_url
    if not result.get("iconUrl"):
        icon_url = item_icon_from_art_path(art_json_path, art_asset, output_dir)
        if icon_url:
            result["iconUrl"] = icon_url
    return {key: value for key, value in result.items() if value not in ("", {}, None)}


def load_item_art(generated_root: Path, output_dir: Path) -> dict:
    item_art = {}
    item_dir = generated_root / "Item" / "Item"
    if not item_dir.exists():
        return item_art
    for path in item_dir.glob("*.json"):
        asset = read_asset(path)
        if not asset:
            continue
        name = asset.get("Name") or path.stem
        art = item_art_from_reference(generated_root, output_dir, (asset.get("Properties") or {}).get("ArtData"))
        if art:
            item_art[name] = art
    return item_art


def apply_item_art(rows: list[dict], item_art: dict) -> None:
    for row in rows:
        art = item_art.get(row.get("itemAsset") or row.get("asset"))
        if art:
            row["art"] = art
            if art.get("iconUrl"):
                row["iconUrl"] = art["iconUrl"]


def asset_names(values: object) -> list[str]:
    if not isinstance(values, list):
        return []
    return [name for name in (asset_name(value) for value in values) if name]


def localized_text(value: object, fallback: str = "") -> str:
    if isinstance(value, dict):
        for key in ("LocalizedString", "SourceString", "Key"):
            text = value.get(key)
            if text:
                return str(text)
    if isinstance(value, str) and value:
        return value
    return fallback


def tag_leaf(value: object) -> str:
    if isinstance(value, dict):
        value = value.get("TagName") or value.get("Name") or value.get("AssetPathName") or value.get("ObjectName")
    if value is None:
        return ""
    text = str(value)
    if "::" in text:
        text = text.rsplit("::", 1)[-1]
    if "." in text:
        text = text.rsplit(".", 1)[-1]
    if "/" in text:
        text = text.rsplit("/", 1)[-1]
    return text


def tag_text(value: object) -> str:
    if isinstance(value, dict):
        value = value.get("TagName") or value.get("Name") or value.get("AssetPathName") or value.get("ObjectName")
    return str(value or "")


def localization_key_for_tag(value: object) -> str:
    text = tag_text(value)
    if not text:
        return ""
    slug = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_")
    return f"Text_Code_DCDataBlueprintLibrary_{slug}" if slug else ""


def find_content_root(path: Path) -> Path | None:
    for candidate in (path, *path.parents):
        if candidate.name == "Content":
            return candidate
        if (candidate / "Localization").exists():
            return candidate
    return None


def load_game_localization(generated_root: Path) -> dict[str, str]:
    content_root = find_content_root(generated_root)
    if not content_root:
        return {}
    localization_root = content_root / "Localization" / "Game" / "en"
    candidates = [localization_root / "Game.json", *localization_root.glob("*.json")]
    strings: dict[str, str] = {}
    for path in candidates:
        if not path.exists():
            continue
        data = read_asset(path)
        if not isinstance(data, dict):
            continue
        for namespace in data.values():
            if not isinstance(namespace, dict):
                continue
            for key, value in namespace.items():
                if isinstance(key, str) and isinstance(value, str) and value.strip():
                    strings.setdefault(key, value.strip())
    return strings


def localized_tag_label(localization: dict[str, str], *tags: object, fallback: str) -> str:
    for tag in tags:
        key = localization_key_for_tag(tag)
        if key and localization.get(key):
            return localization[key]
    return fallback


def normalize_rarity(value: object) -> str:
    leaf = tag_leaf(value)
    return RARITY_ALIASES.get(leaf, leaf)


def humanize_identifier(value: object) -> str:
    text = str(value or "")
    replacements = (
        "Id_ItemPropertyType_Effect_",
        "Id_ItemPropertyType_Perk_",
        "Id_ItemProperty_Primary_",
        "Id_ItemProperty_Secondary_",
        "Id_ActorStatusEffect_",
        "Id_PlayerCharacter_GrandMaster_",
        "Id_PlayerCharacter_",
        "Id_Perk_",
        "Id_Item_",
    )
    for prefix in replacements:
        if text.startswith(prefix):
            text = text[len(prefix) :]
            break
    text = text.replace("MagicRegistance", "MagicResistance")
    text = text.replace("Registance", "Resistance")
    text = text.replace("_", " ")
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or str(value or "")


def class_key(asset: object) -> str:
    text = str(asset or "")
    text = text.replace("Id_PlayerCharacter_GrandMaster_", "")
    text = text.replace("Id_PlayerCharacter_", "")
    return text


def normalize_stat_key(key: object) -> str:
    text = tag_leaf(key) or asset_name(key) or str(key or "")
    text = text.replace("Id_ItemPropertyType_Effect_", "")
    text = text.replace("MagicRegistance", "MagicResistance")
    text = text.replace("Registance", "Resistance")
    if text in STAT_KEY_ALIASES:
        return STAT_KEY_ALIASES[text]
    for base_key in BASE_STAT_KEYS:
        if text == f"{base_key}Base":
            return base_key
    return text


def is_stat_export_key(key: str) -> bool:
    if not key or key in STAT_EXPORT_EXCLUDED_KEYS:
        return False
    if any(key.startswith(prefix) for prefix in STAT_EXPORT_EXCLUDED_PREFIXES):
        return False
    if key in BASE_STAT_KEYS or key in STAT_KEY_ALIASES:
        return True
    return any(key.endswith(suffix) for suffix in STAT_EXPORT_SUFFIXES)


def numeric_stat_entries(properties: dict) -> list[dict]:
    entries = []
    for key, value in properties.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        if not is_stat_export_key(key):
            continue
        stat_key = normalize_stat_key(key)
        value_scale = 0.1 if stat_key in PERCENT_STAT_KEYS or str(key).endswith("Mod") else 1
        unit = "%" if stat_key in PERCENT_STAT_KEYS else ""
        entries.append({
            "statKey": stat_key,
            "rawKey": key,
            "label": humanize_identifier(stat_key),
            "value": round(value * value_scale, 4),
            "unit": unit,
        })
    entries.sort(key=lambda row: row["label"].lower())
    return entries


def effect_properties(asset: dict) -> dict:
    props = asset.get("Properties") or {}
    item_props = props.get("Item")
    return item_props if isinstance(item_props, dict) else props


def load_effect_assets(paths: list[Path]) -> dict:
    effects = {}
    for effect_dir in paths:
        if not effect_dir.exists():
            continue
        for path in effect_dir.glob("*.json"):
            asset = read_asset(path)
            if not asset:
                continue
            name = asset.get("Name") or path.stem
            if name in effects:
                continue
            props = effect_properties(asset)
            effects[name] = {
                "id": name,
                "stats": numeric_stat_entries(props),
                "grantedTags": [tag_leaf(row) for row in props.get("GrantedTags") or [] if tag_leaf(row)],
            }
    return effects


def load_property_types(generated_root: Path, localization: dict[str, str] | None = None) -> dict:
    localization = localization or {}
    property_types = {}
    type_dir = generated_root / "ItemProperty" / "ItemPropertyType"
    for path in type_dir.glob("*.json"):
        asset = read_asset(path)
        if not asset:
            continue
        name = asset.get("Name") or path.stem
        props = asset.get("Properties") or {}
        property_type_tag = tag_text(props.get("PropertyType"))
        effect_type_tag = tag_text(props.get("EffectType"))
        property_type = tag_leaf(property_type_tag) or humanize_identifier(name)
        effect_type = tag_leaf(effect_type_tag)
        stat_key = ITEM_PROPERTY_STAT_KEY_OVERRIDES.get(name) or normalize_stat_key(effect_type or property_type or name)
        property_label = localized_tag_label(localization, property_type_tag, fallback=humanize_identifier(property_type))
        value_ratio = props.get("ValueRatio")
        property_types[name] = {
            "id": name,
            "statKey": stat_key,
            "rawKey": effect_type or property_type,
            "label": localized_tag_label(localization, property_type_tag, effect_type_tag, fallback=humanize_identifier(stat_key)),
            "propertyLabel": property_label,
            "valueRatio": value_ratio if isinstance(value_ratio, (int, float)) else None,
        }
    return property_types


def property_item_entry(row: dict, property_types: dict) -> dict | None:
    type_id = asset_name(row.get("PropertyTypeId"))
    if not type_id:
        return None
    type_info = property_types.get(type_id, {
        "id": type_id,
        "statKey": ITEM_PROPERTY_STAT_KEY_OVERRIDES.get(type_id) or normalize_stat_key(type_id),
        "label": humanize_identifier(type_id),
        "propertyLabel": humanize_identifier(type_id),
        "valueRatio": None,
    })
    if type_info["statKey"] in ITEM_PROPERTY_EXCLUDED_STAT_KEYS:
        return None
    min_value = row.get("MinValue", 0)
    max_value = row.get("MaxValue", min_value)
    value_ratio = type_info.get("valueRatio")
    is_percent = type_info["statKey"] in PERCENT_STAT_KEYS
    value_scale = value_ratio * 100 if is_percent and isinstance(value_ratio, (int, float)) else (0.1 if is_percent else 1)
    unit = "%" if is_percent else ""
    scale_override = ITEM_PROPERTY_VALUE_SCALE_OVERRIDES.get(type_info["statKey"])
    if scale_override:
        min_display = scale_override(min_value)
        max_display = scale_override(max_value)
    else:
        min_display = min_value * value_scale
        max_display = max_value * value_scale
    return {
        "propertyId": type_id,
        "statKey": type_info["statKey"],
        "label": type_info["label"],
        "propertyLabel": type_info.get("propertyLabel") or type_info["label"],
        "min": round(min_display, 4),
        "max": round(max_display, 4),
        "rawMin": min_value,
        "rawMax": max_value,
        "rate": row.get("PropertyRate", 0),
        "valueRatio": type_info.get("valueRatio"),
        "unit": unit,
    }


def load_property_assets(generated_root: Path, property_types: dict) -> dict:
    properties = {}
    property_dir = generated_root / "ItemProperty" / "ItemProperty"
    for path in property_dir.glob("*.json"):
        asset = read_asset(path)
        if not asset:
            continue
        name = asset.get("Name") or path.stem
        rows = (asset.get("Properties") or {}).get("ItemPropertyItemArray") or []
        entries = [entry for entry in (property_item_entry(row, property_types) for row in rows) if entry]
        properties[name] = entries
    return properties


def load_requirement_classes(generated_root: Path, output_dir: Path) -> dict:
    requirements = {}
    requirement_dir = generated_root.parent / "DT_Item" / "ItemRequirement"
    for path in requirement_dir.glob("*.json"):
        asset = read_asset(path)
        if not asset:
            continue
        name = asset.get("Name") or path.stem
        item = ((asset.get("Properties") or {}).get("Item") or {})
        class_assets = asset_names(item.get("ClassRequirements"))
        requirements[name] = []
        for class_asset in class_assets:
            class_id = class_key(class_asset)
            entry = {"id": class_id, "name": humanize_identifier(class_asset)}
            icon_url = class_icon_url(generated_root, output_dir, class_id)
            if icon_url:
                entry["iconUrl"] = icon_url
            requirements[name].append(entry)
    return requirements


def load_status_effects(generated_root: Path) -> dict:
    return load_effect_assets([generated_root / "ActorStatus" / "StatusEffect"])


def format_effect_value(key: str, value: object) -> str:
    if not isinstance(value, (int, float)):
        return str(value or "")
    if key.lower() == "duration":
        seconds = value / 1000 if value > 1000 else value
        return f"{seconds:g}"
    if key == "MovementMod":
        return f"{value:g}"
    stat_key = normalize_stat_key(key)
    scale = 0.1 if stat_key in PERCENT_STAT_KEYS or key.endswith("Mod") else 1
    return f"{value * scale:g}"


def effect_tag_label(key: str) -> str:
    cleaned = str(key or "").split(".", 1)[-1]
    overrides = {
        "MagicalFireDamageBase": "fire magical damage",
        "MagicalIceDamageBase": "ice magical damage",
        "MagicalAirDamageBase": "air magical damage",
        "MagicalLightningDamageBase": "lightning magical damage",
        "MagicalDarkDamageBase": "dark magical damage",
        "MagicalHolyDamageBase": "holy magical damage",
        "MoveSpeedMod": "movement speed",
        "PhysicalDamageBase": "physical damage",
        "MagicalDamageBase": "magical damage",
        "MagicalWaterDamageBase": "water magical damage",
        "PhysicalHealBase": "health",
        "MagicalHealBase": "health",
    }
    return overrides.get(cleaned, humanize_identifier(cleaned).lower())


def clean_effect_description(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")
    text = text.replace(" _", "")
    text = text.replace("_", " ")
    text = text.replace("â€™", "'").replace("â€œ", '"').replace("â€", '"')
    return re.sub(r"\s+", " ", text).strip()


def effect_description_from_asset(desc_asset: dict, content_root: Path) -> dict | None:
    props = desc_asset.get("Properties") or {}
    text = localized_text(props.get("DescriptionFormatTextId"))
    if not text:
        return None
    effect_refs = props.get("DCGameplayEffectDataAssetArray") or []
    movement_refs = props.get("MovementModifierDataAssetArray") or []
    constant_refs = props.get("ConstantDataAssetArray") or []
    def load_ref_props(refs: list[object]) -> list[dict]:
        loaded = []
        for ref in refs:
            path = exported_content_asset_path(content_root, asset_reference_path(ref))
            asset = read_asset(path) if path else None
            loaded.append((asset or {}).get("Properties") or {})
        return loaded
    effects = load_ref_props(effect_refs)
    movements = load_ref_props(movement_refs)
    constants = load_ref_props(constant_refs)
    def effect_value(effect: dict, key: str) -> object:
        if key in effect:
            return effect.get(key)
        compacted = re.sub(r"[^a-z0-9]", "", key.lower())
        for effect_key, value in effect.items():
            if re.sub(r"[^a-z0-9]", "", str(effect_key).lower()) == compacted:
                return value
        return None
    def constant_value(index: int) -> object:
        if not 0 <= index < len(constants):
            return None
        constant = constants[index]
        for key in ("FloatValue", "IntValue", "Value"):
            if key in constant:
                return constant.get(key)
        return None
    def movement_value(index: int, key: str, value_format: str) -> object:
        if not 0 <= index < len(movements):
            return None
        value = effect_value(movements[index], key)
        if isinstance(value, (int, float)) and value_format == "AbsFromOne":
            return abs(1 - value) * 100
        return value
    def render_tag(tag: str, attrs: str, body: str) -> str:
        if not re.search(r"\[(\d+)\]", body or ""):
            return effect_tag_label(tag) if str(body or "").strip() == "_" else str(body or "")
        attr_type = re.search(r'Type="([^"]+)"', attrs or "")
        attr_format = re.search(r'Format="([^"]+)"', attrs or "")
        def replace_placeholder(match: re.Match) -> str:
            index = int(match.group(1))
            if tag == "Constant":
                value = constant_value(index)
                return format_effect_value(tag, value)
            if tag == "MovementMod":
                value = movement_value(index, attr_type.group(1) if attr_type else "", attr_format.group(1) if attr_format else "")
                return format_effect_value(tag, value)
            value = effect_value(effects[index], tag) if 0 <= index < len(effects) else None
            return format_effect_value(tag, value)
        body = re.sub(r"\[(\d+)\]", replace_placeholder, str(body or ""))
        return body.replace("_", effect_tag_label(tag))
    def replace_tag(match: re.Match) -> str:
        return render_tag(match.group(1), match.group(2) or "", match.group(3))
    description = re.sub(r"<([A-Za-z0-9_.]+)([^>]*)>(.*?)</>", replace_tag, text, flags=re.DOTALL)
    description = clean_effect_description(description)
    if not description:
        return None
    return {
        "name": str(desc_asset.get("Name") or ""),
        "description": description,
        "effects": [
            {
                "id": asset_name(ref),
                "durationSeconds": (effect.get("duration") / 1000 if isinstance(effect.get("duration"), (int, float)) else None),
                "stats": numeric_stat_entries(effect),
                "grantedTags": [tag_leaf(row) for row in effect.get("GrantedTags") or [] if tag_leaf(row)],
            }
            for ref, effect in zip(effect_refs, effects)
        ],
    }


def load_item_special_effects(generated_root: Path, props: dict) -> list[dict]:
    content_root = generated_root.parents[2]
    special_effects = []
    seen = set()
    for ability_ref in props.get("Abilities") or []:
        ability_path = exported_content_asset_path(content_root, asset_reference_path(ability_ref))
        ability_asset = read_asset(ability_path) if ability_path else None
        ability_props = (ability_asset or {}).get("Properties") or {}
        desc_ref = ability_props.get("Desc")
        desc_path = exported_content_asset_path(content_root, asset_reference_path(desc_ref))
        desc_asset = read_asset(desc_path) if desc_path else None
        if not desc_asset:
            continue
        effect = effect_description_from_asset(desc_asset, content_root)
        if not effect:
            continue
        key = effect["description"]
        if key in seen:
            continue
        seen.add(key)
        effect["abilityId"] = asset_name(ability_ref)
        special_effects.append(effect)
    return special_effects


def load_character_effects(generated_root: Path) -> dict:
    return load_effect_assets([
        generated_root / "PlayerCharacter" / "PlayerCharacterEffect",
        generated_root.parent / "DT_PlayerCharacter" / "PlayerCharacterEffect",
    ])


def load_character_skins(generated_root: Path, output_dir: Path, status_effects: dict) -> list[dict]:
    content_root = generated_root.parents[2]
    skin_dir = content_root / "Characters" / "Skin"
    skin_folder_names = {
        path.name
        for path in skin_dir.iterdir()
        if skin_dir.exists() and path.is_dir()
    }
    skins = []
    seen_ids = set()
    prefix = "Id_ActorStatusEffect_CharacterSkin_"
    for effect_id, effect in status_effects.items():
        if not str(effect_id).startswith(prefix):
            continue
        token = str(effect_id)[len(prefix):]
        folder = next(
            (
                name
                for name in skin_folder_names
                if token == name or token.startswith(name) or name.startswith(token)
            ),
            "",
        )
        seen_ids.add(effect_id)
        skins.append({
            "id": effect_id,
            "name": humanize_identifier(token),
            "skin": folder or token,
            "effectId": effect_id,
            "stats": effect.get("stats", []),
            "grantedTags": effect.get("grantedTags", []),
            "iconUrl": skin_icon_url(generated_root, output_dir, token, folder),
        })
    for token, display_name in FALLBACK_CHARACTER_SKINS:
        effect_id = f"{prefix}{token}"
        if effect_id in seen_ids:
            continue
        folder = next(
            (
                name
                for name in skin_folder_names
                if token == name or token.startswith(name) or name.startswith(token)
            ),
            token,
        )
        skins.append({
            "id": effect_id,
            "name": display_name,
            "skin": folder,
            "effectId": effect_id,
            "stats": [],
            "grantedTags": [],
            "iconUrl": skin_icon_url(generated_root, output_dir, token, folder)
            or (skin_icon_url(generated_root, output_dir, "Mummy", "Mummy") if token == "NightmareMummy" else ""),
        })
    skins.sort(key=lambda row: row["name"].lower())
    return skins


def load_curve_tables(generated_root: Path) -> dict:
    tables = {}
    curve_dir = generated_root.parent.parent / "GameplayAbility"
    if not curve_dir.exists():
        return tables
    for path in curve_dir.glob("CT_*.json"):
        asset = read_asset(path)
        if not asset:
            continue
        rows = asset.get("Rows") or {}
        table_rows = {}
        for row_name, row in rows.items():
            keys = []
            for key in row.get("Keys") or []:
                time = key.get("Time")
                value = key.get("Value")
                if isinstance(time, (int, float)) and isinstance(value, (int, float)):
                    keys.append([time, value])
            if keys:
                table_rows[row_name] = sorted(keys, key=lambda entry: entry[0])
        if table_rows:
            tables[asset.get("Name") or path.stem] = table_rows
    return tables


def load_perks(generated_root: Path, output_dir: Path, status_effects: dict) -> dict:
    perks = {}
    perk_dir = generated_root / "Perk" / "Perk"
    for path in perk_dir.glob("*.json") if perk_dir.exists() else []:
        asset = read_asset(path)
        if not asset:
            continue
        name = asset.get("Name") or path.stem
        props = asset.get("Properties") or {}
        effect_ids = asset_names(props.get("Effects"))
        stats = []
        for effect_id in effect_ids:
            effect_stats = status_effects.get(effect_id, {}).get("stats", [])
            inferred = False
            if not effect_stats:
                for candidate in (f"{effect_id}Buff", f"{effect_id}_Buff"):
                    effect_stats = status_effects.get(candidate, {}).get("stats", [])
                    if effect_stats:
                        effect_id = candidate
                        inferred = True
                        break
            for stat in effect_stats:
                if inferred:
                    stat = {**stat, "inferred": True}
                stats.append({**stat, "source": effect_id})
        class_assets = asset_names(props.get("Classes"))
        class_ids = sorted({class_key(class_asset) for class_asset in class_assets})
        perk = {
            "id": name,
            "name": localized_text(props.get("Name"), humanize_identifier(name)),
            "classes": class_ids,
            "classNames": [humanize_identifier(f"Id_PlayerCharacter_{class_id}") for class_id in class_ids],
            "effects": effect_ids,
            "stats": stats,
            "canUse": bool(props.get("CanUse", True)),
        }
        icon_url = perk_icon_url(generated_root, output_dir, name)
        if icon_url:
            perk["iconUrl"] = icon_url
        if name in CONDITIONAL_STAT_PERK_IDS:
            perk["conditionalStats"] = True
        perks[name] = perk
    if not perks:
        content_root = generated_root.parents[2]
        icon_dir = content_root / "UI" / "Resources" / "IconPerk"
        for path in sorted(icon_dir.glob("Icon_Perk_*.png")):
            token = path.stem.removeprefix("Icon_Perk_")
            name = f"Id_Perk_{token}"
            icon_url = public_asset_url_from_source(path, output_dir, "perk-icons")
            perks[name] = {
                "id": name,
                "name": humanize_identifier(name),
                "classes": [],
                "classNames": [],
                "effects": [],
                "stats": [],
                "canUse": True,
                "iconUrl": icon_url,
            }
    return perks


def load_characters(generated_root: Path, output_dir: Path, perks: dict, character_effects: dict) -> list[dict]:
    characters = []
    character_dir = generated_root.parent / "DT_PlayerCharacter" / "PlayerCharacter"
    grandmaster_perks: dict[str, set[str]] = {}
    for path in character_dir.glob("Id_PlayerCharacter_GrandMaster_*.json"):
        asset = read_asset(path)
        if not asset:
            continue
        key = class_key(asset.get("Name") or path.stem)
        if key.startswith("GrandMaster_"):
            key = key.removeprefix("GrandMaster_")
        props = ((asset.get("Properties") or {}).get("Item") or {})
        grandmaster_perks[key] = {perk_id for perk_id in asset_names(props.get("Perks")) if perk_id in perks}
    for path in character_dir.glob("Id_PlayerCharacter_*.json"):
        asset = read_asset(path)
        if not asset:
            continue
        name = asset.get("Name") or path.stem
        key = class_key(name)
        if not key or "GrandMaster" in str(name) or key == "GrandMaster":
            continue
        props = ((asset.get("Properties") or {}).get("Item") or {})
        if props.get("CanUse") is False:
            continue
        perk_ids = {perk_id for perk_id in asset_names(props.get("Perks")) if perk_id in perks}
        perk_ids.update(grandmaster_perks.get(key, set()))
        perk_ids.update(
            perk_id
            for perk_id, perk in perks.items()
            if perk.get("canUse", True) and key in (perk.get("classes") or [])
        )
        perk_ids.update(
            perk_id
            for perk_id in FALLBACK_CLASS_PERKS.get(key, ())
            if perk_id in perks and perks[perk_id].get("canUse", True)
        )
        effect_ids = asset_names(props.get("Effects"))
        base_stats = []
        for effect_id in effect_ids:
            if effect_id != f"Id_PlayerCharacterEffect_{key}":
                continue
            for stat in character_effects.get(effect_id, {}).get("stats", []):
                base_stats.append({**stat, "source": effect_id})
        character = {
            "id": key,
            "asset": name,
            "name": localized_text(props.get("Name"), humanize_identifier(name)),
            "perks": sorted(perk_ids, key=lambda perk_id: perks[perk_id]["name"].lower()),
            "effects": effect_ids,
            "baseStats": base_stats,
        }
        icon_url = class_icon_url(generated_root, output_dir, key)
        if icon_url:
            character["iconUrl"] = icon_url
        portrait_url = class_portrait_url(generated_root, output_dir, key)
        if portrait_url:
            character["portraitUrl"] = portrait_url
        characters.append(character)
    characters.sort(key=lambda row: row["name"].lower())
    return characters


def kit_slot_from_item(props: dict) -> dict | None:
    raw_slot = tag_leaf(props.get("SlotType"))
    if not raw_slot:
        return None
    label = EQUIPMENT_SLOT_LABELS.get(raw_slot)
    if not label:
        return None
    return {"id": raw_slot, "label": label}


def public_stat_entry(entry: dict) -> dict:
    keys = ("propertyId", "statKey", "label", "min", "max", "value", "unit")
    return {
        key: entry[key]
        for key in keys
        if key in entry and entry[key] not in (None, "", [], {})
    }


def public_art(art: dict | None) -> dict:
    icon_size = (art or {}).get("iconSize") or {}
    return {"iconSize": icon_size} if icon_size else {}


def load_kit_items(generated_root: Path, public_items: list[dict], property_assets: dict, requirements: dict, item_art: dict) -> list[dict]:
    public_by_asset = {row.get("itemAsset"): row for row in public_items}
    kit_items = []
    item_dir = generated_root / "Item" / "Item"
    for path in item_dir.glob("*.json"):
        asset = read_asset(path)
        if not asset:
            continue
        name = asset.get("Name") or path.stem
        props = asset.get("Properties") or {}
        slot = kit_slot_from_item(props)
        if not slot:
            continue
        primary_id = asset_name(props.get("PrimaryProperty"))
        secondary_ids = asset_names(props.get("SecondaryProperties"))
        if not primary_id and not secondary_ids:
            continue
        requirement_id = asset_name(props.get("Requirement"))
        public_row = public_by_asset.get(name) or {}
        allowed_classes = requirements.get(requirement_id, [])
        rarity_value = normalize_rarity(props.get("RarityType")) or public_row.get("rarity") or "Unknown"
        item_type = str(props.get("ItemType") or "").split("::")[-1]
        kit_item = {
            "asset": name,
            "name": localized_text(props.get("Name"), public_row.get("item") or humanize_identifier(name)),
            "rarity": rarity_value,
            "itemType": item_type,
            "slot": slot,
            "hand": tag_leaf(props.get("HandType")),
            "armorType": tag_leaf(props.get("ArmorType")),
            "weaponTypes": [tag_leaf(row) for row in props.get("WeaponTypes") or [] if tag_leaf(row)],
            "gearScore": props.get("GearScore", 0),
            "inventory": {
                "width": props.get("InventoryWidth", 1),
                "height": props.get("InventoryHeight", 1),
            },
            "primary": [public_stat_entry(entry) for entry in property_assets.get(primary_id, [])],
            "secondaryPoolIds": secondary_ids,
            "specialEffects": [
                {"description": effect["description"]}
                for effect in load_item_special_effects(generated_root, props)
                if effect.get("description")
            ],
            "allowedClasses": [row["id"] for row in allowed_classes if row.get("id")],
        }
        art = item_art.get(name)
        if art:
            compact_art = public_art(art)
            if compact_art:
                kit_item["art"] = compact_art
            if art.get("iconUrl"):
                kit_item["iconUrl"] = art["iconUrl"]
        kit_item = {
            key: value
            for key, value in kit_item.items()
            if value not in (None, "", [], {})
        }
        kit_items.append(kit_item)
    kit_items.sort(key=lambda row: (row["slot"]["label"], row["name"].lower(), row["rarity"]))
    return kit_items


def build_kit_builder_data(generated_root: Path, output_dir: Path, public_items: list[dict], item_art: dict) -> dict:
    localization = load_game_localization(generated_root)
    property_types = load_property_types(generated_root, localization)
    property_assets = load_property_assets(generated_root, property_types)
    requirements = load_requirement_classes(generated_root, output_dir)
    status_effects = load_status_effects(generated_root)
    character_effects = load_character_effects(generated_root)
    character_skins = load_character_skins(generated_root, output_dir, status_effects)
    curve_tables = load_curve_tables(generated_root)
    perks = load_perks(generated_root, output_dir, status_effects)
    characters = load_characters(generated_root, output_dir, perks, character_effects)
    kit_items = load_kit_items(generated_root, public_items, property_assets, requirements, item_art)
    secondary_pool_ids = sorted({pool_id for item in kit_items for pool_id in item.get("secondaryPoolIds", [])})
    secondary_pools = {
        pool_id: {
            "options": [public_stat_entry(entry) for entry in property_assets.get(pool_id, [])],
        }
        for pool_id in secondary_pool_ids
    }
    public_characters = [
        {
            key: value
            for key, value in {
                "id": character.get("id"),
                "name": character.get("name"),
                "perks": character.get("perks") or [],
                "baseStats": [public_stat_entry(entry) for entry in character.get("baseStats") or []],
                "iconUrl": character.get("iconUrl"),
                "portraitUrl": character.get("portraitUrl"),
            }.items()
            if value not in (None, "", [], {})
        }
        for character in characters
    ]
    public_skins = [
        {
            key: value
            for key, value in {
                "id": skin.get("id"),
                "name": skin.get("name"),
                "stats": [public_stat_entry(entry) for entry in skin.get("stats") or []],
                "iconUrl": skin.get("iconUrl"),
            }.items()
            if value not in (None, "", [], {})
        }
        for skin in character_skins
    ]
    public_perks = [
        {
            key: value
            for key, value in {
                "id": perk.get("id"),
                "name": perk.get("name"),
                "stats": [public_stat_entry(entry) for entry in perk.get("stats") or []],
                "iconUrl": perk.get("iconUrl"),
            }.items()
            if value not in (None, "", [], {})
        }
        for perk in sorted(perks.values(), key=lambda row: row["name"].lower())
    ]
    return {
        "dataVersion": DATA_VERSION,
        "items": kit_items,
        "secondaryPools": secondary_pools,
        "curveTables": curve_tables,
        "characters": public_characters,
        "characterSkins": public_skins,
        "perks": public_perks,
    }


def luck_model_for_row(row: dict | None) -> dict | None:
    if not row:
        return None
    rate_key = str(row.get("rate_key") or "").lower()
    if not rate_key:
        return None
    try:
        return {
            "rateKey": rate_key,
            "grade": int(row.get("grade", 0) or 0),
            "rolls": max(1, int(row.get("rolls", 1) or 1)),
            "choiceFraction": float(row.get("choice_fraction", 0.0) or 0.0),
            "baseAtLeastOneValue": float(row.get("base_at_least_one", 0.0) or 0.0),
            "basePerRollValue": float(row.get("base_per_roll", 0.0) or 0.0),
        }
    except (TypeError, ValueError):
        return None


def attach_luck_model(public_row: dict, raw_row: dict | None) -> dict:
    model = luck_model_for_row(raw_row)
    if model:
        public_row["luckModel"] = model
    return public_row


def best_item_row(index, item_row: dict) -> dict | None:
    best = None
    for row in index.item_rows.get(item_row["itemAsset"], ()):
        if row["rarity"] != item_row["rarity"] or row["cat"] != item_row["category"]:
            continue
        if not index.row_location_maps(row):
            continue
        if best is None or row["dyn_at_least_one"] > best["dyn_at_least_one"]:
            best = row
    return best


def best_source_row(index, source_row: dict) -> dict | None:
    best = None
    kind = source_row["sourceKind"]
    for source in source_row.get("sourceValues", [source_row["source"]]):
        for row in index.source_rows_for_query(source, kind):
            if not index.row_location_maps(row):
                continue
            if best is None or row["dyn_at_least_one"] > best["dyn_at_least_one"]:
                best = row
    return best


def best_item_source_row(base_rows: list[dict], source_row: dict) -> dict | None:
    source_values = set(source_row.get("sourceValues") or [source_row["source"]])
    kind = source_row["sourceKind"]
    best = None
    for row in base_rows:
        if row["source_kind"] != kind or row["source"] not in source_values:
            continue
        if best is None or row["dyn_at_least_one"] > best["dyn_at_least_one"]:
            best = row
    return best


def source_row_matches_summary(row: dict, source_row: dict) -> bool:
    source_values = set(source_row.get("sourceValues") or [source_row["source"]])
    return row["source_kind"] == source_row["sourceKind"] and row["source"] in source_values


def public_item_scenario_best(row: dict, map_name: str, diff: str) -> dict:
    public = {
        "map": map_name,
        "diff": diff,
        "baseAtLeastOneValue": row["base_at_least_one"],
        "chanceValue": row["dyn_at_least_one"],
    }
    return attach_luck_model(public, row)


def item_source_scenario_bests(base_rows: list[dict], source_row: dict, index) -> list[dict]:
    best_by_scenario: dict[tuple[str, str], dict] = {}
    for row in base_rows:
        if not source_row_matches_summary(row, source_row):
            continue
        row_maps = index.row_location_maps(row) if index else set(row["maps"])
        if index and not row_maps:
            continue
        for map_name in row_maps:
            for diff in row["diffs"]:
                key = (map_name, diff)
                best = best_by_scenario.get(key)
                if best is None or row["dyn_at_least_one"] > best["dyn_at_least_one"]:
                    best_by_scenario[key] = row
    return [
        public_item_scenario_best(best_by_scenario[(map_name, diff)], map_name, diff)
        for map_name, diff in sorted(
            best_by_scenario,
            key=lambda value: (map_sort_key(value[0]), difficulty_sort_key(value[1])),
        )
    ]


def public_item_source_row(row: dict, raw_row: dict | None = None, scenario_bests: list[dict] | None = None) -> dict:
    cleaned = dict(row)
    cleaned.pop("spawnLocations", None)
    if scenario_bests:
        cleaned["scenarioBests"] = scenario_bests
    return attach_luck_model(cleaned, raw_row)


def public_source_drop_row(row: dict, item_art: dict | None = None) -> dict:
    compact = compact_row(row)
    public = {
        "item": compact["item"],
        "itemAsset": compact["itemAsset"],
        "rarity": compact["rarity"],
        "category": compact["category"],
        "map": compact["map"],
        "maps": compact["maps"],
        "diff": compact["diff"],
        "diffs": compact["diffs"],
        "grade": compact["grade"],
        "itemCount": compact["itemCount"],
        "amountRolls": compact.get("amountRolls"),
        "amountRollBreakdown": compact.get("amountRollBreakdown"),
        "rolls": compact["rolls"],
        "basePerRoll": compact["basePerRoll"],
        "basePerRollValue": compact["basePerRollValue"],
        "baseAtLeastOne": compact["baseAtLeastOne"],
        "baseAtLeastOneValue": compact["baseAtLeastOneValue"],
        "dynAtLeastOne": compact["dynAtLeastOne"],
        "dynAtLeastOneValue": compact["dynAtLeastOneValue"],
        "dynPerRoll": compact["dynPerRoll"],
        "dynPerRollValue": compact["dynPerRollValue"],
        "lootTable": compact["lootTable"],
        "rateTable": compact["rateTable"],
    }
    art = (item_art or {}).get(compact["itemAsset"])
    if art:
        compact_art = public_art(art)
        if compact_art:
            public["art"] = compact_art
        if art.get("iconUrl"):
            public["iconUrl"] = art["iconUrl"]
    return attach_luck_model(public, row)


def public_item_index_row(row: dict) -> dict:
    public = {
        "item": row["item"],
        "itemAsset": row["itemAsset"],
        "rarity": row["rarity"],
        "category": row["category"],
        "sourceCount": row["sourceCount"],
        "maps": row["maps"],
        "diffs": row["diffs"],
        "detailPath": row["detailPath"],
    }
    art = row.get("art") or {}
    icon_url = row.get("iconUrl") or art.get("iconUrl")
    if icon_url:
        public["iconUrl"] = icon_url
        compact_art = public_art(art)
        if compact_art:
            public["art"] = compact_art
    return public


def export_source_details(output_dir: Path, state: AppState, sources: list[dict], item_art: dict) -> None:
    index, result, luck = state.current_data()
    if not index:
        return

    for row in sources:
        source = row["source"]
        kind = row["sourceKind"]
        params = {
            "source": [source],
            "kind": [kind],
            "map": ["All"],
            "diff": ["All"],
            "item": [""],
            "rarity": ["All"],
        }
        base_rows = filter_exact_source_rows(index, params)
        source_scope = index.source_values_for_query(source, kind)
        detail_rows = detail_summary(merge_amount_roll_rows(rows_with_luck(base_rows, result, luck)), index, source_scope)
        detail_rows = sort_detail_rows(detail_rows, "dyn", True)
        public_rows = [
            public_source_drop_row(detail_row, item_art)
            for detail_row in detail_rows[:MAX_SOURCE_DETAIL_ROWS]
        ]
        pages = [
            public_rows[offset:offset + SOURCE_DETAIL_PAGE_SIZE]
            for offset in range(0, len(public_rows), SOURCE_DETAIL_PAGE_SIZE)
        ] or [[]]
        detail_stem = row["detailPath"][:-5] if row["detailPath"].endswith(".json") else row["detailPath"]
        page_paths = [
            f"{detail_stem}-page-{page_number}.json"
            for page_number in range(2, len(pages) + 1)
        ]
        locations = index.locations_for_source(source, kind)
        payload = {
            "dataVersion": DATA_VERSION,
            "type": "source",
            "source": source,
            "sourceKind": kind,
            "sourceValues": row.get("sourceValues", source_scope),
            "total": len(detail_rows),
            "scenarios": source_pair_summary(base_rows, index),
            "spawnLocationCount": len(locations),
            "spawnLocations": index.compact_locations(locations, 160),
            "rowsLimited": len(pages[0]),
            "rowsExported": len(public_rows),
            "nextPage": page_paths[0] if page_paths else None,
            "rows": pages[0],
        }
        write_json(output_path_for_public_data(output_dir, row["detailPath"]), payload)
        for page_index, page_rows in enumerate(pages[1:]):
            page_path = page_paths[page_index]
            next_page = page_paths[page_index + 1] if page_index + 1 < len(page_paths) else None
            write_json(
                output_path_for_public_data(output_dir, page_path),
                {
                    "dataVersion": DATA_VERSION,
                    "rows": page_rows,
                    "nextPage": next_page,
                },
            )


def export_item_details(output_dir: Path, state: AppState, items: list[dict]) -> None:
    index, result, luck = state.current_data()
    if not index:
        return

    for row in items:
        asset = row["itemAsset"]
        params = {
            "asset": [asset],
            "item": [""],
            "source": [""],
            "map": ["All"],
            "diff": ["All"],
            "rarity": ["All"],
            "category": ["All"],
        }
        base_rows = filter_item_source_rows(index, params)
        source_rows = item_source_summary(merge_amount_roll_rows(rows_with_luck(base_rows, result, luck)), index)
        source_rows = sort_item_source_rows(source_rows, "chance", True)
        payload = {
            "dataVersion": DATA_VERSION,
            "type": "item",
            "item": {
                "item": row["item"],
                "itemAsset": row["itemAsset"],
                "rarity": row["rarity"],
                "category": row["category"],
                "maps": row["maps"],
                "diffs": row["diffs"],
                "sourceCount": row["sourceCount"],
                "art": public_art(row.get("art")),
                "iconUrl": row.get("iconUrl"),
            },
            "total": len(source_rows),
            "rows": [
                public_item_source_row(
                    source_row,
                    best_item_source_row(base_rows, source_row),
                    item_source_scenario_bests(base_rows, source_row, index),
                )
                for source_row in source_rows
            ],
        }
        write_json(output_path_for_public_data(output_dir, row["detailPath"]), payload)


def build_indexes(output_dir: Path, state: AppState) -> tuple[list[dict], list[dict], dict]:
    index, result, luck = state.current_data()
    if not index or not result:
        raise RuntimeError("No scan cache loaded. Run the scanner and save loot_spawn_cache.pkl.gz first.")

    items = []
    for summary in index.item_summaries:
        row = compact_row(summary)
        row["detailPath"] = f"/data/details/items/{slug_for(row['itemAsset'], row['item'])}"
        items.append(attach_luck_model(row, best_item_row(index, row)))
    items.sort(key=lambda row: (-float(row.get("dynAtLeastOneValue") or 0), row["item"].lower()))

    sources = []
    for summary in index.source_summaries:
        row = dict(summary)
        row.pop("spawnLocations", None)
        row["detailPath"] = f"/data/details/sources/{slug_for(row['sourceKind'], row['source'])}"
        sources.append(attach_luck_model(row, best_source_row(index, row)))
    sources.sort(key=lambda row: (-float(row.get("bestDynValue") or 0), row["source"].lower(), row["sourceKind"].lower()))

    stats = dict(result.stats)
    stats.pop("generated_root", None)
    stats["rows"] = len(index.rows)
    stats["items"] = len(items)
    stats["sources"] = len(sources)
    stats["module_spawn_locations"] = len(index.spawn_locations)
    stats["luck"] = int(luck)

    manifest = {
        "name": "DarkLoot",
        "domain": "darkloot.net",
        "dataVersion": DATA_VERSION,
        "appVersion": APP_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "luck": int(luck),
        "counts": {
            "rows": len(index.rows),
            "items": len(items),
            "sources": len(sources),
            "sourceDetailFiles": len(sources),
            "itemDetailFiles": len(items),
        },
        "filters": {
            "maps": index.maps,
            "diffs": index.diffs,
            "categories": index.categories,
            "rarities": index.rarities,
        },
        "files": {
            "items": "/data/items-index.json",
            "sources": "/data/sources-index.json",
            "rates": "/data/rates.json",
            "kit": "/data/kit-builder.json",
        },
        "stats": stats,
    }
    return items, sources, manifest


def export_website_data(cache_path: Path, output_dir: Path, root: Path, luck: int) -> dict:
    state = AppState(root.resolve(), luck, cache_path=cache_path)
    if not state.load_cache(cache_path):
        raise RuntimeError(f"Could not load scan cache: {cache_path}")
    with state.lock:
        state.luck = int(luck)

    output_dir.mkdir(parents=True, exist_ok=True)
    reset_generated_details(output_dir)
    items, sources, manifest = build_indexes(output_dir, state)
    _index, result, _luck = state.current_data()
    if not result:
        raise RuntimeError("No scan result available after loading cache.")

    generated_root = Path(result.stats.get("generated_root") or "")
    item_art = load_item_art(generated_root, output_dir) if generated_root.exists() else {}
    apply_item_art(items, item_art)
    write_json(
        output_dir / "items-index.json",
        {"dataVersion": DATA_VERSION, "rows": [public_item_index_row(row) for row in items]},
    )
    write_json(output_dir / "sources-index.json", {"dataVersion": DATA_VERSION, "rows": sources})
    write_json(output_dir / "rates.json", {"dataVersion": DATA_VERSION, "rows": result.rate_weights})
    if generated_root.exists():
        kit_builder = build_kit_builder_data(generated_root, output_dir, items, item_art)
    else:
        kit_builder = {
            "dataVersion": DATA_VERSION,
            "items": [],
            "secondaryPools": {},
            "curveTables": {},
            "characters": [],
            "characterSkins": [],
            "perks": [],
        }
    manifest["counts"]["kitItems"] = len(kit_builder.get("items") or [])
    manifest["counts"]["kitCharacters"] = len(kit_builder.get("characters") or [])
    manifest["counts"]["kitCharacterSkins"] = len(kit_builder.get("characterSkins") or [])
    manifest["counts"]["kitPerks"] = len(kit_builder.get("perks") or [])
    manifest["counts"]["itemArt"] = len(item_art)
    write_json(output_dir / "kit-builder.json", kit_builder)
    export_source_details(output_dir, state, sources, item_art)
    export_item_details(output_dir, state, items)
    write_json(output_dir / "manifest.json", manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Export DarkLoot static website data from the saved scan cache.")
    parser.add_argument("--cache", type=Path, default=Path("loot_spawn_cache.pkl.gz"), help="Saved scanner cache to export.")
    parser.add_argument("--output", type=Path, default=Path("website/public/data"), help="Website data output directory.")
    parser.add_argument("--root", type=Path, default=Path("."), help="Export root used for module spawn lookup.")
    parser.add_argument("--luck", type=int, default=0, help="Luck value represented in exported chance columns.")
    args = parser.parse_args()

    manifest = export_website_data(args.cache, args.output, args.root, args.luck)
    counts = manifest["counts"]
    print(
        "Exported DarkLoot website data: "
        f"{counts['items']} items, {counts['sources']} sources, {counts['rows']} raw rows."
    )
    print(f"Output: {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
