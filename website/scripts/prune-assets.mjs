import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const assetsRoot = path.join(publicRoot, "assets");
const write = process.argv.includes("--write");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".txt", ".webmanifest"]);
const specialTextFiles = new Set(["_headers", "_redirects"]);

async function filesUnder(directory, skip = new Set()) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(target, skip));
    else files.push(target);
  }
  return files;
}

function publicUrl(file) {
  return `/${path.relative(publicRoot, file).split(path.sep).join("/")}`;
}

const referenced = new Set();
const sourceFiles = await filesUnder(root, new Set(["dist"]));
for (const file of sourceFiles) {
  const extension = path.extname(file).toLowerCase();
  if (!textExtensions.has(extension) && !specialTextFiles.has(path.basename(file))) continue;
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/\/assets\/[A-Za-z0-9_./-]+/g)) {
    referenced.add(match[0].toLowerCase());
  }
}

const unused = [];
for (const file of await filesUnder(assetsRoot)) {
  const url = publicUrl(file);
  if (!referenced.has(url.toLowerCase())) unused.push({ file, url, bytes: (await stat(file)).size });
}

if (write) {
  for (const { file } of unused) {
    const relative = path.relative(assetsRoot, path.resolve(file));
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Refusing to remove asset outside ${assetsRoot}`);
    await rm(file);
  }
}

const bytes = unused.reduce((total, entry) => total + entry.bytes, 0);
console.log(`${write ? "Removed" : "Found"} ${unused.length.toLocaleString()} unused assets (${(bytes / 1024 / 1024).toFixed(2)} MB).`);
if (!write && unused.length) process.exitCode = 1;
