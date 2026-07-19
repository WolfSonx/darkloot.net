export function createKitPhoto(api) {
  const {
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
  } = api;

function photoItemLines(slotId, item) {
  if (!item) return [];
  const primary = slotPrimarySummary(slotId, item, 6).map((text) => ({ text, secondary: false }));
  const special = itemSpecialEffectSummary(item).map((text) => ({ text, special: true }));
  const secondary = slotSecondarySummary(slotId, item)
    .filter((line) => !/^No secondary/i.test(line))
    .map((text) => ({ text, secondary: true }));
  return [...primary, ...special, ...secondary].slice(0, 7);
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

function photoDrawRoundRect(ctx, x, y, width, height, radius = 10) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function photoSignedStatValue(entry) {
  const value = Number(entry?.value ?? 0);
  const text = statValue(value, entry?.unit || "");
  return value > 0 ? `+${text}` : text;
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
  const lineHeight = 15;
  const headerHeight = 38;
  const height = Math.max(98, 54 + (lines.length * lineHeight));
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
  ctx.font = "21px Georgia, serif";
  ctx.fillStyle = theme.title;
  ctx.textAlign = "center";
  photoDrawWrappedText(ctx, item?.name || "Empty", x + width / 2, y + 26, width - 18, 21, 1);
  ctx.font = "12px Segoe UI, Arial";
  lines.forEach((line, index) => {
    const lineY = y + 58 + (index * lineHeight);
    ctx.fillStyle = "rgba(238, 241, 242, .88)";
    ctx.fillText("-", x + 20, lineY);
    ctx.fillText("-", x + width - 20, lineY);
    ctx.fillStyle = line.special ? "#f0c76a" : (line.secondary ? "#18bdf4" : "#f1f3f4");
    ctx.fillText(line.text, x + width / 2, lineY);
  });
  ctx.textAlign = "left";
  return height;
}

function photoDrawPerkPanel(ctx, perkEntries, x, y, width) {
  const rows = perkEntries.length ? perkEntries : [[null, null]];
  const rowHeight = 118;
  rows.slice(0, BUILDER_PERK_LIMIT).forEach(([perk, image], index) => {
    const rowY = y + (index * (rowHeight + 14));
    const title = perk?.name || "No perk selected";
    const summary = perk ? builderPerkSummary(perk) : "Pick perks in Kit Builder";
    const gradient = ctx.createLinearGradient(x, rowY, x, rowY + rowHeight);
    gradient.addColorStop(0, "rgba(88, 75, 40, .92)");
    gradient.addColorStop(1, "rgba(22, 22, 20, .94)");
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, .55)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = gradient;
    photoDrawRoundRect(ctx, x, rowY, width, rowHeight, 10);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255, 196, 58, .9)";
    ctx.lineWidth = 2;
    photoDrawRoundRect(ctx, x, rowY, width, rowHeight, 10);
    ctx.stroke();

    const iconSize = 54;
    const iconX = x + 16;
    const iconY = rowY + 17;
    ctx.fillStyle = "rgba(8, 10, 12, .76)";
    photoDrawRoundRect(ctx, iconX, iconY, iconSize, iconSize, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(220, 220, 210, .35)";
    ctx.stroke();
    if (image) ctx.drawImage(image, iconX + 5, iconY + 5, iconSize - 10, iconSize - 10);

    ctx.textAlign = "left";
    ctx.font = "700 23px Segoe UI, Arial";
    ctx.fillStyle = "#fff8d8";
    photoDrawWrappedText(ctx, title, x + 82, rowY + 38, width - 96, 24, 1);
    ctx.font = "18px Segoe UI, Arial";
    ctx.fillStyle = "#d8dde2";
    photoDrawWrappedText(ctx, summary, x + 16, rowY + 96, width - 28, 24, 2);
  });
}

function photoDrawSkinPanel(ctx, skin, image, x, y, width) {
  const stats = skin?.stats || [];
  const imageSize = image ? 142 : 0;
  const height = (skin ? 188 : 118) + (image ? imageSize + 14 : 0);
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, "rgba(58, 58, 58, .92)");
  gradient.addColorStop(.5, "rgba(28, 28, 28, .95)");
  gradient.addColorStop(1, "rgba(9, 9, 9, .96)");
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, .58)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(230, 230, 230, .62)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.beginPath();
  ctx.moveTo(x, y + 58);
  ctx.lineTo(x + width, y + 58);
  ctx.strokeStyle = "rgba(230, 230, 230, .52)";
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "24px Georgia, serif";
  ctx.fillStyle = "#f1eee9";
  photoDrawWrappedText(ctx, skin?.name || "No Skin", x + width / 2, y + 36, width - 20, 26, 1);
  ctx.font = "700 18px Segoe UI, Arial";
  if (stats.length) {
    stats.slice(0, 5).forEach((entry, index) => {
      const lineY = y + 88 + (index * 25);
      const value = Number(entry.value || 0);
      ctx.fillStyle = value >= 0 ? "#ffe35a" : "#ff7a7a";
      ctx.fillText(`${photoSignedStatValue(entry)} ${entry.label || statLabel(entry.statKey)}`, x + width / 2, lineY);
    });
  } else {
    ctx.fillStyle = "#d8dde2";
    ctx.fillText(skin ? "No skin effects" : "Select a skin in Kit Builder", x + width / 2, y + 88);
  }
  if (image) {
    const imageX = x + (width - imageSize) / 2;
    const imageY = y + height - imageSize - 10;
    ctx.fillStyle = "rgba(22, 22, 22, .72)";
    ctx.fillRect(imageX, imageY, imageSize, imageSize);
    ctx.strokeStyle = "rgba(230, 230, 230, .38)";
    ctx.lineWidth = 2;
    ctx.strokeRect(imageX, imageY, imageSize, imageSize);
    const scale = Math.min((imageSize - 12) / image.width, (imageSize - 12) / image.height);
    const iw = image.width * scale;
    const ih = image.height * scale;
    ctx.drawImage(image, imageX + (imageSize - iw) / 2, imageY + (imageSize - ih) / 2, iw, ih);
  }
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

