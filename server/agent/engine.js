import os from 'os';
import { toolDefinitions, ToolExecutor } from './tools.js';
import { generateRepoMap } from './repoMap.js';
import { OpenRouterClient } from './openrouter.js';
import { McpManager } from './mcpManager.js';
import { SkillsManager } from './skillsManager.js';

export const SYSTEM_PROMPT_AGENT = `You are NexusCoder, an elite autonomous AI coding agent operating inside the user's project workspace.

### Core Objectives:
7. **AI Skills & Custom Workflows**:
   - You have access to tools for managing AI Skills: 'add_skill', 'import_skill_file', and 'list_skills'.
   - When the user asks to add, create, or import a skill (e.g. "add skill...", "สร้าง skill...", "เพิ่ม skill...", "import skill from file.md"), formulate the appropriate name, description, slashCommand (e.g. /docker), prompt instructions, tags, and icon, and invoke 'add_skill' or 'import_skill_file' immediately.

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

export function getModelContextLimit(modelId = '') {
  const id = String(modelId || '').toLowerCase();
  if (id.includes('gemini-2') || id.includes('gemini-1.5')) return 1000000;
  if (id.includes('claude-3-7') || id.includes('claude-3.7') || id.includes('claude-3-5') || id.includes('claude-3.5')) return 200000;
  if (id.includes('gpt-4o') || id.includes('o1') || id.includes('o3') || id.includes('deepseek') || id.includes('qwen') || id.includes('llama-3.3')) return 128000;
  if (id.includes('claude-3-haiku') || id.includes('gpt-4-turbo')) return 128000;
  return 128000;
}

export function estimateTokens(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;
  let totalChars = 0;
  for (const m of messages) {
    if (!m) continue;
    if (typeof m.content === 'string') {
      totalChars += m.content.length;
    } else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (!part) continue;
        if (typeof part === 'string') {
          totalChars += part.length;
        } else if (part.text) {
          totalChars += part.text.length;
        } else if (part.type === 'image_url') {
          totalChars += 1600;
        } else if (part.type === 'video_url') {
          totalChars += 3200;
        }
      }
    }
    if (Array.isArray(m.tool_calls)) {
      for (const tc of m.tool_calls) {
        totalChars += (tc?.function?.name?.length || 0) + (tc?.function?.arguments?.length || 0);
      }
    }
  }
  return Math.max(1, Math.ceil(totalChars / 3.5) + (messages.length * 4));
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
    this.mcpManager = new McpManager(this.workspaceRoot);
    this.skillsManager = new SkillsManager();
    this.toolExecutor = new ToolExecutor(null, { mcpManager: this.mcpManager, skillsManager: this.skillsManager });
    this.workspaceRoot = null;

    // Relay MCP & Skills events to agent listeners / WebSocket clients
    this.mcpManager.on('servers_updated', (data) => this.emit('mcp_servers_updated', data));
    this.skillsManager.on('skills_updated', (data) => this.emit('skills_updated', data));
    this.mcpManager.autoConnectEnabled();
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

  // Attached images/videos are sent as base64 data URLs, which can be
  // megabytes of text per attachment. Every turn resends the *entire*
  // transcript to the model, so once a media message ages past the turn it
  // was sent in, keeping its raw bytes in every future request does nothing
  // useful (the model already saw and responded to it) - it only bloats the
  // prompt and, on long sessions with several images, pushes the transcript
  // toward OpenRouter's "middle-out" compression, which can literally cut a
  // base64 blob or JSON structure in half. That produces exactly the
  // "answers strangely, then stops" behavior users see after attaching
  // images. Strip old media down to a text placeholder before sending.
  pruneOldMedia() {
    for (const m of this.messages) {
      if (m.role !== 'user' || !Array.isArray(m.content)) continue;
      let changed = false;
      m.content = m.content.map(part => {
        if (part && (part.type === 'image_url' || part.type === 'video_url')) {
          changed = true;
          return { type: 'text', text: `[attachment from an earlier turn - already reviewed, omitted here to save context]` };
        }
        return part;
      });
      if (changed && m.content.every(p => p.type === 'text')) {
        m.content = m.content.map(p => p.text).join('\n');
      }
    }
  }

  // Find the assistant uiMessage holding an as-yet-unresolved tool call with
  // this id and attach its result in place. Returns true if a match was
  // found, so the caller can fall back to a standalone record otherwise.
  resolveUiToolCall(toolCallId, result) {
    for (let i = this.uiMessages.length - 1; i >= 0; i--) {
      const m = this.uiMessages[i];
      if (m.role !== 'assistant' || !Array.isArray(m.toolCalls) || m.toolCalls.length === 0) continue;
      const tc = m.toolCalls.find(t => t.id === toolCallId && t.result === undefined);
      if (tc) {
        tc.result = result;
        return true;
      }
    }
    return false;
  }

  deriveTitle() {
    const firstUser = this.uiMessages.find(m => m.role === 'user');
    const text = firstUser?.displayContent || firstUser?.content || '';
    return text.trim().slice(0, 45) || 'New Conversation';
  }

  getContextStats() {
    const estimatedTokens = estimateTokens(this.messages);
    const contextLimit = getModelContextLimit(this.model);
    const percent = Math.min(100, Math.round((estimatedTokens / contextLimit) * 100));
    return {
      estimatedTokens,
      contextLimit,
      percent,
      isHigh: percent >= 75,
      isCritical: percent >= 90,
      model: this.model,
      messageCount: this.messages.length,
      uiMessageCount: this.uiMessages.length
    };
  }

  emitContextStats() {
    this.emit('context_stats_updated', this.getContextStats());
  }

  compactContext({ force = false } = {}) {
    if (!Array.isArray(this.messages) || this.messages.length <= 3) {
      return { compacted: false, reason: 'Session context is already minimal', stats: this.getContextStats() };
    }

    const beforeTokens = estimateTokens(this.messages);
    // Keep system prompt (index 0) and the last 4 messages untouched
    const keepLastCount = 4;
    const cutoffIndex = Math.max(1, this.messages.length - keepLastCount);

    let compactedCount = 0;

    for (let i = 1; i < cutoffIndex; i++) {
      const m = this.messages[i];
      if (!m) continue;

      // 1. Prune large tool outputs (> 250 chars)
      if (m.role === 'tool' && typeof m.content === 'string' && m.content.length > 250) {
        const snippet = m.content.slice(0, 120).replace(/[\r\n]+/g, ' ');
        m.content = JSON.stringify({
          status: 'success',
          note: `[Output of earlier tool "${m.name || 'action'}" compacted to conserve context]`,
          preview: `${snippet}...`
        });
        compactedCount++;
      }

      // 2. Prune old attached files context in user messages
      if (m.role === 'user' && typeof m.content === 'string' && m.content.includes('### Attached Files Context:')) {
        const parts = m.content.split('### Attached Files Context:');
        m.content = `${parts[0].trim()}\n\n[Earlier attached files context omitted to save context space]`;
        compactedCount++;
      }

      // 3. Prune old very long assistant text (> 1200 chars)
      if (m.role === 'assistant' && typeof m.content === 'string' && m.content.length > 1200) {
        m.content = m.content.slice(0, 800) + '\n\n[...earlier response truncated in context memory...]';
        compactedCount++;
      }
    }

    const afterTokens = estimateTokens(this.messages);
    this.saveCurrentSession();

    const stats = this.getContextStats();
    this.emit('context_compacted', {
      beforeTokens,
      afterTokens,
      savedTokens: Math.max(0, beforeTokens - afterTokens),
      compactedMessages: compactedCount,
      stats
    });
    this.emit('context_stats_updated', stats);

    return {
      compacted: true,
      beforeTokens,
      afterTokens,
      savedTokens: Math.max(0, beforeTokens - afterTokens),
      stats
    };
  }

  createBranchWithSummary(baseChatId = null) {
    const targetChatId = baseChatId || this.currentSessionId;
    let sourceSession = null;
    if (this.sessionStore && targetChatId) {
      sourceSession = this.sessionStore.getSession(targetChatId);
    }
    if (!sourceSession && targetChatId === this.currentSessionId) {
      sourceSession = {
        title: this.deriveTitle(),
        mode: this.mode,
        model: this.model,
        activePlan: this.activePlan,
        messages: this.messages,
        uiMessages: this.uiMessages
      };
    }

    const sourceTitle = sourceSession?.title || 'Previous Conversation';
    let summaryContent = `Continuing work from session: **${sourceTitle}**\n\n`;

    if (sourceSession?.activePlan?.steps && sourceSession.activePlan.steps.length > 0) {
      const plan = sourceSession.activePlan;
      summaryContent += `### Current Active Plan (${plan.title || 'Implementation Plan'}):\n`;
      if (plan.summary) summaryContent += `${plan.summary}\n\n`;
      summaryContent += `Checklist Steps:\n`;
      plan.steps.forEach((s, idx) => {
        const check = s.status === 'completed' ? '[x]' : s.status === 'in_progress' ? '[-]' : '[ ]';
        summaryContent += `- ${check} ${s.title || `Step ${idx + 1}`}\n`;
      });
      summaryContent += '\n';
    }

    const recentUi = (sourceSession?.uiMessages || []).slice(-4);
    if (recentUi.length > 0) {
      summaryContent += `### Recent Context & User Request:\n`;
      recentUi.forEach(m => {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const txt = (m.displayContent || m.content || '').slice(0, 250);
        if (txt) summaryContent += `- **${role}**: ${txt.replace(/\n+/g, ' ')}\n`;
      });
      summaryContent += '\n';
    }

    const newTitle = `Continuation: ${sourceTitle.replace(/^Continuation:\s*/, '').slice(0, 30)}`;
    const newChat = this.sessionStore.createSession({
      title: newTitle,
      model: sourceSession?.model || this.model,
      mode: sourceSession?.mode || this.mode,
      activePlan: sourceSession?.activePlan || null
    });

    this.currentSessionId = newChat.id;
    this.messages = [];
    this.uiMessages = [];
    this.activePlan = sourceSession?.activePlan || null;
    this.activeCanvas = null;

    const initialUserMsg = {
      id: `msg_${Date.now()}_branch_context`,
      role: 'user',
      content: `[Branch Continuation Context]\n${summaryContent}\nPlease proceed with the next steps from this plan or task.`,
      displayContent: `🌿 **Branch Continuation from "${sourceTitle}"**\n\n${summaryContent}`,
      isContinuationSummary: true,
      timestamp: Date.now()
    };

    this.addUiMessage(initialUserMsg);
    this.messages.push({
      role: 'user',
      content: initialUserMsg.content
    });

    this.saveCurrentSession();
    this.emit('chat_created', { chat: newChat });
    this.emitContextStats();

    return newChat;
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
    session.estimatedTokens = estimateTokens(this.messages);

    if (!session.title || session.title === 'New Conversation' || session.title === 'Untitled Conversation') {
      session.title = this.deriveTitle();
    }

    this.sessionStore.saveSession(session);
    this.emit('sessions_updated', {});
    this.emitContextStats();
  }

  setApiKey(key) {
    this.openrouter.setApiKey(key);
  }

  setModel(model) {
    this.model = model;
    this.emitContextStats();
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
    if (this.mcpManager) {
      this.mcpManager.setWorkspace(dir);
    }
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
    this.emitContextStats();
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
    const mcpTools = this.mcpManager ? this.mcpManager.getOpenAiTools() : [];

    if (this.mode === 'ask') {
      return [
        ...toolDefinitions.filter(t => 
          ['read_file', 'list_dir', 'search_code', 'update_canvas', 'ask_user'].includes(t.function.name)
        ),
        ...mcpTools
      ];
    }
    if (this.mode === 'plan') {
      return toolDefinitions.filter(t => 
        ['read_file', 'list_dir', 'search_code', 'update_plan', 'update_canvas', 'ask_user'].includes(t.function.name)
      );
    }
    if (this.mode === 'system') {
      return [
        ...toolDefinitions.filter(t => 
          ['get_system_info', 'list_processes', 'kill_process', 'get_network_info', 'run_command', 'read_file', 'write_file', 'apply_diff', 'list_dir', 'search_code', 'update_plan', 'update_canvas', 'ask_user'].includes(t.function.name)
        ),
        ...mcpTools
      ];
    }
    return [...toolDefinitions, ...mcpTools]; // all tools + active MCP tools for agent mode
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

    // Check for AI skill slash commands (e.g. /review, /sql, /test, etc.)
    const { matchedSkill, cleanPrompt } = this.skillsManager ? this.skillsManager.matchSlashCommand(userPrompt) : { matchedSkill: null, cleanPrompt: userPrompt };
    const skillsAugmentation = this.skillsManager ? this.skillsManager.getSkillsPromptAugmentation(matchedSkill) : '';

    // If MCP servers are connected, add a contextual note
    let mcpNote = '';
    const mcpStatus = this.mcpManager ? this.mcpManager.getServersStatus() : null;
    if (mcpStatus?.summary?.connectedCount > 0) {
      mcpNote = `\n\n### Model Context Protocol (MCP) Integration Active:\n${mcpStatus.summary.connectedCount} MCP server(s) connected with ${mcpStatus.summary.totalToolsCount} dynamic tools available (prefixed with 'mcp__'). Use them when requested or relevant.`;
    }

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
      content: `${modePrompt}${skillsAugmentation}${mcpNote}${contextAttachment}`
    };

    // Prepare user message
    const promptToSend = matchedSkill ? cleanPrompt : userPrompt;
    let fullUserContent = promptToSend;
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
        fullUserContent = `${promptToSend}\n\n### Attached Files Context:\n${fileContexts.join('\n\n')}`;
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

    this.pruneOldMedia();
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
   *
   * This used to also guess from the reply's TEXT - phrases like "next I'll
   * fix..." or Thai "กำลังจะ..." meant "still working". That guess kept
   * false-positiving on ordinary, complete answers (tightening it to
   * "only the last ~220 chars, and only with a real verb" cut down the Thai
   * false-positives, but the same class of misfire kept happening in English
   * too - any natural closing remark that merely LOOKS like an announced
   * next step). A complete answer would then get auto-continued anyway,
   * confusing the model into a short/empty follow-up right after it had
   * already finished - which is exactly what looked like "answering, then
   * disappearing". Text-guessing is inherently unreliable for this, so it's
   * gone: only the plan's own step status is used now, which is a fact the
   * model itself reported via update_plan, not a guess about phrasing.
   * Genuinely cut-off or empty replies are caught separately in runLoop via
   * finish_reason and empty-content checks - those are hard signals, not
   * text pattern matching.
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
        let response = null;
        let lastError = null;

        this.emit('agent_progress', {
          phase: 'thinking',
          percent: Math.min(30 + (iteration - 1) * 15, 80),
          step: iteration === 1 ? 'NexusCoder is thinking & analyzing...' : `Step ${iteration}: Reasoning about next actions...`,
          iteration
        });

        this.emit('stream_start', { messageId: assistantMsgId });

        // Auto-compact context if it is reaching model capacity (>= 80%)
        const currentStats = this.getContextStats();
        if (currentStats.percent >= 80) {
          this.compactContext();
        }

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

            // Prefer the provider's own Retry-After (429s especially) over a
            // fixed exponential guess - a rate-limit window can easily outlast
            // the 15s backoff cap, which was giving up mid-window every time.
            const waitMs = Number.isFinite(err?.retryAfterMs)
              ? Math.min(Math.max(err.retryAfterMs, 1000), 60000)
              : Math.min(1000 * Math.pow(2, attempt), 15000);
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
          // A finish_reason of "length" means the provider cut the reply off
          // mid-generation to stay under max_tokens - that's a hard fact, not
          // a guess, so it always counts as unfinished regardless of mode or
          // what the (truncated, possibly mid-sentence) text happens to say.
          // Without this check the run ended right there and looked like the
          // agent had answered and then vanished.
          const wasTruncated = response.finishReason === 'length';
          // Some models/providers occasionally return a completion with no
          // text at all (an empty choice, a content filter, a "thinking"
          // turn that used its whole budget and produced nothing) - the
          // stream_end push above only adds a chat bubble when content,
          // reasoning, or a tool call is non-empty, so a fully empty turn
          // added NOTHING to the transcript. Combined with detectUnfinished
          // Work() explicitly returning null for empty text (it only looks
          // for "announced but didn't do it" phrases), the run then silently
          // marked itself "completed" with literally nothing shown - the
          // spinner just stops and the chat goes completely silent, which is
          // indistinguishable from the agent having crashed.
          const wasEmpty = !wasTruncated
            && (finalContent || '').trim().length === 0
            && (finalReasoning || '').trim().length === 0;
          const unfinished = wasTruncated
            ? 'the previous reply was cut off by the max output length limit'
            : wasEmpty
              ? 'the previous reply came back completely empty - no text was generated'
              : this.detectUnfinishedWork(finalContent);
          if (unfinished && this.autoContinueCount < this.maxAutoContinues) {
            this.autoContinueCount++;
            this.messages.push({
              role: 'user',
              content: wasTruncated
                ? '[system] Your previous reply was cut off by the output length limit before it finished. ' +
                  'Continue exactly where you left off - do not repeat what you already said.'
                : wasEmpty
                  ? '[system] Your previous reply came back completely empty - no answer was generated. ' +
                    "Answer the user's last message now, directly and completely."
                  : `[system] The task is not finished yet (${unfinished}). ` +
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

          // Reaching here with wasEmpty still true means every retry also
          // came back empty. Never let that resolve as a silent "Task
          // completed" - tell the user plainly instead of leaving them
          // staring at a chat that just stopped.
          if (wasEmpty) {
            const noticeMsg = {
              id: `err_${Date.now()}`,
              role: 'system_error',
              content: 'NexusCoder ไม่ได้ตอบกลับหลังจากลองหลายครั้ง (โมเดลส่งคำตอบว่างเปล่ากลับมา) อาจเกิดจากตัวโมเดลที่เลือกไว้ หรือปัญหาฝั่งผู้ให้บริการชั่วคราว ลองส่งใหม่อีกครั้ง หรือเปลี่ยนโมเดลในหน้าตั้งค่า',
              timestamp: Date.now()
            };
            this.addUiMessage(noticeMsg);
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

          // Resolve the matching embedded tool-call entry (persisted at
          // stream_end as "no result yet") instead of appending a second,
          // duplicate record. Without this, a session reload showed every
          // finished tool call as permanently "Running..." plus a separate
          // Success card underneath - looking like the agent had abandoned
          // the task even though it had actually finished.
          const resolved = this.resolveUiToolCall(tc.id, result);
          if (!resolved) {
            this.uiMessages.push({
              id: `tool_${Date.now()}_${tc.id}`,
              role: 'tool_result',
              toolName: toolName,
              result: result,
              timestamp: Date.now()
            });
          }

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
