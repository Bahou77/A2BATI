import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photosDirectory = path.join(projectRoot, 'public', 'photos');
const manifestPath = path.join(photosDirectory, 'gallery.json');
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

async function readPhotos(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const photos = [];

  for (const entry of entries) {
    if (entry.name === 'gallery.json') {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      photos.push(...await readPhotos(absolutePath));
      continue;
    }

    if (!entry.isFile() || !imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    const relativePath = path.relative(photosDirectory, absolutePath).split(path.sep);
    photos.push({
      title: path.basename(entry.name, path.extname(entry.name)).replace(/[-_]+/g, ' ').trim(),
      src: `/photos/${relativePath.map(encodeURIComponent).join('/')}`
    });
  }

  return photos;
}

const photos = await readPhotos(photosDirectory);
await writeFile(manifestPath, `${JSON.stringify(photos, null, 2)}\n`, 'utf8');
console.log(`Galerie mise à jour : ${photos.length} photo(s).`);
