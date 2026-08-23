import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import MessageItem from './MessageItem';
import InteractivePrompt from './InteractivePrompt';
import ModeSelector from './ModeSelector';
import MediaLightboxModal from '../Modals/MediaLightboxModal';
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
  Lightbulb,
  Image as ImageIcon,
  Film,
  X,
  Maximize2,
  Plus
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
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll down
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamData, pendingPrompt]);

  // Helper to read files as data URLs and append to attachedMedia
  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) return;

    const validMediaFiles = Array.from(files).filter(f => 
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    if (validMediaFiles.length === 0) return;

    validMediaFiles.forEach(file => {
      // 50MB limit check
      if (file.size > 50 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum supported size is 50MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const isVideo = file.type.startsWith('video/');
        setAttachedMedia(prev => [
          ...prev,
          {
            id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name || (isVideo ? 'Pasted_Video.mp4' : 'Pasted_Image.png'),
            type: isVideo ? 'video' : 'image',
            mimeType: file.type || (isVideo ? 'video/mp4' : 'image/png'),
            dataUrl: dataUrl,
            size: file.size
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle Ctrl+V paste (captures clipboard screenshots and images)
  const handlePaste = useCallback((e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    const mediaFiles = [];
    let hasPureImage = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))) {
        const file = item.getAsFile();
        if (file) {
          mediaFiles.push(file);
          hasPureImage = true;
        }
      }
    }

    if (mediaFiles.length > 0) {
      handleFiles(mediaFiles);
      // If only pasting an image/screenshot (no accompanying text), prevent default paste
      if (hasPureImage && !clipboardData.getData('text/plain')) {
        e.preventDefault();
      }
    }
  }, [handleFiles]);

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeMedia = (idToRemove) => {
    setAttachedMedia(prev => prev.filter(m => m.id !== idToRemove));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const hasText = inputPrompt.trim().length > 0;
    const hasMedia = attachedMedia.length > 0;

    if ((!hasText && !hasMedia) || agentStatus === 'streaming' || agentStatus === 'executing_tool') return;

    const promptToSend = hasText 
      ? inputPrompt 
      : (hasMedia ? 'Please inspect and analyze the attached media.' : '');

    sendMessage(promptToSend, [], attachedMedia);
    setInputPrompt('');
    setAttachedMedia([]);
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
  const canSend = (inputPrompt.trim().length > 0 || attachedMedia.length > 0) && !!workspaceRoot && !isBusy;

  const quickPrompts = [
    { label: 'Explore & explain project', icon: <Lightbulb className="w-3 h-3 text-amber-400" />, prompt: 'Please explore this project workspace, explain its structure and main features.' },
    { label: 'Find & fix bugs', icon: <Bug className="w-3 h-3 text-rose-400" />, prompt: 'Check all files in the project for potential bugs, syntax issues, or missing dependencies and propose fixes.' },
    { label: 'Add automated tests', icon: <Code2 className="w-3 h-3 text-cyan-400" />, prompt: 'Write comprehensive unit tests for the core logic in this project.' }
  ];

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-slate-950/40 relative min-w-0"
      onPaste={handlePaste}
    >
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
        </div>
      </div>

      {/* Messages Stream (Supports text selection everywhere) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text selectable-text">
        {messages.length === 0 && !streamData.content && !streamData.reasoning && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto select-none">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4 glow-box">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              Welcome to NexusCoder
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your autonomous AI coding agent powered by OpenRouter. Supports images, videos, clipboard pasting (Ctrl+V), surgical code diffs, command execution, and deep thinking.
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
          <div className="flex items-center gap-2 p-2 px-3 bg-cyan-950/30 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs animate-pulse select-none">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="font-mono">{agentStepLog}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur select-none">
        {/* Mode Selector (Agent / Plan / Ask) & Reasoning Level */}
        <ModeSelector />

        {/* Hidden File Input for Images & Videos */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <form
          onSubmit={handleSubmit}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-2xl border ${
            isDraggingOver
              ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-slate-800/90'
              : 'border-slate-800 bg-slate-900/90 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30'
          } transition-all shadow-xl`}
        >
          {/* Pinned Context Files Pill Indicator */}
          {pinnedContextFiles.length > 0 && (
            <div className="px-3 pt-2.5 pb-1 flex flex-wrap gap-1 border-b border-slate-800/60">
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Paperclip className="w-3 h-3" /> Attached Code:
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

          {/* Attached Images / Videos Preview Carousel */}
          {attachedMedia.length > 0 && (
            <div className="px-3 pt-3 pb-2 border-b border-slate-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Attached Media ({attachedMedia.length}):
                </span>
                <button
                  type="button"
                  onClick={() => setAttachedMedia([])}
                  className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5 overflow-x-auto max-h-36 p-1">
                {attachedMedia.map((item) => {
                  const isVideo = item.type === 'video' || (item.mimeType && item.mimeType.startsWith('video/'));
                  return (
                    <div
                      key={item.id}
                      className="relative group flex items-center gap-2 p-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 hover:border-cyan-500/50 transition-all shadow-md"
                    >
                      {isVideo ? (
                        <div 
                          className="w-14 h-14 rounded-lg bg-purple-950/60 border border-purple-500/30 flex flex-col items-center justify-center text-purple-300 cursor-pointer overflow-hidden relative"
                          onClick={() => setLightboxMedia(item)}
                        >
                          <Film className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px] font-mono">Video</span>
                        </div>
                      ) : (
                        <div
                          className="w-14 h-14 rounded-lg overflow-hidden cursor-pointer relative"
                          onClick={() => setLightboxMedia(item)}
                        >
                          <img
                            src={item.dataUrl}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col pr-6 max-w-[130px]">
                        <span className="text-xs font-medium text-slate-200 truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : 'Media'}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMedia(item.id);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-800/90 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                        title="Remove attachment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative flex items-center">
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
                  : "Ask NexusCoder to build, fix, refactor, or attach image/video... (Ctrl+V to paste image, Enter to send)"
              }
              disabled={!workspaceRoot}
              className="w-full p-3.5 pl-10 pr-24 bg-transparent text-slate-200 text-sm focus:outline-none resize-none max-h-48 placeholder-slate-500 leading-relaxed font-sans select-text"
            />

            {/* Left Attachment Icon Button (Image / Video) */}
            <div className="absolute left-2.5 bottom-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!workspaceRoot || isBusy}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 disabled:opacity-40 transition-all"
                title="Attach Image or Video (or press Ctrl+V to paste from clipboard)"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>

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
                  disabled={!canSend}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/30 transition-all"
                  title="Send instruction (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500 select-none">
          <span className="flex items-center gap-1">
            <span>Supports images & videos • Paste with Ctrl+V</span>
          </span>
          <span>OpenRouter Multimodal Engine</span>
        </div>
      </div>

      {/* Lightbox Modal for previewing images/videos */}
      {lightboxMedia && (
        <MediaLightboxModal
          media={lightboxMedia}
          onClose={() => setLightboxMedia(null)}
        />
      )}
    </div>
  );
}
