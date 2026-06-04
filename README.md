# DarkLoot

DarkLoot is a static browser app for searching Dark and Darker loot drops, source tables, map filters, item art, and kit stats.

The current app lives in `website/` and builds to static files in `website/dist/`. There is no local Python scanner UI in this source tree.

## Quick Start

From the repository root:

```bat
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Build

From the repository root:

```bat
npm run build
```

The generated site is written to:

```text
website/dist/
```

You can also run the same commands from inside `website/`.

## Cloudflare Pages

Suggested Cloudflare Pages settings:

```text
Project name: darkloot
Production branch: main
Root directory: website
Build command: npm run build
Build output directory: dist
```

After the first successful deploy, attach the custom domain:

```text
darkloot.net
```

## Project Layout

```text
website/index.html          App shell and metadata
website/src/main.js         Runtime UI and client-side logic
website/src/styles.css      App styling
website/public/assets/      Icons and visual assets
website/public/data/        Static generated loot data
website/scripts/build.mjs   Static build script
website/scripts/dev-server.mjs Local preview server
```

## Notes

- The app is static and client-side; it does not require a backend server.
- Favorites and saved kits are stored in the player's browser with `localStorage`.
- Build output, dependency folders, and local generated files are ignored by git.
