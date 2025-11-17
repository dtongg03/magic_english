import { t, setLanguage, getLanguage, loadLabels } from './i18n.js';

// Utility: debounce function for performance
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const state = {
  words: [],
  selectedWordId: null,
  theme: 'system',
  language: 'vi',
  activeDb: null,
  dbList: [],
  paths: [],
  activePath: null,
  defaultPath: null,
  isLoadingAI: false,
  lastAiResult: null,
  currentSearchController: null // For cancelling searches
};

// AI Result Cache
const aiCache = new Map();
const AI_CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Get cached AI result
const getCachedAiResult = (word) => {
  const cached = aiCache.get(word.toLowerCase());
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
    return cached.data;
  }
  return null;
};

// Set cached AI result
const setCachedAiResult = (word, data) => {
  aiCache.set(word.toLowerCase(), {
    data,
    timestamp: Date.now()
  });
};

const els = {
  magicSearchBtn: document.getElementById('magic-search-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  themeSelect: document.getElementById('theme-select'),
  languageSelect: document.getElementById('language-select'),
  // AI Settings elements
  aiProviderSelect: document.getElementById('ai-provider-select'),
  ollamaCloudSettings: document.getElementById('ollama-cloud-settings'),
  ollamaLocalSettings: document.getElementById('ollama-local-settings'),
  openaiSettings: document.getElementById('openai-settings'),
  ollamaCloudApiKey: document.getElementById('ollama-cloud-api-key'),
  ollamaCloudModel: document.getElementById('ollama-cloud-model'),
  testOllamaCloud: document.getElementById('test-ollama-cloud'),
  toggleOllamaApiKey: document.getElementById('toggle-ollama-api-key'),
  ollamaLocalHost: document.getElementById('ollama-local-host'),
  ollamaLocalModel: document.getElementById('ollama-local-model'),
  testOllamaLocal: document.getElementById('test-ollama-local'),
  openaiEndpoint: document.getElementById('openai-endpoint'),
  openaiApiKey: document.getElementById('openai-api-key'),
  openaiModel: document.getElementById('openai-model'),
  testOpenai: document.getElementById('test-openai'),
  toggleOpenaiApiKey: document.getElementById('toggle-openai-api-key'),
  saveAiSettings: document.getElementById('save-ai-settings'),
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  searchInput: document.getElementById('word-search-input'),
  searchBtn: document.getElementById('word-search-btn'),
  aiOutput: document.getElementById('ai-output'),
  dbList: document.getElementById('db-list'),
  dbNew: document.getElementById('db-new'),
  dbRename: document.getElementById('db-rename'),
  dbDelete: document.getElementById('db-delete'),
  pathSelect: document.getElementById('path-select'),
  pathPin: document.getElementById('path-pin'),
  pathRemove: document.getElementById('path-remove'),
  wordTableBody: document.getElementById('word-table-body'),
  // Profile & Streaks elements
  totalWords: document.getElementById('total-words'),
  currentStreak: document.getElementById('current-streak'),
  longestStreak: document.getElementById('longest-streak'),
  totalAchievements: document.getElementById('total-achievements'),
  dailyProgress: document.getElementById('daily-progress'),
  dailyGoal: document.getElementById('daily-goal'),
  dailyProgressBar: document.getElementById('daily-progress-bar'),
  weeklyProgress: document.getElementById('weekly-progress'),
  weeklyGoal: document.getElementById('weekly-goal'),
  weeklyProgressBar: document.getElementById('weekly-progress-bar'),
  editGoalsBtn: document.getElementById('edit-goals-btn'),
  activityCalendar: document.getElementById('activity-calendar'),
  achievementsGrid: document.getElementById('achievements-grid'),
  levelChart: document.getElementById('level-chart'),
  typeChart: document.getElementById('type-chart'),
  useFreezeBtn: document.getElementById('use-freeze-btn'),
  freezesAvailable: document.getElementById('freezes-available'),
  tableEmpty: document.getElementById('table-empty'),
  tableTitle: document.getElementById('word-table-title'),
  toastContainer: document.getElementById('toast-container'),
  dbModal: document.getElementById('db-modal'),
  dbModalInput: document.getElementById('db-modal-input'),
  dbModalConfirm: document.getElementById('db-modal-confirm'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmModalTitle: document.getElementById('confirm-modal-title'),
  confirmModalMessage: document.getElementById('confirm-modal-message'),
  confirmModalConfirm: document.getElementById('confirm-modal-confirm'),
  promptModal: document.getElementById('prompt-modal'),
  promptModalTitle: document.getElementById('prompt-modal-title'),
  promptModalMessage: document.getElementById('prompt-modal-message'),
  promptModalInput: document.getElementById('prompt-modal-input'),
  promptModalConfirm: document.getElementById('prompt-modal-confirm'),
  goalsModal: document.getElementById('goals-modal'),
  goalsDailyInput: document.getElementById('goals-daily-input'),
  goalsWeeklyInput: document.getElementById('goals-weekly-input'),
  goalsModalConfirm: document.getElementById('goals-modal-confirm'),
  sentenceInput: document.getElementById('sentence-input'),
  scoreBtn: document.getElementById('score-btn'),
  scoringOutput: document.getElementById('scoring-output')
};

let unsubscribeWordsChanged = null;

// Unified Toast System
const showToast = (message, tone = 'info', duration = 3000) => {
  if (!els.toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.dataset.tone = tone;
  
  const iconMap = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    loading: '⏳'
  };
  
  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  
  // Add spinner for loading
  if (tone === 'loading') {
    icon.innerHTML = '<span class="toast-spinner"></span>';
  } else {
    icon.textContent = iconMap[tone] || iconMap.info;
  }
  
  const messageEl = document.createElement('span');
  messageEl.className = 'toast__message';
  messageEl.textContent = message;
  
  toast.appendChild(icon);
  toast.appendChild(messageEl);
  
  // Add to main container
  els.toastContainer.appendChild(toast);
  
  // Also add to modal container if modal is open
  const modalToastContainer = document.querySelector('.modal-toast-container');
  let modalToast = null;
  if (modalToastContainer && els.settingsModal?.open) {
    modalToast = toast.cloneNode(true);
    modalToastContainer.appendChild(modalToast);
  }
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
    if (modalToast) modalToast.classList.add('toast--visible');
  });
  
  // Auto remove (except loading toasts)
  if (tone !== 'loading' && duration > 0) {
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      if (modalToast) modalToast.classList.remove('toast--visible');
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (modalToast && modalToast.parentNode) {
          modalToast.parentNode.removeChild(modalToast);
        }
      }, 300);
    }, duration);
  }
  
  // Return toast element for manual control (useful for loading)
  return toast;
};

// Hide specific toast (for loading completion)
const hideToast = (toast) => {
  if (!toast) return;
  toast.classList.remove('toast--visible');
  
  // Also hide modal toast if exists
  const modalToastContainer = document.querySelector('.modal-toast-container');
  if (modalToastContainer) {
    const modalToasts = modalToastContainer.querySelectorAll('.toast');
    modalToasts.forEach(mt => {
      if (mt.textContent === toast.textContent) {
        mt.classList.remove('toast--visible');
        setTimeout(() => {
          if (mt.parentNode) mt.parentNode.removeChild(mt);
        }, 300);
      }
    });
  }
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
};

const showConfirmModal = (title, message, confirmText = null) => {
  return new Promise((resolve) => {
    if (!els.confirmModal) {
      resolve(false);
      return;
    }
    
    els.confirmModalTitle.textContent = title;
    els.confirmModalMessage.textContent = message;
    els.confirmModalConfirm.textContent = confirmText || t('modals.confirm');
    
    const handleClose = (event) => {
      const result = event.target.returnValue === 'confirm';
      els.confirmModal.removeEventListener('close', handleClose);
      resolve(result);
    };
    
    els.confirmModal.addEventListener('close', handleClose);
    els.confirmModal.showModal();
  });
};

