"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const validCallback = (fn) => {
  if (typeof fn !== "function") {
    throw new TypeError("Callback must be a function");
  }
  return fn;
};

contextBridge.exposeInMainWorld("api", {
  words: {
    getAll: () => ipcRenderer.invoke("words:get-all"),
    getById: (id) => ipcRenderer.invoke("words:get-by-id", id),
    search: (query) => ipcRenderer.invoke("words:search", query),
    create: (payload) => ipcRenderer.invoke("words:create", payload),
    update: (id, payload) => ipcRenderer.invoke("words:update", { id, payload }),
    remove: (id) => ipcRenderer.invoke("words:remove", id),
    importFromFile: (filePath) => ipcRenderer.invoke("words:import", filePath),
    exportToFile: (filePath) => ipcRenderer.invoke("words:export", filePath),
    onChanged: (callback) => {
      const cb = validCallback(callback);
      const channel = "words:updated";
      const listener = (_event, payload) => cb(payload);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  },
  db: {
    list: () => ipcRenderer.invoke("db:list"),
    create: (name) => ipcRenderer.invoke("db:create", name),
    remove: (name) => ipcRenderer.invoke("db:delete", name),
    rename: (oldName, newName) => ipcRenderer.invoke("db:rename", { oldName, newName }),
    getActive: () => ipcRenderer.invoke("db:get-active"),
    setActive: (name) => ipcRenderer.invoke("db:set-active", name)
  },
  preferences: {
    getTheme: () => ipcRenderer.invoke("preferences:get-theme"),
    setTheme: (theme) => ipcRenderer.invoke("preferences:set-theme", theme),
    getLanguage: () => ipcRenderer.invoke("preferences:get-language"),
    setLanguage: (lang) => ipcRenderer.invoke("preferences:set-language", lang)
  },
  profile: {
    get: () => ipcRenderer.invoke("profile:get"),
    recordActivity: (data) => ipcRenderer.invoke("profile:record-activity", data),
    updateGoals: (data) => ipcRenderer.invoke("profile:update-goals", data),
    getActivityHistory: (days) => ipcRenderer.invoke("profile:get-activity-history", days),
    useStreakFreeze: () => ipcRenderer.invoke("profile:use-streak-freeze"),
    updateStats: () => ipcRenderer.invoke("profile:update-stats")
  },
  dbPaths: {
    list: () => ipcRenderer.invoke("dbPaths:list"),
    add: (dirPath) => ipcRenderer.invoke("dbPaths:add", dirPath),
    remove: (dirPath) => ipcRenderer.invoke("dbPaths:remove", dirPath),
    setActive: (dirPath) => ipcRenderer.invoke("dbPaths:set-active", dirPath)
  },
  ai: {
    analyzeWord: (word) => ipcRenderer.invoke("ai:analyze", word),
    analyzeSentence: (sentence) => ipcRenderer.invoke("ai:analyze-sentence", sentence),
    chat: (message) => ipcRenderer.invoke("ai:chat", message),
    chatStream: (message) => ipcRenderer.invoke("ai:chat-stream", message),
    onChatChunk: (callback) => {
      const listener = (_event, chunk) => callback(chunk);
      ipcRenderer.on("ai:chat-chunk", listener);
      return () => ipcRenderer.removeListener("ai:chat-chunk", listener);
    },
    onChatDone: (callback) => {
      const listener = () => callback();
      ipcRenderer.on("ai:chat-done", listener);
      return () => ipcRenderer.removeListener("ai:chat-done", listener);
    },
    onChatError: (callback) => {
      const listener = (_event, error) => callback(error);
      ipcRenderer.on("ai:chat-error", listener);
      return () => ipcRenderer.removeListener("ai:chat-error", listener);
    }
  },
  dialog: {
    openJsonFile: () => ipcRenderer.invoke("dialog:open-json-file"),
    saveJsonFile: () => ipcRenderer.invoke("dialog:save-json-file"),
    selectDirectory: () => ipcRenderer.invoke("dialog:select-directory")
  },
  theme: {
    get: () => ipcRenderer.invoke("preferences:get-theme"),
    onChange: (callback) => {
      const listener = (_event, theme) => callback(theme);
      ipcRenderer.on("theme-changed", listener);
      return () => ipcRenderer.removeListener("theme-changed", listener);
    }
  },
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close")
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke("shell:open-external", url)
  },
  magicSearch: {
    open: () => ipcRenderer.invoke("magic-search:open"),
    close: () => ipcRenderer.invoke("magic-search:close"),
    toggle: () => ipcRenderer.invoke("magic-search:toggle"),
    getBounds: () => ipcRenderer.invoke("magic-search:get-bounds"),
    setBounds: (bounds) => ipcRenderer.invoke("magic-search:set-bounds", bounds),
    syncTheme: (theme) => ipcRenderer.invoke("magic-search:sync-theme", theme),
    onMouseEnter: () => ipcRenderer.send("magic-search:mouse-enter"),
    onMouseLeave: () => ipcRenderer.send("magic-search:mouse-leave"),
    onThemeChanged: (callback) => {
      ipcRenderer.on("theme-changed", (event, theme) => callback(theme));
    }
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});

