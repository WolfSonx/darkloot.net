import assert from "node:assert/strict";
import test from "node:test";

import {
  clampLuck,
  escapeHtml,
  finalHealth,
  interpolateCurve,
  isTwoHandedItem,
  loreMasteryKnowledgeBonus,
  matchesSearchGroups,
  maxHealthRating,
  slotContributesStats,
  sourceKey,
  sumEquippedGearScore,
  terms,
} from "../src/core.js";
import { detailSlug, queryForState, readRoute, routePath } from "../src/router.js";

test("search terms split camel case and punctuation", () => {
  assert.deepEqual(terms("GoldKey-High Roller"), ["gold", "key", "high", "roller"]);
  assert.equal(matchesSearchGroups(["gol", "key"], [["gold", "key"]]), true);
});

test("shared helpers sanitize values", () => {
  assert.equal(escapeHtml('<a "x">'), "&lt;a &quot;x&quot;&gt;");
  assert.equal(clampLuck(800), 500);
  assert.equal(clampLuck(-20), 0);
  assert.equal(sourceKey("Mimic", "Monster"), "Monster::Mimic");
});

test("two-handed item detection follows exported hand metadata", () => {
  assert.equal(isTwoHandedItem({ hand: "TwoHanded" }), true);
  assert.equal(isTwoHandedItem({ hand: "OneHanded" }), false);
  assert.equal(isTwoHandedItem(null), false);
});

test("Lore Mastery grants Knowledge from Resourcefulness", () => {
  assert.equal(loreMasteryKnowledgeBonus(30), 15);
  assert.equal(loreMasteryKnowledgeBonus(31), 15.5);
  assert.equal(loreMasteryKnowledgeBonus("bad"), 0);
});

test("health uses the fractional Strength and Vigor rating before the class base add", () => {
  const maxHealthCurve = [[0, 70], [15, 100], [21, 110.5], [44, 145]];
  const rating = maxHealthRating(18, 15);
  assert.equal(rating, 15.75);
  assert.equal(interpolateCurve(maxHealthCurve, rating), 101.3125);
  assert.equal(finalHealth(interpolateCurve(maxHealthCurve, rating), 25, 5, 0), 133);
});

test("active weapons contribute stats while gear score includes both weapon sets", () => {
  assert.equal(slotContributesStats({ weaponSet: "1" }, "1"), true);
  assert.equal(slotContributesStats({ weaponSet: "2" }, "1"), false);
  assert.equal(slotContributesStats({ id: "chest" }, "1"), true);
  const items = new Map([
    ["fine-cuirass", { gearScore: 36 }],
    ["halberd", { gearScore: 45 }],
    ["lantern", { gearScore: 1 }],
  ]);
  assert.equal(sumEquippedGearScore({ chest: "fine-cuirass", weapon1Primary: "halberd", weapon2Secondary: "lantern" }, items), 82);
});

test("detail routes remain stable", () => {
  const row = { detailPath: "/data/details/items/gold-key-abc123.json" };
  assert.equal(detailSlug(row.detailPath), "gold-key-abc123");
  assert.equal(routePath("item", row), "/items/gold-key-abc123/");
  assert.equal(readRoute({ pathname: "/sources/mimic-123/", search: "?luck=50" }).detailType, "source");
});

test("URL query state omits defaults", () => {
  const query = queryForState({
    view: "items",
    luck: 0,
    itemSearch: "gold key",
    itemRarity: "Unique",
    itemCategory: "All",
    itemMap: "All",
    itemDiff: "High Roller",
  });
  assert.equal(query, "q=gold+key&rarity=Unique");
});