const showPromptModal = (title, message, defaultValue = '', placeholder = '') => {
  return new Promise((resolve) => {
    if (!els.promptModal) {
      resolve(null);
      return;
    }
    
    els.promptModalTitle.textContent = title;
    els.promptModalMessage.textContent = message;
    els.promptModalInput.value = defaultValue;
    els.promptModalInput.placeholder = placeholder;
    
    const handleClose = (event) => {
      const result = event.target.returnValue === 'confirm' ? els.promptModalInput.value.trim() : null;
      els.promptModal.removeEventListener('close', handleClose);
      resolve(result);
    };
    
    els.promptModal.addEventListener('close', handleClose);
    els.promptModal.showModal();
    els.promptModalInput.focus();
    els.promptModalInput.select();
  });
};

const clearAiOutput = () => {
  state.lastAiResult = null;
  els.aiOutput.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <h3 class="empty-state-title">${t('vocab.aiResult.empty')}</h3>
      <p class="empty-state-text">Hãy nhập từ vào ô tìm kiếm và nhấn Search để bắt đầu</p>
    </div>
  `;
};

// Render skeleton loader for AI output
const renderAiSkeleton = () => {
  els.aiOutput.innerHTML = `
    <div class="ai-skeleton">
      <div class="skeleton-header">
        <div class="skeleton-line skeleton-shimmer" style="width: 40%; height: 24px; margin-bottom: 12px;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width: 60%; height: 14px;"></div>
      </div>
      <div class="skeleton-content" style="margin-top: 20px;">
        <div class="skeleton-line skeleton-shimmer" style="width: 100%; height: 14px; margin-bottom: 8px;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width: 90%; height: 14px; margin-bottom: 8px;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width: 80%; height: 14px;"></div>
      </div>
    </div>
  `;
};

const renderAiResult = (word) => {
  if (!word) {
    clearAiOutput();
    return;
  }
  state.lastAiResult = word;

  const header = document.createElement('div');
  header.className = 'ai-output__header';
  const title = document.createElement('h3');
  title.textContent = word.word;
  const meta = document.createElement('div');
  meta.className = 'ai-output__meta';
  if (word.wordType) {
    const type = document.createElement('span');
    type.textContent = word.wordType;
    meta.appendChild(type);
  }
  if (word.cefrLevel) {
    const level = document.createElement('span');
    level.textContent = `CEFR ${word.cefrLevel}`;
    meta.appendChild(level);
  }
  header.append(title);
  if (meta.children.length) {
    header.append(meta);
  }

  const grid = document.createElement('div');
  grid.className = 'ai-output__grid';

  const createRow = (label, value, colorClass) => {
    const row = document.createElement('div');
    row.className = `ai-output__row ai-output__row--${colorClass}`;
    const labelEl = document.createElement('strong');
    labelEl.textContent = label;
    const valueEl = document.createElement('p');
    valueEl.textContent = value || '—';
    row.append(labelEl, valueEl);
    return row;
  };

  grid.append(
    createRow(t('vocab.aiResult.definition'), word.definition, 'definition'),
    createRow(t('vocab.aiResult.example'), word.exampleSentence, 'example'),
    createRow(t('vocab.aiResult.ipa'), word.ipaPronunciation, 'ipa'),
    createRow(t('vocab.aiResult.notes'), word.notes, 'notes')
  );

  if (Array.isArray(word.tags) && word.tags.length) {
    const tagsRow = document.createElement('div');
    tagsRow.className = 'ai-output__row ai-output__row--tags';
    const labelEl = document.createElement('strong');
    labelEl.textContent = t('vocab.aiResult.tags');
    const valueEl = document.createElement('div');
    valueEl.className = 'ai-tags';
    word.tags.forEach((tag) => {
      const pill = document.createElement('span');
      pill.className = 'tag';
      pill.textContent = tag;
      valueEl.appendChild(pill);
    });
    tagsRow.append(labelEl, valueEl);
    grid.appendChild(tagsRow);
  }

  els.aiOutput.replaceChildren(header, grid);
};

const updateTableTitle = () => {
  if (state.activeDb) {
    els.tableTitle.textContent = `${t('vocab.words.title')} • ${state.activeDb}`;
  } else {
    els.tableTitle.textContent = t('vocab.words.title');
  }
};

const renderDbList = () => {
  // Clear existing options
  els.dbList.replaceChildren();
  
  if (!state.dbList.length) {
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = t('vocab.database.empty');
    emptyOption.disabled = true;
    emptyOption.selected = true;
    els.dbList.appendChild(emptyOption);
  } else {
    state.dbList.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      option.selected = name === state.activeDb;
      els.dbList.appendChild(option);
    });
  }
};

// Handle database selection from dropdown
els.dbList.addEventListener('change', (e) => {
  const selectedDb = e.target.value;
  if (selectedDb && selectedDb !== state.activeDb) {
    handleDbSelect(selectedDb);
  }
});

const renderPathSelect = () => {
  els.pathSelect.replaceChildren();
  if (state.paths.length === 0) {
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = t('vocab.paths.empty');
    emptyOption.disabled = true;
    els.pathSelect.appendChild(emptyOption);
  } else {
    state.paths.forEach((dirPath) => {
      const option = document.createElement('option');
      option.value = dirPath;
      option.textContent = dirPath;
      option.selected = dirPath === state.activePath;
      els.pathSelect.appendChild(option);
    });
  }
  els.pathRemove.disabled = !state.activePath || state.activePath === state.defaultPath;
  els.pathSelect.disabled = state.paths.length === 0;
};

const renderWordTable = () => {
  const fragment = document.createDocumentFragment();
  state.words.forEach((word) => {
    const row = document.createElement('tr');
    row.dataset.id = word.id;
    if (word.id === state.selectedWordId) {
      row.classList.add('word-row--active');
    }

    const cells = [
      word.word,
      word.ipaPronunciation,
      word.wordType,
      word.cefrLevel,
      word.definition,
      word.exampleSentence,
      word.notes,
      (word.tags || []).join(', ')
    ];

    cells.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value || '—';
      row.appendChild(td);
    });

    // Make row clickable to view word details
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      // Don't trigger if clicking delete button
      if (e.target.closest('button[data-action="delete"]')) return;
      renderAiResult(word);
    });

    const actionsTd = document.createElement('td');
    actionsTd.className = 'table-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ghost-btn icon-only';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = word.id;
    deleteBtn.title = t('vocab.words.actions.delete');
    deleteBtn.textContent = '🗑️';

    actionsTd.appendChild(deleteBtn);
    row.appendChild(actionsTd);

    fragment.appendChild(row);
  });

  els.wordTableBody.replaceChildren(fragment);
  const hasWords = state.words.length > 0;
  els.tableEmpty.classList.toggle('hidden', hasWords);
};

const refreshDbList = async () => {
  const [dbs, active] = await Promise.all([window.api.db.list(), window.api.db.getActive()]);
  state.dbList = dbs;
  state.activeDb = active ?? null;
  renderDbList();
  updateTableTitle();
};

const refreshWords = async () => {
  const words = await window.api.words.getAll();
  state.words = words;
  if (state.selectedWordId && !state.words.some((w) => w.id === state.selectedWordId)) {
    state.selectedWordId = null;
  }
  renderWordTable();
  updateTableTitle();
  if (state.selectedWordId) {
    const current = state.words.find((item) => item.id === state.selectedWordId);
    renderAiResult(current);
  } else if (!state.lastAiResult) {
    clearAiOutput();
  }
  // Refresh profile to update stats
  await loadProfile().catch(err => console.error('[Profile] Refresh error:', err));
};

const refreshPathList = async () => {
  const result = await window.api.dbPaths.list();
  state.paths = result.paths ?? [];
  state.activePath = result.activePath ?? null;
  state.defaultPath = result.defaultPath ?? null;
  renderPathSelect();
};

const handleDbSelect = async (name) => {
  if (name === state.activeDb) return;
  try {
    await window.api.db.setActive(name);
    state.activeDb = name;
    state.selectedWordId = null;
    clearAiOutput();
    await refreshDbList();
    await refreshWords();
    showToast(t('toasts.success.dbSelected', { name }), 'info');
  } catch (error) {
    showToast(error.message ?? t('toasts.error.failed'), 'error');
  }
};

const openDbModal = () => {
  els.dbModalInput.value = '';
  els.dbModal.showModal();
  requestAnimationFrame(() => {
    els.dbModalInput.focus();
  });
};

const closeDbModal = () => {
  els.dbModal.close();
};

const handleDbCreate = async (name) => {
  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    showToast(t('toasts.error.empty'), 'error');
    return;
  }
  try {
    const file = await window.api.db.create(trimmed);
    state.activeDb = file;
    state.selectedWordId = null;
    clearAiOutput();
    // Refresh path list vì có thể đã tự động tạo folder trên desktop
    await refreshPathList();
    await refreshDbList();
    await refreshWords();
    showToast(t('toasts.success.created'), 'success');
  } catch (error) {
    showToast(error.message ?? t('toasts.error.failed'), 'error');
  } finally {
    closeDbModal();
  }
};

const handleDbRename = async () => {
  if (!state.activeDb) {
    showToast(t('toasts.error.noDatabase'), 'error');
    return;
  }
  const nextName = await showPromptModal(
    t('modals.rename.title'),
    t('modals.rename.message') + ` "${state.activeDb}":`,
    state.activeDb,
    t('modals.rename.placeholder')
  );
  if (!nextName || nextName === state.activeDb) {
    return;
  }
  try {
    const newFile = await window.api.db.rename(state.activeDb, nextName);
    state.activeDb = newFile;
    await refreshDbList();
    await refreshWords();
    showToast(t('toasts.success.renamed'), 'success');
  } catch (error) {
    showToast(error.message ?? t('toasts.error.failed'), 'error');
  }
};

const handleDbDelete = async () => {
  if (!state.activeDb) {
    showToast(t('toasts.error.noDatabase'), 'error');
    return;
  }
  const confirmed = await showConfirmModal(
    t('modals.delete.title'),
    t('modals.delete.message', { name: state.activeDb }),
    t('modals.delete.confirm')
  );
  if (!confirmed) {
    return;
  }
  try {
    const oldName = state.activeDb;
    await window.api.db.remove(oldName);
    state.selectedWordId = null;
    clearAiOutput();
    await refreshDbList();
    await refreshWords();
    showToast(t('toasts.success.deleted'), 'success');
  } catch (error) {
    showToast(error.message ?? t('toasts.error.cannotDelete'), 'error');
  }
};

const handlePathChange = async () => {
  const selected = els.pathSelect.value;
  if (!selected || selected === state.activePath) return;
  try {
    await window.api.dbPaths.setActive(selected);
    state.activePath = selected;
    state.selectedWordId = null;
    clearAiOutput();
    await refreshPathList();
    await refreshDbList();
    await refreshWords();
    showToast(t('toasts.success.pathChanged'), 'success');
  } catch (error) {
    showToast(error.message ?? t('toasts.error.failed'), 'error');
  }
};

const handlePathPin = async () => {
  try {
    const dirPath = await window.api.dialog.selectDirectory();
    if (!dirPath) return;
    await window.api.dbPaths.add(dirPath);
    await window.api.dbPaths.setActive(dirPath);
    state.selectedWordId = null;
    clearAiOutput();
    await refreshPathList();
    await refreshDbList();
    await refreshWords();
    showToast(t('toasts.success.pinned'), 'success');
  } catch (error) {
    showToast(error.message ?? t('toasts.error.failed'), 'error');
  }
};

const handlePathRemove = async () => {
  if (!state.activePath) return;
  if (state.activePath === state.defaultPath) {
    showToast(t('toasts.error.cannotUnpinDefault'), 'error');
    return;
  }
  const confirmed = await showConfirmModal(
    t('modals.unpinPath.title'),
    t('modals.unpinPath.message', { path: state.activePath }),
    t('modals.unpinPath.confirm')
  );
  if (!confirmed) return;
  try {
    await window.api.dbPaths.remove(state.activePath);
    state.selectedWordId = null;
    clearAiOutput();
    await refreshPathList();
    await refreshDbList();
    await refreshWords();
    showToast(t('toasts.success.unpinned'), 'success');
  } catch (error) {
    showToast(error.message ?? t('toasts.error.failed'), 'error');
  }
};

const handleTableClick = async (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const word = state.words.find((item) => item.id === id);
  if (!word) return;

  if (btn.dataset.action === 'delete') {
    const confirmed = await showConfirmModal(
      t('modals.deleteWord.title'),
      t('modals.deleteWord.message', { word: word.word }),
      t('modals.deleteWord.confirm')
    );
    if (!confirmed) return;
    try {
      await window.api.words.remove(id);
      showToast(t('toasts.success.wordDeleted', { word: word.word }), 'success');
      if (state.selectedWordId === id) {
        state.selectedWordId = null;
        clearAiOutput();
      }
      await refreshWords();
    } catch (error) {
      showToast(error.message ?? t('toasts.error.failed'), 'error');
    }
  }
};

const normalizeAiResult = (word, result, existing = {}) => ({
  word,
  definition: (result.definition ?? '').trim(),
  wordType: (result.word_type ?? result.wordType ?? '').trim(),
  cefrLevel: (result.cefr_level ?? result.cefrLevel ?? '').trim().toUpperCase(),
  ipaPronunciation: (result.ipa_pronunciation ?? result.ipaPronunciation ?? '').trim(),
  exampleSentence: (result.example_sentence ?? result.exampleSentence ?? '').trim(),
  tags: Array.isArray(existing.tags) ? existing.tags : [],
  notes: existing.notes ?? ''
});

const handleSearch = async () => {
  const word = (els.searchInput.value ?? '').trim();
  if (!word) {
    showToast(t('toasts.error.emptyWord'), 'error');
    return;
  }
  
  // Cancel previous search if any
  if (state.currentSearchController) {
    state.currentSearchController.abort();
  }
  
  // Show skeleton loader immediately for better UX
  renderAiSkeleton();
  
  // Show loading toast and disable inputs
  const loadingToast = showToast(t('vocab.search.analyzing'), 'loading', 0);
  els.searchBtn.disabled = true;
  els.searchInput.disabled = true;
  
  // Create new abort controller
  state.currentSearchController = new AbortController();
  
  try {
    // Find existing word (fast - no await needed)
    const existing = state.words.find((item) => item.word.toLowerCase() === word.toLowerCase());
    
    // Check cache first
    let aiResult = getCachedAiResult(word);
    
    if (!aiResult) {
      // Call AI analysis (this is the slowest part)
      aiResult = await window.api.ai.analyzeWord(word);
      
      // Cache the result
      setCachedAiResult(word, aiResult);
    }
    
    // Normalize result
    const payload = normalizeAiResult(word, aiResult, existing || {});

    // Save to database (IPC handler will trigger background word update)
    const saved = existing 
      ? await window.api.words.update(existing.id, payload)
      : await window.api.words.create(payload);

    // Update UI immediately without waiting for full refresh
    state.selectedWordId = saved.id;
    
    // Update word in local state immediately for instant UI update
    if (existing) {
      const idx = state.words.findIndex(w => w.id === existing.id);
      if (idx !== -1) state.words[idx] = saved;
    } else {
      state.words.push(saved);
    }
    
    // Render immediately with local state (no IPC call needed)
    renderWordTable();
    renderAiResult(saved);
    updateTableTitle();
    
    // Refresh profile to update stats and streak
    loadProfile().catch(err => console.error('[Profile] Refresh error:', err));
    
    // Hide loading and show success
    hideToast(loadingToast);
    showToast(t('toasts.success.analyzed'), 'success');
    els.searchInput.value = '';
  } catch (error) {
    // Don't show error if request was cancelled
    if (error.name === 'AbortError') {
      return;
    }
    
    hideToast(loadingToast);
    clearAiOutput(); // Clear skeleton on error
    showToast(error.message ?? t('toasts.error.analyzeFailed'), 'error');
  } finally {
    els.searchBtn.disabled = false;
    els.searchInput.disabled = false;
    state.currentSearchController = null;
  }
};

const updateTheme = (theme) => {
  state.theme = theme;
  const applied =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.body.dataset.theme = applied;
  
  // Update select value in settings modal if open
  if (els.themeSelect) {
    els.themeSelect.value = state.theme;
  }
  
  // Sync theme to magic search window
  if (window.api?.magicSearch?.syncTheme) {
    window.api.magicSearch.syncTheme(applied).catch(() => {
      // Magic search might not be open, ignore error
    });
  }
};


const handleThemeSelect = async (theme) => {
  try {
    const savedTheme = await window.api.preferences.setTheme(theme);
    updateTheme(savedTheme);
    showToast(t('toasts.success.themeChanged'), 'success');
  } catch (error) {
    showToast(error.message ?? t('toasts.error.failed'), 'error');
  }
};

const initWordSubscription = () => {
  if (unsubscribeWordsChanged) {
    unsubscribeWordsChanged();
  }
  unsubscribeWordsChanged = window.api.words.onChanged((words) => {
    state.words = words;
    if (state.selectedWordId && !state.words.some((w) => w.id === state.selectedWordId)) {
      state.selectedWordId = null;
      clearAiOutput();
    }
    renderWordTable();
    if (state.selectedWordId) {
      const current = state.words.find((item) => item.id === state.selectedWordId);
      renderAiResult(current);
    } else if (!state.lastAiResult) {
      clearAiOutput();
    }
  });
};

const switchTab = (tabName) => {
  // Update tabs
  els.tabs.forEach((tab) => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update tab contents
  els.tabContents.forEach((content) => {
    if (content.dataset.tab === tabName) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
};

const handleTabClick = (event) => {
  const tab = event.currentTarget;
  const tabName = tab.dataset.tab;
  if (tabName) {
    switchTab(tabName);
  }
};

const clearScoringOutput = () => {
  if (!els.scoringOutput) return;
  els.scoringOutput.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">✍️</div>
      <h3 class="empty-state-title">${t('scoring.result.empty')}</h3>
      <p class="empty-state-text">Nhập câu tiếng Anh vào ô bên trái và nhấn "Chấm điểm" để nhận phân tích chi tiết</p>
      <div class="sample-sentences">
        <p class="sample-title">Thử với các câu mẫu:</p>
        <button class="sample-btn" data-sample="I goes to school every day.">I goes to school every day.</button>
        <button class="sample-btn" data-sample="She don't like coffee.">She don't like coffee.</button>
        <button class="sample-btn" data-sample="The book is on the table and it very interesting.">The book is on table and it very interesting.</button>
      </div>
    </div>
  `;
  
  // Add click handlers for sample buttons
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (els.sentenceInput) {
        els.sentenceInput.value = btn.dataset.sample;
        els.sentenceInput.focus();
        updateCharCount();
      }
    });
  });
};

