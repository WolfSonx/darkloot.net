import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { escapeHtml } from "../src/core.js";
import { detailSlug } from "../src/router.js";
import { minifyCss } from "./css.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const server = path.join(dist, "server");

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });
await cp(path.join(root, "index.html"), path.join(client, "index.html"));
await cp(path.join(root, "public"), client, { recursive: true });

const sourceDir = path.join(root, "src");
const clientSourceDir = path.join(client, "src");
await mkdir(clientSourceDir, { recursive: true });
for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
  if (entry.isFile() && path.extname(entry.name) === ".js") {
    await cp(path.join(sourceDir, entry.name), path.join(clientSourceDir, entry.name));
  }
}
const css = await Promise.all([
  readFile(path.join(sourceDir, "styles.css"), "utf8"),
  readFile(path.join(sourceDir, "modern.css"), "utf8"),
]);
await writeFile(path.join(clientSourceDir, "app.css"), minifyCss(css.join("\n")));

const template = await readFile(path.join(root, "index.html"), "utf8");
const items = JSON.parse(await readFile(path.join(root, "public", "data", "items-index.json"), "utf8")).rows || [];
const sources = JSON.parse(await readFile(path.join(root, "public", "data", "sources-index.json"), "utf8")).rows || [];
const sitemapUrls = ["https://darkloot.net/"];

function routeHtml({ title, description, url }) {
  const summary = `<article class="seo-route-summary"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><a href="${escapeHtml(url)}">Open in DarkLoot</a></article>`;
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)} | DarkLoot</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeHtml(url)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(title)} | DarkLoot">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeHtml(url)}">`)
    .replace("<body>", `<body>${summary}`);
}

async function writeRoute(type, row, title, description) {
  const slug = detailSlug(row.detailPath);
  if (!slug) return "";
  const relative = `/${type}/${encodeURIComponent(slug)}/`;
  const url = `https://darkloot.net${relative}`;
  const outputDir = path.join(client, type, slug);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "index.html"), routeHtml({ title, description, url }));
  return url;
}

async function writeRoutes(routes, concurrency = 64) {
  for (let index = 0; index < routes.length; index += concurrency) {
    const urls = await Promise.all(routes.slice(index, index + concurrency).map((route) => writeRoute(...route)));
    sitemapUrls.push(...urls.filter(Boolean));
  }
}

const routes = [
  ...items.map((item) => {
    const maps = (item.maps || []).slice(0, 4).join(", ");
    return ["items", item, item.item, `${item.item} (${item.rarity}) drop sources${maps ? ` across ${maps}` : ""}.`];
  }),
  ...sources.map((source) => {
    const maps = (source.mapValues || source.maps || []).slice(0, 4).join(", ");
    return ["sources", source, source.source, `${source.source} ${source.sourceKind} loot table${maps ? ` across ${maps}` : ""}.`];
  }),
];
await writeRoutes(routes);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.join(client, "sitemap.xml"), sitemap);

const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (!acceptsHtml) return response;
    const fallback = new URL("/index.html", request.url);
    return env.ASSETS.fetch(new Request(fallback, request));
  },
};
`;
await writeFile(path.join(server, "index.js"), worker);

console.log(`Built DarkLoot static site at ${dist}`);
