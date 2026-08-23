import os from 'os';
import { toolDefinitions, ToolExecutor } from './tools.js';
import { generateRepoMap } from './repoMap.js';
import { OpenRouterClient } from './openrouter.js';

export const SYSTEM_PROMPT_AGENT = `You are NexusCoder, an elite autonomous AI coding agent operating inside the user's project workspace.

### Core Objectives:
1. **Explore before assuming**: Use 'read_file', 'list_dir', or 'search_code' to inspect existing code before writing or editing.
2. **Make clean, precise edits**:
   - Use 'apply_diff' for targeted updates to existing files.
   - Use 'write_file' when creating new files or when rewriting large parts.
3. **Keep Visual Progress**: Use 'update_plan' to show a step-by-step checklist when working on multi-step tasks.
4. **Interactive Decisions ('ask_user')**:
   - When requirements are ambiguous or have multiple paths, call 'ask_user' with clear options (e.g. ["1. React + Vite", "2. Next.js"]).
5. **Interactive Canvas Artifacts**: Use 'update_canvas' to present architecture summaries or live preview components.
6. **Formatting & Communication**:
   - Respond in the language used by the user (Thai / English).
   - Use beautiful, well-spaced Markdown (headers, bullet points, code blocks with language tags).
`;

export const SYSTEM_PROMPT_PLAN = `You are NexusCoder in **Plan Mode** (Architecture & Planning Specialist).
Your goal is to thoroughly analyze the user's project and create an exceptional, structured implementation plan BEFORE any code is modified.

### Rules for Plan Mode:
1. **Do NOT write or patch code files directly in this mode.**
2. Use 'read_file', 'list_dir', and 'search_code' to investigate the current codebase architecture.
3. Call 'update_plan' with a clear title, summary, and ordered checklist of steps.
4. Call 'update_canvas' to display a complete design document / architectural diagram.
5. In your response:
   - **Goal & Overview**: What we are going to build/fix.
   - **Affected Components & Files**: Which files need to be created, modified, or deleted.
   - **Step-by-Step Execution Plan**: Clear numbered steps.
   - **Potential Risks & Verification Strategy**: How we will test the changes.
6. Ask the user for review or use 'ask_user' if any design decision needs confirmation.
`;

export const SYSTEM_PROMPT_ASK = `You are NexusCoder in **Ask Mode** (Consultation & Explanation Specialist).
Your goal is to answer questions, explain code, debug issues conceptually, and teach best practices.

### Rules for Ask Mode:
1. You do not modify any files or execute shell commands in this mode.
2. Use 'read_file', 'list_dir', and 'search_code' to find relevant code and give accurate, context-aware answers.
3. Use 'update_canvas' if presenting substantial documentation, live HTML/JS demos, or diagrams.
4. Format your explanations beautifully with clear headings, callouts, generous paragraph spacing, and syntax-highlighted code snippets.
`;

export const SYSTEM_PROMPT_SYSTEM = `You are NexusCoder in **System Agent Mode** (Host OS, Hardware & Machine Management Specialist).
Your mission is to inspect, diagnose, troubleshoot, maintain, and manage the user's host computer and operating system directly. You are NOT confined to any project directory.

### Core Capabilities & Native Tools:
1. **Host System & Hardware Inspection ('get_system_info')**:
   - Inspect OS version, CPU cores & real-time load, RAM utilization (Total, Used, Free), Disk drive partitions (C:, D:, etc.) with exact used/free space, and network adapters.
2. **Process Management & Diagnostics ('list_processes', 'kill_process')**:
   - Inspect running processes with PID, Process Name, Memory (MB), CPU usage.
   - Find runaway, high-memory, high-CPU, or unresponsive processes.
   - Terminate hung or problematic processes safely when asked.
3. **Network & Port Diagnostics ('get_network_info')**:
   - Inspect active listening ports (e.g. check what process is using port 3000, 8080, 5000, etc.) and view network adapters.
4. **Machine-Wide Filesystem Management ('read_file', 'write_file', 'apply_diff', 'list_dir', 'search_code')**:
   - Access, read, create, or edit files across any path or drive on the host machine (e.g. C:\\, D:\\, %USERPROFILE%, %TEMP%, AppData, system logs, config files).
5. **System Terminal Execution ('run_command')**:
   - Execute PowerShell, CMD, or Bash commands with optional 'cwd' parameter.
   - Run system diagnostics, check disk health, clean temporary files, manage Windows services, install/update packages (winget, choco, npm, pip, git), and automate repetitive tasks.
6. **Visual Summaries & Checklists ('update_plan', 'update_canvas')**:
   - Use 'update_plan' for multi-step diagnostic or maintenance tasks.
   - Use 'update_canvas' to present clean system health dashboards, storage breakdown tables, or diagnostic reports.

### Safety & Guidelines:
- Before executing destructive commands (e.g. deleting files outside temp folders, terminating critical system processes, modifying system registry), explain what will happen and confirm safety with the user.
- Respond in the language used by the user (Thai / English).
- Format all outputs with clear Markdown headers, tables, callouts, and clean code blocks.
`;