// Render skeleton loader for scoring
const renderScoringSkeleton = () => {
  if (!els.scoringOutput) return;
  els.scoringOutput.innerHTML = `
    <div class="scoring-skeleton">
      <!-- Score Circle -->
      <div class="skeleton-score-section">
        <div class="skeleton-score-circle">
          <div class="skeleton-shimmer-circle"></div>
        </div>
        <div class="skeleton-line skeleton-shimmer" style="width: 60%; height: 18px; margin: 16px auto 0;"></div>
      </div>
      
      <!-- Sentence Section -->
      <div class="skeleton-section">
        <div class="skeleton-line skeleton-shimmer" style="width: 40%; height: 20px; margin-bottom: 12px;"></div>
        <div class="skeleton-box skeleton-shimmer" style="height: 80px; margin-bottom: 24px;"></div>
      </div>
      
      <!-- Errors Section -->
      <div class="skeleton-section">
        <div class="skeleton-line skeleton-shimmer" style="width: 35%; height: 20px; margin-bottom: 12px;"></div>
        <div class="skeleton-box skeleton-shimmer" style="height: 100px; margin-bottom: 12px;"></div>
        <div class="skeleton-box skeleton-shimmer" style="height: 100px; margin-bottom: 24px;"></div>
      </div>
      
      <!-- Improvements Section -->
      <div class="skeleton-section">
        <div class="skeleton-line skeleton-shimmer" style="width: 45%; height: 20px; margin-bottom: 12px;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width: 100%; height: 14px; margin-bottom: 8px;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width: 95%; height: 14px; margin-bottom: 8px;"></div>
        <div class="skeleton-line skeleton-shimmer" style="width: 85%; height: 14px;"></div>
      </div>
    </div>
  `;
};

