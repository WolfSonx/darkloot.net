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
