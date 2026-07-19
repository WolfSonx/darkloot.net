import assert from "node:assert/strict";
import test from "node:test";

import { createKitShareCodec } from "../src/kit-share.js";

function codecFixture() {
  const sword = {
    asset: "Sword",
    slot: { id: "Primary" },
    primary: [{ propertyId: "damage", min: 10, max: 12 }],
    secondaryPoolIds: ["weapon"],
  };
  const armor = {
    asset: "Armor",
    slot: { id: "Chest" },
    primary: [],
    secondaryPoolIds: [],
  };
  const options = [{ propertyId: "strength", min: 1, max: 3 }];
  const state = {
    kit: {
      items: [sword, armor],
      itemByAsset: new Map([[sword.asset, sword], [armor.asset, armor]]),
      characters: [{ id: "Fighter" }],
      characterSkins: [{ id: "Elf" }],
      perks: [{ id: "WeaponMastery" }],
    },
  };
  return createKitShareCodec({
    slots: [
      { id: "weapon1Primary", accepts: ["Primary"] },
      { id: "chest", accepts: ["Chest"] },
    ],
    state,
    itemSlotId: (item) => item.slot.id,
    defaultPrimaryValuesForItem: (item) => (item?.primary || []).map((entry) => entry.max),
    clampStatEntryValue: (entry, value) => Math.max(entry.min, Math.min(entry.max, Number(value))),
    secondaryOptionsForItem: () => options,
    secondaryOptionForItem: (_item, _pool, id) => options.find((option) => option.propertyId === id),
    defaultBonusesForItem: () => [],
    normalizeSavedKit: (kit) => kit,
    defaultSavedKitName: () => "Shared Kit",
  });
}

test("kit share codec round-trips active builder state", () => {
  const codec = codecFixture();
  const encoded = codec.encode({
    characterId: "Fighter",
    selectedSlot: "chest",
    activeWeaponSet: "2",
    skinId: "Elf",
    equipped: { weapon1Primary: "Sword", chest: "Armor" },
    primaryValues: { weapon1Primary: [11] },
    bonuses: { weapon1Primary: [{ poolId: "weapon", propertyId: "strength", value: 2 }] },
    perks: ["WeaponMastery"],
  });
  const decoded = codec.decode(encoded);

  assert.ok(encoded.startsWith("~"));
  assert.equal(decoded.characterId, "Fighter");
  assert.equal(decoded.activeWeaponSet, "2");
  assert.equal(decoded.selectedSlot, "chest");
  assert.equal(decoded.equipped.weapon1Primary, "Sword");
  assert.equal(decoded.primaryValues.weapon1Primary[0], 11);
  assert.equal(decoded.bonuses.weapon1Primary[0].value, 2);
  assert.deepEqual(decoded.perks, ["WeaponMastery"]);
  assert.equal(decoded.skinId, "Elf");
});
