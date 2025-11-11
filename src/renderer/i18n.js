// i18n service for managing translations
let currentLanguage = 'vi'; // Default to Vietnamese
let labels = {};
let labelsLoaded = false;

const loadLabels = async (lang = 'vi') => {
  try {
    // Use relative path from renderer directory (i18n is sibling to renderer)
    const response = await fetch(`../i18n/labels.${lang}.json`, {
      cache: 'no-cache'
    });
    if (!response.ok) {
      throw new Error(`Failed to load labels for ${lang}`);
    }
    labels = await response.json();
    currentLanguage = lang;
    labelsLoaded = true;
    return labels;
  } catch (error) {
    console.error(`[i18n] Error loading labels for ${lang}:`, error);
    // Fallback to Vietnamese if English fails
    if (lang !== 'vi') {
      return loadLabels('vi');
    }
    // If even Vietnamese fails, use empty labels
    labels = {};
    labelsLoaded = true;
    return labels;
  }
};

const t = (key, params = {}) => {
  if (!labelsLoaded || !labels || Object.keys(labels).length === 0) {
    return key;
  }
  
  const keys = key.split('.');
  let value = labels;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Replace placeholders like {name}, {word}, {path} with actual values
  if (typeof params === 'object' && params !== null) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  }
  
  return value;
};

const setLanguage = async (lang) => {
  await loadLabels(lang);
  // Trigger update event
  if (document) {
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }
};

const getLanguage = () => currentLanguage;

export { t, setLanguage, getLanguage, loadLabels };



