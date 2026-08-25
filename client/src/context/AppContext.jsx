import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as api from '../services/api';
import { usePanelSizes } from '../hooks/usePanelSizes';

// How often the live token stream is allowed to repaint the chat, in ms.
// ~12 fps of text updates reads as instant while leaving the main thread free
// for typing and scrolling.
const STREAM_FLUSH_MS = 80;

const AppContext = createContext(null);

// Hot, high-frequency agent state (token stream, progress bar, step log) lives
// in its own context. It ticks many times per second while the model is
// answering; keeping it out of the main context is what stops every panel in
// the app from re-rendering on every token.
const AgentStreamContext = createContext(null);

export function AppProvider({ children }) {
  // Config & Modals
  const [hasApiKey, setHasApiKey] = useState(false);
  const [model, setModel] = useState('anthropic/claude-3.7-sonnet');
  const [models, setModels] = useState([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [mcpServers, setMcpServers] = useState([]);
  const [mcpSummary, setMcpSummary] = useState({ totalServers: 0, connectedCount: 0, totalToolsCount: 0, hasConnected: false });
  const [mcpTemplates, setMcpTemplates] = useState([]);
  const [skills, setSkills] = useState([]);
  const [activeSkills, setActiveSkills] = useState([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [appVersion, setAppVersion] = useState('');
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('nexuscoder_theme') || 'default';
    } catch (e) {
      return 'default';
    }
  });

  // Software Updates
  const [updateStatus, setUpdateStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateProgress, setUpdateProgress] = useState({ percent: 0, speed: '0 KB/s', transferred: 0, total: 0 });
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateRepo, setUpdateRepo] = useState('arnonsrirat/Nexus_Coder');
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);

  // Workspace
  const [workspaceRoot, setWorkspaceRoot] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [fileTree, setFileTree] = useState([]);
  const [activeTabs, setActiveTabs] = useState([]); // [{ path, name, content, dirty }]
  const [activeTabPath, setActiveTabPath] = useState(null);
  const [pinnedContextFiles, setPinnedContextFiles] = useState([]);
  const [fileDiffs, setFileDiffs] = useState([]); // [{ path, action, diff, timestamp }]
  const [activeDiff, setActiveDiff] = useState(null);

  // Agent State & Modes
  const [messages, setMessages] = useState([]);
  const [agentMode, setAgentMode] = useState('agent'); // 'agent' | 'plan' | 'ask' | 'system'
  const [reasoningEffort, setReasoningEffort] = useState('medium'); // 'high' | 'medium' | 'low' | 'off'
  const [agentStatus, setAgentStatus] = useState('idle'); // 'idle' | 'streaming' | 'executing_tool' | 'waiting_input' | 'stopped'
  const [agentProgress, setAgentProgress] = useState({
    isBusy: false,
    phase: 'idle',
    percent: 0,
    stepText: '',
    startedAt: null,
    toolName: '',
    iteration: 1
  });
  const [streamData, setStreamData] = useState({ content: '', reasoning: '', toolCalls: [] });
  const [pendingPrompt, setPendingPrompt] = useState(null); // { id, type, question, options, allowCustomInput, toolName, toolArgs }
  const [agentStepLog, setAgentStepLog] = useState('');

  // Chat History & Sessions
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatTitle, setCurrentChatTitle] = useState('New Conversation');
  const [contextStats, setContextStats] = useState({
    estimatedTokens: 0,
    contextLimit: 200000,
    percent: 0,
    isHigh: false,
    isCritical: false,
    model: 'anthropic/claude-3.7-sonnet',
    messageCount: 0,
    uiMessageCount: 0
  });

  // Throttled streaming buffer for lag-free rendering.
  // Tokens arrive far faster than the screen can paint, so chunks are collected
  // in a ref and flushed at most once per STREAM_FLUSH_MS on an animation frame.
  // Both content and reasoning share one flush, so a burst of either can never
  // starve the other the way two competing timers used to.
  const streamBufferRef = useRef({ content: '', reasoning: '' });
  // Id of the most recent optimistically-rendered user message, so the
  // server's authoritative echo (message_added) can replace it in place
  // instead of appearing as a duplicate.
  const pendingUserMessageIdRef = useRef(null);
  const streamTimerRef = useRef(null);
  const streamRafRef = useRef(null);

  const flushStreamBuffer = useCallback(() => {
    streamTimerRef.current = null;
    streamRafRef.current = null;
    const { content, reasoning } = streamBufferRef.current;
    setStreamData(prev => (
      prev.content === content && prev.reasoning === reasoning
        ? prev
        : { ...prev, content, reasoning }
    ));
  }, []);

  const scheduleStreamFlush = useCallback(() => {
    if (streamTimerRef.current) return;
    streamTimerRef.current = setTimeout(() => {
      // Paint on a frame boundary so we never render mid-layout.
      streamRafRef.current = requestAnimationFrame(flushStreamBuffer);
    }, STREAM_FLUSH_MS);
  }, [flushStreamBuffer]);

  const cancelStreamFlush = useCallback(() => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    if (streamRafRef.current) {
      cancelAnimationFrame(streamRafRef.current);
      streamRafRef.current = null;
    }
  }, []);

  // Interactive Canvas & Visual Plan
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [activePlan, setActivePlan] = useState(null); // { title, summary, steps: [...] }
  const [activeCanvas, setActiveCanvas] = useState(null); // { type, title, content }
  const [canvasViewMode, setCanvasViewMode] = useState('plan'); // 'plan' | 'artifact' | 'preview'

  // Terminal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);

  // Resizable layout panel sizes, custom ordering and collapsibility (persisted per user)
  const {
    panelSizes,
    panelOrder,
    panelVisibility,
    resizePanel,
    resetPanel,
    resetAllPanels,
    togglePanelVisibility,
    setPanelVisibility,
    movePanel,
    reorderPanels,
    resetLayout
  } = usePanelSizes();

  // WebSocket reference
  const wsRef = useRef(null);
  const workspaceRootRef = useRef('');
  const treeRefreshTimerRef = useRef(null);

  // Initialize Config & Models
  const loadInitialData = useCallback(async () => {
    // Config must load first since it decides which modal (if any) to open,
    // but models/chat history are independent - one timing out or failing
    // (e.g. no internet reaching OpenRouter) must never block the other or
    // leave the UI stuck waiting.
    try {
      const cfg = await api.fetchConfig();
      setHasApiKey(cfg.hasApiKey);
      if (cfg.model) setModel(cfg.model);
      if (cfg.autoApprove !== undefined) setAutoApprove(cfg.autoApprove);
      if (cfg.workspaceRoot) {
        setWorkspaceRoot(cfg.workspaceRoot);
        setWorkspaceName(cfg.workspaceRoot.split(/[\\/]/).pop() || '');
      }
      if (cfg.recentWorkspaces) setRecentWorkspaces(cfg.recentWorkspaces);
      if (cfg.version) setAppVersion(cfg.version);
      if (cfg.updateRepo) setUpdateRepo(cfg.updateRepo);
      if (cfg.autoCheckUpdates !== undefined) setAutoCheckUpdates(cfg.autoCheckUpdates);
      if (cfg.theme && !localStorage.getItem('nexuscoder_theme')) {
        setThemeState(cfg.theme);
        document.documentElement.setAttribute('data-theme', cfg.theme);
      }

      if (!cfg.hasApiKey) {
        setIsSettingsOpen(true);
      } else if (!cfg.workspaceRoot) {
        setIsFolderPickerOpen(true);
      }

      // Non-blocking auto update check after app boot
      if (cfg.autoCheckUpdates !== false) {
        setTimeout(() => {
          api.checkUpdates(cfg.updateRepo || null)
            .then(res => {
              if (res && res.info) {
                setUpdateInfo(res.info);
                setUpdateStatus(res.info.updateAvailable ? 'available' : 'idle');
                if (res.info.updateAvailable) {
                  setIsUpdateModalOpen(true);
                }
              }
            })
            .catch(() => {});
        }, 4000);
      }
    } catch (err) {
      console.error('Failed to load initial config:', err);
    }

    api.fetchModels()
      .then(mList => mList.models && setModels(mList.models))
      .catch(err => console.error('Failed to load models:', err));

    api.fetchChats()
      .then(cList => cList.chats && setChatSessions(cList.chats))
      .catch(err => console.error('Failed to load chat history:', err));

    // Load MCP and AI Skills data
    api.fetchMcpServers()
      .then(res => {
        if (res?.servers) setMcpServers(res.servers);
        if (res?.summary) setMcpSummary(res.summary);
      })
      .catch(err => console.warn('Failed to load MCP servers:', err));

    api.fetchMcpTemplates()
      .then(res => {
        if (res?.templates) setMcpTemplates(res.templates);
      })
      .catch(err => console.warn('Failed to load MCP templates:', err));

    api.fetchSkills()
      .then(res => {
        if (res?.skills) {
          setSkills(res.skills);
          setActiveSkills(res.active || res.skills.filter(s => s.enabled));
        }
      })
      .catch(err => console.warn('Failed to load skills:', err));
  }, []);

  // MCP & Skills Management Handlers
  const loadMcpData = useCallback(async () => {
    try {
      const [serversRes, tplRes] = await Promise.allSettled([
        api.fetchMcpServers(),
        api.fetchMcpTemplates()
      ]);
      if (serversRes.status === 'fulfilled' && serversRes.value) {
        setMcpServers(serversRes.value.servers || []);
        setMcpSummary(serversRes.value.summary || {});
      }
      if (tplRes.status === 'fulfilled' && tplRes.value?.templates) {
        setMcpTemplates(tplRes.value.templates);
      }
    } catch (e) {
      console.warn('Failed to refresh MCP data:', e);
    }
  }, []);

  const loadSkillsData = useCallback(async () => {
    try {
      const res = await api.fetchSkills();
      if (res?.skills) {
        setSkills(res.skills);
        setActiveSkills(res.active || res.skills.filter(s => s.enabled));
      }
    } catch (e) {
      console.warn('Failed to refresh skills data:', e);
    }
  }, []);

  const connectMcpServer = async (id) => {
    const res = await api.connectMcpServer(id);
    await loadMcpData();
    return res;
  };

  const disconnectMcpServer = async (id) => {
    const res = await api.disconnectMcpServer(id);
    await loadMcpData();
    return res;
  };

  const saveMcpServer = async (serverConfig) => {
    const res = await api.saveMcpServer(serverConfig);
    await loadMcpData();
    return res;
  };

  const deleteMcpServer = async (id) => {
    const res = await api.deleteMcpServer(id);
    await loadMcpData();
    return res;
  };

  const testMcpServer = async (id) => {
    return await api.testMcpServer(id);
  };

  const toggleSkill = async (id, enabled = null) => {
    const res = await api.toggleSkill(id, enabled);
    await loadSkillsData();
    return res;
  };

  const saveSkill = async (skillData) => {
    const res = await api.saveSkill(skillData);
    await loadSkillsData();
    return res;
  };

  const deleteSkill = async (id) => {
    const res = await api.deleteSkill(id);
    await loadSkillsData();
    return res;
  };

  const resetBuiltinSkills = async () => {
    const res = await api.resetBuiltinSkills();
    await loadSkillsData();
    return res;
  };

  const importSkillMarkdown = async (payload) => {
    const res = await api.importSkillMarkdown(payload);
    await loadSkillsData();
    return res;
  };

  const exportSkillMarkdown = async (id) => {
    return await api.exportSkillMarkdown(id);
  };

  // Refresh Workspace Tree.
  // Deliberately has no reactive dependencies: it reads the current workspace
  // from a ref so its identity stays stable. Previously it changed whenever
  // workspaceRoot changed, which tore down and reopened the WebSocket.
  const refreshTree = useCallback(async () => {
    if (!workspaceRootRef.current) return;
    try {
      const data = await api.fetchWorkspaceTree();
      setFileTree(data.tree || []);
      if (data.workspaceName) setWorkspaceName(data.workspaceName);
    } catch (e) {
      console.error('Failed to refresh tree:', e);
    }
  }, []);

  // Coalesce bursts of file-change events into a single tree refresh.
  const scheduleTreeRefresh = useCallback(() => {
    if (treeRefreshTimerRef.current) clearTimeout(treeRefreshTimerRef.current);
    treeRefreshTimerRef.current = setTimeout(() => {
      treeRefreshTimerRef.current = null;
      refreshTree();
    }, 400);
  }, [refreshTree]);

  useEffect(() => {
    workspaceRootRef.current = workspaceRoot;
  }, [workspaceRoot]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('nexuscoder_theme', newTheme);
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', newTheme);
    api.saveConfig({ theme: newTheme }).catch(() => {});
  };

  // Connect WebSocket (runs once - see refreshTree note above)
  useEffect(() => {
    loadInitialData();

    let disposed = false;
    let reconnectTimer = null;
    let reconnectAttempts = 0;

    const connect = () => {
      if (disposed) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isDev = window.location.port === '3000';
      const wsUrl = isDev
        ? `${wsProtocol}//${window.location.host}/ws`
        : `${wsProtocol}//${window.location.host}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Agent Backend WS');
      reconnectAttempts = 0;
    };

    ws.onclose = () => {
      if (disposed) return;
      // Back off from 500ms up to 5s so a backend restart is picked up
      // automatically instead of leaving the UI permanently dead.
      reconnectAttempts += 1;
      const delay = Math.min(500 * reconnectAttempts, 5000);
      reconnectTimer = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      try { ws.close(); } catch (e) { /* onclose handles the retry */ }
    };

    ws.onmessage = (event) => {
      try {
        const { event: evtType, data } = JSON.parse(event.data);

        switch (evtType) {
          case 'init_state':
            if (data.workspaceRoot) {
              setWorkspaceRoot(data.workspaceRoot);
              setWorkspaceName(data.workspaceRoot.split(/[\\/]/).pop() || '');
            }
            if (data.model) setModel(data.model);
            if (data.autoApprove !== undefined) setAutoApprove(data.autoApprove);
            if (data.mode) setAgentMode(data.mode);
            if (data.reasoningEffort) setReasoningEffort(data.reasoningEffort);

            // Restore the conversation - covers both app relaunch and a
            // mid-task WebSocket reconnect.
            if (Array.isArray(data.messages)) setMessages(data.messages);
            if (data.chatId) setCurrentChatId(data.chatId);
            setActivePlan(data.activePlan || null);
            setActiveCanvas(data.activeCanvas || null);
            if (data.activePlan || data.activeCanvas) setIsCanvasOpen(true);

            if (data.contextStats) setContextStats(data.contextStats);

            if (data.mcp) {
              if (Array.isArray(data.mcp.servers)) setMcpServers(data.mcp.servers);
              if (data.mcp.summary) setMcpSummary(data.mcp.summary);
            }
            if (Array.isArray(data.skills)) {
              setSkills(data.skills);
              setActiveSkills(data.skills.filter(s => s.enabled));
            }

            if (data.isPausedForInput && data.pendingAction) {
              setPendingPrompt(data.pendingAction);
              setAgentStatus('waiting_input');
            } else if (data.isRunning) {
              setAgentStatus('streaming');
            } else {
              setAgentStatus('idle');
            }
            break;

          case 'mcp_servers_updated':
            if (data) {
              if (Array.isArray(data.servers)) setMcpServers(data.servers);
              if (data.summary) setMcpSummary(data.summary);
            }
            break;

          case 'skills_updated':
            if (data) {
              if (Array.isArray(data.skills)) setSkills(data.skills);
              if (Array.isArray(data.activeSkills)) setActiveSkills(data.activeSkills);
            }
            break;

          case 'context_stats_updated':
            if (data) setContextStats(data);
            break;

          case 'context_compacted':
            if (data?.stats) setContextStats(data.stats);
            break;

          case 'agent_resumed':
            setAgentStatus('streaming');
            break;

          case 'stream_retry':
            // Surface the retry instead of leaving the UI looking frozen.
            setAgentStepLog(
              `Connection issue - retrying (${data.attempt}/${data.maxAttempts})...`
            );
            break;

          case 'message_added':
            if (data.role === 'user' && pendingUserMessageIdRef.current) {
              const pendingId = pendingUserMessageIdRef.current;
              pendingUserMessageIdRef.current = null;
              setMessages(prev => {
                const idx = prev.findIndex(m => m.id === pendingId);
                if (idx === -1) return [...prev, data];
                const updated = [...prev];
                updated[idx] = data;
                return updated;
              });
            } else {
              setMessages(prev => [...prev, data]);
            }
            break;

          case 'sessions_updated':
            api.fetchChats().then(res => res.chats && setChatSessions(res.chats)).catch(console.error);
            break;

          case 'status_change':
            if (data.status) setUpdateStatus(data.status);
            if (data.updateInfo) setUpdateInfo(data.updateInfo);
            if (data.downloadProgress) setUpdateProgress(data.downloadProgress);
            break;

          // update_progress/update_ready/update_error each used to appear a
          // second time later in this same switch (right before
          // 'history_cleared') with extra behavior - a switch only ever runs
          // the FIRST matching case, so that second copy was dead code and
          // its extra lines never ran: downloading progress never flipped
          // the status to 'downloading', and worse, a ready update never
          // opened the update modal to prompt the user to install it. Merged
          // here so both actually happen.
          case 'update_progress':
            setUpdateStatus('downloading');
            setUpdateProgress(data);
            break;

          case 'update_ready':
            setUpdateStatus('ready');
            if (data.version) {
              setUpdateInfo(prev => ({ ...prev, latestVersion: data.version }));
            }
            setIsUpdateModalOpen(true);
            break;

          case 'update_error':
            setUpdateStatus('error');
            if (data.message) {
              setUpdateInfo(prev => ({ ...prev, error: data.message }));
            }
            break;

          case 'chat_switched':
            if (data.chat) {
              setCurrentChatId(data.chat.id);
              setCurrentChatTitle(data.chat.title || 'Conversation');
              // uiMessages is the renderable transcript; chat.messages is the
              // raw API transcript and must never be fed to the chat panel.
              setMessages(data.chat.uiMessages || []);
              if (data.chat.mode) setAgentMode(data.chat.mode);
              setActivePlan(data.chat.activePlan || null);
              setActiveCanvas(data.chat.activeCanvas || null);
              setPendingPrompt(null);
              // Same fix as clearChat: without this, switching away from a
              // chat while agentStatus was stuck non-idle (mid-run, or from
              // an earlier glitch) carried isAgentBusy=true into the chat you
              // switched to, permanently disabling send/attach there even
              // though nothing was actually running for it.
              setAgentStatus('idle');
              setAgentProgress({ isBusy: false, phase: 'idle', percent: 0, stepText: '', startedAt: null, toolName: '', iteration: 1 });
            }
            break;

          case 'chat_created':
            if (data.chat) {
              setCurrentChatId(data.chat.id);
              setCurrentChatTitle(data.chat.title || 'New Conversation');
              setMessages([]);
              setActivePlan(null);
              setActiveCanvas(null);
              setPendingPrompt(null);
              setAgentStatus('idle');
              setAgentProgress({ isBusy: false, phase: 'idle', percent: 0, stepText: '', startedAt: null, toolName: '', iteration: 1 });
              api.fetchChats().then(res => res.chats && setChatSessions(res.chats)).catch(console.error);
            }
            break;

          case 'agent_progress':
            setAgentProgress(prev => ({
              ...prev,
              isBusy: data.phase !== 'completed' && data.phase !== 'stopped',
              phase: data.phase || prev.phase,
              percent: data.percent !== undefined ? data.percent : prev.percent,
              stepText: data.step || prev.stepText,
              toolName: data.toolName || '',
              iteration: data.iteration || prev.iteration || 1,
              startedAt: prev.startedAt || Date.now()
            }));
            if (data.step) setAgentStepLog(data.step);
            break;

          case 'stream_start':
            setAgentStatus('streaming');
            setAgentProgress(prev => ({
              ...prev,
              isBusy: true,
              phase: (prev.phase === 'reading_context' || prev.phase === 'idle') ? 'thinking' : prev.phase,
              percent: Math.max(prev.percent || 0, 30),
              stepText: prev.stepText || 'NexusCoder is thinking...',
              startedAt: prev.startedAt || Date.now()
            }));
            cancelStreamFlush();
            streamBufferRef.current = { content: '', reasoning: '' };
            setStreamData({ content: '', reasoning: '', toolCalls: [] });
            break;

          case 'stream_chunk':
            streamBufferRef.current.content = data.content;
            scheduleStreamFlush();
            break;

          case 'stream_reasoning':
            streamBufferRef.current.reasoning = data.reasoning;
            scheduleStreamFlush();
            break;

          case 'stream_end':
            cancelStreamFlush();
            setAgentStatus('executing_tool');
            const endContent = (data.content !== undefined && data.content !== null && data.content !== '')
              ? data.content 
              : (streamBufferRef.current.content || streamData.content || '');
            const endReasoning = (data.reasoning !== undefined && data.reasoning !== null && data.reasoning !== '')
              ? data.reasoning 
              : (streamBufferRef.current.reasoning || streamData.reasoning || '');
            
            if (endContent || endReasoning || (data.toolCalls && data.toolCalls.length > 0)) {
              setMessages(prev => {
                const existingIdx = prev.findIndex(m => m.id === data.messageId);
                if (existingIdx !== -1) {
                  const updated = [...prev];
                  updated[existingIdx] = {
                    ...updated[existingIdx],
                    content: endContent,
                    reasoning: endReasoning,
                    toolCalls: data.toolCalls
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: data.messageId,
                    role: 'assistant',
                    content: endContent,
                    reasoning: endReasoning,
                    toolCalls: data.toolCalls,
                    timestamp: Date.now()
                  }
                ];
              });
            }
            streamBufferRef.current = { content: '', reasoning: '' };
            setStreamData({ content: '', reasoning: '', toolCalls: [] });
            api.fetchChats().then(res => res.chats && setChatSessions(res.chats)).catch(console.error);
            break;

          case 'interactive_prompt_required':
            setPendingPrompt(data);
            setAgentStatus('waiting_input');
            break;

          case 'action_approval_required':
            setPendingPrompt(data);
            setAgentStatus('waiting_input');
            break;

          case 'interactive_prompt_resolved':
            setPendingPrompt(null);
            setAgentStatus('streaming');
            break;

          case 'plan_updated':
            setActivePlan(data);
            setIsCanvasOpen(true);
            setCanvasViewMode('plan');
            break;

          case 'canvas_updated':
            setActiveCanvas(data);
            setIsCanvasOpen(true);
            setCanvasViewMode(data.type === 'html_preview' ? 'preview' : 'artifact');
            break;

          case 'mode_updated':
            setAgentMode(data.mode);
            break;

          case 'reasoning_effort_updated':
            setReasoningEffort(data.reasoningEffort);
            break;

          case 'tool_call_start':
            setAgentStatus('executing_tool');
            setAgentStepLog(`Running: ${data.name}...`);
            setAgentProgress(prev => ({
              ...prev,
              phase: 'tool_executing',
              percent: 85,
              stepText: `Running action: ${data.name}...`,
              toolName: data.name
            }));
            break;

          case 'tool_call_result':
            setAgentProgress(prev => ({
              ...prev,
              phase: 'tool_completed',
              percent: 90,
              stepText: `Completed action: ${data.name}. Analyzing results...`,
              toolName: data.name
            }));
            // Resolve the matching embedded tool-call card (it was rendered as
            // "Running..." at stream_end) instead of appending a second,
            // duplicate card - that duplication was what made finished work
            // look stuck / like it had vanished mid-task.
            setMessages(prev => {
              let matched = false;
              const updated = prev.map(m => {
                if (matched || m.role !== 'assistant' || !m.toolCalls || m.toolCalls.length === 0) return m;
                const idx = m.toolCalls.findIndex(tc => tc.id === data.toolCallId && tc.result === undefined);
                if (idx === -1) return m;
                matched = true;
                const newToolCalls = [...m.toolCalls];
                newToolCalls[idx] = { ...newToolCalls[idx], result: data.result };
                return { ...m, toolCalls: newToolCalls };
              });
              if (matched) return updated;
              // Fallback: no matching embedded call found (e.g. approved
              // action from a pending prompt) - show it as its own card.
              return [
                ...prev,
                {
                  id: `tool_${Date.now()}_${data.toolCallId}`,
                  role: 'tool_result',
                  toolName: data.name,
                  result: data.result,
                  timestamp: Date.now()
                }
              ];
            });
            break;

          case 'file_modified':
            // Add to visual diffs list
            setFileDiffs(prev => [
              {
                id: `diff_${Date.now()}`,
                path: data.path,
                action: data.action,
                diff: data.diff,
                timestamp: Date.now()
              },
              ...prev
            ]);
            // Refresh tree and opened tabs
            scheduleTreeRefresh();
            break;

          case 'agent_completed':
            setAgentStatus('idle');
            setAgentStepLog('');
            setAgentProgress(prev => ({
              ...prev,
              isBusy: false,
              phase: 'completed',
              percent: 100,
              stepText: 'Task completed.'
            }));
            break;

          case 'agent_max_iterations':
            // Without this the status stayed on "AI Generating..." forever and
            // the agent looked like it had silently vanished.
            setAgentStatus('paused');
            setAgentStepLog('');
            setAgentProgress(prev => ({
              ...prev,
              isBusy: false,
              phase: 'paused',
              stepText: 'Paused at step limit.'
            }));
            setMessages(prev => [
              ...prev,
              {
                id: `paused_${Date.now()}`,
                role: 'system_notice',
                content: data.message,
                canContinue: !!data.canContinue,
                timestamp: Date.now()
              }
            ]);
            break;

          case 'error': {
            // A rejected start_task (e.g. "Agent is already running") means
            // no 'message_added' will ever arrive to resolve the optimistic
            // user message - clear the ref so it doesn't get mistakenly
            // matched against a later, unrelated send.
            pendingUserMessageIdRef.current = null;
            // There used to be a second, later `case 'error':` in this same
            // switch that always pushed a visible chat message - but a JS
            // switch only ever runs the FIRST matching case, so that block
            // was dead code and every error (e.g. "Agent is already
            // running", a dropped connection mid-task) was silently
            // swallowed into agentProgress.stepText, a field only shown by
            // AgentThinkingCard - which this same update unmounts by setting
            // isBusy:false. The user saw nothing at all: a message sent, or
            // a run in progress, would just vanish with no explanation.
            // Merged here so an error is always visible in the transcript.
            if (streamBufferRef.current.content || streamData.content) {
              const partial = streamBufferRef.current.content || streamData.content;
              setMessages(prev => [
                ...prev,
                {
                  id: `msg_${Date.now()}_interrupted`,
                  role: 'assistant',
                  content: partial,
                  timestamp: Date.now()
                }
              ]);
            }
            streamBufferRef.current = { content: '', reasoning: '' };
            setStreamData({ content: '', reasoning: '', toolCalls: [] });
            setAgentStatus('idle');
            setAgentProgress(prev => ({
              ...prev,
              isBusy: false,
              phase: 'stopped',
              percent: 0,
              stepText: `Error: ${data.message || 'An error occurred'}`
            }));
            setMessages(prev => [
              ...prev,
              {
                id: `err_${Date.now()}`,
                role: 'system_error',
                content: data.message || 'An error occurred.',
                timestamp: Date.now()
              }
            ]);
            break;
          }

          case 'agent_stopped':
            if (streamBufferRef.current.content || streamData.content) {
              const partial = streamBufferRef.current.content || streamData.content;
              setMessages(prev => [
                ...prev,
                {
                  id: `msg_${Date.now()}_stopped`,
                  role: 'assistant',
                  content: partial,
                  timestamp: Date.now()
                }
              ]);
            }
            streamBufferRef.current = { content: '', reasoning: '' };
            setStreamData({ content: '', reasoning: '', toolCalls: [] });
            setAgentStatus('stopped');
            setPendingPrompt(null);
            setAgentProgress(prev => ({
              ...prev,
              isBusy: false,
              phase: 'stopped',
              percent: 0,
              stepText: 'Stopped'
            }));
            break;

          case 'workspace_updated':
            setWorkspaceRoot(data.workspaceRoot);
            setWorkspaceName(data.name || data.workspaceRoot.split(/[\\/]/).pop());
            refreshTree();
            break;

          case 'workspace_file_changed':
            scheduleTreeRefresh();
            break;

          case 'terminal_command_started':
            setTerminalOpen(true);
            setTerminalLogs(prev => [...prev.slice(-900), `\n$ ${data.command}\n`]);
            break;

          case 'terminal_output':
            setTerminalLogs(prev => [...prev.slice(-900), data.data]);
            break;

          case 'terminal_command_completed':
            setTerminalLogs(prev => [...prev.slice(-900), `[Process exited with code ${data.exitCode}]\n`]);
            break;

          case 'history_cleared':
            setMessages([]);
            setPendingPrompt(null);
            setAgentStatus('idle');
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('Error processing WS event:', err);
      }
    };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (treeRefreshTimerRef.current) clearTimeout(treeRefreshTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [loadInitialData, refreshTree, scheduleTreeRefresh]);

  // Update file tree when workspaceRoot changes
  useEffect(() => {
    if (workspaceRoot) {
      refreshTree();
    }
  }, [workspaceRoot, refreshTree]);

  // Actions
  const sendMessage = (text, attachedFiles = [], media = []) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('WebSocket is not connected to backend.');
      return;
    }
    // Show the user's own message immediately instead of waiting for the
    // server to echo it back over 'message_added'. Previously, if that
    // round-trip was ever interrupted (a connection hiccup, the server
    // rejecting the request), the message the user just typed never
    // appeared anywhere - it looked like the whole chat had vanished before
    // the AI even had a chance to respond. The 'message_added' handler below
    // replaces this placeholder with the server's authoritative copy once it
    // arrives, so nothing is duplicated.
    const pendingId = `pending_user_${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: pendingId,
        role: 'user',
        content: text,
        displayContent: text,
        media: media,
        pending: true,
        timestamp: Date.now()
      }
    ]);
    pendingUserMessageIdRef.current = pendingId;

    setAgentStatus('streaming');
    setAgentProgress({
      isBusy: true,
      phase: 'reading_context',
      percent: 15,
      stepText: 'Receiving prompt & analyzing context...',
      startedAt: Date.now(),
      toolName: '',
      iteration: 1
    });
    wsRef.current.send(JSON.stringify({
      type: 'start_task',
      payload: {
        prompt: text,
        attachedFiles: [...pinnedContextFiles, ...attachedFiles],
        media: media,
        mode: agentMode,
        reasoningEffort: reasoningEffort
      }
    }));
  };

  // Resume a run that stopped at the safety limit, keeping full context.
  const continueRun = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setAgentStatus('streaming');
    setAgentProgress(prev => ({
      ...prev,
      isBusy: true,
      phase: 'thinking',
      percent: Math.max(prev.percent || 0, 30),
      stepText: 'Continuing task...',
      startedAt: Date.now()
    }));
    wsRef.current.send(JSON.stringify({ type: 'continue_run', payload: {} }));
  };

  const handleSetAgentMode = (mode) => {
    setAgentMode(mode);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'set_mode', payload: { mode } }));
    }
  };

  const handleSetReasoningEffort = (effort) => {
    setReasoningEffort(effort);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'set_reasoning_effort', payload: { reasoningEffort: effort } }));
    }
  };

  const respondInteractivePrompt = (actionId, response) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setPendingPrompt(null);
    setAgentProgress(prev => ({
      ...prev,
      isBusy: true,
      phase: 'tool_executing',
      stepText: 'Processing your choice & continuing...',
      startedAt: prev.startedAt || Date.now()
    }));
    wsRef.current.send(JSON.stringify({
      type: 'respond_interactive_prompt',
      payload: { actionId, response }
    }));
  };

  const stopAgent = () => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'stop_agent' }));
    setAgentStatus('stopped');
    setAgentProgress(prev => ({
      ...prev,
      isBusy: false,
      phase: 'stopped',
      percent: 0,
      stepText: 'Stopped'
    }));
  };

  const clearChat = () => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'clear_history' }));
    setMessages([]);
    setFileDiffs([]);
    setActivePlan(null);
    setActiveCanvas(null);
    setPendingPrompt(null);
    // isAgentBusy (which disables the send/attach buttons) is
    // `agentStatus === 'streaming' || 'executing_tool' || agentProgress.isBusy`
    // - this used to reset only agentProgress.isBusy, so if agentStatus was
    // anything other than idle at the moment of clearing (still mid-run, or
    // stuck from an earlier glitch), isAgentBusy stayed permanently true
    // afterward: the chat looked empty and normal, but the send button and
    // attach button were disabled forever, with no visible reason why.
    setAgentStatus('idle');
    setAgentProgress({
      isBusy: false,
      phase: 'idle',
      percent: 0,
      stepText: '',
      startedAt: null,
      toolName: '',
      iteration: 1
    });
  };

  const switchChat = (chatId) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'switch_chat',
      payload: { chatId }
    }));
  };

  const createNewChat = useCallback(({ mode = null, withSummary = false, baseChatId = null, title = null } = {}) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const targetMode = mode || (agentMode === 'system' ? 'system' : 'agent');
    if (mode) setAgentMode(mode);
    wsRef.current.send(JSON.stringify({
      type: 'new_chat',
      payload: {
        mode: targetMode,
        title: title,
        withSummary: !!withSummary,
        baseChatId: baseChatId || currentChatId
      }
    }));
  }, [agentMode, currentChatId]);

  const compactCurrentContext = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'compact_context' }));
  }, []);

  const renameChatSession = async (chatId, title) => {
    try {
      await api.renameChat(chatId, title);
      if (currentChatId === chatId) {
        setCurrentChatTitle(title);
      }
      const res = await api.fetchChats();
      if (res.chats) setChatSessions(res.chats);
    } catch (e) {
      console.error('Failed to rename chat:', e);
    }
  };

  const deleteChatSession = async (chatId) => {
    try {
      // The server can genuinely fail to delete (e.g. a Windows file lock
      // during autosave) and still answer HTTP 200 with { success: false }.
      // That result used to go unchecked, so a failed delete looked
      // identical to a successful one - the chat "wouldn't delete" with no
      // explanation, because the code never actually looked at whether it
      // had.
      const result = await api.deleteChat(chatId);
      if (!result?.success) {
        alert('Could not delete this conversation - it may be in use. Please try again.');
        return;
      }
      if (currentChatId === chatId) {
        createNewChat();
      }
      const res = await api.fetchChats();
      if (res.chats) setChatSessions(res.chats);
    } catch (e) {
      console.error('Failed to delete chat:', e);
      alert('Could not delete this conversation: ' + e.message);
    }
  };

  const selectWorkspaceFolder = async (folderPath) => {
    try {
      await api.setWorkspaceFolder(folderPath);
      setWorkspaceRoot(folderPath);
      setWorkspaceName(folderPath.split(/[\\/]/).pop() || '');
      setRecentWorkspaces(prev => [folderPath, ...prev.filter(p => p !== folderPath)].slice(0, 8));
      setActiveTabs([]);
      setActiveTabPath(null);
      setIsFolderPickerOpen(false);
      refreshTree();
    } catch (err) {
      alert(err.message);
    }
  };

  const openFileInEditor = async (filePath) => {
    const existing = activeTabs.find(t => t.path === filePath);
    if (existing) {
      setActiveTabPath(filePath);
      return;
    }

    try {
      const res = await api.fetchFileContent(filePath);
      const newTab = {
        path: filePath,
        name: res.name || filePath.split('/').pop(),
        content: res.content || '',
        dirty: false
      };
      setActiveTabs(prev => [...prev, newTab]);
      setActiveTabPath(filePath);
    } catch (e) {
      console.error('Error opening file:', e);
    }
  };

  const closeTab = (filePath) => {
    setActiveTabs(prev => {
      const next = prev.filter(t => t.path !== filePath);
      if (activeTabPath === filePath) {
        setActiveTabPath(next.length > 0 ? next[next.length - 1].path : null);
      }
      return next;
    });
  };

  const updateTabContent = (filePath, newContent) => {
    setActiveTabs(prev => prev.map(t => {
      if (t.path === filePath) {
        return { ...t, content: newContent, dirty: true };
      }
      return t;
    }));
  };

  const saveActiveFile = async () => {
    const tab = activeTabs.find(t => t.path === activeTabPath);
    if (!tab) return;
    try {
      await api.saveFileContent(tab.path, tab.content);
      setActiveTabs(prev => prev.map(t => t.path === tab.path ? { ...t, dirty: false } : t));
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const togglePinContextFile = (filePath) => {
    setPinnedContextFiles(prev => {
      if (prev.includes(filePath)) {
        return prev.filter(p => p !== filePath);
      } else {
        return [...prev, filePath];
      }
    });
  };

  const runTerminalCommand = (command) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: 'run_terminal_command',
      payload: { command }
    }));
  };

  const killTerminalCommand = (procId = null) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: 'kill_terminal_command',
      payload: { procId }
    }));
  };

  // Software Update Actions
  const checkUpdates = async (repo = null) => {
    setUpdateStatus('checking');
    try {
      const res = await api.checkUpdates(repo || updateRepo);
      if (res && res.info) {
        setUpdateInfo(res.info);
        setUpdateStatus(res.info.updateAvailable ? 'available' : 'idle');
        if (res.info.updateAvailable) {
          setIsUpdateModalOpen(true);
        }
        return res.info;
      }
      return null;
    } catch (err) {
      console.warn('Update check failed:', err);
      setUpdateStatus('error');
      setUpdateInfo({ updateAvailable: false, error: err.message });
      throw err;
    }
  };

  const startDownloadUpdate = async () => {
    setUpdateStatus('downloading');
    try {
      await api.downloadUpdate();
    } catch (err) {
      setUpdateStatus('error');
      alert(`Download failed: ${err.message}`);
    }
  };

  const applyUpdate = async () => {
    try {
      await api.applyUpdate();
    } catch (err) {
      alert(`Failed to apply update: ${err.message}`);
    }
  };

  const clearUpdateCache = async () => {
    try {
      const res = await api.cleanUpdateCache();
      return res;
    } catch (err) {
      console.warn('Failed to clear update cache:', err);
      return { success: false, error: err.message };
    }
  };

  const saveSettings = async ({ apiKey, selectedModel, autoApprove: autoApp, updateRepo: repo, autoCheckUpdates: autoCheck, selectedTheme }) => {
    try {
      const themeToSave = selectedTheme || theme;
      await api.saveConfig({ 
        apiKey, 
        model: selectedModel, 
        autoApprove: autoApp,
        updateRepo: repo !== undefined ? repo : updateRepo,
        autoCheckUpdates: autoCheck !== undefined ? autoCheck : autoCheckUpdates,
        theme: themeToSave
      });
      setHasApiKey(true);
      setModel(selectedModel);
      setAutoApprove(autoApp);
      if (repo !== undefined) setUpdateRepo(repo);
      if (autoCheck !== undefined) setAutoCheckUpdates(autoCheck);
      if (selectedTheme) setTheme(selectedTheme);
      setIsSettingsOpen(false);

      const mList = await api.fetchModels();
      if (mList.models) setModels(mList.models);
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  // Actions are re-created on every render. Wrap them once in stable
  // identities so the context value only changes when real state changes.
  const actionsRef = useRef(null);
  actionsRef.current = {
    setTheme,
    saveSettings,
    selectWorkspaceFolder,
    openFileInEditor,
    closeTab,
    updateTabContent,
    saveActiveFile,
    togglePinContextFile,
    refreshTree,
    setAgentMode: handleSetAgentMode,
    setReasoningEffort: handleSetReasoningEffort,
    sendMessage,
    respondInteractivePrompt,
    stopAgent,
    continueRun,
    clearChat,
    switchChat,
    createNewChat,
    compactCurrentContext,
    renameChatSession,
    deleteChatSession,
    runTerminalCommand,
    killTerminalCommand,
    checkUpdates,
    startDownloadUpdate,
    applyUpdate,
    clearUpdateCache,

    // MCP Actions
    loadMcpData,
    refreshMcp: loadMcpData,
    connectMcpServer,
    disconnectMcpServer,
    saveMcpServer,
    deleteMcpServer,
    testMcpServer,

    // AI Skills Actions
    loadSkillsData,
    refreshSkills: loadSkillsData,
    toggleSkill,
    saveSkill,
    deleteSkill,
    resetBuiltinSkills,
    importSkillMarkdown,
    exportSkillMarkdown
  };

  const actions = useMemo(() => {
    const names = Object.keys(actionsRef.current);
    const stable = {};
    for (const name of names) {
      stable[name] = (...args) => actionsRef.current[name](...args);
    }
    return stable;
  }, []);

  // Global Keyboard Shortcut: Ctrl+Shift+N or Cmd+Shift+N to create a new chat
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        createNewChat({ withSummary: false });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [createNewChat]);

  // `isAgentBusy` is intentionally a boolean, not the agentProgress object:
  // it only flips when the agent starts or finishes, so consumers that just
  // need "is it working?" do not re-render on every progress tick.
  const isAgentBusy =
    agentStatus === 'streaming' ||
    agentStatus === 'executing_tool' ||
    Boolean(agentProgress?.isBusy);

  const streamValue = useMemo(() => ({
    streamData,
    agentProgress,
    setAgentProgress,
    agentStepLog,
    agentStatus,
    isAgentBusy
  }), [streamData, agentProgress, agentStepLog, agentStatus, isAgentBusy]);

  const value = useMemo(() => ({
    // Settings & State
    hasApiKey,
    model,
    models,
    autoApprove,
    isSettingsOpen,
    setIsSettingsOpen,
    isFolderPickerOpen,
    setIsFolderPickerOpen,
    isNewSessionModalOpen,
    setIsNewSessionModalOpen,
    isMcpModalOpen,
    setIsMcpModalOpen,
    isSkillsModalOpen,
    setIsSkillsModalOpen,
    recentWorkspaces,
    appVersion,
    theme,

    // MCP & AI Skills
    mcpServers,
    mcpSummary,
    mcpTemplates,
    skills,
    activeSkills,

    // Resizable & Customizable Layout
    panelSizes,
    panelOrder,
    panelVisibility,
    resizePanel,
    resetPanel,
    resetAllPanels,
    togglePanelVisibility,
    setPanelVisibility,
    movePanel,
    reorderPanels,
    resetLayout,

    // Workspace & Editor
    workspaceRoot,
    workspaceName,
    fileTree,
    activeTabs,
    activeTabPath,
    setActiveTabPath,
    pinnedContextFiles,
    fileDiffs,
    activeDiff,
    setActiveDiff,

    // Agent & Modes
    agentMode,
    reasoningEffort,
    messages,
    agentStatus,
    isAgentBusy,
    pendingPrompt,

    // Chat Sessions History & Context Stats
    chatSessions,
    currentChatId,
    currentChatTitle,
    contextStats,

    // Canvas & Visual Plan
    isCanvasOpen,
    setIsCanvasOpen,
    activePlan,
    setActivePlan,
    activeCanvas,
    setActiveCanvas,
    canvasViewMode,
    setCanvasViewMode,

    // Terminal
    terminalOpen,
    setTerminalOpen,
    terminalLogs,
    setTerminalLogs,

    // Software Updates
    updateStatus,
    updateInfo,
    updateProgress,
    isUpdateModalOpen,
    setIsUpdateModalOpen,
    updateRepo,
    setUpdateRepo,
    autoCheckUpdates,
    setAutoCheckUpdates,

    ...actions
  }), [
    hasApiKey, model, models, autoApprove, isSettingsOpen, isFolderPickerOpen, isNewSessionModalOpen,
    isMcpModalOpen, isSkillsModalOpen, recentWorkspaces, appVersion, theme,
    mcpServers, mcpSummary, mcpTemplates, skills, activeSkills,
    panelSizes, panelOrder, panelVisibility, resizePanel, resetPanel,
    resetAllPanels, togglePanelVisibility, setPanelVisibility, movePanel,
    reorderPanels, resetLayout,
    workspaceRoot, workspaceName, fileTree, activeTabs, activeTabPath,
    pinnedContextFiles, fileDiffs, activeDiff,
    agentMode, reasoningEffort, messages, agentStatus, isAgentBusy, pendingPrompt,
    chatSessions, currentChatId, currentChatTitle, contextStats,
    isCanvasOpen, activePlan, activeCanvas, canvasViewMode,
    terminalOpen, terminalLogs,
    updateStatus, updateInfo, updateProgress, isUpdateModalOpen, updateRepo,
    autoCheckUpdates,
    actions
  ]);

  return (
    <AppContext.Provider value={value}>
      <AgentStreamContext.Provider value={streamValue}>
        {children}
      </AgentStreamContext.Provider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

// Subscribe to the live token stream / progress only where it is actually
// rendered, so a streaming answer never re-renders the editor or the sidebar.
export function useAgentStream() {
  const context = useContext(AgentStreamContext);
  if (!context) throw new Error('useAgentStream must be used within AppProvider');
  return context;
}
