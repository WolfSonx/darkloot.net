const PREFIX = "~";
const FLAGS = {
  character: 1,
  weaponSet2: 2,
  selectedSlot: 4,
  skin: 8,
  equipped: 16,
  primary: 32,
  bonuses: 64,
  perks: 128,
};

function encodeBase64Url(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function writeVarint(bytes, value) {
  let next = Math.max(0, Math.floor(Number(value) || 0));
  while (next >= 0x80) {
    bytes.push((next & 0x7f) | 0x80);
    next = Math.floor(next / 0x80);
  }
  bytes.push(next);
}

function readVarint(reader) {
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

function writeSigned(bytes, value) {
  const next = Math.round(Number(value) || 0);
  writeVarint(bytes, next < 0 ? ((Math.abs(next) * 2) - 1) : next * 2);
}

function readSigned(reader) {
  const value = readVarint(reader);
  return value % 2 ? -((value + 1) / 2) : value / 2;
}

export function createKitShareCodec(context) {
  const {
    slots,
    state,
    itemSlotId,
    defaultPrimaryValuesForItem,
    clampStatEntryValue,
    secondaryOptionsForItem,
    secondaryOptionForItem,
    defaultBonusesForItem,
    normalizeSavedKit,
    defaultSavedKitName,
  } = context;

  const slotIndex = (slotId) => Math.max(0, slots.findIndex((slot) => slot.id === slotId));
  const slotId = (value) => Number.isInteger(value) ? slots[value]?.id || "" : String(value || "");
  const scale = (value) => Math.round(Number(value || 0) * 10);
  const unscale = (value) => value / 10;

  function dictionary() {
    const slotItemIds = new Map();
    const slotItemIndexById = new Map();
    slots.forEach((slot) => {
      const items = state.kit.items
        .filter((item) => slot.accepts.includes(itemSlotId(item)))
        .map((item) => item.asset);
      slotItemIds.set(slot.id, items);
      slotItemIndexById.set(slot.id, new Map(items.map((asset, index) => [asset, index])));
    });
    return {
      slotItemIds,
      slotItemIndexById,
      characterIds: state.kit.characters.map((character) => character.id),
      characterIndexById: new Map(state.kit.characters.map((character, index) => [character.id, index])),
      perkIds: state.kit.perks.map((perk) => perk.id),
      perkIndexById: new Map(state.kit.perks.map((perk, index) => [perk.id, index])),
      skinIds: state.kit.characterSkins.map((skin) => skin.id),
      skinIndexById: new Map(state.kit.characterSkins.map((skin, index) => [skin.id, index])),
    };
  }

  function encode(kit) {
    const dict = dictionary();
    const characterIndex = (dict.characterIndexById.get(kit.characterId) ?? -1) + 1;
    const selectedSlotIndex = slotIndex(kit.selectedSlot);
    const skinIndex = (dict.skinIndexById.get(kit.skinId) ?? -1) + 1;
    const equippedRows = slots
      .map((slot, index) => {
        const itemIndex = dict.slotItemIndexById.get(slot.id)?.get(kit.equipped?.[slot.id]);
        return Number.isInteger(itemIndex) ? [index, itemIndex] : null;
      })
      .filter(Boolean);

    const primaryRows = [];
    Object.entries(kit.primaryValues || {}).forEach(([slot, values]) => {
      const item = state.kit.itemByAsset.get(kit.equipped?.[slot]);
      const defaults = defaultPrimaryValuesForItem(item);
      if (!item || !Array.isArray(values)) return;
      values.forEach((value, index) => {
        const entry = item.primary?.[index];
        if (!entry) return;
        const selected = clampStatEntryValue(entry, value);
        if (Math.abs(Number(selected) - Number(defaults[index])) < 0.0001) return;
        primaryRows.push([slotIndex(slot), index, scale(selected)]);
      });
    });

    const bonusRows = [];
    Object.entries(kit.bonuses || {}).forEach(([slot, entries]) => {
      const item = state.kit.itemByAsset.get(kit.equipped?.[slot]);
      if (!item || !Array.isArray(entries)) return;
      entries.forEach((entry, index) => {
        if (!entry?.propertyId) return;
        const poolId = entry.poolId || item.secondaryPoolIds?.[index];
        const options = secondaryOptionsForItem(item, poolId);
        const optionIndex = options.findIndex((option) => option.propertyId === entry.propertyId);
        if (optionIndex < 0) return;
        const option = secondaryOptionForItem(item, poolId, entry.propertyId);
        const defaultValue = Number(option?.max ?? option?.min ?? 0);
        const selected = entry.value === "" || entry.value == null
          ? defaultValue
          : clampStatEntryValue(option, entry.value);
        const changed = Number.isFinite(selected) && Math.abs(selected - defaultValue) > 0.0001;
        bonusRows.push([slotIndex(slot), index, optionIndex, changed ? scale(selected) : null]);
      });
    });

    const perkRows = (Array.isArray(kit.perks) ? kit.perks : [])
      .map((perkId) => dict.perkIndexById.get(perkId))
      .filter(Number.isInteger);

    let flags = 0;
    if (characterIndex > 0) flags |= FLAGS.character;
    if (kit.activeWeaponSet === "2") flags |= FLAGS.weaponSet2;
    if (selectedSlotIndex > 0) flags |= FLAGS.selectedSlot;
    if (skinIndex > 0) flags |= FLAGS.skin;
    if (equippedRows.length) flags |= FLAGS.equipped;
    if (primaryRows.length) flags |= FLAGS.primary;
    if (bonusRows.length) flags |= FLAGS.bonuses;
    if (perkRows.length) flags |= FLAGS.perks;

    const bytes = [flags];
    if (flags & FLAGS.character) writeVarint(bytes, characterIndex);
    if (flags & FLAGS.selectedSlot) writeVarint(bytes, selectedSlotIndex);
    if (flags & FLAGS.skin) writeVarint(bytes, skinIndex);

    const writeRows = (flag, rows, writeRow) => {
      if (!(flags & flag)) return;
      writeVarint(bytes, rows.length);
      rows.forEach(writeRow);
    };
    writeRows(FLAGS.equipped, equippedRows, ([slot, item]) => {
      writeVarint(bytes, slot);
      writeVarint(bytes, item + 1);
    });
    writeRows(FLAGS.primary, primaryRows, ([slot, index, value]) => {
      writeVarint(bytes, slot);
      writeVarint(bytes, index);
      writeSigned(bytes, value);
    });
    writeRows(FLAGS.bonuses, bonusRows, ([slot, index, option, value]) => {
      writeVarint(bytes, slot);
      writeVarint(bytes, index);
      writeVarint(bytes, (option * 2) + (value == null ? 0 : 1));
      if (value != null) writeSigned(bytes, value);
    });
    writeRows(FLAGS.perks, perkRows, (index) => writeVarint(bytes, index + 1));
    return `${PREFIX}${encodeBase64Url(Uint8Array.from(bytes))}`;
  }

  function decode(value) {
    const bytes = decodeBase64Url(String(value || "").slice(PREFIX.length));
    const reader = { bytes, offset: 1 };
    const dict = dictionary();
    const flags = bytes[0] || 0;
    const characterId = (flags & FLAGS.character) ? dict.characterIds[readVarint(reader) - 1] || "" : "";
    const activeWeaponSet = (flags & FLAGS.weaponSet2) ? "2" : "1";
    const selectedSlot = (flags & FLAGS.selectedSlot) ? slotId(readVarint(reader)) || "weapon1Primary" : "weapon1Primary";
    const skinId = (flags & FLAGS.skin) ? dict.skinIds[readVarint(reader) - 1] || "" : "";
    const equipped = {};

    if (flags & FLAGS.equipped) {
      const count = readVarint(reader);
      for (let row = 0; row < count; row += 1) {
        const slot = slotId(readVarint(reader));
        const asset = dict.slotItemIds.get(slot)?.[readVarint(reader) - 1];
        if (slot && asset) equipped[slot] = asset;
      }
    }

    const primaryValues = {};
    if (flags & FLAGS.primary) {
      const count = readVarint(reader);
      for (let row = 0; row < count; row += 1) {
        const slot = slotId(readVarint(reader));
        const index = readVarint(reader);
        const item = state.kit.itemByAsset.get(equipped[slot]);
        const value = unscale(readSigned(reader));
        if (!slot || !item?.primary?.[index]) continue;
        if (!Array.isArray(primaryValues[slot])) primaryValues[slot] = defaultPrimaryValuesForItem(item);
        primaryValues[slot][index] = clampStatEntryValue(item.primary[index], value);
      }
    }

    const bonuses = {};
    if (flags & FLAGS.bonuses) {
      const count = readVarint(reader);
      for (let row = 0; row < count; row += 1) {
        const slot = slotId(readVarint(reader));
        const index = readVarint(reader);
        const optionAndFlag = readVarint(reader);
        const optionIndex = Math.floor(optionAndFlag / 2);
        const hasValue = optionAndFlag % 2 === 1;
        const item = state.kit.itemByAsset.get(equipped[slot]);
        const poolId = item?.secondaryPoolIds?.[index] || "";
        const option = secondaryOptionsForItem(item, poolId)[optionIndex] || null;
        const selected = hasValue ? clampStatEntryValue(option, unscale(readSigned(reader))) : Number(option?.max ?? option?.min ?? 0);
        if (!slot || !item || !option) continue;
        if (!Array.isArray(bonuses[slot])) bonuses[slot] = defaultBonusesForItem(item);
        bonuses[slot][index] = { poolId, propertyId: option.propertyId, value: selected };
      }
    }

    const perks = [];
    if (flags & FLAGS.perks) {
      const count = readVarint(reader);
      for (let row = 0; row < count; row += 1) {
        const perkId = dict.perkIds[readVarint(reader) - 1];
        if (perkId) perks.push(perkId);
      }
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

  return { encode, decode };
}
