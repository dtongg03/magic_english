// Magic Search Window - Production Ready
// Author: dtongg03

// State management
let els = null;
let isSearching = false;
let debounceTimer = null;
let searchTimeout = null;

// Detect search type
const detectSearchType = (query) => {
  const trimmed = query.trim();
  
  // Empty query
  if (!trimmed) return null;
  
  // Single word (no spaces or just one word) and only letters
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && /^[a-zA-Z-]+$/.test(trimmed)) {
    return 'word';
  }
  
  // Multiple words or question - treat as chat
  return 'chat';
};

// Show loading state
const setLoading = (loading) => {
  if (!els) return;
  isSearching = loading;
  els.spinner.classList.toggle('hidden', !loading);
  els.input.disabled = loading;
};

// Update mode badge
const updateModeBadge = (type) => {
  if (!els) return;
  if (!type) {
    els.modeBadge.classList.add('hidden');
    return;
  }
  
  els.modeBadge.className = `mode-badge ${type}`;
  
  if (type === 'word') {
    els.modeBadge.textContent = '🔍 Word';
  } else if (type === 'chat') {
    els.modeBadge.textContent = '💬 Chat';
  }
  
  els.modeBadge.classList.remove('hidden');
};

// Resize window smoothly
const resizeWindow = async (height) => {
  try {
    const currentBounds = await window.api.magicSearch.getBounds();
    await window.api.magicSearch.setBounds({
      ...currentBounds,
      height: height
    });
  } catch (error) {
    console.error('[Magic Search] Resize error:', error);
  }
};

// Clear results
const clearResults = () => {
  if (!els) return;
  els.resultsContainer.classList.add('hidden');
  els.resultsContent.innerHTML = '';
  resizeWindow(100); // Shrink to compact size
};

