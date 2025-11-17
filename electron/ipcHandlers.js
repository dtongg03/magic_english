import { ipcMain, dialog, nativeTheme, app, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';
import { JsonStore } from './services/jsonStore.js';
import { PreferencesStore } from './services/preferencesStore.js';
import { AiClient } from './services/aiClient.js';
import { DbManager } from './services/dbManager.js';
import { UserProfileStore } from './services/userProfileStore.js';

const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && console.log(...args);

let wordStore;
let preferencesStore;
let aiClient;
let windowRef = null;
let isRegistered = false;
let dbManager;
let defaultDataPath;
let activeDbPath;
let userProfileStore;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function for HTTP/HTTPS requests
const httpRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

const sanitizeWordPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object.');
  }
  const {
    word,
    definition = '',
    wordType = '',
    cefrLevel = '',
    ipaPronunciation = '',
    exampleSentence = '',
    tags = [],
    notes = ''
  } = payload;

  if (!word || typeof word !== 'string') {
    throw new Error('`word` is required and must be a string.');
  }

  return {
    word: word.trim(),
    definition: definition.trim(),
    wordType: wordType.trim(),
    cefrLevel: cefrLevel.trim().toUpperCase(),
    ipaPronunciation: ipaPronunciation.trim(),
    exampleSentence: exampleSentence.trim(),
    notes: notes.trim(),
    tags: Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : []
  };
};