const highlightErrors = (sentence, errors) => {
  if (!errors || errors.length === 0) {
    return sentence;
  }
  
  // Sort errors by start_index descending to avoid index shifting
  const sortedErrors = [...errors].sort((a, b) => b.start_index - a.start_index);
  let highlighted = sentence;
  
  for (const error of sortedErrors) {
    const before = highlighted.slice(0, error.start_index);
    const errorText = highlighted.slice(error.start_index, error.end_index);
    const after = highlighted.slice(error.end_index);
    highlighted = `${before}<mark class="error-highlight" data-error-type="${error.type}" title="${error.explanation}">${errorText}</mark>${after}`;
  }
  
  return highlighted;
};

const renderScoringResult = (sentence, result) => {
  if (!result || !els.scoringOutput) return;
  
  const highlightedSentence = highlightErrors(sentence, result.errors);
  const scoreColor = result.score >= 9 ? '#22c55e' : result.score >= 7 ? '#f59e0b' : '#ef4444';
  
  let html = `
    <div class="scoring-score-section">
      <div class="score-display" style="--score-color: ${scoreColor}">
        <span class="score-value">${result.score.toFixed(1)}</span>
        <span class="score-max">/ 10</span>
      </div>
      <p class="overall-feedback">${result.overall_feedback || t('scoring.result.noFeedback')}</p>
    </div>
    
    <div class="scoring-sentence-section">
      <h3 class="section-title">${t('scoring.result.yourSentence')}</h3>
      <div class="sentence-display">${highlightedSentence}</div>
    </div>
  `;
  
  if (result.errors && result.errors.length > 0) {
    html += `
      <div class="scoring-errors-section">
        <h3 class="section-title">${t('scoring.result.errors.title')} (${result.errors.length}):</h3>
        <div class="errors-list">
    `;
    result.errors.forEach((error, index) => {
      html += `
        <div class="error-item" data-error-index="${index}">
          <div class="error-header">
            <span class="error-type-badge error-type-${error.type}">${error.type}</span>
            <span class="error-text">"${error.text}"</span>
          </div>
          <div class="error-details">
            <p class="error-explanation">${error.explanation}</p>
            <div class="error-correction">
              <strong>${t('scoring.result.errors.fixTo')}</strong> <span class="correction-text">${error.correction}</span>
            </div>
            ${error.suggestion ? `<p class="error-suggestion">💡 ${error.suggestion}</p>` : ''}
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
  }
  
  if (result.strengths && result.strengths.length > 0) {
    html += `
      <div class="scoring-strengths-section">
        <h3 class="section-title">${t('scoring.result.strengths.title')}</h3>
        <ul class="strengths-list">
    `;
    result.strengths.forEach(strength => {
      html += `<li>✅ ${strength}</li>`;
    });
    html += `</ul></div>`;
  }
  
  if (result.improvements && result.improvements.length > 0) {
    html += `
      <div class="scoring-improvements-section">
        <h3 class="section-title">${t('scoring.result.improvements.title')}</h3>
        <div class="improvements-list">
    `;
    result.improvements.forEach(improvement => {
      html += `
        <div class="improvement-item">
          <strong>${improvement.aspect}:</strong> ${improvement.suggestion}
        </div>
      `;
    });
    html += `</div></div>`;
  }
  
  if (result.grammar_analysis) {
    html += `
      <div class="scoring-grammar-section">
        <h3 class="section-title">${t('scoring.result.grammar.title')}</h3>
        <div class="grammar-details">
          ${result.grammar_analysis.tense ? `<p><strong>${t('scoring.result.grammar.tense')}</strong> ${result.grammar_analysis.tense}</p>` : ''}
          ${result.grammar_analysis.subject_verb_agreement ? `<p><strong>${t('scoring.result.grammar.subjectVerb')}</strong> ${result.grammar_analysis.subject_verb_agreement}</p>` : ''}
          ${result.grammar_analysis.word_order ? `<p><strong>${t('scoring.result.grammar.wordOrder')}</strong> ${result.grammar_analysis.word_order}</p>` : ''}
          ${result.grammar_analysis.articles ? `<p><strong>${t('scoring.result.grammar.articles')}</strong> ${result.grammar_analysis.articles}</p>` : ''}
        </div>
      </div>
    `;
  }
  
  if (result.vocabulary_analysis) {
    html += `
      <div class="scoring-vocab-section">
        <h3 class="section-title">${t('scoring.result.vocabulary.title')}</h3>
        <div class="vocab-details">
          ${result.vocabulary_analysis.level ? `<p><strong>${t('scoring.result.vocabulary.level')}</strong> ${result.vocabulary_analysis.level}</p>` : ''}
          ${result.vocabulary_analysis.appropriateness ? `<p><strong>${t('scoring.result.vocabulary.appropriateness')}</strong> ${result.vocabulary_analysis.appropriateness}</p>` : ''}
          ${result.vocabulary_analysis.suggestions && result.vocabulary_analysis.suggestions.length > 0 ? `
            <p><strong>${t('scoring.result.vocabulary.suggestions')}</strong></p>
            <ul>
              ${result.vocabulary_analysis.suggestions.map(s => `<li>${s}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  els.scoringOutput.innerHTML = html;
};

// Update character count
const updateCharCount = () => {
  const charCountEl = document.getElementById('char-count');
  if (charCountEl && els.sentenceInput) {
    const length = els.sentenceInput.value.length;
    charCountEl.textContent = length;
    
    // Color feedback
    if (length > 500) {
      charCountEl.style.color = 'var(--color-muted)';
    } else if (length > 0) {
      charCountEl.style.color = 'var(--color-accent)';
    } else {
      charCountEl.style.color = 'var(--color-muted)';
    }
  }
};

// Auto-resize textarea
const autoResizeTextarea = (textarea) => {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
};

const handleScoreSentence = async () => {
  const sentence = (els.sentenceInput?.value ?? '').trim();
  if (!sentence) {
    showToast(t('toasts.error.emptySentence'), 'error');
    return;
  }
  
  // Show skeleton loader immediately
  renderScoringSkeleton();
  
  const loadingToast = showToast(t('scoring.analyzing'), 'loading', 0);
  els.scoreBtn.disabled = true;
  els.sentenceInput.disabled = true;
  
  try {
    const result = await window.api.ai.analyzeSentence(sentence);
    renderScoringResult(sentence, result);
    hideToast(loadingToast);
    showToast(t('toasts.success.scoringComplete'), 'success');
    // Refresh profile to update sentence count
    await loadProfile().catch(err => console.error('[Profile] Refresh error:', err));
  } catch (error) {
    console.error('[Scoring] Error:', error);
    clearScoringOutput(); // Clear skeleton on error
    els.scoringOutput.innerHTML = `
      <div class="scoring-error">
        <p class="error-message">❌ ${error.message ?? t('toasts.error.scoringFailed')}</p>
      </div>
    `;
    hideToast(loadingToast);
    showToast(error.message ?? t('toasts.error.scoringFailed'), 'error');
  } finally {
    els.scoreBtn.disabled = false;
    els.sentenceInput.disabled = false;
  }
};

const attachListeners = () => {
  // Magic Search
  els.magicSearchBtn?.addEventListener('click', () => {
    window.api?.magicSearch?.toggle();
  });

  // Keyboard shortcut: Ctrl+K or Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      window.api?.magicSearch?.toggle();
    }
  });

  // Settings
  els.settingsBtn?.addEventListener('click', openSettings);
  
  // Window controls
  const minimizeBtn = document.getElementById('window-minimize');
  const maximizeBtn = document.getElementById('window-maximize');
  const closeBtn = document.getElementById('window-close');
  
  minimizeBtn?.addEventListener('click', () => {
    window.api?.window?.minimize();
  });
  
  maximizeBtn?.addEventListener('click', () => {
    window.api?.window?.maximize();
  });
  
  closeBtn?.addEventListener('click', () => {
    window.api?.window?.close();
  });
  
  // Theme and language selection with dropdowns
  els.themeSelect?.addEventListener('change', (e) => {
    handleThemeSelect(e.target.value);
  });
  
  els.languageSelect?.addEventListener('change', (e) => {
    handleLanguageSelect(e.target.value);
  });

  // AI Settings
  els.aiProviderSelect?.addEventListener('change', handleProviderChange);
  els.toggleOllamaApiKey?.addEventListener('click', () => togglePasswordVisibility(els.ollamaCloudApiKey));
  els.toggleOpenaiApiKey?.addEventListener('click', () => togglePasswordVisibility(els.openaiApiKey));
  els.testOllamaCloud?.addEventListener('click', () => testConnection('ollama-cloud'));
  els.testOllamaLocal?.addEventListener('click', () => testConnection('ollama-local'));
  els.testOpenai?.addEventListener('click', () => testConnection('openai'));
  els.saveAiSettings?.addEventListener('click', saveAiSettings);
  
  // Tab switching
  els.tabs.forEach((tab) => {
    tab.addEventListener('click', handleTabClick);
  });
  
  els.searchBtn.addEventListener('click', handleSearch);
  els.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  });
  els.dbNew.addEventListener('click', openDbModal);
  els.dbRename.addEventListener('click', handleDbRename);
  els.dbDelete.addEventListener('click', handleDbDelete);
  els.pathSelect.addEventListener('change', handlePathChange);
  els.pathPin.addEventListener('click', handlePathPin);
  els.pathRemove.addEventListener('click', handlePathRemove);
  els.wordTableBody.addEventListener('click', handleTableClick);
  els.dbModal.addEventListener('close', () => {
    els.dbModalInput.value = '';
  });
  els.dbModalConfirm.addEventListener('click', (event) => {
    event.preventDefault();
    handleDbCreate(els.dbModalInput.value);
  });
  els.dbModal.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleDbCreate(els.dbModalInput.value);
    }
  });
  
  // Prompt modal Enter key
  els.promptModalInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      els.promptModalConfirm?.click();
    }
  });
  
  // Click backdrop to close modals
  els.confirmModal?.addEventListener('click', (event) => {
    if (event.target === els.confirmModal) {
      els.confirmModal.close('cancel');
    }
  });
  
  els.promptModal?.addEventListener('click', (event) => {
    if (event.target === els.promptModal) {
      els.promptModal.close('cancel');
    }
  });
  
  // Settings modal backdrop click
  els.settingsModal?.addEventListener('click', (event) => {
    if (event.target === els.settingsModal) {
      els.settingsModal.close();
    }
  });
  
  // Scoring tab handlers
  els.scoreBtn?.addEventListener('click', handleScoreSentence);
  els.sentenceInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleScoreSentence();
    }
  });
  
  // Character counter and auto-resize
  els.sentenceInput?.addEventListener('input', () => {
    updateCharCount();
    autoResizeTextarea(els.sentenceInput);
  });
  
  // Initialize char count
  if (els.sentenceInput) {
    updateCharCount();
  }

  // Profile & Streaks tab handlers
  if (els.editGoalsBtn) {
    els.editGoalsBtn.addEventListener('click', editGoals);
    console.log('[Profile] Edit goals button attached');
  } else {
    console.warn('[Profile] Edit goals button not found');
  }
  
  if (els.useFreezeBtn) {
    els.useFreezeBtn.addEventListener('click', useStreakFreeze);
    console.log('[Profile] Freeze button attached');
  } else {
    console.warn('[Profile] Freeze button not found');
  }
  
  // Toggle calendar collapse/expand
  const toggleCalendarBtn = document.getElementById('toggle-calendar-btn');
  const calendarContent = document.getElementById('calendar-content');
  if (toggleCalendarBtn && calendarContent) {
    // Restore saved state
    const isCollapsed = localStorage.getItem('calendarCollapsed') === 'true';
    if (isCollapsed) {
      calendarContent.classList.add('collapsed');
      toggleCalendarBtn.querySelector('.toggle-icon').textContent = '▶';
    }
    
    toggleCalendarBtn.addEventListener('click', () => {
      const collapsed = calendarContent.classList.toggle('collapsed');
      toggleCalendarBtn.querySelector('.toggle-icon').textContent = collapsed ? '▶' : '▼';
      localStorage.setItem('calendarCollapsed', collapsed);
    });
  }
};