// Render word result
const renderWordResult = (word) => {
  if (!els) return;

  
  if (!word) {
    els.resultsContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">No word found</div>
      </div>
    `;
    return;
  }

  const tagsHTML = word.tags && word.tags.length > 0
    ? `<div class="word-section">
         <strong>Tags</strong>
         <div class="word-tags">
           ${word.tags.map(tag => `<span class="word-tag">${tag}</span>`).join('')}
         </div>
       </div>`
    : '';

  els.resultsContent.innerHTML = `
    <div class="word-result">
      <h3>${word.word}</h3>
      <div class="word-meta">
        ${word.wordType ? `<span class="word-type">${word.wordType}</span>` : ''}
        ${word.cefrLevel ? `<span class="word-level">CEFR ${word.cefrLevel}</span>` : ''}
        ${word.ipaPronunciation ? `<span class="word-pronunciation">${word.ipaPronunciation}</span>` : ''}
      </div>
      
      ${word.definition ? `
        <div class="word-section">
          <strong>Definition</strong>
          <p>${word.definition}</p>
        </div>
      ` : ''}
      
      ${word.exampleSentence ? `
        <div class="word-section">
          <strong>Example</strong>
          <p>${word.exampleSentence}</p>
        </div>
      ` : ''}
      
      ${word.notes ? `
        <div class="word-section">
          <strong>Notes</strong>
          <p>${word.notes}</p>
        </div>
      ` : ''}
      
      ${tagsHTML}
    </div>
  `;
  


  els.resultsContainer.classList.remove('hidden');




  
  // Expand window for word result
  resizeWindow(400);
};

// Render chat skeleton loader (Threads style)
const renderChatSkeleton = () => {
  if (!els) return;

  
  els.resultsContent.innerHTML = `
    <div class="chat-result">
      <div class="chat-message">
        <div class="chat-skeleton">
          <div class="skeleton-line skeleton-shimmer"></div>
          <div class="skeleton-line skeleton-shimmer"></div>
          <div class="skeleton-line skeleton-shimmer" style="width: 80%;"></div>
        </div>
      </div>
    </div>
  `;
  
  els.resultsContainer.classList.remove('hidden');
  resizeWindow(500);
};

// Render chat result with formatted response
const renderChatResult = (response) => {
  if (!els) return;

  
  if (!response) {
    renderChatError('No response from AI');
    return;
  }

  // Format response with better structure
  let formatted = '';
  try {
    formatted = formatChatResponse(response);

  } catch (error) {
    console.error('[Magic Search] Format error:', error);
    // Fallback to plain text
    formatted = `<p>${response.replace(/\n/g, '<br>')}</p>`;
  }
  
  els.resultsContent.innerHTML = `
    <div class="chat-result fade-in">
      <div class="chat-message">
        <div class="chat-text">${formatted}</div>
      </div>
    </div>
  `;
  

  els.resultsContainer.classList.remove('hidden');

  
  resizeWindow(500);
};

// Render chat error
const renderChatError = (errorMessage) => {
  if (!els) return;
  
  els.resultsContent.innerHTML = `
    <div class="chat-result">
      <div class="error-message">
        <div class="error-icon">⚠️</div>
        <div class="error-text">${errorMessage}</div>
      </div>
    </div>
  `;
  
  els.resultsContainer.classList.remove('hidden');
  resizeWindow(400);
};

// Format chat response for better readability (ChatGPT style)
const formatChatResponse = (text) => {
  if (!text) return '';
  
  let formatted = text;
  
  // Split by lines for processing
  const lines = formatted.split('\n');
  const result = [];
  let inTable = false;
  let tableLines = [];
  let inCodeBlock = false;
  let codeBlockLines = [];
  let codeLanguage = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Code blocks ```
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
        codeBlockLines = [];
      } else {
        // End code block
        inCodeBlock = false;
        const code = codeBlockLines.join('\n');
        result.push(`<pre><code class="language-${codeLanguage}">${escapeHtml(code)}</code></pre>`);
        codeBlockLines = [];
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }
    
    // Tables (markdown format)
    if (trimmed.includes('|') && trimmed.split('|').length > 2) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
      continue;
    } else if (inTable) {
      // End of table
      inTable = false;
      result.push(formatMarkdownTable(tableLines));
      tableLines = [];
    }
    
    // Headers
    if (trimmed.startsWith('####')) {
      result.push(`<h4>${trimmed.slice(4).trim()}</h4>`);
    } else if (trimmed.startsWith('###')) {
      result.push(`<h3>${trimmed.slice(3).trim()}</h3>`);
    } else if (trimmed.startsWith('##')) {
      result.push(`<h2>${trimmed.slice(2).trim()}</h2>`);
    } else if (trimmed.startsWith('#')) {
      result.push(`<h1>${trimmed.slice(1).trim()}</h1>`);
    }
    // Horizontal rule
    else if (trimmed === '---' || trimmed === '***') {
      result.push('<hr>');
    }
    // Blockquote
    else if (trimmed.startsWith('>')) {
      result.push(`<blockquote>${trimmed.slice(1).trim()}</blockquote>`);
    }
    // Bullet list
    else if (trimmed.match(/^[-•*]\s+(.+)/)) {
      const content = trimmed.replace(/^[-•*]\s+/, '');
      result.push(`<li>${formatInlineMarkdown(content)}</li>`);
    }
    // Numbered list
    else if (trimmed.match(/^\d+\.\s+(.+)/)) {
      const content = trimmed.replace(/^\d+\.\s+/, '');
      result.push(`<li class="numbered">${formatInlineMarkdown(content)}</li>`);
    }
    // Empty line
    else if (trimmed === '') {
      result.push('<br>');
    }
    // Regular paragraph
    else {
      result.push(`<p>${formatInlineMarkdown(line)}</p>`);
    }
  }
  
  // Close any open table
  if (inTable && tableLines.length > 0) {
    result.push(formatMarkdownTable(tableLines));
  }
  
  // Join all results
  let html = result.join('\n');
  
  // Wrap consecutive <li> in <ul> or <ol> - safer approach
  const htmlLines = html.split('\n');
  const finalResult = [];
  let listBuffer = [];
  let isNumberedList = false;
  
  for (const line of htmlLines) {
    if (line.trim().startsWith('<li')) {
      listBuffer.push(line);
      if (line.includes('class="numbered"')) {
        isNumberedList = true;
      }
    } else {
      // Flush list buffer
      if (listBuffer.length > 0) {
        const listTag = isNumberedList ? 'ol' : 'ul';
        finalResult.push(`<${listTag}>${listBuffer.join('\n')}</${listTag}>`);
        listBuffer = [];
        isNumberedList = false;
      }
      finalResult.push(line);
    }
  }
  
  // Flush remaining list items
  if (listBuffer.length > 0) {
    const listTag = isNumberedList ? 'ol' : 'ul';
    finalResult.push(`<${listTag}>${listBuffer.join('\n')}</${listTag}>`);
  }
  
  return finalResult.join('\n');
};