// Network hiccups, rate limits and gateway errors are worth retrying;
// a bad request or a rejected API key is not.
function isRetryableError(err) {
  const message = String(err?.message || '').toLowerCase();
  if (err?.name === 'AbortError') return false;
  if (message.includes('api key')) return false;
  if (message.includes('invalid') && !message.includes('gateway')) return false;
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('stalled') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('fetch failed') ||
    message.includes('rate limit') ||
    message.includes('http 408') ||
    message.includes('http 429') ||
    message.includes('http 500') ||
    message.includes('http 502') ||
    message.includes('http 503') ||
    message.includes('http 504') ||
    message.includes('overloaded')
  );
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
    }
  });
}

export class AgentEngine {
  constructor() {
    this.openrouter = new OpenRouterClient('');
    this.toolExecutor = new ToolExecutor(null);
    this.workspaceRoot = null;
    this.model = 'anthropic/claude-3.7-sonnet';
    this.mode = 'agent'; // 'agent' | 'plan' | 'ask' | 'system'
    this.reasoningEffort = 'medium'; // 'high' | 'medium' | 'low' | 'off'
    this.autoApprove = false;
    // Long tasks legitimately need many tool round-trips. The old limit of 15
    // made the agent stop mid-task and look like it had "disappeared".
    this.maxIterations = 300;
    // Transient upstream failures (network blip, 429, 502) must not end a run.
    this.maxStreamRetries = 5;
    // How many times a single run may nudge itself to keep going after the
    // model stopped without finishing. Bounded so a confused model can never
    // loop forever.
    this.maxAutoContinues = 3;
    this.autoContinueCount = 0;

    // Active session state.
    // `messages` is the raw OpenRouter transcript (system prompt, tool frames);
    // `uiMessages` is what the chat panel renders. They are NOT interchangeable
    // - persisting only the former is why restored chats used to look broken.
    this.messages = [];
    this.uiMessages = [];
    this.isRunning = false;
    this.isPausedForInput = false;
    this.pendingAction = null; // for approval or ask_user
    this.abortController = null;
    this.listeners = new Set();
    
    // Sessions & History
    this.sessionStore = null;
    this.currentSessionId = null;

    // Active Visual Plan & Canvas
    this.activePlan = null;
    this.activeCanvas = null;

    // Usage stats
    this.stats = {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCostUsd: 0
    };
  }

  // Record a message for the chat panel and push it to connected clients.
  addUiMessage(message) {
    this.uiMessages.push(message);
    this.emit('message_added', message);
  }

  deriveTitle() {
    const firstUser = this.uiMessages.find(m => m.role === 'user');
    const text = firstUser?.displayContent || firstUser?.content || '';
    return text.trim().slice(0, 45) || 'New Conversation';
  }

