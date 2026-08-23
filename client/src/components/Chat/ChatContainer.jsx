import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import MessageItem from './MessageItem';
import InteractivePrompt from './InteractivePrompt';
import ModeSelector from './ModeSelector';
import { 
  Send, 
  Square, 
  Trash2, 
  Sparkles, 
  Paperclip, 
  Bot, 
  Loader2, 
  Zap, 
  Brain,
  Code2,
  Bug,
  Lightbulb
} from 'lucide-react';

export default function ChatContainer() {
  const {
    messages,
    agentStatus,
    agentMode,
    streamData,
    pendingPrompt,
    agentStepLog,
    sendMessage,
    stopAgent,
    clearChat,
    currentChatTitle,
    createNewChat,
    workspaceRoot,
    pinnedContextFiles,
    togglePinContextFile
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto scroll down
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamData, pendingPrompt]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || agentStatus === 'streaming' || agentStatus === 'executing_tool') return;
    sendMessage(inputPrompt);
    setInputPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e) => {
    setInputPrompt(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const isBusy = agentStatus === 'streaming' || agentStatus === 'executing_tool';

  const quickPrompts = [
    { label: 'Explore & explain project', icon: <Lightbulb className="w-3 h-3 text-amber-400" />, prompt: 'Please explore this project workspace, explain its structure and main features.' },
    { label: 'Find & fix bugs', icon: <Bug className="w-3 h-3 text-rose-400" />, prompt: 'Check all files in the project for potential bugs, syntax issues, or missing dependencies and propose fixes.' },
    { label: 'Add automated tests', icon: <Code2 className="w-3 h-3 text-cyan-400" />, prompt: 'Write comprehensive unit tests for the core logic in this project.' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative min-w-0">
      {/* Chat Top Bar */}
      <div className="h-10 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/60 backdrop-blur text-xs">
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
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamData.content && !streamData.reasoning && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4 glow-box">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              Welcome to NexusCoder
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your autonomous AI coding agent powered by OpenRouter. Give high-level instructions, and NexusCoder will read code, apply surgical diffs, run commands, and ask for your input whenever needed.
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

        {/* Real-time Streaming Assistant Chunk */}
        {(streamData.content || streamData.reasoning) && (
          <MessageItem
            message={{
              id: 'streaming_current',
              role: 'assistant',
              content: streamData.content,
              reasoning: streamData.reasoning
            }}
          />
        )}

        {/* Interactive Decision / Choice Prompt (Ask User) */}
        {pendingPrompt && (
          <InteractivePrompt prompt={pendingPrompt} />
        )}

        {/* Agent Step Status Bar */}
        {agentStepLog && isBusy && (
          <div className="flex items-center gap-2 p-2 px-3 bg-cyan-950/30 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="font-mono">{agentStepLog}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur">
        {/* Mode Selector (Agent / Plan / Ask) & Reasoning Level */}
        <ModeSelector />

        <form
          onSubmit={handleSubmit}
          className="relative rounded-2xl border border-slate-800 bg-slate-900/90 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-xl"
        >
          {/* Pinned Context Files Pill Indicator */}
          {pinnedContextFiles.length > 0 && (
            <div className="px-3 pt-2.5 pb-1 flex flex-wrap gap-1 border-b border-slate-800/60">
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Paperclip className="w-3 h-3" /> Attached:
              </span>
              {pinnedContextFiles.map(f => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 text-[11px] bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.2 font-mono"
                >
                  <span>{f.split('/').pop()}</span>
                  <button
                    type="button"
                    onClick={() => togglePinContextFile(f)}
                    className="hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputPrompt}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={
              !workspaceRoot
                ? "Please select a project folder first..."
                : agentMode === 'plan'
                ? "Ask NexusCoder to plan architecture, outline steps, or design features..."
                : agentMode === 'ask'
                ? "Ask any question about code, frameworks, bugs, or architecture..."
                : "Ask NexusCoder to build, fix, refactor, or test code... (Shift+Enter for newline)"
            }
            disabled={!workspaceRoot}
            className="w-full p-3.5 pr-24 bg-transparent text-slate-200 text-sm focus:outline-none resize-none max-h-48 placeholder-slate-500 leading-relaxed font-sans"
          />

          {/* Action buttons inside textarea */}
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
            {isBusy ? (
              <button
                type="button"
                onClick={stopAgent}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all"
                title="Stop Agent"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputPrompt.trim() || !workspaceRoot}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/30 transition-all"
                title="Send instruction (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
          <span>AI coding agent loop • Automatic multi-step execution</span>
          <span>OpenRouter Engine</span>
        </div>
      </div>
    </div>
  );
}
