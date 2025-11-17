import { fileURLToPath } from 'node:url';
import path from 'node:path';

const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && console.log(...args);
const warn = (...args) => isDev && console.warn(...args);

function buildPrompt(word) {
  return [
    `Analyze the English word '${word}'.`,
    `Provide a concise and clear analysis in JSON format. The JSON object must contain these exact keys:`,
    `- "definition": (string, in Vietnamese)`,
    `- "word_type": (string, e.g., "noun", "verb", "adjective")`,
    `- "cefr_level": (string, e.g., "A1", "A2", "B1", "B2", "C1", "C2")`,
    `- "ipa_pronunciation": (string)`,
    `- "example_sentence": (string, a clear English example)`,
    ``,
    `Example for the word 'ubiquitous':`,
    `{`,
    `    "definition": "có mặt ở khắp nơi, phổ biến",`,
    `    "word_type": "adjective",`,
    `    "cefr_level": "C1",`,
    `    "ipa_pronunciation": "/juːˈbɪkwɪtəs/",`,
    `    "example_sentence": "The company's logo has become ubiquitous all over the world."`,
    `}`,
    ``,
    `Generate the JSON for the word '${word}':`
  ].join('\n');
}

function buildSentenceAnalysisPrompt(sentence) {
  // Optimized prompt: shorter, more direct, focused on essential output
  return `Analyze this English sentence and return JSON only:

"${sentence}"

JSON format:
{
  "score": 0-10 (one decimal),
  "overall_feedback": "brief assessment in Vietnamese",
  "errors": [{"text": "incorrect text", "start_index": number, "end_index": number, "type": "grammar|vocabulary|spelling|punctuation|tense|article|preposition", "explanation": "why wrong in Vietnamese", "correction": "correct version", "suggestion": "teaching tip in Vietnamese"}],
  "strengths": ["positive aspects in Vietnamese"],
  "improvements": [{"aspect": "grammar|vocabulary|style", "suggestion": "improvement in Vietnamese"}],
  "grammar_analysis": {"tense": "assessment", "subject_verb_agreement": "assessment", "word_order": "assessment", "articles": "assessment"},
  "vocabulary_analysis": {"level": "A1-C2", "appropriateness": "assessment", "suggestions": ["better words if any"]}
}

Rules:
- If perfect, score=10
- Indices must be accurate
- Vietnamese for explanations
- JSON only, no extra text`;
}

export class AiClient {
  #preferencesStore;

  constructor(options = {}) {
    // Accept preferencesStore from options
    this.#preferencesStore = options.preferencesStore;
  }
  
  // Get API config from preferences only
  async #getApiConfig() {
    // Get from preferences
    if (this.#preferencesStore) {
      try {
        const provider = this.#preferencesStore.get('aiProvider', 'ollama-cloud');
        
        switch (provider) {
          case 'ollama-cloud': {
            const apiKey = this.#preferencesStore.get('ollamaCloudApiKey', '');
            const model = this.#preferencesStore.get('ollamaCloudModel', 'gpt-oss:20b-cloud');
            
            return {
              provider: 'ollama-cloud',
              host: 'https://ollama.com',
              apiKey: apiKey || '',
              model: model || 'gpt-oss:20b-cloud'
            };
          }
          
          case 'ollama-local': {
            const host = this.#preferencesStore.get('ollamaLocalHost', 'http://localhost:11434');
            const model = this.#preferencesStore.get('ollamaLocalModel', 'llama3.2:latest');
            
            return {
              provider: 'ollama-local',
              host: host || 'http://localhost:11434',
              apiKey: '', // Local Ollama doesn't need API key
              model: model || 'llama3.2:latest'
            };
          }
          
          case 'openai': {
            const endpoint = this.#preferencesStore.get('openaiEndpoint', 'https://api.openai.com');
            const apiKey = this.#preferencesStore.get('openaiApiKey', '');
            const model = this.#preferencesStore.get('openaiModel', 'gpt-4o-mini');
            
            return {
              provider: 'openai',
              host: endpoint || 'https://api.openai.com',
              apiKey: apiKey || '',
              model: model || 'gpt-4o-mini'
            };
          }
          
          default:
            warn(`[AiClient] Unknown provider: ${provider}, falling back to ollama-cloud`);
            return {
              provider: 'ollama-cloud',
              host: 'https://ollama.com',
              apiKey: this.#preferencesStore.get('ollamaCloudApiKey', ''),
              model: this.#preferencesStore.get('ollamaCloudModel', 'gpt-oss:20b-cloud')
            };
        }
      } catch (error) {
        warn('[AiClient] Error reading preferences:', error);
      }
    }
    
