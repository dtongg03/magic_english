import fs from 'node:fs/promises';
import path from 'node:path';

const JSON_EXT = '.json';

export class DbManager {
  #dir;
  constructor(baseDir) {
    if (!baseDir) throw new Error('DbManager requires baseDir.');
    this.#dir = baseDir;
  }

  setBaseDir(baseDir) {
    if (!baseDir) throw new Error('baseDir is required.');
    this.#dir = baseDir;
  }

  #sanitizeName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('Name must not be empty.');
    if (/[\\/:*?"<>|]/.test(trimmed)) throw new Error('Name contains invalid characters.');
    return trimmed.endsWith(JSON_EXT) ? trimmed : trimmed + JSON_EXT;
  }

  async list() {
    await fs.mkdir(this.#dir, { recursive: true });
    const files = await fs.readdir(this.#dir, { withFileTypes: true });
    return files
      .filter((f) => f.isFile() && f.name.toLowerCase().endsWith(JSON_EXT))
      .map((f) => f.name);
  }

  async create(name) {
    const filename = this.#sanitizeName(name);
    const full = path.join(this.#dir, filename);
    try {
      await fs.access(full);
      throw new Error('File already exists.');
    } catch {
      // not exists
    }
    await fs.writeFile(full, '[]', 'utf-8');
    return filename;
  }

  async remove(name) {
    const filename = this.#sanitizeName(name);
    const full = path.join(this.#dir, filename);
    await fs.unlink(full);
    return true;
  }

  async rename(oldName, newName) {
    const src = this.#sanitizeName(oldName);
    const dst = this.#sanitizeName(newName);
    const from = path.join(this.#dir, src);
    const to = path.join(this.#dir, dst);
    if (from === to) return dst;
    await fs.rename(from, to);
    return dst;
  }
}

