import Store from 'electron-store';

const schema = {
  theme: {
    type: 'string',
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  language: {
    type: 'string',
    enum: ['en', 'vi'],
    default: 'vi'
  },
  activeDbFile: {
    type: 'string',
    default: 'words.json'
  },
  activeDbPath: {
    type: 'string'
  },
  pinnedPaths: {
    type: 'array',
    default: []
  },
  // AI API Settings
  aiProvider: {
    type: 'string',
    enum: ['ollama-cloud', 'openai', 'ollama-local'],
    default: 'ollama-cloud'
  },
  ollamaCloudApiKey: {
    type: 'string',
    default: ''
  },
  ollamaCloudModel: {
    type: 'string',
    enum: ['qwen3-coder:480b-cloud', 'gpt-oss:120b-cloud', 'gpt-oss:20b-cloud', 'deepseek-v3.1:671b-cloud'],
    default: 'gpt-oss:20b-cloud'
  },
  openaiEndpoint: {
    type: 'string',
    default: 'https://api.openai.com'
  },
  openaiApiKey: {
    type: 'string',
    default: ''
  },
  openaiModel: {
    type: 'string',
    default: 'gpt-4o-mini'
  },
  ollamaLocalHost: {
    type: 'string',
    default: 'http://localhost:11434'
  },
  ollamaLocalModel: {
    type: 'string',
    default: 'llama3.2:latest'
  }
};

export class PreferencesStore {
  #store;

  constructor() {
    this.#store = new Store({ name: 'preferences', schema });
  }

  async getTheme() {
    return this.#store.get('theme', 'system');
  }

  async setTheme(theme) {
    if (!['light', 'dark', 'system'].includes(theme)) {
      throw new Error('Theme must be one of: light, dark, system.');
    }
    this.#store.set('theme', theme);
    return theme;
  }

  async getActiveDbFile() {
    return this.#store.get('activeDbFile', 'words.json');
  }

  async setActiveDbFile(fileName) {
    this.#store.set('activeDbFile', fileName);
    return fileName;
  }

  async getActiveDbPath() {
    return this.#store.get('activeDbPath');
  }

  async setActiveDbPath(dirPath) {
    this.#store.set('activeDbPath', dirPath);
    return dirPath;
  }

  async getPinnedPaths() {
    return this.#store.get('pinnedPaths', []);
  }

  async addPinnedPath(dirPath) {
    const current = await this.getPinnedPaths();
    if (!current.includes(dirPath)) {
      current.push(dirPath);
      this.#store.set('pinnedPaths', current);
    }
    return current;
  }

  async removePinnedPath(dirPath) {
    const current = await this.getPinnedPaths();
    const filtered = current.filter((item) => item !== dirPath);
    this.#store.set('pinnedPaths', filtered);
    const active = await this.getActiveDbPath();
    if (active === dirPath) {
      await this.setActiveDbPath(null);
    }
    return filtered;
  }

  async getLanguage() {
    return this.#store.get('language', 'vi');
  }

  async setLanguage(lang) {
    if (!['en', 'vi'].includes(lang)) {
      throw new Error('Language must be one of: en, vi.');
    }
    this.#store.set('language', lang);
    return lang;
  }

  // Generic get/set for all schema properties
  get(key, defaultValue) {
    try {
      return this.#store.get(key, defaultValue);
    } catch (error) {
      console.error(`[PreferencesStore] Error getting key '${key}':`, error);
      return defaultValue;
    }
  }

  set(key, value) {
    try {
      this.#store.set(key, value);
    } catch (error) {
      console.error(`[PreferencesStore] Error setting key '${key}':`, error);
      throw error;
    }
  }
}