const updateUIWithLabels = () => {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      const text = t(key);
      if (text && text !== key) {
        // Use innerHTML for elements that may contain HTML (like links)
        if (el.classList.contains('provider-description') || el.classList.contains('settings-description')) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    }
  });

  // Update elements with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      const text = t(key);
      if (text && text !== key) {
        el.title = text;
      }
    }
  });

  // Update elements with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      const text = t(key);
      if (text && text !== key) {
        el.placeholder = text;
      }
    }
  });

  // Update specific placeholders
  const searchInput = document.getElementById('word-search-input');
  if (searchInput) searchInput.placeholder = t('vocab.search.placeholder');

  const sentenceInput = document.getElementById('sentence-input');
  if (sentenceInput) sentenceInput.placeholder = t('scoring.input.placeholder');

  // Update button texts
  const searchBtn = document.getElementById('word-search-btn');
  if (searchBtn) searchBtn.textContent = t('vocab.search.button');

  const scoreBtn = document.getElementById('score-btn');
  if (scoreBtn) scoreBtn.textContent = t('scoring.input.button');

  // Update tab labels
  const vocabTab = document.querySelector('[data-tab="vocab"] .tab-label');
  if (vocabTab) vocabTab.textContent = t('tabs.vocab');

  const scoringTab = document.querySelector('[data-tab="scoring"] .tab-label');
  if (scoringTab) scoringTab.textContent = t('tabs.scoring');

  // Update window control titles
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.title = t('window.settings');

  const minimizeBtn = document.getElementById('window-minimize');
  if (minimizeBtn) minimizeBtn.title = t('window.minimize');

  const maximizeBtn = document.getElementById('window-maximize');
  if (maximizeBtn) maximizeBtn.title = t('window.maximize');

  const closeBtn = document.getElementById('window-close');
  if (closeBtn) closeBtn.title = t('window.close');
};

