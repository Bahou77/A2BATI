import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.join(projectRoot, 'public', 'photos');
const outputDirectory = path.join(projectRoot, 'public', 'gallery');
const thumbsDirectory = path.join(outputDirectory, 'thumbs');
const fullDirectory = path.join(outputDirectory, 'full');
const manifestPath = path.join(outputDirectory, 'gallery.json');
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
// Noms issus d'un appareil photo (IMG_2024..., 10, DSC0001) : pas de légende utile.
const genericName = /^(img|dsc|dscn|pxl|photo|image)?[\s_-]*[\d\s_-]+(\(\d+\))?$/i;

async function findPhotos(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findPhotos(absolutePath));
    } else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function isUpToDate(outputPath, sourceTime) {
  try {
    return (await stat(outputPath)).mtimeMs >= sourceTime;
  } catch {
    return false;
  }
}

async function removeOrphans(directory, keptNames) {
  for (const name of await readdir(directory)) {
    if (!keptNames.has(name)) {
      await rm(path.join(directory, name), { force: true });
    }
  }
}

sharp.cache(false);
await mkdir(thumbsDirectory, { recursive: true });
await mkdir(fullDirectory, { recursive: true });

const sourceFiles = (await findPhotos(sourceDirectory))
  .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
const photos = [];
const keptNames = new Set();
let converted = 0;

for (const sourceFile of sourceFiles) {
  const relativePath = path.relative(sourceDirectory, sourceFile);
  const id = relativePath.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `${id}.webp`;
  const thumbPath = path.join(thumbsDirectory, fileName);
  const fullPath = path.join(fullDirectory, fileName);

  try {
    const sourceTime = (await stat(sourceFile)).mtimeMs;
    const upToDate = await isUpToDate(thumbPath, sourceTime) && await isUpToDate(fullPath, sourceTime);

    if (!upToDate) {
      const image = () => sharp(sourceFile, { failOn: 'none' }).rotate();
      await image().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 }).toFile(thumbPath);
      await image().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 }).toFile(fullPath);
      converted += 1;
    }
  } catch (error) {
    console.warn(`Photo ignorée (illisible) : ${relativePath} — ${error.message}`);
    continue;
  }

  const baseName = path.basename(sourceFile, path.extname(sourceFile));
  photos.push({
    title: genericName.test(baseName) ? '' : baseName.replace(/[-_]+/g, ' ').trim(),
    src: `/gallery/thumbs/${fileName}`,
    full: `/gallery/full/${fileName}`
  });
  keptNames.add(fileName);
}

await removeOrphans(thumbsDirectory, keptNames);
await removeOrphans(fullDirectory, keptNames);
await writeFile(manifestPath, `${JSON.stringify(photos, null, 2)}\n`, 'utf8');
console.log(`Galerie mise à jour : ${photos.length} photo(s), ${converted} optimisée(s).`);