  saveCurrentSession() {
    if (!this.sessionStore) return;

    if (!this.currentSessionId) {
      const created = this.sessionStore.createSession({
        model: this.model,
        mode: this.mode,
        title: this.deriveTitle()
      });
      this.currentSessionId = created.id;
    }

    const session = this.sessionStore.getSession(this.currentSessionId) || { id: this.currentSessionId };
    session.messages = this.messages;
    session.uiMessages = this.uiMessages;
    session.mode = this.mode;
    session.model = this.model;
    session.activePlan = this.activePlan;
    session.activeCanvas = this.activeCanvas;

    if (!session.title || session.title === 'New Conversation' || session.title === 'Untitled Conversation') {
      session.title = this.deriveTitle();
    }

    this.sessionStore.saveSession(session);
    this.emit('sessions_updated', {});
  }

  setApiKey(key) {
    this.openrouter.setApiKey(key);
  }

  setModel(model) {
    this.model = model;
  }

  setMode(mode) {
    if (['agent', 'plan', 'ask', 'system'].includes(mode)) {
      this.mode = mode;
      this.emit('mode_updated', { mode });
    }
  }

  setReasoningEffort(effort) {
    if (['high', 'medium', 'low', 'off'].includes(effort)) {
      this.reasoningEffort = effort;
      this.emit('reasoning_effort_updated', { reasoningEffort: effort });
    }
  }

  setWorkspace(dir) {
    this.workspaceRoot = dir;
    this.toolExecutor.setWorkspaceRoot(dir);
    this.emit('workspace_updated', { workspaceRoot: dir });
  }

  setAutoApprove(val) {
    this.autoApprove = !!val;
    this.toolExecutor.autoApprove = this.autoApprove;
  }

