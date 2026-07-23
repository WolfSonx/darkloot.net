import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const kit = JSON.parse(
  await readFile(new URL("../public/data/kit-builder.json", import.meta.url), "utf8"),
);

test("Ifrit skin exports its assigned attribute changes", () => {
  const ifrit = kit.characterSkins.find(
    (skin) => skin.id === "Id_ActorStatusEffect_CharacterSkin_Ifrit",
  );

  assert.ok(ifrit);
  assert.deepEqual(
    Object.fromEntries(ifrit.stats.map((entry) => [entry.statKey, entry.value])),
    {
      Strength: 1,
      Vigor: 1,
      Agility: -1,
      Dexterity: -1,
    },
  );
});
