import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Brain, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Sparkles, 
  User, 
  AlertCircle,
  FileText,
  Zap,
  ListChecks,
  MessageSquare,
  Film,
  Image as ImageIcon,
  Maximize2
} from 'lucide-react';
import ToolCallCard from './ToolCallCard';
import { useApp } from '../../context/AppContext';
import MediaLightboxModal from '../Modals/MediaLightboxModal';

function MessageItemComponent({ message }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const { continueRun, agentStatus } = useApp();

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyResponseToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const getModeBadge = () => {
    if (!message.mode) return null;
    switch (message.mode) {
      case 'plan':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-mono select-none">
            <ListChecks className="w-3 h-3" /> Plan Mode
          </span>
        );
      case 'ask':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono select-none">
            <MessageSquare className="w-3 h-3" /> Ask Mode
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono select-none">
            <Zap className="w-3 h-3" /> Agent Mode
          </span>
        );
    }
  };

  // User Message
  if (message.role === 'user') {
    return (
      <div className="flex justify-end my-4 select-text selectable-text">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-800 text-white p-4 shadow-xl shadow-indigo-950/40 text-sm">
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-indigo-400/20 select-none">
            <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-semibold">
              <User className="w-3.5 h-3.5" />
              <span>You</span>
            </div>
            {getModeBadge()}
          </div>

          {/* Attached Media Gallery (Images & Videos) */}
          {message.media && message.media.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2.5">
              {message.media.map((item, idx) => {
                const isVideo = item.type === 'video' || (item.mimeType && item.mimeType.startsWith('video/'));
                return (
                  <div key={item.id || idx} className="relative group rounded-xl overflow-hidden border border-white/20 bg-black/40">
                    {isVideo ? (
                      <div className="flex flex-col">
                        <video
                          src={item.dataUrl}
                          controls
                          className="max-h-56 max-w-full rounded-xl bg-black"
                        />
                        <div className="px-2 py-1 bg-black/60 text-[10px] text-slate-300 flex items-center justify-between">
                          <span className="truncate max-w-[180px] font-mono">{item.name || 'Video'}</span>
                          <button
                            type="button"
                            onClick={() => setLightboxMedia(item)}
                            className="text-purple-300 hover:text-white flex items-center gap-1 ml-2"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="relative cursor-pointer overflow-hidden rounded-xl"
                        onClick={() => setLightboxMedia(item)}
                      >
                        <img
                          src={item.dataUrl}
                          alt={item.name || 'Attached image'}
                          className="h-36 w-auto max-w-xs object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-medium">
                          <Maximize2 className="w-4 h-4" />
                          <span>View</span>
                        </div>
                        {item.name && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-0.5 text-[10px] text-slate-200 truncate font-mono">
                            {item.name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="whitespace-pre-wrap leading-relaxed font-sans text-slate-100 select-text selectable-text">
            {message.displayContent || message.content}
          </div>

          {message.attachedFiles && message.attachedFiles.length > 0 && (
            <div className="mt-3 pt-2 border-t border-indigo-400/20 flex flex-wrap gap-1 select-none">
              {message.attachedFiles.map(f => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 text-[10px] bg-indigo-950/80 border border-indigo-400/40 rounded-lg px-2 py-0.5 text-indigo-200 font-mono"
                >
                  <FileText className="w-3 h-3" />
                  {f.split('/').pop()}
                </span>
              ))}
            </div>
          )}
        </div>

        {lightboxMedia && (
          <MediaLightboxModal
            media={lightboxMedia}
            onClose={() => setLightboxMedia(null)}
          />
        )}
      </div>
    );
  }

  // System Error
  if (message.role === 'system_error') {
    return (
      <div className="my-3 p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 shadow-lg select-text selectable-text">
        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed whitespace-pre-wrap font-sans select-text">{message.content}</div>
      </div>
    );
  }

  // Safety-limit pause
  if (message.role === 'system_notice') {
    return (
      <div className="my-3 p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-start gap-2.5 shadow-lg select-text selectable-text">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="leading-relaxed whitespace-pre-wrap font-sans select-text">{message.content}</div>
          {message.canContinue && (
            <button
              onClick={continueRun}
              disabled={agentStatus === 'streaming' || agentStatus === 'executing_tool'}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded-lg transition-colors select-none"
            >
              Continue task
            </button>
          )}
        </div>
      </div>
    );
  }

  // Tool Result
  if (message.role === 'tool_result') {
    return (
      <ToolCallCard
        toolName={message.toolName}
        result={message.result}
      />
    );
  }

  // Assistant Message
  return (
    <div className="my-4 flex gap-3 select-text selectable-text">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-lg shadow-indigo-600/30 select-none">
        <Sparkles className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Deep Thinking / Reasoning Collapsible Box */}
        {message.reasoning && (
          <div className="mb-3 rounded-xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-950/40 text-xs overflow-hidden shadow-md">
            <button
              onClick={() => setIsReasoningOpen(!isReasoningOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2 text-purple-300 hover:bg-purple-900/20 font-medium transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>Deep Thinking Process (Reasoning)</span>
                <span className="text-[10px] px-2 py-0.2 bg-purple-500/20 rounded-full font-mono">
                  {message.reasoning.length} chars
                </span>
              </div>
              {isReasoningOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
              )}
            </button>
            {isReasoningOpen && (
              <div className="p-3.5 bg-black/40 border-t border-purple-500/20 text-purple-200/90 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto select-text selectable-text">
                {message.reasoning}
              </div>
            )}
          </div>
        )}

        {/* Assistant Main Content with Rich Typography */}
        {message.content && (
          <div className="bg-slate-900/70 p-5 rounded-2xl rounded-tl-sm border border-slate-800/80 shadow-xl space-y-4">
            {/* Header with Copy Response Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 select-none">
              <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>NexusCoder</span>
              </div>
              <button
                onClick={() => copyResponseToClipboard(message.content)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all shadow-sm"
                title="Copy entire AI response to clipboard"
              >
                {copiedResponse ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy Response</span>
                  </>
                )}
              </button>
            </div>

            {/* Markdown Content (Fully Selectable) */}
            <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed text-sm select-text selectable-text">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p({ children }) {
                    return <p className="mb-3.5 leading-7 text-slate-200 select-text">{children}</p>;
                  },
                  h1({ children }) {
                    return <h1 className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800 flex items-center gap-2 select-text">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-base font-bold text-cyan-300 mt-3.5 mb-2 flex items-center gap-1.5 select-text">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-semibold text-indigo-300 mt-3 mb-1.5 select-text">{children}</h3>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-3.5 space-y-1.5 text-slate-300 select-text">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-3.5 space-y-1.5 text-slate-300 select-text">{children}</ol>;
                  },
                  blockquote({ children }) {
                    return (
                      <div className="my-3 p-3.5 rounded-xl border-l-4 border-indigo-500 bg-indigo-950/30 text-indigo-200 text-xs leading-relaxed shadow-sm select-text">
                        {children}
                      </div>
                    );
                  },
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    if (!inline && match) {
                      return (
                        <div className="my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-lg">
                          <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono select-none">
                            <span className="font-semibold text-cyan-400">{match[1]}</span>
                            <button
                              onClick={() => copyToClipboard(codeString)}
                              className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
                            >
                              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed select-text selectable-text">
                            <code>{codeString}</code>
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-xs font-medium select-text" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Embedded Tool Calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {message.toolCalls.map((tc, idx) => (
              <ToolCallCard
                key={tc.id || idx}
                toolName={tc.name}
                args={tc.arguments}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxMedia && (
        <MediaLightboxModal
          media={lightboxMedia}
          onClose={() => setLightboxMedia(null)}
        />
      )}
    </div>
  );
}

const MessageItem = React.memo(MessageItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.reasoning === nextProps.message.reasoning &&
    prevProps.message.toolCalls?.length === nextProps.message.toolCalls?.length &&
    prevProps.message.mode === nextProps.message.mode &&
    prevProps.message.media?.length === nextProps.message.media?.length
  );
});

export default MessageItem;