  addListener(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error in agent listener:', e);
      }
    }
  }

  clearHistory() {
    this.messages = [];
    this.uiMessages = [];
    this.activePlan = null;
    this.activeCanvas = null;
    this.stats = { totalPromptTokens: 0, totalCompletionTokens: 0, totalCostUsd: 0 };
    this.pendingAction = null;
    this.isPausedForInput = false;
    this.emit('history_cleared', {});
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRunning = false;
    this.isPausedForInput = false;
    this.pendingAction = null;
    this.emit('agent_progress', { phase: 'stopped', percent: 0, step: 'Agent stopped by user.' });
    this.emit('agent_stopped', { message: 'Agent stopped by user.' });
  }

  getToolsForMode() {
    if (this.mode === 'ask') {
      return toolDefinitions.filter(t => 
        ['read_file', 'list_dir', 'search_code', 'update_canvas', 'ask_user'].includes(t.function.name)
      );
    }
    if (this.mode === 'plan') {
      return toolDefinitions.filter(t => 
        ['read_file', 'list_dir', 'search_code', 'update_plan', 'update_canvas', 'ask_user'].includes(t.function.name)
      );
    }
    if (this.mode === 'system') {
      return toolDefinitions.filter(t => 
        ['get_system_info', 'list_processes', 'kill_process', 'get_network_info', 'run_command', 'read_file', 'write_file', 'apply_diff', 'list_dir', 'search_code', 'update_plan', 'update_canvas', 'ask_user'].includes(t.function.name)
      );
    }
    return toolDefinitions; // all tools for agent mode
  }

  getSystemPromptForMode() {
    switch (this.mode) {
      case 'plan':
        return SYSTEM_PROMPT_PLAN;
      case 'ask':
        return SYSTEM_PROMPT_ASK;
      case 'system':
        return SYSTEM_PROMPT_SYSTEM;
      default:
        return SYSTEM_PROMPT_AGENT;
    }
  }

  async startTask(userPrompt, attachedFiles = [], options = {}) {
    if (this.isRunning) {
      throw new Error('Agent is already running. Please stop or wait.');
    }
    if (options.mode) this.mode = options.mode;
    if (options.reasoningEffort) this.reasoningEffort = options.reasoningEffort;

    if (!this.workspaceRoot && this.mode !== 'system') {
      throw new Error('Please select a project folder first.');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    this.emit('agent_progress', {
      phase: 'reading_context',
      percent: 10,
      step: this.mode === 'system' ? 'Loading system overview & context...' : 'Loading workspace context & pinned files...',
      iteration: 1
    });

    // Prepare system prompt with workspace repo map or host system overview
    let contextAttachment = '';
    if (this.mode === 'system') {
      try {
        const sys = await this.toolExecutor.getSystemInfo();
        const diskStr = (sys.disks || []).map(d => `${d.drive || d.mount} (${d.usedPercent} used, ${d.freeGB} free / ${d.totalGB})`).join(' | ');
        contextAttachment = `\n\n### Host System Environment:\n- OS: ${sys.os.platform} (${sys.os.release}, ${sys.os.arch}) | Hostname: ${sys.os.hostname} | User: ${sys.os.username}\n- CPU: ${sys.cpu.model} (${sys.cpu.cores} cores, usage ~${sys.cpu.usageApprox})\n- RAM: Total ${sys.memory.totalGB} | Used ${sys.memory.usedGB} (${sys.memory.usedPercent}) | Free ${sys.memory.freeGB}\n- Storage: ${diskStr || 'N/A'}\n- System Uptime: ${sys.os.uptime}`;
      } catch (e) {
        contextAttachment = `\n\n### Host System: ${os.platform()} ${os.arch()}`;
      }
    } else if (this.workspaceRoot) {
      const repoMap = generateRepoMap(this.workspaceRoot);
      contextAttachment = `\n\n### Current Project Structure:\n${repoMap}`;
    }

    const modePrompt = this.getSystemPromptForMode();
    const systemMessage = {
      role: 'system',
      content: `${modePrompt}${contextAttachment}`
    };

    // Prepare user message
    let fullUserContent = userPrompt;
    if (attachedFiles && attachedFiles.length > 0) {
      const fileContexts = [];
      for (const f of attachedFiles) {
        try {
          const res = await this.toolExecutor.readFile({ path: f });
          if (!res.error) {
            fileContexts.push(`--- File: ${f} ---\n${res.content}`);
          }
        } catch (e) {}
      }
      if (fileContexts.length > 0) {
        fullUserContent = `${userPrompt}\n\n### Attached Files Context:\n${fileContexts.join('\n\n')}`;
      }
    }

    if (this.messages.length === 0) {
      this.messages.push(systemMessage);
    } else {
      this.messages[0] = systemMessage;
    }

    let messageContentForLLM;
    if (options.media && options.media.length > 0) {
      messageContentForLLM = [
        {
          type: 'text',
          text: fullUserContent || 'Please inspect the attached image / video and assist based on it.'
        }
      ];
      for (const m of options.media) {
        if (m.type === 'video' || (m.mimeType && m.mimeType.startsWith('video/'))) {
          messageContentForLLM.push({
            type: 'video_url',
            video_url: {
              url: m.dataUrl
            }
          });
        } else {
          messageContentForLLM.push({
            type: 'image_url',
            image_url: {
              url: m.dataUrl
            }
          });
        }
      }
    } else {
      messageContentForLLM = fullUserContent;
    }

    const userMsgObj = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: fullUserContent,
      displayContent: userPrompt,
      mode: this.mode,
      reasoningEffort: this.reasoningEffort,
      attachedFiles: attachedFiles,
      media: options.media || [],
      timestamp: Date.now()
    };

    this.messages.push({ role: 'user', content: messageContentForLLM });
    this.addUiMessage(userMsgObj);
    this.saveCurrentSession();

    this.emit('agent_progress', {
      phase: 'analyzing_prompt',
      percent: 20,
      step: 'Connecting to AI model & sending prompt...',
      iteration: 1
    });

    this.runLoop();
  }

  // Resume a run that hit the safety limit, without losing any context.
  continueRun() {
    if (this.isRunning) throw new Error('Agent is already running.');
    if (!this.messages.length) throw new Error('Nothing to continue.');
    this.isRunning = true;
    this.abortController = new AbortController();
    this.emit('agent_resumed', { message: 'Continuing task...' });
    this.runLoop();
  }

  async resumeWithUserInput(actionId, userResponse) {
    if (!this.isPausedForInput || !this.pendingAction || this.pendingAction.id !== actionId) {
      throw new Error('No matching pending prompt found.');
    }

    const currentPending = this.pendingAction;
    this.isPausedForInput = false;
    this.pendingAction = null;

    this.emit('interactive_prompt_resolved', {
      actionId: actionId,
      userResponse: userResponse
    });

    if (currentPending.type === 'ask_user') {
      this.messages.push({
        role: 'tool',
        tool_call_id: currentPending.toolCallId,
        name: 'ask_user',
        content: JSON.stringify({
          status: 'answered_by_user',
          user_selection: userResponse
        })
      });
    } else if (currentPending.type === 'action_approval') {
      if (userResponse === 'approved') {
        this.emit('step_status', { step: 'Executing approved action...' });
        const result = await this.toolExecutor.execute(
          currentPending.toolName,
          currentPending.toolArgs,
          (status) => this.handleToolStatus(status)
        );
        this.messages.push({
          role: 'tool',
          tool_call_id: currentPending.toolCallId,
          name: currentPending.toolName,
          content: JSON.stringify(result)
        });
      } else {
        this.messages.push({
          role: 'tool',
          tool_call_id: currentPending.toolCallId,
          name: currentPending.toolName,
          content: JSON.stringify({ error: `User rejected this action: ${userResponse}` })
        });
      }
    }

    this.isRunning = true;
    this.runLoop();
  }

  handleToolStatus(status) {
    if (status.type === 'plan_updated') {
      this.activePlan = status.plan;
      this.emit('plan_updated', status.plan);
    }
    if (status.type === 'canvas_updated') {
      this.activeCanvas = status.canvas;
      this.emit('canvas_updated', status.canvas);
    }
    this.emit('tool_status', status);
  }

  /**
   * Decide whether an assistant turn that made no tool call actually left work
   * on the table. Returns a short human-readable reason, or null when the run
   * looks genuinely complete.
   */
  detectUnfinishedWork(content) {
    // Only autonomous modes act on their own; ask/plan modes answer and stop.
    if (this.mode !== 'agent' && this.mode !== 'system') return null;

    const steps = this.activePlan?.steps;
    if (Array.isArray(steps) && steps.length > 0) {
      const remaining = steps.filter(s => s && s.status !== 'completed');
      if (remaining.length > 0) {
        const names = remaining.slice(0, 3).map(s => s.title).join(', ');
        return `${remaining.length} plan step(s) still open: ${names}`;
      }
    }

    const text = (content || '').trim();
    if (!text) return null;

    // Phrases that announce an action instead of reporting one. Thai included
    // because the UI is used bilingually.
    const intentPatterns = [
      /\b(next|now)[,]?\s+(i|we)('?ll| will| am going to| going to)\b/i,
      /\b(i|we)('?ll| will| am going to| going to)\s+(now\s+)?(create|add|update|write|edit|modify|fix|implement|refactor|install|run|check|read|continue)\b/i,
      /\blet me\s+(now\s+)?(create|add|update|write|edit|modify|fix|implement|refactor|install|run|check|read|continue)\b/i,
      /\b(proceeding|continuing|moving on) (to|with)\b/i,
      /(ต่อไป|ขั้นตอนถัดไป|กำลังจะ|เดี๋ยว(ผม|ฉัน|เรา))/
    ];

    if (intentPatterns.some(re => re.test(text))) {
      return 'the last message announced a next action but performed none';
    }

    return null;
  }

  async runLoop() {
    let iteration = 0;
    const tools = this.getToolsForMode();

    try {
      while (this.isRunning && iteration < this.maxIterations) {
        iteration++;
        this.emit('iteration_start', { iteration, maxIterations: this.maxIterations });

        const assistantMsgId = `msg_${Date.now()}_assistant_${iteration}`;
        let currentAssistantText = '';
        let currentReasoningText = '';
        let hasEmittedGeneratingProgress = false;
        let hasEmittedReasoningProgress = false;

        this.emit('agent_progress', {
          phase: 'thinking',
          percent: Math.min(30 + (iteration - 1) * 15, 80),
          step: iteration === 1 ? 'NexusCoder is thinking & analyzing...' : `Step ${iteration}: Reasoning about next actions...`,
          iteration
        });

        this.emit('stream_start', { messageId: assistantMsgId });

        let response = null;
        let lastError = null;

        // Retry transient upstream failures instead of ending the whole run.
        for (let attempt = 0; attempt <= this.maxStreamRetries; attempt++) {
          try {
            response = await this.openrouter.streamChat({
              model: this.model,
              messages: this.messages,
              tools: tools,
              reasoningEffort: this.reasoningEffort,
              signal: this.abortController?.signal,
              onChunk: (chunk, fullText) => {
                currentAssistantText = fullText;
                if (!hasEmittedGeneratingProgress) {
                  hasEmittedGeneratingProgress = true;
                  this.emit('agent_progress', {
                    phase: 'generating',
                    percent: Math.min(70 + (iteration - 1) * 5, 90),
                    step: 'Generating response & code...',
                    iteration
                  });
                }
                this.emit('stream_chunk', { messageId: assistantMsgId, content: fullText });
              },
              onReasoning: (chunk, fullReasoning) => {
                currentReasoningText = fullReasoning;
                if (!hasEmittedReasoningProgress) {
                  hasEmittedReasoningProgress = true;
                  this.emit('agent_progress', {
                    phase: 'reasoning',
                    percent: Math.min(45 + (iteration - 1) * 10, 85),
                    step: 'Deep Thinking & Reasoning...',
                    iteration
                  });
                }
                this.emit('stream_reasoning', { messageId: assistantMsgId, reasoning: fullReasoning });
              }
            });
            lastError = null;
            break;
          } catch (err) {
            // A user-initiated stop is final, never retried.
            if (this.abortController?.signal.aborted) {
              this.emit('agent_stopped', { message: 'Stopped.' });
              return;
            }

            lastError = err;
            if (!isRetryableError(err) || attempt === this.maxStreamRetries) break;

            const waitMs = Math.min(1000 * Math.pow(2, attempt), 15000);
            this.emit('stream_retry', {
              messageId: assistantMsgId,
              attempt: attempt + 1,
              maxAttempts: this.maxStreamRetries,
              waitMs,
              message: err.message
            });
            await sleep(waitMs, this.abortController?.signal);
            if (!this.isRunning) return;
          }
        }

        if (lastError) {
          const partialContent = (currentAssistantText || '').trim();
          const partialReasoning = (currentReasoningText || '').trim();
          if (partialContent || partialReasoning) {
            this.emit('stream_end', {
              messageId: assistantMsgId,
              content: partialContent,
              reasoning: partialReasoning,
              toolCalls: []
            });
            this.uiMessages.push({
              id: assistantMsgId,
              role: 'assistant',
              content: partialContent,
              reasoning: partialReasoning,
              toolCalls: [],
              timestamp: Date.now()
            });
          }
          this.emit('error', {
            message: `${lastError.message} (gave up after ${this.maxStreamRetries} retries)`
          });
          this.isRunning = false;
          this.saveCurrentSession();
          return;
        }

        const finalContent = response?.content || currentAssistantText || '';
        const finalReasoning = response?.reasoning || currentReasoningText || '';
        const finalToolCalls = response?.toolCalls || [];

        const assistantObj = {
          role: 'assistant',
          content: finalContent
        };

        if (finalToolCalls.length > 0) {
          assistantObj.tool_calls = finalToolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: tc.rawArguments || JSON.stringify(tc.arguments)
            }
          }));
        }

        this.messages.push(assistantObj);

        this.emit('stream_end', {
          messageId: assistantMsgId,
          content: finalContent,
          reasoning: finalReasoning,
          toolCalls: finalToolCalls
        });

        // Mirror what the client appends on stream_end so a restored session
        // renders identically to a live one.
        if (finalContent || finalReasoning || finalToolCalls.length > 0) {
          this.uiMessages.push({
            id: assistantMsgId,
            role: 'assistant',
            content: finalContent,
            reasoning: finalReasoning,
            toolCalls: finalToolCalls,
            timestamp: Date.now()
          });
        }

        this.saveCurrentSession();

        if (!response.toolCalls || response.toolCalls.length === 0) {
          // A turn with no tool call usually means "done" - but models also
          // narrate ("Next I'll update the config...") and then stop, which
          // looked like the agent abandoning the task halfway. When the work is
          // demonstrably unfinished, nudge it to keep going instead of ending
          // the run and making the user re-type the same request.
          const unfinished = this.detectUnfinishedWork(finalContent);
          if (unfinished && this.autoContinueCount < this.maxAutoContinues) {
            this.autoContinueCount++;
            this.messages.push({
              role: 'user',
              content:
                `[system] The task is not finished yet (${unfinished}). ` +
                'Continue working now without asking for confirmation: call the ' +
                'next tool required to make progress. If the task really is ' +
                'complete, reply with a short final summary and no tool call.'
            });
            this.emit('agent_progress', {
              phase: 'thinking',
              percent: Math.min(30 + iteration * 5, 85),
              step: `Auto-continuing (${this.autoContinueCount}/${this.maxAutoContinues}) - task not finished yet...`,
              iteration
            });
            this.saveCurrentSession();
            continue;
          }

          this.isRunning = false;
          this.emit('agent_progress', {
            phase: 'completed',
            percent: 100,
            step: 'Task completed.',
            iteration
          });
          this.emit('agent_completed', {
            message: 'Task completed.',
            totalIterations: iteration
          });
          this.saveCurrentSession();
          return;
        }

        // Real progress was made, so the nudge budget is refreshed.
        this.autoContinueCount = 0;

        let requiresUserPause = false;

        for (const tc of response.toolCalls) {
          const toolName = tc.name;
          const toolArgs = tc.arguments;

          this.emit('agent_progress', {
            phase: 'tool_executing',
            percent: 85,
            step: `Executing action: ${toolName}...`,
            toolName,
            iteration
          });

          this.emit('tool_call_start', {
            toolCallId: tc.id,
            name: toolName,
            args: toolArgs
          });

          if (toolName === 'ask_user') {
            const actionId = `action_${Date.now()}_ask`;
            this.pendingAction = {
              id: actionId,
              type: 'ask_user',
              toolCallId: tc.id,
              toolName: toolName,
              toolArgs: toolArgs,
              question: toolArgs.question,
              options: toolArgs.options || [],
              allowCustomInput: toolArgs.allow_custom_input !== false
            };

            this.isPausedForInput = true;
            this.isRunning = false;
            requiresUserPause = true;

            this.emit('interactive_prompt_required', this.pendingAction);
            break;
          }

          const isSensitive = toolName === 'run_command' || (toolName === 'write_file' && !this.autoApprove);
          if (isSensitive && !this.autoApprove) {
            const actionId = `action_${Date.now()}_approval`;
            this.pendingAction = {
              id: actionId,
              type: 'action_approval',
              toolCallId: tc.id,
              toolName: toolName,
              toolArgs: toolArgs
            };

            this.isPausedForInput = true;
            this.isRunning = false;
            requiresUserPause = true;

            this.emit('action_approval_required', this.pendingAction);
            break;
          }

          const result = await this.toolExecutor.execute(
            toolName,
            toolArgs,
            (status) => this.handleToolStatus({ toolCallId: tc.id, ...status })
          );

          this.emit('agent_progress', {
            phase: 'tool_completed',
            percent: 90,
            step: `Completed ${toolName}. Analyzing results...`,
            toolName,
            iteration
          });

          this.emit('tool_call_result', {
            toolCallId: tc.id,
            name: toolName,
            result: result
          });

          this.uiMessages.push({
            id: `tool_${Date.now()}_${tc.id}`,
            role: 'tool_result',
            toolName: toolName,
            result: result,
            timestamp: Date.now()
          });

          this.messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: toolName,
            content: JSON.stringify(result)
          });

          // Persist after every tool step so a crash never loses progress.
          this.saveCurrentSession();
        }

        if (requiresUserPause) {
          return;
        }
      }

      if (iteration >= this.maxIterations) {
        this.isRunning = false;
        this.saveCurrentSession();
        this.emit('agent_max_iterations', {
          message: `Paused after ${iteration} steps as a safety limit. Nothing was lost - press Continue to keep going.`,
          iterations: iteration,
          canContinue: true
        });
      }
    } catch (err) {
      console.error('Agent loop unexpected error:', err);
      this.isRunning = false;
      this.emit('error', { message: err.message || String(err) });
    }
  }
}
