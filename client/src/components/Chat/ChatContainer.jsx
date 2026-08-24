import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import MessageItem from './MessageItem';
import InteractivePrompt from './InteractivePrompt';
import AgentStatusPulse from './AgentStatusPulse';
import StreamingMessage from './StreamingMessage';
import ChatComposer from './ChatComposer';
import ContextMeter from './ContextMeter';
import ContextWarningBanner from './ContextWarningBanner';
import {
  Trash2,
  Sparkles,
  Bot,
  Code2,
  Bug,
  Lightbulb,
  Zap,
  PanelRightClose,
  Monitor,
  Plus,
  ChevronDown
} from 'lucide-react';

/**
 * The chat column: title bar, transcript, and composer.
 *
 * This component intentionally does NOT read the live token stream. The
 * streaming text and the progress card subscribe to it themselves
 * (see StreamingMessage / AgentStatusPulse), which keeps the transcript from
 * re-rendering on every token.
 */
export default function ChatContainer() {
  const {
    messages,
    agentMode,
    isAgentBusy,
    pendingPrompt,
    sendMessage,
    clearChat,
    currentChatTitle,
    createNewChat,
    currentChatId,
    workspaceRoot,
    togglePanelVisibility,
    setIsNewSessionModalOpen
  } = useApp();

  const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState(false);
  const newChatMenuRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Close new chat dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (newChatMenuRef.current && !newChatMenuRef.current.contains(e.target)) {
        setIsNewChatMenuOpen(false);
      }
    };
    if (isNewChatMenuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isNewChatMenuOpen]);

  // Auto scroll on new messages. Streaming text scrolls itself from inside
  // StreamingMessage, so this effect never runs on a per-token cadence.
  useEffect(() => {
    if (!messagesContainerRef.current) return;
    if (isAgentBusy) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pendingPrompt, isAgentBusy]);

  const isSystemMode = agentMode === 'system';

  const projectQuickPrompts = [
    { label: 'Explore & explain project', icon: <Lightbulb className="w-3 h-3 text-amber-400" />, prompt: 'Please explore this project workspace, explain its structure and main features.' },
    { label: 'Find & fix bugs', icon: <Bug className="w-3 h-3 text-rose-400" />, prompt: 'Check all files in the project for potential bugs, syntax issues, or missing dependencies and propose fixes.' },
    { label: 'Add automated tests', icon: <Code2 className="w-3 h-3 text-cyan-400" />, prompt: 'Write comprehensive unit tests for the core logic in this project.' }
  ];

  const systemQuickPrompts = [
    { label: 'Check System Specs & Health', icon: <Monitor className="w-3 h-3 text-amber-400" />, prompt: 'Please check my machine specs, real-time CPU load, RAM utilization, and storage space on all drives.' },
    { label: 'Inspect Running Processes', icon: <Zap className="w-3 h-3 text-cyan-400" />, prompt: 'List active processes and identify any high-CPU, high-memory, or unresponsive applications.' },
    { label: 'Scan Open Ports & Services', icon: <Code2 className="w-3 h-3 text-indigo-400" />, prompt: 'Check listening network ports to see which services and processes are currently active.' },
    { label: 'Clean Temp Files & Storage', icon: <Bug className="w-3 h-3 text-rose-400" />, prompt: 'Scan temporary file directories, caches, and storage waste to recommend safe cleanup options.' }
  ];

  const quickPrompts = isSystemMode ? systemQuickPrompts : projectQuickPrompts;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative min-w-0">
      {/* Chat Top Bar */}
      <div className="h-10 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/60 backdrop-blur text-xs select-none">
        <div className="flex items-center gap-2 text-slate-300 font-medium truncate max-w-[280px]">
          {isSystemMode ? (
            <span className="px-2 py-0.5 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm shadow-amber-950/40">
              <Monitor className="w-3 h-3 text-amber-400" /> System
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm shadow-cyan-950/40">
              <Code2 className="w-3 h-3 text-cyan-400" /> Code
            </span>
          )}

          <span className="truncate font-semibold text-slate-200" title={currentChatTitle || 'New Conversation'}>
            {currentChatTitle || 'New Conversation'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Context Token Meter */}
          <ContextMeter />

          {/* New Chat Button & Dropdown */}
          <div className="relative" ref={newChatMenuRef}>
            <div className="flex items-center rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-sm shadow-indigo-900/40 transition-all">
              <button
                onClick={() => setIsNewSessionModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border-r border-white/20 hover:bg-white/10 rounded-l-lg transition-colors"
                title="Create a new conversation (Ctrl+Shift+N)"
              >
                <Plus className="w-3 h-3" />
                <span>New Chat</span>
              </button>
              <button
                onClick={() => setIsNewChatMenuOpen(!isNewChatMenuOpen)}
                className="px-1.5 py-1 hover:bg-white/10 rounded-r-lg transition-colors"
                title="More New Chat options (Code / System / Branch)"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {isNewChatMenuOpen && (
              <div className="absolute right-0 top-8 w-64 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-xl space-y-1">
                {/* 1. Code Agent Session */}
                <button
                  onClick={() => {
                    setIsNewChatMenuOpen(false);
                    createNewChat({ mode: 'agent', withSummary: false });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-left text-slate-200 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                      <Code2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-200">New Code Session</div>
                      <div className="text-[10px] text-slate-400">พัฒนาโค้ดและโปรเจกต์</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">Ctrl+Shift+N</span>
                </button>

                {/* 2. System Agent Session */}
                <button
                  onClick={() => {
                    setIsNewChatMenuOpen(false);
                    createNewChat({ mode: 'system', withSummary: false, title: 'System Diagnostic Session' });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-950/40 text-left text-amber-200 transition-colors border border-amber-500/20 group"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/30">
                      <Monitor className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-amber-200">New System Session</div>
                      <div className="text-[10px] text-amber-300/70">จัดการเครื่อง &amp; OS (ไม่ต้องเลือกโฟลเดอร์)</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-amber-400 font-bold">OS ✨</span>
                </button>

                {/* 3. Branch Session with Summary */}
                <button
                  onClick={() => {
                    setIsNewChatMenuOpen(false);
                    createNewChat({ withSummary: true, baseChatId: currentChatId });
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-purple-950/40 text-left text-purple-200 transition-colors border border-purple-500/20"
                >
                  <div className="p-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-purple-200">New with Task Summary</div>
                    <div className="text-[10px] text-purple-300/70">ต่อยอดงานเดิมด้วยแชทใหม่</div>
                  </div>
                </button>

                {/* 4. Choose Session Type Modal */}
                <button
                  onClick={() => {
                    setIsNewChatMenuOpen(false);
                    setIsNewSessionModalOpen(true);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg text-center text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ⚙️ Open Session Type Selector...
                </button>
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 rounded border border-transparent hover:border-rose-500/30 transition-all text-[11px]"
              title="Clear current messages"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => togglePanelVisibility('chat')}
            className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors ml-0.5"
            title="Collapse Chat Panel (พับเก็บแผงแชต)"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Stream (Supports text selection everywhere) */}
      <div
        ref={messagesContainerRef}
        className="chat-scroll flex-1 overflow-y-auto p-4 space-y-4 select-text selectable-text"
      >
        {messages.length === 0 && !isAgentBusy && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto select-none">
            <div className={`w-12 h-12 rounded-2xl ${isSystemMode ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 shadow-amber-500/20' : 'bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-indigo-500/20'} flex items-center justify-center text-white shadow-xl mb-4 glow-box`}>
              {isSystemMode ? <Monitor className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              {isSystemMode ? 'System Agent & Host Assistant' : 'Welcome to NexusCoder'}
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {isSystemMode
                ? 'Autonomous machine & OS specialist. Inspect CPU/RAM, check disk partitions, analyze running processes, inspect listening ports, clean caches, and run system management tasks directly on your computer.'
                : 'Your autonomous AI coding agent powered by OpenRouter. Supports images, videos, clipboard pasting (Ctrl+V), surgical code diffs, command execution, and deep thinking.'}
            </p>

            <div className="w-full space-y-2 text-left">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Quick Start Suggestions:
              </div>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(qp.prompt)}
                  className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 flex items-center gap-3 text-xs text-slate-300 transition-all group"
                >
                  <div className="p-1 rounded-lg bg-slate-800 group-hover:bg-slate-700">
                    {qp.icon}
                  </div>
                  <span className="font-medium text-slate-200">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Messages */}
        {messages.map(msg => (
          <MessageItem key={msg.id} message={msg} />
        ))}

        {/* Real-time Thinking & Progress Card */}
        {isAgentBusy && <AgentStatusPulse />}

        {/* Real-time Streaming Assistant Chunk (subscribes to the stream itself) */}
        <StreamingMessage />

        {/* Interactive Decision / Choice Prompt (Ask User) */}
        {pendingPrompt && <InteractivePrompt prompt={pendingPrompt} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Warning Alert Banner when context > 75% */}
      <ContextWarningBanner />

      {/* Input Area (isolated so typing never re-renders the transcript) */}
      <ChatComposer />
    </div>
  );
}
