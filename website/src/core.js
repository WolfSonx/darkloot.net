const TERMS_CACHE_LIMIT = 6000;
const termsCache = new Map();

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function terms(value) {
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

export function buildSearchIndex(rows, groupFn) {
  return new Map(rows.map((row) => [row, searchGroupTokens(groupFn(row))]));
}

function matchesSearchParts(parts, haystack) {
  return parts.every((part) => haystack.some((textPart) => textPart.startsWith(part)));
}

export function matchesSearchGroups(parts, groups) {
  if (!parts.length) return true;
  return (groups || []).some((group) => matchesSearchParts(parts, group));
}

export function sourceKey(source, kind) {
  return `${kind}::${source}`;
}

export function clampLuck(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(500, parsed));
}

export function isTwoHandedItem(item) {
  return String(item?.hand || "").toLowerCase() === "twohanded";
}

export function loreMasteryKnowledgeBonus(resourcefulness, ratio = 0.5) {
  const value = Number(resourcefulness || 0);
  const multiplier = Number(ratio);
  if (!Number.isFinite(value) || !Number.isFinite(multiplier)) return 0;
  return value * multiplier;
}

export function interpolateCurve(keys, input, fallback = 0) {
  const points = Array.isArray(keys) ? keys : [];
  const x = Number(input || 0);
  if (!points.length || !Number.isFinite(x)) return fallback;
  if (x <= Number(points[0][0])) return Number(points[0][1] || 0);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    const x1 = Number(previous[0]);
    const y1 = Number(previous[1]);
    const x2 = Number(next[0]);
    const y2 = Number(next[1]);
    if (x <= x2) {
      if (Math.abs(x2 - x1) < 0.0001) return y2;
      return y1 + ((y2 - y1) * ((x - x1) / (x2 - x1)));
    }
  }
  return Number(points[points.length - 1][1] || 0);
}

export function maxHealthRating(strength, vigor) {
  return (Number(strength || 0) * 0.25) + (Number(vigor || 0) * 0.75);
}

export function finalHealth(curveBaseHealth, baseHealthAdd = 0, maxHealthBonus = 0, maxHealthAdd = 0) {
  const baseHealth = Number(curveBaseHealth || 0) + Number(baseHealthAdd || 0);
  return Math.ceil((baseHealth * (1 + (Number(maxHealthBonus || 0) / 100))) + Number(maxHealthAdd || 0));
}

export function slotContributesStats(slot, activeWeaponSet = "1") {
  return !slot?.weaponSet || String(slot.weaponSet) === String(activeWeaponSet || "1");
}

export function sumEquippedGearScore(equipped, itemByAsset) {
  return Object.values(equipped || {})
    .map((asset) => Number(itemByAsset?.get(asset)?.gearScore || 0))
    .reduce((sum, value) => sum + value, 0);
}
