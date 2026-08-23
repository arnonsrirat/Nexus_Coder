import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import MessageItem from './MessageItem';
import InteractivePrompt from './InteractivePrompt';
import AgentThinkingCard from './AgentThinkingCard';
import StreamingMessage from './StreamingMessage';
import ChatComposer from './ChatComposer';
import {
  Trash2,
  Sparkles,
  Bot,
  Code2,
  Bug,
  Lightbulb,
  Zap,
  PanelRightClose,
  Monitor
} from 'lucide-react';

/**
 * The chat column: title bar, transcript, and composer.
 *
 * This component intentionally does NOT read the live token stream. The
 * streaming text and the progress card subscribe to it themselves
 * (see StreamingMessage / AgentThinkingCard), which keeps the transcript from
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
    workspaceRoot,
    togglePanelVisibility
  } = useApp();

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

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
          <Bot className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="truncate font-semibold text-slate-200">
            {currentChatTitle || 'New Conversation'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={createNewChat}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-900 hover:bg-indigo-600/80 border border-slate-800 hover:border-indigo-500 rounded-lg transition-all text-[11px] font-medium shadow-sm"
            title="Create a new conversation"
          >
            <span>+ New Chat</span>
          </button>

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
        {isAgentBusy && <AgentThinkingCard />}

        {/* Real-time Streaming Assistant Chunk (subscribes to the stream itself) */}
        <StreamingMessage />

        {/* Interactive Decision / Choice Prompt (Ask User) */}
        {pendingPrompt && <InteractivePrompt prompt={pendingPrompt} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (isolated so typing never re-renders the transcript) */}
      <ChatComposer />
    </div>
  );
}