const updateLanguageActiveState = () => {
  if (els.languageSelect) {
    els.languageSelect.value = state.language;
  }
};

const initLanguage = async () => {
  try {
    const lang = await window.api.preferences.getLanguage();
    state.language = lang;
    await loadLabels(lang);
    updateUIWithLabels();
    updateLanguageActiveState();
  } catch (error) {
    console.warn('Could not load language preference', error);
    await loadLabels('vi');
    updateUIWithLabels();
    updateLanguageActiveState();
  }
  
  // Listen for language changes
  document.addEventListener('languageChanged', () => {
    updateUIWithLabels();
    updateLanguageActiveState();
  });
};

const handleLanguageSelect = async (lang) => {
  try {
    await window.api.preferences.setLanguage(lang);
    state.language = lang;
    await setLanguage(lang);
    updateUIWithLabels();
    
    // Update select value
    if (els.languageSelect) {
      els.languageSelect.value = lang;
    }
    
    showToast(t('toasts.success.saved'), 'success');
  } catch (error) {
    console.error('[Language] Error:', error);
    showToast(error.message ?? t('toasts.error.failed'), 'error');
  }
};

const initTheme = async () => {
  const systemMedia = window.matchMedia('(prefers-color-scheme: dark)');
  systemMedia.addEventListener('change', () => {
    if (state.theme === 'system') {
      updateTheme('system');
    }
  });
  try {
    const theme = await window.api.preferences.getTheme();
    updateTheme(theme);
  } catch (error) {
    console.warn('Could not load theme preference', error);
    updateTheme('light');
  }
};

// AI Settings Functions
const handleProviderChange = (event) => {
  const provider = event.target.value;
  showProviderSettings(provider);
};

const showProviderSettings = (provider) => {
  // Hide all provider settings
  if (els.ollamaCloudSettings) els.ollamaCloudSettings.style.display = 'none';
  if (els.ollamaLocalSettings) els.ollamaLocalSettings.style.display = 'none';
  if (els.openaiSettings) els.openaiSettings.style.display = 'none';
  
  // Show selected provider settings
  switch (provider) {
    case 'ollama-cloud':
      if (els.ollamaCloudSettings) els.ollamaCloudSettings.style.display = 'block';
      break;
    case 'ollama-local':
      if (els.ollamaLocalSettings) els.ollamaLocalSettings.style.display = 'block';
      break;
    case 'openai':
      if (els.openaiSettings) els.openaiSettings.style.display = 'block';
      break;
  }
};

const togglePasswordVisibility = (inputEl) => {
  if (!inputEl) return;
  inputEl.type = inputEl.type === 'password' ? 'text' : 'password';
};

const testConnection = async (provider) => {
  let config = { provider };
  let testButton;

  switch (provider) {
    case 'ollama-cloud': {
      const apiKey = els.ollamaCloudApiKey?.value || '';
      const model = els.ollamaCloudModel?.value || 'gpt-oss:20b-cloud';

      if (!apiKey) {
        showToast(t('toasts.error.apiKeyRequired'), 'error');
        return;
      }

      config.ollamaCloud = { apiKey, model };
      testButton = els.testOllamaCloud;
      break;
    }

    case 'ollama-local': {
      const host = els.ollamaLocalHost?.value || 'http://localhost:11434';
      const model = els.ollamaLocalModel?.value || 'llama3.2:latest';

      config.ollamaLocal = { host, model };
      testButton = els.testOllamaLocal;
      break;
    }

    case 'openai': {
      const endpoint = els.openaiEndpoint?.value || 'https://api.openai.com';
      const apiKey = els.openaiApiKey?.value || '';
      const model = els.openaiModel?.value || 'gpt-4o-mini';

      if (!apiKey) {
        showToast(t('toasts.error.apiKeyRequired'), 'error');
        return;
      }

      config.openai = { endpoint, apiKey, model };
      testButton = els.testOpenai;
      break;
    }

    default:
      showToast(t('toasts.error.unknownProvider'), 'error');
      return;
  }

  const loadingToast = showToast(t('toasts.info.testingConnection'), 'loading', 0);
  if (testButton) testButton.disabled = true;

  try {
    const result = await window.api.invoke('settings:test-connection', config);

    hideToast(loadingToast);

    if (result.success) {
      let message = result.message || t('toasts.success.connectionSuccess');
      if (result.models && result.models.length > 0) {
        message += ` (${t('toasts.success.modelsAvailable', { count: result.models.length })})`;
      }
      showToast(message, 'success');
    } else {
      showToast(result.message || t('toasts.error.connectionFailed'), 'error');
    }
  } catch (error) {
    console.error('[AI Settings] Test connection error:', error);
    hideToast(loadingToast);
    showToast(error.message || t('toasts.error.connectionFailed'), 'error');
  } finally {
    if (testButton) testButton.disabled = false;
  }
};