    // No preferences store - return default config
    warn('[AiClient] No preferences store available');
    return {
      provider: 'ollama-cloud',
      host: 'https://ollama.com',
      apiKey: '',
      model: 'gpt-oss:20b-cloud'
    };
  }

  #getEndpoint(config) {
    switch (config.provider) {
      case 'openai':
        return new URL('/v1/chat/completions', config.host).toString();
      case 'ollama-local':
      case 'ollama-cloud':
      default:
        return new URL('/api/chat', config.host).toString();
    }
  }

  #buildRequestBody(config, messages, options = {}) {
    const baseBody = {
      model: config.model,
      messages,
      stream: options.stream || false,
      temperature: options.temperature || 0.3
    };

    if (options.maxTokens) {
      if (config.provider === 'openai') {
        baseBody.max_tokens = options.maxTokens;
      } else {
        baseBody.max_tokens = options.maxTokens;
      }
    }

    if (options.responseFormat) {
      baseBody.response_format = options.responseFormat;
    }

    return baseBody;
  }

  #buildHeaders(config) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    return headers;
  }

  async analyzeWord(word) {
    const config = await this.#getApiConfig();
    
    if (config.provider !== 'ollama-local' && !config.apiKey) {
      const providerName = config.provider === 'openai' ? 'OpenAI' : 'Ollama Cloud';
      throw new Error(`Missing API key. Please configure your ${providerName} API key in Settings.`);
    }
    
    const endpoint = this.#getEndpoint(config);
    const messages = [{ role: 'user', content: buildPrompt(word) }];

    // Add timeout and abort controller for faster failure
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this.#buildHeaders(config),
        body: JSON.stringify(this.#buildRequestBody(config, messages, {
          stream: false,
          temperature: 0.3,
          maxTokens: 500,
          responseFormat: { type: 'json_object' }
        })),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`AI HTTP ${res.status}: ${text || res.statusText}`);
      }
      // Expect OpenAI-style response: { choices: [{ message: { content } }] }
      const data = await res.json();
      let content = '';
      if (data?.message?.content) {
        content = data.message.content;
      } else if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
        content = data.choices[0].message.content;
      } else if (typeof data === 'string') {
        content = data;
      } else {
        // Fallback: stringify and try to parse later
        content = JSON.stringify(data);
      }

      // Extract JSON object from content
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error('AI trả về nội dung không có JSON hợp lệ.');
      }
      const jsonSlice = content.slice(jsonStart, jsonEnd + 1);
      let parsed;
      try {
        parsed = JSON.parse(jsonSlice);
      } catch (err) {
        const compact = jsonSlice.replace(/\s+/g, ' ').slice(0, 400);
        const error = new Error('AI response is not valid JSON.');
        error.raw = compact;
        throw error;
      }
      return parsed;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout after 30 seconds');
      }
      throw error;
    }
  }

  async analyzeSentence(sentence, options = {}) {
    const config = await this.#getApiConfig();
    
    if (config.provider !== 'ollama-local' && !config.apiKey) {
      const providerName = config.provider === 'openai' ? 'OpenAI' : 'Ollama Cloud';
      throw new Error(`Missing API key. Please configure your ${providerName} API key in Settings.`);
    }

    const endpoint = this.#getEndpoint(config);
    const messages = [{ role: 'user', content: buildSentenceAnalysisPrompt(sentence) }];
    const useStreaming = options.stream !== false;

    if (useStreaming) {
      // Try streaming first for faster response
      try {
        return await this.#analyzeSentenceStreaming(endpoint, config, messages, options.onChunk);
      } catch (streamError) {
        warn('[AiClient] Streaming failed, falling back to non-streaming:', streamError);
        // Fall through to non-streaming
      }
    }

    // Non-streaming fallback with optimizations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: this.#buildHeaders(config),
        body: JSON.stringify(this.#buildRequestBody(config, messages, {
          stream: false,
          temperature: 0.3,
          maxTokens: 2000,
          responseFormat: { type: 'json_object' }
        })),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`AI HTTP ${res.status}: ${text || res.statusText}`);
      }

      const data = await res.json();
      let content = '';
      if (data?.message?.content) {
        content = data.message.content;
      } else if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
        content = data.choices[0].message.content;
      } else if (typeof data === 'string') {
        content = data;
      } else if (data && typeof data === 'object') {
        // If response_format worked, data might already be parsed JSON
        if (data.score !== undefined || data.errors !== undefined) {
          return data;
        }
        content = JSON.stringify(data);
      } else {
        content = JSON.stringify(data);
      }

      // Extract JSON object from content
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error('AI trả về nội dung không có JSON hợp lệ.');
      }
      const jsonSlice = content.slice(jsonStart, jsonEnd + 1);
      let parsed;
      try {
        parsed = JSON.parse(jsonSlice);
      } catch (err) {
        const compact = jsonSlice.replace(/\s+/g, ' ').slice(0, 400);
        const error = new Error('AI response is not valid JSON.');
        error.raw = compact;
        throw error;
      }
      return parsed;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI request timeout after 60 seconds.');
      }
      throw error;
    }
  }

  async #analyzeSentenceStreaming(endpoint, config, messages, onChunk) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.#buildHeaders(config),
      body: JSON.stringify(this.#buildRequestBody(config, messages, {
        stream: true,
        temperature: 0.3,
        maxTokens: 2000,
        responseFormat: { type: 'json_object' }
      }))
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI HTTP ${res.status}: ${text || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.message?.content || parsed.choices?.[0]?.delta?.content || '';
              if (chunk) {
                fullContent += chunk;
                if (onChunk) {
                  onChunk(chunk, fullContent);
                }
              }
            } catch (e) {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Parse final JSON from accumulated content
    const jsonStart = fullContent.indexOf('{');
    const jsonEnd = fullContent.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('AI trả về nội dung không có JSON hợp lệ.');
    }
    const jsonSlice = fullContent.slice(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(jsonSlice);
    } catch (err) {
      throw new Error('AI response is not valid JSON after streaming.');
    }
  }

  async chat(message, options = {}) {
    const config = await this.#getApiConfig();
    
    if (config.provider !== 'ollama-local' && !config.apiKey) {
      const providerName = config.provider === 'openai' ? 'OpenAI' : 'Ollama Cloud';
      throw new Error(`Missing API key. Please configure your ${providerName} API key in Settings.`);
    }

    const { stream = false, onChunk = null } = options;
    const endpoint = this.#getEndpoint(config);
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful English learning assistant. Answer questions clearly and concisely.'
      },
      {
        role: 'user',
        content: message
      }
    ];

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.#buildHeaders(config),
      body: JSON.stringify(this.#buildRequestBody(config, messages, {
        stream
      }))
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI HTTP ${res.status}: ${text || res.statusText}`);
    }

    // Check content type
    const contentType = res.headers.get('content-type') || '';

    // Streaming response
    if (stream) {
      if (!onChunk || typeof onChunk !== 'function') {
        throw new Error('onChunk callback is required for streaming');
      }

      // Check if response is actually streaming
      if (!contentType.includes('text/event-stream') && !contentType.includes('application/x-ndjson')) {
        // Fallback: read full response and simulate streaming
        const data = await res.json();
        let content = '';
        
        if (data?.message?.content) {
          content = data.message.content;
        } else if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
          content = data.choices[0].message.content;
        } else if (data?.content) {
          content = data.content;
        } else if (data?.response) {
          content = data.response;
        }
        
        // Simulate streaming by sending content in chunks
        if (content) {
          const chunkSize = 10;
          for (let i = 0; i < content.length; i += chunkSize) {
            onChunk(content.slice(i, i + chunkSize));
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
        
        return content;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                
                let content = '';
                
                if (json?.message?.content) {
                  content = json.message.content;
                } else if (json?.choices?.[0]?.delta?.content) {
                  content = json.choices[0].delta.content;
                } else if (json?.content) {
                  content = json.content;
                } else if (json?.response) {
                  content = json.response;
                }

                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // Silent error in production
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return '';
    }

    // Non-streaming response (original code)
    const data = await res.json();
    // Removed verbose logging - use warn() only for actual issues
    
    let content = '';

    // Try Ollama format first
    if (data?.message?.content) {
      content = data.message.content;
    }
    // Try OpenAI format
    else if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
      content = data.choices[0].message.content;
    }
    // Try direct string
    else if (typeof data === 'string') {
      content = data;
    }
    // Try other possible formats
    else if (data?.content) {
      content = data.content;
    }
    else if (data?.response) {
      content = data.response;
    }
    else {
      if (isDev) {
        console.error('[AiClient] Unexpected response format:', data);
      }
      throw new Error('AI returned unexpected response format.');
    }

    return content.trim();
  }
}

