const VALID_VIEWS = new Set(["items", "sources", "builder", "favorites"]);

export function detailSlug(detailPath) {
  const file = String(detailPath || "").split("/").pop() || "";
  return file.replace(/\.json$/i, "");
}

export function routePath(type, row) {
  const slug = detailSlug(row?.detailPath);
  if (!slug) return "/";
  return `/${type === "source" ? "sources" : "items"}/${encodeURIComponent(slug)}/`;
}

export function readRoute(locationLike = window.location) {
  const params = new URLSearchParams(locationLike.search || "");
  const pathMatch = String(locationLike.pathname || "/").match(/^\/(items|sources)\/([^/]+)\/?$/i);
  const pathType = pathMatch?.[1]?.toLowerCase() === "sources" ? "source" : pathMatch ? "item" : "";
  const pathSlug = pathMatch ? decodeURIComponent(pathMatch[2]) : "";
  const requestedView = params.get("view") || (pathType === "source" ? "sources" : pathType === "item" ? "items" : "items");
  return {
    view: VALID_VIEWS.has(requestedView) ? requestedView : "items",
    luck: params.get("luck") || "",
    itemSearch: params.get("q") || "",
    itemRarity: params.get("rarity") || "All",
    itemCategory: params.get("category") || "All",
    itemMap: params.get("map") || "All",
    itemDiff: params.get("difficulty") || "High Roller",
    sourceSearch: params.get("sourceQuery") || "",
    sourceMap: params.get("sourceMap") || "All",
    sourceDiff: params.get("sourceDifficulty") || "High Roller",
    sourceKind: params.get("kind") || "All",
    detailType: pathType || (params.has("item") ? "item" : params.has("source") ? "source" : ""),
    detailKey: pathSlug || params.get("item") || params.get("source") || "",
  };
}

export function queryForState(route) {
  const params = new URLSearchParams();
  if (route.view && route.view !== "items") params.set("view", route.view);
  if (Number(route.luck) > 0) params.set("luck", String(route.luck));
  if (route.view === "items") {
    if (route.itemSearch) params.set("q", route.itemSearch);
    if (route.itemRarity && route.itemRarity !== "All") params.set("rarity", route.itemRarity);
    if (route.itemCategory && route.itemCategory !== "All") params.set("category", route.itemCategory);
    if (route.itemMap && route.itemMap !== "All") params.set("map", route.itemMap);
    if (route.itemDiff && route.itemDiff !== "High Roller") params.set("difficulty", route.itemDiff);
  }
  if (route.view === "sources") {
    if (route.sourceSearch) params.set("sourceQuery", route.sourceSearch);
    if (route.sourceMap && route.sourceMap !== "All") params.set("sourceMap", route.sourceMap);
    if (route.sourceDiff && route.sourceDiff !== "High Roller") params.set("sourceDifficulty", route.sourceDiff);
    if (route.sourceKind && route.sourceKind !== "All") params.set("kind", route.sourceKind);
  }
  return params.toString();
}

export function urlForState(route, detail = null) {
  const path = detail ? routePath(detail.type, detail.row) : "/";
  const query = queryForState(route);
  return `${path}${query ? `?${query}` : ""}`;
}