const sendWordUpdate = async () => {
  const allWords = await wordStore.getAllWords();
  if (windowRef && !windowRef.isDestroyed()) {
    windowRef.webContents.send('words:updated', allWords);
  }
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const configureStoresForPath = async (dirPath, fileName) => {
  await ensureDir(dirPath);
  activeDbPath = dirPath;
  wordStore.setBaseDir(dirPath);
  wordStore.setFileName(fileName);
  dbManager.setBaseDir(dirPath);
  
  // Also update userProfileStore base dir
  if (userProfileStore) {
    userProfileStore.setBaseDir(dirPath);
    await userProfileStore.init();
  }
  
  await wordStore.init();
};

export async function registerIpcHandlers(window) {
  windowRef = window;
  
  // Initialize stores first (only if not already initialized)
  if (!isRegistered) {
    try {
    const userDataPath = app.getPath('userData');
    defaultDataPath = path.join(userDataPath, 'data');

    preferencesStore = new PreferencesStore();
    // Load activeDbPath từ preferences, có thể là null
    activeDbPath = await preferencesStore.getActiveDbPath();
    
    // Nếu activeDbPath là null, dùng defaultDataPath để hoạt động nhưng không lưu vào preferences
    const workingPath = activeDbPath ?? defaultDataPath;
    await ensureDir(workingPath);

    const activeDb = await preferencesStore.getActiveDbFile();
    wordStore = new JsonStore({ baseDir: workingPath, fileName: activeDb });
    dbManager = new DbManager(workingPath);
    aiClient = new AiClient({ 
      projectRoot: path.join(__dirname, '..'),
      preferencesStore // Inject preferencesStore into AiClient
    });

    // Initialize user profile store
    userProfileStore = new UserProfileStore(workingPath);
    await userProfileStore.init();

    await wordStore.init();
    log('[IPC] Stores initialized');
  } catch (error) {
    if (isDev) {
      console.error('[IPC] Error initializing stores:', error);
    }
    // Continue anyway - try to register handlers with defaults
    if (!preferencesStore) {
      preferencesStore = new PreferencesStore();
    }
    if (!defaultDataPath) {
      const userDataPath = app.getPath('userData');
      defaultDataPath = path.join(userDataPath, 'data');
    }
    // Nếu activeDbPath là null, dùng defaultDataPath để hoạt động nhưng không lưu vào preferences
    const workingPath = activeDbPath ?? defaultDataPath;
    if (!wordStore) {
      const activeDb = await preferencesStore.getActiveDbFile();
      wordStore = new JsonStore({ baseDir: workingPath, fileName: activeDb });
      await wordStore.init();
    }
    if (!dbManager) {
      dbManager = new DbManager(workingPath);
    }
    if (!aiClient) {
      aiClient = new AiClient({ projectRoot: path.join(__dirname, '..') });
    }
  }
  
  // Ensure aiClient is initialized even if stores were already initialized
  if (!aiClient) {
    aiClient = new AiClient({ projectRoot: path.join(__dirname, '..') });
    log('[IPC] AI client initialized on handler registration');
  }
  
  // Register all handlers - this must always run
  try {

  ipcMain.handle('words:get-all', async () => {
    if (!wordStore) {
      return [];
    }
    return wordStore.getAllWords();
  });

  ipcMain.handle('words:get-by-id', async (_event, id) => wordStore.getWordById(id));

  ipcMain.handle('words:search', async (_event, query) => wordStore.searchWords(query));

  ipcMain.handle('words:create', async (_event, payload) => {
    const sanitized = sanitizeWordPayload(payload);
    const result = await wordStore.createWord(sanitized);
    
    // Record activity - word added (await to ensure it's saved)
    try {
      if (userProfileStore) {
        await userProfileStore.recordActivity(1, 0);
        log('[IPC] Activity recorded: +1 word');
        
        // Check for achievements after recording activity
        const unlocked = await userProfileStore.checkAchievements();
        if (unlocked && unlocked.length > 0) {
          log('[IPC] Achievements unlocked:', unlocked);
        }
      }
    } catch (err) {
      log('[IPC] Error recording activity:', err);
    }
    
    // Send word update in background
    sendWordUpdate().catch(err => log('[IPC] Error sending word update:', err));
    
    return result;
  });

  ipcMain.handle('words:update', async (_event, data) => {
    const { id, payload } = data ?? {};
    if (!id) {
      throw new Error('`id` is required.');
    }
    const sanitized = sanitizeWordPayload(payload);
    const result = await wordStore.updateWord(id, sanitized);
    // Don't wait for sendWordUpdate - let it run in background
    sendWordUpdate().catch(err => log('[IPC] Error sending word update:', err));
    return result;
  });

  ipcMain.handle('words:remove', async (_event, id) => {
    if (!id) {
      throw new Error('`id` is required.');
    }
    const deleted = await wordStore.deleteWord(id);
    await sendWordUpdate();
    return deleted;
  });

  ipcMain.handle('words:import', async (_event, filePath) => {
    if (!filePath) {
      throw new Error('File path is required.');
    }
    const imported = await wordStore.importFromFile(filePath);
    await sendWordUpdate();
    return imported;
  });

  ipcMain.handle('words:export', async (_event, filePath) => {
    if (!filePath) {
      throw new Error('File path is required.');
    }
    return wordStore.exportToFile(filePath);
  });

  ipcMain.handle('preferences:get-theme', async () => {
    const theme = await preferencesStore.getTheme();
    return theme;
  });

    ipcMain.handle('preferences:set-theme', async (_event, theme) => {
    await preferencesStore.setTheme(theme);
    nativeTheme.themeSource = theme;
    
    // Broadcast theme change to all windows
    if (window && !window.isDestroyed()) {
      window.webContents.send('theme-changed', theme);
    }
    
    return theme;
  });

  ipcMain.handle('preferences:get-language', async () => {
    return preferencesStore.getLanguage();
  });

  ipcMain.handle('preferences:set-language', async (_event, lang) => {
    return preferencesStore.setLanguage(lang);
  });

  // User Profile handlers
  ipcMain.handle('profile:get', async () => {
    return userProfileStore.getProfile();
  });

  ipcMain.handle('profile:record-activity', async (_event, data) => {
    const { wordsAdded = 0, sentencesScored = 0 } = data || {};
    const profile = await userProfileStore.recordActivity(wordsAdded, sentencesScored);
    
    // Check for new achievements
    const unlocked = await userProfileStore.checkAchievements();
    
    return { profile, unlockedAchievements: unlocked };
  });

  ipcMain.handle('profile:update-goals', async (_event, data) => {
    const { dailyWords, weeklyWords } = data || {};
    return userProfileStore.updateGoals(dailyWords, weeklyWords);
  });

  ipcMain.handle('profile:get-activity-history', async (_event, days = 30) => {
    return userProfileStore.getActivityHistory(days);
  });

  ipcMain.handle('profile:use-streak-freeze', async () => {
    return userProfileStore.useStreakFreeze();
  });

  ipcMain.handle('profile:update-stats', async () => {
    const words = await wordStore.getAllWords();
    return userProfileStore.updateStats(words);
  });

  // DB management
  ipcMain.handle('db:list', async () => {
    if (!dbManager) {
      throw new Error('Chưa chọn thư mục database. Vui lòng pin một thư mục hoặc tạo database mới.');
    }
    return dbManager.list();
  });

  ipcMain.handle('db:create', async (_event, name) => {
    // Nếu chưa có activePath, tự động tạo folder trên desktop và pin vào đó
    let currentActivePath = activeDbPath;
    if (!currentActivePath) {
      const desktopPath = app.getPath('desktop');
      const vocabFolderName = 'Desktop Vocab';
      const vocabFolderPath = path.join(desktopPath, vocabFolderName);
      
      await ensureDir(vocabFolderPath);
      await preferencesStore.addPinnedPath(vocabFolderPath);
      await preferencesStore.setActiveDbPath(vocabFolderPath);
      await configureStoresForPath(vocabFolderPath, await preferencesStore.getActiveDbFile());
      currentActivePath = vocabFolderPath;
    }
    
    const fileName = await dbManager.create(name);
    const activeFile = await preferencesStore.setActiveDbFile(fileName);
    await configureStoresForPath(currentActivePath, activeFile);
    await sendWordUpdate();
    return fileName;
  });

  ipcMain.handle('db:delete', async (_event, name) => {
    const files = await dbManager.list();
    if (!files.includes(name)) {
      throw new Error('Database not found.');
    }
    const remaining = files.filter((file) => file !== name);
    if (!remaining.length) {
      throw new Error('Cannot delete the last database. Create another first.');
    }

    const active = await preferencesStore.getActiveDbFile();
    if (active === name) {
      const next = remaining[0];
      wordStore.setFileName(next);
      await wordStore.init();
      await preferencesStore.setActiveDbFile(next);
      await sendWordUpdate();
    }

    await dbManager.remove(name);
    return true;
  });

  ipcMain.handle('db:rename', async (_event, { oldName, newName }) => {
    const active = await preferencesStore.getActiveDbFile();
    const renamed = await dbManager.rename(oldName, newName);
    if (active === oldName) {
      await preferencesStore.setActiveDbFile(renamed);
      wordStore.setFileName(renamed);
      await wordStore.init();
      await sendWordUpdate();
    }
    return renamed;
  });

  ipcMain.handle('db:get-active', async () => preferencesStore.getActiveDbFile());

  ipcMain.handle('db:set-active', async (_event, name) => {
    wordStore.setFileName(name);
    await wordStore.init();
    const saved = await preferencesStore.setActiveDbFile(name);
    await sendWordUpdate();
    return saved;
  });

  ipcMain.handle('dbPaths:list', async () => {
    const paths = await preferencesStore.getPinnedPaths();
    const activePath = await preferencesStore.getActiveDbPath();
    return {
      activePath: activePath ?? null,
      paths,
      defaultPath: defaultDataPath
    };
  });

  ipcMain.handle('dbPaths:add', async (_event, dirPath) => {
    if (!dirPath) {
      throw new Error('Directory path is required.');
    }
    await ensureDir(dirPath);
    const updated = await preferencesStore.addPinnedPath(dirPath);
    return { paths: updated };
  });

  ipcMain.handle('dbPaths:remove', async (_event, dirPath) => {
    if (!dirPath) {
      throw new Error('Directory path is required.');
    }
    if (dirPath === defaultDataPath) {
      throw new Error('Không thể bỏ pin thư mục mặc định của ứng dụng.');
    }
    const activePath = await preferencesStore.getActiveDbPath();
    const updated = await preferencesStore.removePinnedPath(dirPath);
    
    if (activePath === dirPath) {
      // Set activePath về null khi bỏ pin thư mục hiện tại
      await preferencesStore.setActiveDbPath(null);
      activeDbPath = null;
      // Luôn giữ stores hoạt động với defaultDataPath để app vẫn hoạt động được
      // (nhưng activePath trong preferences vẫn là null)
      const activeDb = await preferencesStore.getActiveDbFile();
      await configureStoresForPath(defaultDataPath, activeDb);
    }
    
    return { paths: updated };
  });

  ipcMain.handle('dbPaths:set-active', async (_event, dirPath) => {
    if (!dirPath) {
      throw new Error('Directory path is required.');
    }
    await preferencesStore.addPinnedPath(dirPath);
    await preferencesStore.setActiveDbPath(dirPath);
    await configureStoresForPath(dirPath, await preferencesStore.getActiveDbFile());
    await sendWordUpdate();
    return dirPath;
  });

  ipcMain.handle('dialog:open-json-file', async () => {
    const result = await dialog.showOpenDialog(window, {
      title: 'Import vocabulary JSON',
      buttonLabel: 'Import',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:save-json-file', async () => {
    const result = await dialog.showSaveDialog(window, {
      title: 'Export vocabulary JSON',
      buttonLabel: 'Save',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      defaultPath: 'desktop_vocab_words.json'
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    return result.filePath;
  });

  ipcMain.handle('dialog:select-directory', async () => {
    const result = await dialog.showOpenDialog(window, {
      title: 'Chọn thư mục',
      buttonLabel: 'Chọn',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths.length) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('ai:analyze', async (_event, word) => {
    if (!word || typeof word !== 'string') {
      throw new Error('Word must be a non-empty string.');
    }
    if (!aiClient) {
      throw new Error('AI client not initialized.');
    }
    return aiClient.analyzeWord(word);
  });

  ipcMain.handle('ai:analyze-sentence', async (_event, sentence) => {
    log('[IPC] ai:analyze-sentence handler called');
    if (!sentence || typeof sentence !== 'string') {
      throw new Error('Sentence must be a non-empty string.');
    }
    if (!aiClient) {
      if (isDev) {
        console.error('[IPC] AI client not initialized');
      }
      throw new Error('AI client not initialized.');
    }
    try {
      const result = await aiClient.analyzeSentence(sentence, { stream: false });
      log('[IPC] ai:analyze-sentence completed');
      
      // Record activity - sentence scored (await to ensure it's saved)
      try {
        if (userProfileStore) {
          await userProfileStore.recordActivity(0, 1);
          log('[IPC] Activity recorded: +1 sentence');
          
          // Check for achievements after recording activity
          const unlocked = await userProfileStore.checkAchievements();
          if (unlocked && unlocked.length > 0) {
            log('[IPC] Achievements unlocked:', unlocked);
          }
        }
      } catch (err) {
        log('[IPC] Error recording activity:', err);
      }
      
      return result;
    } catch (error) {
      if (isDev) {
        console.error('[IPC] ai:analyze-sentence error:', error);
      }
      throw error;
    }
  });

  log('[IPC] Registered ai:analyze-sentence handler');

  // AI Chat handler
  ipcMain.handle('ai:chat', async (_event, message) => {
    if (!message || typeof message !== 'string') {
      throw new Error('Message is required');
    }

    try {
      const response = await aiClient.chat(message);
      return response;
    } catch (error) {
      console.error('[IPC] ai:chat error:', error);
      throw error;
    }
  });

  // AI Chat Stream handler (new!)
  ipcMain.handle('ai:chat-stream', async (event, message) => {
    if (!message || typeof message !== 'string') {
      throw new Error('Message is required');
    }

    try {
      await aiClient.chat(message, {
        stream: true,
        onChunk: (chunk) => {
          // Send chunk to renderer via event
          event.sender.send('ai:chat-chunk', chunk);
        }
      });
      
      // Send done signal
      event.sender.send('ai:chat-done');
      return true;
    } catch (error) {
      console.error('[IPC] ai:chat-stream error:', error);
      event.sender.send('ai:chat-error', error.message);
      throw error;
    }
  });

  ipcMain.handle('window:minimize', () => {
    if (window && !window.isDestroyed()) {
      window.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    if (window && !window.isDestroyed()) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (window && !window.isDestroyed()) {
      window.close();
    }
  });

  // Shell handler - open external links in default browser
  ipcMain.handle('shell:open-external', async (_event, url) => {
    try {
      // Validate URL
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        throw new Error('Only HTTP(S) URLs are allowed');
      }
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      log('[Shell] Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });

  // API Settings handlers
  ipcMain.handle('settings:get-ai-config', async () => {
    try {
      const provider = preferencesStore.get('aiProvider') || 'ollama-cloud';
      const ollamaCloudApiKey = preferencesStore.get('ollamaCloudApiKey') || '';
      const ollamaCloudModel = preferencesStore.get('ollamaCloudModel') || 'gpt-oss:20b-cloud';
      const openaiEndpoint = preferencesStore.get('openaiEndpoint') || 'https://api.openai.com';
      const openaiApiKey = preferencesStore.get('openaiApiKey') || '';
      const openaiModel = preferencesStore.get('openaiModel') || 'gpt-4o-mini';
      const ollamaLocalHost = preferencesStore.get('ollamaLocalHost') || 'http://localhost:11434';
      const ollamaLocalModel = preferencesStore.get('ollamaLocalModel') || 'llama3.2:latest';
      
      return {
        provider,
        ollamaCloud: {
          apiKey: ollamaCloudApiKey,
          model: ollamaCloudModel
        },
        openai: {
          endpoint: openaiEndpoint,
          apiKey: openaiApiKey,
          model: openaiModel
        },
        ollamaLocal: {
          host: ollamaLocalHost,
          model: ollamaLocalModel
        }
      };
    } catch (error) {
      isDev && console.error('[IPC] Error getting AI config:', error);
      // Return defaults instead of throwing
      return {
        provider: 'ollama-cloud',
        ollamaCloud: {
          apiKey: '',
          model: 'gpt-oss:20b-cloud'
        },
        openai: {
          endpoint: 'https://api.openai.com',
          apiKey: '',
          model: 'gpt-4o-mini'
        },
        ollamaLocal: {
          host: 'http://localhost:11434',
          model: 'llama3.2:latest'
        }
      };
    }
  });

  ipcMain.handle('settings:set-ai-config', async (event, config) => {
    log('[IPC] settings:set-ai-config handler called');
    try {
      if (config.provider) {
        preferencesStore.set('aiProvider', config.provider);
      }
      if (config.ollamaCloud) {
        if (config.ollamaCloud.apiKey !== undefined) {
          preferencesStore.set('ollamaCloudApiKey', config.ollamaCloud.apiKey);
        }
        if (config.ollamaCloud.model) {
          preferencesStore.set('ollamaCloudModel', config.ollamaCloud.model);
        }
      }
      if (config.openai) {
        if (config.openai.endpoint) {
          preferencesStore.set('openaiEndpoint', config.openai.endpoint);
        }
        if (config.openai.apiKey !== undefined) {
          preferencesStore.set('openaiApiKey', config.openai.apiKey);
        }
        if (config.openai.model) {
          preferencesStore.set('openaiModel', config.openai.model);
        }
      }
      if (config.ollamaLocal) {
        if (config.ollamaLocal.host) {
          preferencesStore.set('ollamaLocalHost', config.ollamaLocal.host);
        }
        if (config.ollamaLocal.model) {
          preferencesStore.set('ollamaLocalModel', config.ollamaLocal.model);
        }
      }
      return { success: true };
    } catch (error) {
      isDev && console.error('[IPC] Error setting AI config:', error);
      throw new Error('Failed to save AI configuration');
    }
  });

  ipcMain.handle('settings:test-connection', async (event, config) => {
    log('[IPC] settings:test-connection handler called');
    try {
      if (config.provider === 'ollama-cloud') {
        const response = await httpRequest('https://api.ollama.cloud/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.ollamaCloud.apiKey}`
          },
          timeout: 10000
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key');
          }
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return { 
          success: true, 
          message: 'Connection successful',
          models: data.data?.map(m => m.id) || []
        };
        
      } else if (config.provider === 'openai') {
        const response = await httpRequest('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.openai.apiKey}`
          },
          timeout: 10000
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key');
          }
          throw new Error(`API error: ${response.status}`);
        }
        
        return { 
          success: true, 
          message: 'Connection successful'
        };
        
      } else if (config.provider === 'ollama-local') {
        const response = await httpRequest(`${config.ollamaLocal.host}/api/tags`, {
          timeout: 5000
        });
        
        if (!response.ok) {
          throw new Error('Cannot connect to local Ollama server');
        }
        
        const data = await response.json();
        return { 
          success: true, 
          message: 'Connection successful',
          models: data.models?.map(m => m.name) || []
        };
      }
      
      throw new Error('Unknown provider');
      
    } catch (error) {
      isDev && console.error('[IPC] Test connection error:', error);
      return {
        success: false,
        message: error.message || 'Connection failed'
      };
    }
  });

  log('[IPC] Registered API settings handlers');
  
  } catch (error) {
    console.error('[IPC] Error registering handlers:', error);
    throw error;
  }
  
  isRegistered = true;
  log('[IPC] All handlers registered successfully');
  log('[IPC] Registered handlers count:', ipcMain.listenerCount ? 'check manually' : 'N/A');
  }
}

