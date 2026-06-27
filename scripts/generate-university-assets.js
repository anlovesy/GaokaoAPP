import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { universityImageCatalog } from "../src/universityImageCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const assetRoot = path.join(projectRoot, "public", "universities");

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function writeAssetIfMissing(slug) {
  const directoryPath = path.join(assetRoot, slug);
  const filePath = path.join(directoryPath, "cover.jpg");

  try {
    await fs.access(filePath);
    return { slug, status: "exists" };
  } catch {
    // continue
  }

  await ensureDirectory(directoryPath);

  const response = await fetch(`https://picsum.photos/seed/gaokao-${slug}/1600/900`);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset for ${slug}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return { slug, status: "created" };
}

async function main() {
  await ensureDirectory(assetRoot);

  const results = [];
  for (const entry of universityImageCatalog) {
    const result = await writeAssetIfMissing(entry.slug);
    results.push(result);
  }

  const created = results.filter((item) => item.status === "created").length;
  const existing = results.filter((item) => item.status === "exists").length;
  process.stdout.write(
    JSON.stringify(
      {
        total: results.length,
        created,
        existing
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