return async function saveBuilderPhoto() {
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
    const item = displayedBuilderItem(slot.id);
    return [slot, item, await photoLoadImage(item?.iconUrl)];
  }));
  const perkEntries = await Promise.all(state.builder.perks
    .map((perkId) => state.kit.perkById.get(perkId))
    .filter(Boolean)
    .map(async (perk) => [perk, await photoLoadImage(perkIconUrl(perk))]));
  const skin = selectedBuilderSkin();
  const character = selectedBuilderCharacter();
  const skinImage = await photoLoadImage(skin?.iconUrl || character?.portraitUrl || character?.iconUrl);
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
    ["weapon1Primary", 560, 46, 236],
    ["weapon2Primary", 820, 46, 236],
    ["head", 1080, 46, 224],
    ["weapon1Secondary", 500, 232, 232],
    ["weapon2Secondary", 500, 402, 232],
    ["chest", 500, 572, 232],
    ["ring1", 500, 742, 232],
    ["hands", 736, 866, 220],
    ["legs", 974, 866, 220],
    ["feet", 1212, 866, 220],
    ["necklace", 1416, 232, 222],
    ["cloak", 1416, 402, 222],
    ["ring2", 1416, 572, 222],
  ];
  cardSlots.forEach(([slotId, x, y, w]) => {
    const item = displayedBuilderItem(slotId);
    if (item) photoDrawCard(ctx, item, builderItemOwnerSlotId(slotId), x, y, w);
  });
  photoDrawPerkPanel(ctx, perkEntries, 1648, 44, 270);
  photoDrawSkinPanel(ctx, skin, skinImage, 1698, 718, 186);
  ctx.textAlign = "center";
  ctx.font = "700 18px Segoe UI, Arial";
  ctx.fillStyle = "rgba(255, 255, 255, .72)";
  ctx.fillText("Generated by Darkloot.net", 960, 1060);

  const link = document.createElement("a");
  const name = currentBuilderKitName().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "darkloot-kit";
  link.download = `${name.toLowerCase()}-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}


}
