const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  async fetchModels() {
    try {
      const headers = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: headers,
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch models: HTTP ${res.status}`);
      }

      const data = await res.json();
      const models = (data.data || []).map(m => {
        const isFree = m.pricing && (parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0);
        return {
          id: m.id,
          name: m.name || m.id,
          description: m.description || '',
          contextLength: m.context_length || 128000,
          pricing: {
            prompt: m.pricing ? (parseFloat(m.pricing.prompt) * 1000000).toFixed(2) : '0',
            completion: m.pricing ? (parseFloat(m.pricing.completion) * 1000000).toFixed(2) : '0',
            isFree: isFree
          },
          architecture: m.architecture || {},
          top_provider: m.top_provider || {}
        };
      });

      // Sort models: popular/coding models first
      const priorityPrefixes = [
        'anthropic/claude-3.7-sonnet',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-chat',
        'openai/gpt-4o',
        'google/gemini-2.5-pro',
        'google/gemini-2.5-flash',
        'qwen/qwen-2.5-coder-32b-instruct',
        'meta-llama/llama-3.3-70b-instruct'
      ];

      models.sort((a, b) => {
        const aIdx = priorityPrefixes.findIndex(p => a.id.startsWith(p));
        const bIdx = priorityPrefixes.findIndex(p => b.id.startsWith(p));
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      return models;
    } catch (err) {
      console.error('Error fetching OpenRouter models:', err);
      // Fallback default list if offline or no network
      return [
        { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)', contextLength: 200000, pricing: { prompt: '3.00', completion: '15.00' } },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', contextLength: 200000, pricing: { prompt: '3.00', completion: '15.00' } },
        { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Full Reasoning)', contextLength: 128000, pricing: { prompt: '0.55', completion: '2.19' } },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', contextLength: 128000, pricing: { prompt: '0.14', completion: '0.28' } },
        { id: 'openai/gpt-4o', name: 'GPT-4o (Omni)', contextLength: 128000, pricing: { prompt: '2.50', completion: '10.00' } },
        { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextLength: 1000000, pricing: { prompt: '1.25', completion: '5.00' } },
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextLength: 1000000, pricing: { prompt: '0.15', completion: '0.60' } },
        { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', contextLength: 128000, pricing: { prompt: '0.07', completion: '0.14' } }
      ];
    }
  }

  async streamChat({
    model,
    messages,
    tools = [],
    temperature = 0.2,
    maxTokens = 8192,
    reasoningEffort = 'medium',
    onChunk = () => {},
    onReasoning = () => {},
    signal = null,
    // Abort if the upstream stream goes completely silent for this long. A
    // stalled socket would otherwise hang the agent forever with no error.
    stallTimeoutMs = 120000,
    connectTimeoutMs = 60000
  }) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API Key is required. Please set your API key in Settings.');
    }

    const payload = {
      model: model || 'anthropic/claude-3.7-sonnet',
      messages: messages,
      stream: true,
      temperature: temperature,
      max_tokens: maxTokens,
      transforms: ['middle-out'] // OpenRouter context compression if prompt is huge
    };

    // Configure Reasoning / Thinking
    if (reasoningEffort && reasoningEffort !== 'off') {
      payload.include_reasoning = true;
      payload.reasoning = {
        effort: reasoningEffort === 'high' ? 'high' : (reasoningEffort === 'low' ? 'low' : 'medium')
      };

      // Model-specific thinking budgets for Claude 3.7 Sonnet
      if (model && model.includes('claude-3.7-sonnet')) {
        const budgetMap = { low: 4000, medium: 8000, high: 16000 };
        const budgetTokens = budgetMap[reasoningEffort] || 8000;
        payload.thinking = {
          type: 'enabled',
          budget_tokens: budgetTokens
        };
        // Anthropic requires max_tokens to exceed thinking.budget_tokens - it
        // is the ceiling for thinking + the actual reply combined. The fixed
        // 8192 default was already smaller than the "high" budget (16000),
        // so those requests were malformed, and even "medium" (8000) left
        // almost no room for the actual answer/tool call after thinking used
        // its budget - the model would get cut off mid-reply and the run
        // looked like the agent "answered and vanished".
        payload.max_tokens = Math.max(maxTokens, budgetTokens + 4096);
      }
    }

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    // Watchdog: reset on every byte received. Combined with the caller's abort
    // signal so a user stop and a stall both cancel the same request.
    const watchdog = new AbortController();
    let stallTimer = null;
    let stalled = false;

    const armWatchdog = (ms) => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        stalled = true;
        watchdog.abort();
      }, ms);
    };
    const disarmWatchdog = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = null;
    };

    const onExternalAbort = () => watchdog.abort();
    if (signal) {
      if (signal.aborted) watchdog.abort();
      else signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const cleanup = () => {
      disarmWatchdog();
      if (signal) signal.removeEventListener('abort', onExternalAbort);
    };

    // Distinguish "we gave up" from "the user stopped" when reporting errors.
    const describeAbort = (err) => {
      if (stalled) {
        return new Error(`Upstream stream stalled with no data for ${Math.round(stallTimeoutMs / 1000)}s`);
      }
      return err;
    };

    let response;
    armWatchdog(connectTimeoutMs);
    try {
      response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'OpenRouter Agentic Coding Studio',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: watchdog.signal
      });
    } catch (err) {
      cleanup();
      throw describeAbort(err);
    }

    if (!response.ok) {
      cleanup();
      const errorText = await response.text();
      // Keep the status code in the message: the retry classifier keys off it.
      let errorMsg = `OpenRouter API error (HTTP ${response.status}): ${errorText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) {
          errorMsg = `HTTP ${response.status}: ${parsed.error.message}`;
        }
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let fullText = '';
    let fullReasoning = '';
    let toolCallsMap = {};
    let usage = null;
    let buffer = '';
    let finishReason = null;

    armWatchdog(stallTimeoutMs);

    while (true) {
      let done, value;
      try {
        ({ done, value } = await reader.read());
      } catch (err) {
        cleanup();
        throw describeAbort(err);
      }
      if (done) break;

      // Data arrived - the connection is alive, restart the stall clock.
      armWatchdog(stallTimeoutMs);

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        if (trimmed === 'data: [DONE]') continue;

        const jsonStr = trimmed.substring(5).trim();
        try {
          const data = JSON.parse(jsonStr);
          const choice = data.choices?.[0];

          if (data.usage) {
            usage = data.usage;
          }

          if (!choice) continue;

          if (choice.finish_reason) {
            finishReason = choice.finish_reason;
          }

          // Check for reasoning tokens (e.g., DeepSeek R1 or Claude thinking)
          const reasoning = choice.delta?.reasoning || choice.delta?.thought;
          if (reasoning) {
            fullReasoning += reasoning;
            onReasoning(reasoning, fullReasoning);
          }

          // Check for content tokens
          const content = choice.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content, fullText);
          }

          // Check for tool calls
          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap[idx]) {
                toolCallsMap[idx] = {
                  id: tc.id || `call_${Date.now()}_${idx}`,
                  type: 'function',
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || ''
                  }
                };
              } else {
                if (tc.function?.name) {
                  toolCallsMap[idx].function.name += tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCallsMap[idx].function.arguments += tc.function.arguments;
                }
              }
            }
          }
        } catch (err) {
          // Skip invalid JSON chunks
        }
      }
    }

    cleanup();

    const toolCalls = Object.values(toolCallsMap).map(tc => {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(tc.function.arguments || '{}');
      } catch (e) {
        parsedArgs = { raw: tc.function.arguments };
      }
      return {
        id: tc.id,
        name: tc.function.name,
        arguments: parsedArgs,
        rawArguments: tc.function.arguments
      };
    });

    // Fallback: Check if the model emitted text-based pseudo tool calls (e.g. ```tool_call or <tool_call>)
    if (toolCalls.length === 0 && fullText) {
      const fallbackCalls = this.parseFallbackToolCalls(fullText);
      if (fallbackCalls.length > 0) {
        toolCalls.push(...fallbackCalls);
      }
    }

    return {
      content: fullText,
      reasoning: fullReasoning,
      toolCalls: toolCalls,
      usage: usage,
      finishReason: finishReason
    };
  }

  parseFallbackToolCalls(text) {
    const calls = [];
    
    // Pattern 1: <tool_call> {"name": "...", "arguments": {...}} </tool_call>
    const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
    let match;
    while ((match = xmlRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.name) {
          calls.push({
            id: `fallback_${Date.now()}_${calls.length}`,
            name: parsed.name,
            arguments: parsed.arguments || parsed.parameters || parsed,
            rawArguments: match[1]
          });
        }
      } catch (e) {}
    }

    // Pattern 2: ```tool_call\n{"name": "...", "arguments": {...}}\n```
    const mdRegex = /```(?:tool_call|json:tool)\s*([\s\S]*?)```/gi;
    while ((match = mdRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.name) {
          calls.push({
            id: `fallback_${Date.now()}_${calls.length}`,
            name: parsed.name,
            arguments: parsed.arguments || parsed.parameters || parsed,
            rawArguments: match[1]
          });
        }
      } catch (e) {}
    }

    return calls;
  }
}
