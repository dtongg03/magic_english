import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ENCODING = 'utf-8';

export class JsonStore {
  #baseDir;
  #fileName;
  #filePath;
  #queue = Promise.resolve();

  constructor(options = {}) {
    const { baseDir, fileName = 'words.json' } = options;
    if (!baseDir) {
      throw new Error('JsonStore requires a baseDir option.');
    }
    this.#baseDir = baseDir;
    this.#fileName = fileName;
    this.#filePath = path.join(this.#baseDir, this.#fileName);
  }

  setBaseDir(baseDir) {
    if (!baseDir) {
      throw new Error('baseDir must be provided.');
    }
    this.#baseDir = baseDir;
    this.#filePath = path.join(this.#baseDir, this.#fileName);
  }

  setFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('fileName must be a non-empty string.');
    }
    this.#fileName = fileName;
    this.#filePath = path.join(this.#baseDir, this.#fileName);
  }

  async init() {
    await fs.mkdir(this.#baseDir, { recursive: true });
    try {
      await fs.access(this.#filePath);
    } catch {
      await this.#writeFile([]);
    }
  }

  async getAllWords() {
    const data = await this.#readFile();
    return data.sort((a, b) => a.word.localeCompare(b.word));
  }

  async getWordById(id) {
    const data = await this.#readFile();
    return data.find((item) => item.id === id) ?? null;
  }

  async searchWords(query) {
    const normalized = (query ?? '').trim().toLowerCase();
    if (!normalized) {
      return this.getAllWords();
    }
    const data = await this.#readFile();
    return data.filter((item) => {
      const haystack = [
        item.word,
        item.definition,
        item.wordType,
        item.cefrLevel,
        item.exampleSentence,
        item.notes,
        ...(item.tags ?? [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }

  async createWord(payload) {
    const entry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...payload
    };

    return this.#enqueue(async () => {
      const existing = await this.#readFile();
      existing.push(entry);
      await this.#writeFile(existing);
      return entry;
    });
  }

  async updateWord(id, payload) {
    return this.#enqueue(async () => {
      const existing = await this.#readFile();
      const index = existing.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error(`Word with id ${id} not found.`);
      }
      const { id: _id, createdAt: _createdAt, ...cleanPayload } = payload;
      const updated = {
        ...existing[index],
        ...cleanPayload,
        id: existing[index].id,
        createdAt: existing[index].createdAt,
        updatedAt: new Date().toISOString()
      };
      existing[index] = updated;
      await this.#writeFile(existing);
      return updated;
    });
  }

  async deleteWord(id) {
    return this.#enqueue(async () => {
      const existing = await this.#readFile();
      const filtered = existing.filter((item) => item.id !== id);
      if (filtered.length === existing.length) {
        throw new Error(`Word with id ${id} not found.`);
      }
      await this.#writeFile(filtered);
      return true;
    });
  }

  async importFromFile(filePath) {
    const raw = await fs.readFile(filePath, ENCODING);
    let incoming;
    try {
      incoming = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Unable to parse JSON: ${error}`);
    }
    if (!Array.isArray(incoming)) {
      throw new Error('Imported JSON must be an array of word objects.');
    }

    return this.#enqueue(async () => {
      const existing = await this.#readFile();
      const deduped = new Map(existing.map((item) => [item.word.toLowerCase(), item]));

      for (const item of incoming) {
        if (!item?.word) {
          continue;
        }
        const wordKey = String(item.word).toLowerCase();
        const cleanItem = {
          id: item.id ?? crypto.randomUUID(),
          word: String(item.word).trim(),
          definition: String(item.definition ?? '').trim(),
          wordType: String(item.wordType ?? item.word_type ?? '').trim(),
          cefrLevel: String(item.cefrLevel ?? item.cefr_level ?? '').trim().toUpperCase(),
          ipaPronunciation: String(item.ipaPronunciation ?? item.ipa_pronunciation ?? '').trim(),
          exampleSentence: String(item.exampleSentence ?? item.example_sentence ?? '').trim(),
          notes: String(item.notes ?? '').trim(),
          tags: Array.isArray(item.tags)
            ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
            : [],
          createdAt: item.createdAt ?? new Date().toISOString(),
          updatedAt: item.updatedAt ?? new Date().toISOString()
        };
        deduped.set(wordKey, cleanItem);
      }

      const merged = Array.from(deduped.values());
      await this.#writeFile(merged);
      return merged;
    });
  }

  async exportToFile(filePath) {
    const data = await this.#readFile();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), ENCODING);
    return { exported: data.length };
  }

  #enqueue(task) {
    const runTask = () => Promise.resolve().then(() => task());
    this.#queue = this.#queue.then(runTask, runTask);
    return this.#queue.catch((error) => {
      console.error('[JsonStore] operation failed:', error);
      this.#queue = Promise.resolve();
      throw error;
    });
  }

  async #readFile() {
    try {
      const raw = await fs.readFile(this.#filePath, ENCODING);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.#writeFile([]);
        return [];
      }
      throw error;
    }
  }

  async #writeFile(data) {
    await fs.writeFile(this.#filePath, JSON.stringify(data, null, 2), ENCODING);
  }
}

