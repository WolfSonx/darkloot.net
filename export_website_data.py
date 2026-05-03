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
    rows_with_luck,
    scan_luck,
    sort_detail_rows,
    sort_item_source_rows,
    source_pair_summary,
)


DATA_VERSION = 1
MAX_SOURCE_DETAIL_ROWS = 2000


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


def public_item_source_row(row: dict) -> dict:
    cleaned = dict(row)
    cleaned.pop("spawnLocations", None)
    return cleaned


def public_source_drop_row(row: dict) -> dict:
    compact = compact_row(row)
    return {
        "item": compact["item"],
        "itemAsset": compact["itemAsset"],
        "rarity": compact["rarity"],
        "category": compact["category"],
        "map": compact["map"],
        "diff": compact["diff"],
        "grade": compact["grade"],
        "itemCount": compact["itemCount"],
        "rolls": compact["rolls"],
        "dynAtLeastOne": compact["dynAtLeastOne"],
        "dynAtLeastOneValue": compact["dynAtLeastOneValue"],
        "lootTable": compact["lootTable"],
        "rateTable": compact["rateTable"],
    }


def export_source_details(output_dir: Path, state: AppState, sources: list[dict]) -> None:
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
        detail_rows = detail_summary(rows_with_luck(base_rows, result, luck), index, source_scope)
        detail_rows = sort_detail_rows(detail_rows, "dyn", True)
        public_rows = detail_rows[:MAX_SOURCE_DETAIL_ROWS]
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
            "rowsLimited": len(public_rows),
            "rows": [public_source_drop_row(detail_row) for detail_row in public_rows],
        }
        write_json(output_path_for_public_data(output_dir, row["detailPath"]), payload)


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
        source_rows = item_source_summary(rows_with_luck(base_rows, result, luck), index)
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
            },
            "total": len(source_rows),
            "rows": [public_item_source_row(source_row) for source_row in source_rows],
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
        items.append(row)
    items.sort(key=lambda row: (-float(row.get("dynAtLeastOneValue") or 0), row["item"].lower()))

    sources = []
    for summary in index.source_summaries:
        row = dict(summary)
        row.pop("spawnLocations", None)
        row["detailPath"] = f"/data/details/sources/{slug_for(row['sourceKind'], row['source'])}"
        sources.append(row)
    sources.sort(key=lambda row: (-float(row.get("bestDynValue") or 0), row["source"].lower(), row["sourceKind"].lower()))

    stats = dict(result.stats)
    stats["rows"] = len(index.rows)
    stats["items"] = len(items)
    stats["sources"] = len(sources)
    stats["module_spawn_locations"] = len(index.spawn_locations)

    manifest = {
        "name": "DarkLoot",
        "domain": "darkloot.net",
        "dataVersion": DATA_VERSION,
        "appVersion": APP_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "luck": int(luck or scan_luck(result)),
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
            "quests": "/data/quests.json",
            "maps": "/data/maps.json",
        },
        "stats": stats,
    }
    return items, sources, manifest


def export_website_data(cache_path: Path, output_dir: Path, root: Path, luck: int) -> dict:
    state = AppState(root.resolve(), luck, cache_path=cache_path)
    if not state.load_cache(cache_path):
        raise RuntimeError(f"Could not load scan cache: {cache_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    reset_generated_details(output_dir)
    items, sources, manifest = build_indexes(output_dir, state)

    write_json(output_dir / "items-index.json", {"dataVersion": DATA_VERSION, "rows": items})
    write_json(output_dir / "sources-index.json", {"dataVersion": DATA_VERSION, "rows": sources})
    write_json(output_dir / "quests.json", {"dataVersion": DATA_VERSION, "rows": []})
    write_json(output_dir / "maps.json", {"dataVersion": DATA_VERSION, "rows": []})
    export_source_details(output_dir, state, sources)
    export_item_details(output_dir, state, items)
    write_json(output_dir / "manifest.json", manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Export DarkLoot static website data from the saved scan cache.")
    parser.add_argument("--cache", type=Path, default=Path("loot_spawn_cache.pkl.gz"), help="Saved scanner cache to export.")
    parser.add_argument("--output", type=Path, default=Path("website/public/data"), help="Website data output directory.")
    parser.add_argument("--root", type=Path, default=Path("."), help="Export root used for module spawn lookup.")
    parser.add_argument("--luck", type=int, default=500, help="Luck value represented in exported chance columns.")
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
