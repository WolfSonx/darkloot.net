# DungeonCrawler Loot Browser

Current app version: **1.2**

A local browser app for exploring loot tables from generated DungeonCrawler export files.

The app scans generated JSON exports, links loot groups, drop-rate tables, mobs, chests, props, items, maps, difficulties, rarities, and luck scaling into one searchable interface. It runs on your own machine at `http://127.0.0.1:8765/` and does not require a public server.

## Features

- Search mobs, chests, props, and loot sources by readable names.
- Search items across all sources, physical spawn maps, and difficulties.
- Read dungeon module files to show exact mob spawn modules and coordinates.
- Open an item to see every source that can drop it.
- Double-click or open a source, then choose the map and difficulty before viewing drops.
- Search inside a source's drop list.
- Group duplicate item results so common items do not flood the table.
- Sort tables by clicking column headers.
- Apply luck instantly to the current view without rescanning files.
- Compare a drop table against another luck value.
- Favorite sources and items.
- Save a scan cache so future launches do not need to rescan the generated files.
- Export item results and source drops to CSV.
- Build a shareable Windows EXE with the scan cache bundled inside.

## Quick Start

1. Place your exported `Content` folder beside the app files.
2. Double-click `run_loot_spawn_web.bat`.
3. Open the browser page it prints or opens automatically:

```text
http://127.0.0.1:8765/
```

4. Wait for the scan to finish.
5. Use `Mob/Chest Search` or `Item Search`.

The app auto-detects exports shaped like:

```text
Content/DungeonCrawler/Data/Generated/V2
```

For physical mob placement, it also reads:

```text
Content/DungeonCrawler/Maps/Dungeon/Modules
```

You can also paste a different export root into the `Export root` box and press `Scan`.

## Recommended Workflow

For your own use:

1. Put the generated `Content` folder beside the scripts.
2. Start the app with `run_loot_spawn_web.bat`.
3. Press `Scan + Save Cache`.
4. Next time, the app will load `loot_spawn_cache.pkl.gz` automatically.

For sharing with friends:

1. Scan the data.
2. Press `Save Scan Cache` or `Scan + Save Cache`.
3. Run `build_exe.bat`.
4. Share the generated EXE or the verified EXE folder zip from your release package.

## Requirements

- Windows
- Python 3.10 or newer, if running from source
- PyInstaller, only if building an EXE

Runtime use from source relies on Python's standard library. PyInstaller is only needed for packaging.

Install PyInstaller with:

```bat
python -m pip install pyinstaller
```

## Files

Core source files:

```text
loot_spawn_web.py
loot_spawn_analyzer.py
run_loot_spawn_web.bat
build_exe.bat
make_bundle_cache.py
README.md
.gitignore
```

Generated local files:

```text
loot_spawn_cache.pkl.gz
loot_spawn_settings.json
```

`loot_spawn_cache.pkl.gz` stores scanned loot data. `loot_spawn_settings.json` stores UI preferences and favorites.

## Building An EXE

After saving a scan cache, run:

```bat
build_exe.bat
```

If `loot_spawn_cache.pkl.gz` exists, the build script prepares a smaller bundle-safe cache and includes it in the EXE.

The normal output is:

```text
dist/DungeonCrawler Loot Browser.exe
```

If one-file EXE extraction is blocked by an antivirus, sandbox, or Windows policy, use an `onedir` PyInstaller build instead. The folder-style EXE is larger, but it is usually easier to verify and distribute reliably.

## GitHub Repository Notes

For a public source repository, commit the code and documentation, not generated game data.

Good files to commit:

```text
loot_spawn_web.py
loot_spawn_analyzer.py
run_loot_spawn_web.bat
build_exe.bat
make_bundle_cache.py
README.md
.gitignore
LICENSE
```

Do not commit:

```text
Content/
loot_spawn_cache.pkl.gz
loot_spawn_settings.json
bundle_cache/
dist/
dist_onedir/
build/
build_onedir/
*.zip
*.log
*.spec
__pycache__/
.idea/
pyi_tmp/
```

Use GitHub Releases for downloadable builds or cached packages.

## Notes

- The first scan can take 30-60 seconds on a large export.
- Luck changes reuse the loaded scan and update only the current view.
- If a new scan fails because the folder is wrong, the browser keeps the last successful results loaded.
- The app auto-loads `loot_spawn_cache.pkl.gz` on startup when it exists beside `loot_spawn_web.py`.
- A PyInstaller-built EXE can also load a cache bundled inside the EXE.
- Source maps come from dungeon module spawner placements when `Content/DungeonCrawler/Maps/Dungeon/Modules` is available. If a source cannot be matched to a module spawner, the app falls back to the exported loot-row map scope.
- Dungeon grade codes use the explicit game table: `100x = PVE`, `200x = Normal`, `300x = High Roller`, `400x = Squire`.
- Rarity codes use: `1001 = Junk`, `2001 = Common`, `3001 = Uncommon`, `4001 = Rare`, `5001 = Epic`, `6001 = Legendary`, `7001 = Unique`, `8001 = Artifact`.

## Troubleshooting

If the app opens but shows no data, confirm the selected folder contains:

```text
Content/DungeonCrawler/Data/Generated/V2
```

If search feels stale after replacing game export files, press `Scan + Save Cache` again.

If the EXE does not start, try the source launcher first:

```bat
run_loot_spawn_web.bat
```

If the source launcher works, rebuild the EXE after installing PyInstaller.
