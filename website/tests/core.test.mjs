import assert from "node:assert/strict";
import test from "node:test";

import { clampLuck, escapeHtml, isTwoHandedItem, loreMasteryKnowledgeBonus, matchesSearchGroups, sourceKey, terms } from "../src/core.js";
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
