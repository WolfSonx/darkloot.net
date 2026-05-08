# DarkLoot Website Workflow

This project now has two parts:

- The existing Python scanner/cache builder, used privately after a Dark and Darker update.
- The static `website/` app, deployed publicly to Cloudflare Pages.

## Local Update Flow

1. Scan the current game export with the existing local tool.
2. Save `loot_spawn_cache.pkl.gz`.
3. Export static website data:

```bat
python export_website_data.py
```

If `python` is not on PATH, run it with the Python executable you use for the scanner.

4. Preview the website locally:

```bat
cd website
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

The preview server builds `website/dist/` and serves the same files Cloudflare Pages will deploy.

## Generated Website Data

The exporter writes:

```text
website/public/data/manifest.json
website/public/data/rates.json
website/public/data/items-index.json
website/public/data/sources-index.json
website/public/data/details/items/*.json
website/public/data/details/sources/*.json
```

Items and sources load first. Detailed item/source data loads only when a player opens a row.

Favorites are saved in the player's browser with `localStorage`, so no account, server database, or login is needed.

## Cloudflare Pages Setup

Use Cloudflare Pages with Git integration.

Suggested settings:

```text
Project name: darkloot
Production branch: main
Root directory: website
Build command: npm run build
Build output directory: dist
```

After the first successful deploy, add the custom domain:

```text
darkloot.net
```

In Cloudflare, go to:

```text
Workers & Pages > darkloot > Custom domains > Set up a domain
```

Use the `*.pages.dev` URL first to confirm the deploy works, then attach `darkloot.net`.

## Later Features

When quests or map pages are ready, extend `export_website_data.py` to emit only the data files the runtime loads.