const loadAiSettings = async () => {
  try {
    const config = await window.api.invoke('settings:get-ai-config');
    
    // Set provider selection
    if (els.aiProviderSelect && config.provider) {
      els.aiProviderSelect.value = config.provider;
      showProviderSettings(config.provider);
    }
    
    // Load Ollama Cloud settings
    if (config.ollamaCloud) {
      if (els.ollamaCloudApiKey) els.ollamaCloudApiKey.value = config.ollamaCloud.apiKey || '';
      if (els.ollamaCloudModel) els.ollamaCloudModel.value = config.ollamaCloud.model || 'gpt-oss:20b-cloud';
    }
    
    // Load Ollama Local settings
    if (config.ollamaLocal) {
      if (els.ollamaLocalHost) els.ollamaLocalHost.value = config.ollamaLocal.host || 'http://localhost:11434';
      if (els.ollamaLocalModel) els.ollamaLocalModel.value = config.ollamaLocal.model || 'llama3.2:latest';
    }
    
    // Load OpenAI settings
    if (config.openai) {
      if (els.openaiEndpoint) els.openaiEndpoint.value = config.openai.endpoint || 'https://api.openai.com';
      if (els.openaiApiKey) els.openaiApiKey.value = config.openai.apiKey || '';
      if (els.openaiModel) els.openaiModel.value = config.openai.model || 'gpt-4o-mini';
    }
  } catch (error) {
    console.error('[AI Settings] Load error:', error);
  }
};

const saveAiSettings = async () => {
  const loadingToast = showToast(t('toasts.info.savingSettings'), 'loading', 0);

  try {
    const provider = els.aiProviderSelect?.value || 'ollama-cloud';
    const config = { provider };

    // Add provider-specific settings
    if (provider === 'ollama-cloud') {
      config.ollamaCloud = {
        apiKey: els.ollamaCloudApiKey?.value || '',
        model: els.ollamaCloudModel?.value || 'gpt-oss:20b-cloud'
      };
    } else if (provider === 'ollama-local') {
      config.ollamaLocal = {
        host: els.ollamaLocalHost?.value || 'http://localhost:11434',
        model: els.ollamaLocalModel?.value || 'llama3.2:latest'
      };
    } else if (provider === 'openai') {
      config.openai = {
        endpoint: els.openaiEndpoint?.value || 'https://api.openai.com',
        apiKey: els.openaiApiKey?.value || '',
        model: els.openaiModel?.value || 'gpt-4o-mini'
      };
    }

    await window.api.invoke('settings:save-ai-config', config);

    hideToast(loadingToast);
    showToast(t('toasts.success.settingsSaved'), 'success');
  } catch (error) {
    console.error('[AI Settings] Save error:', error);
    hideToast(loadingToast);
    showToast(error.message || t('toasts.error.saveFailed'), 'error');
  }
};

const openSettings = async () => {
  if (!els.settingsModal) return;
  
  // Update theme and language selects
  if (els.themeSelect) {
    els.themeSelect.value = state.theme;
  }
  if (els.languageSelect) {
    els.languageSelect.value = state.language;
  }
  
  // Load AI settings
  await loadAiSettings();
  els.settingsModal.showModal();
};

// ========== Profile & Streaks Functions ==========

const achievementsList = [
  { id: 'first_word', icon: '🎯', name: 'First Step', desc: 'Add your first word' },
  { id: 'vocab_10', icon: '📚', name: 'Learner', desc: 'Learn 10 words' },
  { id: 'vocab_50', icon: '📖', name: 'Bookworm', desc: 'Learn 50 words' },
  { id: 'vocab_100', icon: '🎓', name: 'Scholar', desc: 'Learn 100 words' },
  { id: 'vocab_500', icon: '🏅', name: 'Expert', desc: 'Learn 500 words' },
  { id: 'vocab_1000', icon: '👑', name: 'Master', desc: 'Learn 1000 words' },
  { id: 'streak_3', icon: '🔥', name: '3-Day Streak', desc: 'Stay consistent for 3 days' },
  { id: 'streak_7', icon: '✨', name: 'Week Warrior', desc: 'Maintain 7-day streak' },
  { id: 'streak_30', icon: '💎', name: 'Month Master', desc: 'Reach 30-day streak' },
  { id: 'streak_100', icon: '🏆', name: 'Century Club', desc: '100-day streak!' },
  { id: 'perfect_week', icon: '⭐', name: 'Perfect Week', desc: 'Active all 7 days' }
];

const loadProfile = async () => {
  try {
    // First update stats from current words database
    await window.api.profile.updateStats();
    
    const profile = await window.api.profile.get();
    if (!profile) return;

    // Update stats cards - use database word count for accuracy
    const currentWordCount = state.words?.length || 0;
    if (els.totalWords) els.totalWords.textContent = currentWordCount;
    if (els.currentStreak) els.currentStreak.textContent = profile.streaks?.current || 0;
    if (els.longestStreak) els.longestStreak.textContent = profile.streaks?.longest || 0;
    if (els.totalAchievements) els.totalAchievements.textContent = profile.achievements?.length || 0;

    // Update goals
    const goals = profile.goals || { dailyWords: 5, weeklyWords: 30 };
    if (els.dailyGoal) els.dailyGoal.textContent = goals.dailyWords;
    if (els.weeklyGoal) els.weeklyGoal.textContent = goals.weeklyWords;

    // Calculate progress
    const today = new Date().toISOString().split('T')[0];
    const todayActivity = profile.streaks?.history?.find(h => h.date === today);
    const dailyWordsToday = todayActivity?.wordsAdded || 0;

    // Calculate weekly progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const weeklyWordsCount = profile.streaks?.history
      ?.filter(h => h.date >= weekAgoStr)
      .reduce((sum, h) => sum + (h.wordsAdded || 0), 0) || 0;

    if (els.dailyProgress) els.dailyProgress.textContent = dailyWordsToday;
    if (els.weeklyProgress) els.weeklyProgress.textContent = weeklyWordsCount;

    const dailyPercent = Math.min((dailyWordsToday / goals.dailyWords) * 100, 100);
    const weeklyPercent = Math.min((weeklyWordsCount / goals.weeklyWords) * 100, 100);
    
    if (els.dailyProgressBar) els.dailyProgressBar.style.width = `${dailyPercent}%`;
    if (els.weeklyProgressBar) els.weeklyProgressBar.style.width = `${weeklyPercent}%`;

    // Update freezes
    if (els.freezesAvailable) {
      els.freezesAvailable.textContent = profile.streaks?.freezesAvailable || 0;
    }

    // Render activity calendar
    renderActivityCalendar(profile.streaks?.history || []);

    // Render achievements
    renderAchievements(profile.achievements || []);

    // Render charts
    renderLevelChart(profile.stats?.byLevel || {});
    renderTypeChart(profile.stats?.byType || {});

  } catch (error) {
    console.error('[Profile] Load error:', error);
  }
};