// Format inline markdown (bold, italic, code, links)
const formatInlineMarkdown = (text) => {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_ (not inside words)
    .replace(/\s\*([^\*]+)\*/g, ' <em>$1</em>')
    .replace(/\s_([^_]+)_/g, ' <em>$1</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
};

// Format markdown table to HTML
const formatMarkdownTable = (lines) => {
  if (lines.length < 2) return '';
  
  const rows = lines.map(line => {
    return line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell !== '');
  });
  
  // Skip separator line (---|---|---)
  const headerRow = rows[0];
  const bodyRows = rows.slice(2); // Skip header and separator
  
  let html = '<table class="chat-table"><thead><tr>';
  headerRow.forEach(cell => {
    html += `<th>${formatInlineMarkdown(cell)}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  bodyRows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${formatInlineMarkdown(cell)}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  return html;
};

// Escape HTML to prevent XSS
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

// Render error
const renderError = (message) => {
  if (!els) return;
  els.resultsContent.innerHTML = `
    <div class="error-message">
      ❌ ${message}
    </div>
  `;
};

// Perform search
const performSearch = async (query, type) => {
  if (!els) {
    console.error('[Magic Search] Elements not initialized!');
    return;
  }
  
  if (isSearching) {

    return;
  }
  
  clearResults();
  setLoading(true);
  
  try {

    
    if (type === 'word') {
      // Word search: Check DB first, then AI if not found

      
      try {
        // Search in database first
        const dbResults = await window.api.words.search(query);
        
        if (dbResults && dbResults.length > 0) {
          // Found in DB

          renderWordResult(dbResults[0]);
        } else {
          // Not in DB, use AI and auto-save

          const aiResult = await window.api.ai.analyzeWord(query);
          
          // Auto-save to DB

          const savedWord = await window.api.words.create({
            word: query,
            definition: aiResult.definition,
            wordType: aiResult.word_type,
            cefrLevel: aiResult.cefr_level,
            ipaPronunciation: aiResult.ipa_pronunciation,
            exampleSentence: aiResult.example_sentence,
            notes: '',
            tags: []
          });
          

          renderWordResult(savedWord);
        }
      } catch (error) {
        console.error('[Magic Search] Word search error:', error);
        throw error;
      }
    } else if (type === 'chat') {
      // Chat with AI (non-streaming with skeleton effect)

      
      // Show skeleton loader
      renderChatSkeleton();
      
      try {
        const response = await window.api.ai.chat(query);

        
        // Remove skeleton and show actual response
        renderChatResult(response);
      } catch (error) {
        console.error('[Magic Search] Chat error:', error);
        renderChatError(error.message);
        throw error;
      }
    }
    
    els.resultsContainer.classList.remove('hidden');


  } catch (error) {
    console.error('[Magic Search] Error:', error);
    renderError(error.message || 'Search failed. Please try again.');
    els.resultsContainer.classList.remove('hidden');
  } finally {
    setLoading(false);
  }
};

// Handle input change
const handleInput = () => {
  if (!els) return;
  const query = els.input.value;
  const type = detectSearchType(query);
  
  // Update mode badge
  updateModeBadge(type);
  
  // Clear timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Clear results if empty
  if (!query.trim()) {
    clearResults();
    els.modeBadge.classList.add('hidden');
  }
};

// Handle Enter key
const handleKeyDown = (e) => {
  if (!els) return;
  if (e.key === 'Enter' && !isSearching) {
    const query = els.input.value.trim();
    const type = detectSearchType(query);
    
    if (query && type) {
      performSearch(query, type);
    }
  } else if (e.key === 'Escape') {
    window.api.magicSearch.close();
  }
};

// Close window
const handleClose = () => {
  window.api.magicSearch.close();
};

// Initialize
const init = async () => {
  // Initialize DOM elements
  els = {
    input: document.getElementById('magic-input'),
    closeBtn: document.getElementById('close-btn'),
    spinner: document.querySelector('.search-spinner'),
    resultsContainer: document.querySelector('.results-container'),
    resultsContent: document.getElementById('results-content'),
    modeBadge: document.getElementById('mode-badge')
  };
  
  // Verify all elements exist
  const missing = Object.entries(els).filter(([key, el]) => !el).map(([key]) => key);
  
  if (missing.length > 0) {
    console.error('[Magic Search] Missing DOM elements:', missing);
    console.error('[Magic Search] DOM state:', document.readyState);
    console.error('[Magic Search] Body children:', document.body?.children.length);
    return;
  }
  

  
  // Focus input on load
  els.input.focus();
  
  // Event listeners
  els.input.addEventListener('input', handleInput);
  els.input.addEventListener('keydown', handleKeyDown);
  els.closeBtn.addEventListener('click', handleClose);
  
  // Apply theme
  await applyTheme();
  

};

// Theme management
const applyTheme = async () => {
  try {
    const theme = await window.api.theme.get();
    document.documentElement.setAttribute('data-theme', theme);
  } catch (error) {
    console.error('[Magic Search] Failed to get theme:', error);
  }
};

// Listen for theme changes from main app
if (window.api?.magicSearch?.onThemeChanged) {
  window.api.magicSearch.onThemeChanged((theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  });
}

// Fallback: listen for theme changes (legacy)
if (window.api?.theme?.onChange) {
  window.api.theme.onChange((theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