const renderActivityCalendar = (history) => {
  if (!els.activityCalendar) return;

  els.activityCalendar.innerHTML = '';
  
  // Add weekday labels
  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  weekdays.forEach(day => {
    const label = document.createElement('div');
    label.className = 'calendar-weekday-label';
    label.textContent = day;
    els.activityCalendar.appendChild(label);
  });
  
  // Get last 21 days to show 3 weeks (3 rows x 7 days) - more compact
  const days = [];
  for (let i = 20; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const activity = history?.find(h => h.date === dateStr);
    days.push({
      date: dateStr,
      day: date.getDate(),
      wordsAdded: activity?.wordsAdded || 0,
      sentencesScored: activity?.sentencesScored || 0,
      frozen: activity?.frozen || false
    });
  }

  const today = new Date().toISOString().split('T')[0];

  days.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    // Activity level
    const total = day.wordsAdded + day.sentencesScored;
    if (total === 0) dayEl.classList.add('activity-none');
    else if (total <= 2) dayEl.classList.add('activity-low');
    else if (total <= 5) dayEl.classList.add('activity-medium');
    else dayEl.classList.add('activity-high');

    if (day.date === today) dayEl.classList.add('today');
    if (day.frozen) dayEl.classList.add('frozen');

    dayEl.textContent = day.day;
    dayEl.title = `${day.date}\n${day.wordsAdded} words, ${day.sentencesScored} sentences${day.frozen ? '\n❄️ Freeze used' : ''}`;

    els.activityCalendar.appendChild(dayEl);
  });
};

const renderAchievements = (unlockedAchievements) => {
  if (!els.achievementsGrid) return;

  els.achievementsGrid.innerHTML = '';

  achievementsList.forEach(achievement => {
    const unlocked = unlockedAchievements.find(a => a.id === achievement.id);
    
    const badge = document.createElement('div');
    badge.className = 'achievement-badge';
    if (!unlocked) badge.classList.add('locked');

    badge.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-name">${achievement.name}</div>
      <div class="achievement-desc">${achievement.desc}</div>
      ${unlocked ? `<div class="achievement-date">${new Date(unlocked.unlockedAt).toLocaleDateString()}</div>` : ''}
    `;

    badge.title = unlocked ? `Unlocked on ${new Date(unlocked.unlockedAt).toLocaleString()}` : 'Not yet unlocked';

    els.achievementsGrid.appendChild(badge);
  });
};

const renderLevelChart = (byLevel) => {
  if (!els.levelChart) return;

  els.levelChart.innerHTML = '';

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const maxCount = Math.max(...levels.map(l => byLevel[l] || 0), 1);

  levels.forEach(level => {
    const count = byLevel[level] || 0;
    const percent = (count / maxCount) * 100;

    const barContainer = document.createElement('div');
    barContainer.className = 'chart-bar';
    barContainer.innerHTML = `
      <div class="chart-label">${level}</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${percent}%">
          ${count > 0 ? `<span class="chart-value">${count}</span>` : ''}
        </div>
      </div>
    `;

    els.levelChart.appendChild(barContainer);
  });
};

const renderTypeChart = (byType) => {
  if (!els.typeChart) return;

  els.typeChart.innerHTML = '';

  const types = [
    { key: 'noun', label: 'Noun' },
    { key: 'verb', label: 'Verb' },
    { key: 'adjective', label: 'Adj' },
    { key: 'adverb', label: 'Adv' },
    { key: 'other', label: 'Other' }
  ];

  const maxCount = Math.max(...types.map(t => byType[t.key] || 0), 1);

  types.forEach(type => {
    const count = byType[type.key] || 0;
    const percent = (count / maxCount) * 100;

    const barContainer = document.createElement('div');
    barContainer.className = 'chart-bar';
    barContainer.innerHTML = `
      <div class="chart-label">${type.label}</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${percent}%">
          ${count > 0 ? `<span class="chart-value">${count}</span>` : ''}
        </div>
      </div>
    `;

    els.typeChart.appendChild(barContainer);
  });
};

const editGoals = async () => {
  try {
    const profile = await window.api.profile.get();
    const currentGoals = profile?.goals || { dailyWords: 5, weeklyWords: 30 };

    // Set current values
    if (els.goalsDailyInput) els.goalsDailyInput.value = currentGoals.dailyWords;
    if (els.goalsWeeklyInput) els.goalsWeeklyInput.value = currentGoals.weeklyWords;

    // Show modal
    els.goalsModal?.showModal();

    // Handle confirm
    const handleConfirm = async () => {
      const daily = parseInt(els.goalsDailyInput?.value || '5');
      const weekly = parseInt(els.goalsWeeklyInput?.value || '30');

      if (isNaN(daily) || daily < 1 || isNaN(weekly) || weekly < 1) {
        showToast('Please enter valid numbers (minimum 1)', 'error');
        return;
      }

      try {
        await window.api.profile.updateGoals({ dailyWords: daily, weeklyWords: weekly });
        showToast('Goals updated!', 'success');
        await loadProfile();
        els.goalsModal?.close();
      } catch (error) {
        console.error('[Profile] Update goals error:', error);
        showToast('Failed to update goals', 'error');
      }
    };

    // Attach listeners
    const confirmBtn = els.goalsModalConfirm;
    if (confirmBtn) {
      // Remove old listener if exists
      const newBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode?.replaceChild(newBtn, confirmBtn);
      els.goalsModalConfirm = newBtn;
      newBtn.addEventListener('click', handleConfirm);
    }

    // Handle cancel
    const cancelBtns = els.goalsModal?.querySelectorAll('button[value="cancel"]');
    cancelBtns?.forEach(btn => {
      btn.addEventListener('click', () => els.goalsModal?.close());
    });

    // Handle backdrop click
    els.goalsModal?.addEventListener('click', (e) => {
      if (e.target === els.goalsModal) {
        els.goalsModal?.close();
      }
    });

  } catch (error) {
    console.error('[Profile] Edit goals error:', error);
    showToast('Failed to open goals editor', 'error');
  }
};

const useStreakFreeze = async () => {
  const confirm = window.confirm('Use a freeze to mark yesterday as active and maintain your streak?');
  if (!confirm) return;

  try {
    const result = await window.api.profile.useStreakFreeze();
    if (result.success) {
      showToast('Streak freeze used! Your streak is safe.', 'success');
      await loadProfile();
    } else {
      showToast(result.message || 'No freezes available', 'error');
    }
  } catch (error) {
    console.error('[Profile] Use freeze error:', error);
    showToast('Failed to use freeze', 'error');
  }
};

// Detect low-end devices and reduce animations
const isLowEndDevice = () => {
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = navigator.deviceMemory || 4;
  return hardwareConcurrency <= 4 || deviceMemory <= 4;
};

// Apply reduced motion for low-end devices
const applyPerformanceOptimizations = () => {
  if (isLowEndDevice()) {
    document.body.classList.add('reduce-motion');
    console.log('[Performance] Low-end device detected, reducing animations');
  }
};

const init = async () => {
  applyPerformanceOptimizations();
  attachListeners();
  await initLanguage(); // Load language first
  initWordSubscription();
  await initTheme();
  await refreshPathList();
  await refreshDbList();
  await refreshWords();
  clearAiOutput();
  await loadProfile(); // Load profile data
  
  // Intercept all external links and open in default browser
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && link.href) {
      // Check if it's an external link (http/https)
      if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
        e.preventDefault();
        window.api.shell.openExternal(link.href).catch(err => {
          console.error('Failed to open external link:', err);
          showToast('Failed to open link', 'error');
        });
      }
    }
  });
};

init().catch((error) => {
  console.error('Failed to initialize renderer', error);
  showToast(t('toasts.error.initFailed'), 'error');
});
