import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Sparkles, 
  Loader2, 
  Cpu, 
  Search, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Layers, 
  Zap,
  Terminal
} from 'lucide-react';
import { useAgentStream } from '../../context/AppContext';

export default function AgentThinkingCard() {
  // Subscribes to the hot stream context only: this card ticks constantly while
  // the agent works, and must not drag the rest of the app along with it.
  const {
    agentProgress,
    streamData,
    agentStatus
  } = useAgentStream();

  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const reasoningScrollRef = useRef(null);
  const timerRef = useRef(null);

  const hasReasoning = Boolean(streamData?.reasoning && streamData.reasoning.length > 0);
  const percent = Math.min(Math.max(agentProgress?.percent || 15, 5), 100);
  const currentStepText = agentProgress?.stepText || 'NexusCoder is thinking...';
  const phase = agentProgress?.phase || (hasReasoning ? 'reasoning' : 'thinking');
  const iteration = agentProgress?.iteration || 1;

  // Local, isolated timer (updates ONLY this card, never triggers global React re-renders)
  useEffect(() => {
    const startedAt = agentProgress?.startedAt || Date.now();
    setElapsed(Math.max(0, (Date.now() - startedAt) / 1000));

    timerRef.current = setInterval(() => {
      const sec = (Date.now() - startedAt) / 1000;
      setElapsed(sec);
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [agentProgress?.startedAt]);

  // Non-blocking instant auto-scroll for reasoning stream
  useEffect(() => {
    if (hasReasoning && isReasoningExpanded && reasoningScrollRef.current) {
      reasoningScrollRef.current.scrollTop = reasoningScrollRef.current.scrollHeight;
    }
  }, [streamData?.reasoning, hasReasoning, isReasoningExpanded]);

  // Stage resolver for the 4-step progress breadcrumbs
  const getStageStatus = (stageIndex) => {
    if (phase === 'completed') return 'completed';

    if (stageIndex === 0) {
      return (phase === 'reading_context' || phase === 'analyzing_prompt') ? 'active' : 'completed';
    }
    if (stageIndex === 1) {
      if (phase === 'reading_context' || phase === 'analyzing_prompt') return 'pending';
      if (phase === 'thinking' || phase === 'reasoning') return 'active';
      return 'completed';
    }
    if (stageIndex === 2) {
      if (phase === 'tool_executing' || phase === 'tool_completed' || agentStatus === 'executing_tool') return 'active';
      if (phase === 'generating' || phase === 'completed') return 'completed';
      return 'pending';
    }
    if (stageIndex === 3) {
      if (phase === 'generating') return 'active';
      if (phase === 'completed') return 'completed';
      return 'pending';
    }
    return 'pending';
  };

  const getPhaseConfig = () => {
    switch (phase) {
      case 'reading_context':
      case 'analyzing_prompt':
        return {
          icon: <Search className="w-4 h-4 text-cyan-400 animate-pulse" />,
          label: 'Analyzing Workspace & Prompt',
          badgeClass: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300',
          gradient: 'from-cyan-500 to-blue-600',
          glowColor: 'rgba(6, 182, 212, 0.4)'
        };
      case 'reasoning':
        return {
          icon: <Brain className="w-4 h-4 text-purple-400 animate-bounce" />,
          label: 'Deep Thinking Process',
          badgeClass: 'bg-purple-950/70 border-purple-500/40 text-purple-300',
          gradient: 'from-purple-500 via-indigo-500 to-pink-500',
          glowColor: 'rgba(168, 85, 247, 0.4)'
        };
      case 'tool_executing':
      case 'tool_completed':
        return {
          icon: <Cpu className="w-4 h-4 text-amber-400 spin-slow" />,
          label: agentProgress?.toolName ? `Running: ${agentProgress.toolName}` : 'Executing Action',
          badgeClass: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
          gradient: 'from-amber-500 to-orange-600',
          glowColor: 'rgba(245, 158, 11, 0.4)'
        };
      case 'generating':
        return {
          icon: <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />,
          label: 'Synthesizing Response & Code',
          badgeClass: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
          gradient: 'from-emerald-500 to-teal-600',
          glowColor: 'rgba(16, 185, 129, 0.4)'
        };
      default:
        return {
          icon: <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />,
          label: iteration > 1 ? `Step ${iteration}: Processing Next Actions` : 'AI Thinking & Planning',
          badgeClass: 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300',
          gradient: 'from-cyan-500 via-indigo-500 to-purple-600',
          glowColor: 'rgba(99, 102, 241, 0.4)'
        };
    }
  };

  const phaseConfig = getPhaseConfig();

  return (
    <div className="my-4 flex gap-3 select-text selectable-text">
      {/* Glowing AI Avatar Indicator */}
      <div className="relative flex-shrink-0 mt-1">
        <div 
          className="absolute -inset-1 rounded-2xl opacity-75 blur-sm radar-ring"
          style={{ background: `radial-gradient(circle, ${phaseConfig.glowColor}, transparent 70%)` }}
        />
        <div className={`relative w-8 h-8 rounded-xl bg-gradient-to-tr ${phaseConfig.gradient} flex items-center justify-center text-white shadow-lg select-none`}>
          {hasReasoning ? <Brain className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </div>
      </div>

      {/* Main Thinking Container */}
      <div className="flex-1 min-w-0 bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Subtle Ambient Background Gradient */}
        <div 
          className="absolute top-0 right-0 w-64 h-32 opacity-15 pointer-events-none blur-3xl"
          style={{ background: `radial-gradient(circle, ${phaseConfig.glowColor}, transparent 80%)` }}
        />

        {/* Top Header: Phase Badge, Elapsed Stopwatch, Percentage */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80 select-none">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-sm ${phaseConfig.badgeClass}`}>
              {phaseConfig.icon}
              <span>{phaseConfig.label}</span>
            </span>

            {iteration > 1 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono">
                <Layers className="w-3 h-3 text-slate-400" />
                Step #{iteration}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Live Stopwatch */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px]">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{elapsed.toFixed(1)}s</span>
            </div>

            {/* Percentage Badge */}
            <div className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] shadow-sm">
              {percent}%
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="relative w-full h-2 bg-slate-950/90 rounded-full overflow-hidden border border-slate-800/90 mb-3 shadow-inner">
          <div 
            className={`h-full bg-gradient-to-r ${phaseConfig.gradient} rounded-full transition-all duration-500 ease-out relative`}
            style={{ width: `${percent}%` }}
          >
            {/* Shimmer moving highlight */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent progress-shimmer" />
          </div>
        </div>

        {/* Step-by-Step Progress Breadcrumbs */}
        <div className="grid grid-cols-4 gap-1.5 mb-3 text-[10px] font-mono select-none">
          {[
            { name: '1. Context', index: 0 },
            { name: '2. Thinking', index: 1 },
            { name: '3. Action', index: 2 },
            { name: '4. Response', index: 3 }
          ].map((st) => {
            const status = getStageStatus(st.index);
            return (
              <div
                key={st.name}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md border text-center transition-all ${
                  status === 'completed'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : status === 'active'
                    ? 'bg-cyan-950/70 border-cyan-400/60 text-cyan-200 font-bold ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                ) : status === 'active' ? (
                  <Loader2 className="w-2.5 h-2.5 text-cyan-400 animate-spin flex-shrink-0" />
                ) : null}
                <span className="truncate">{st.name}</span>
              </div>
            );
          })}
        </div>

        {/* Live Monospace Step Log */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-slate-800/80 text-slate-300 text-xs font-mono select-text selectable-text">
          <span className="text-cyan-400 font-bold select-none">&gt;</span>
          <span className="truncate text-slate-200">{currentStepText}</span>
          <span className="inline-block w-1.5 h-3.5 bg-cyan-400/80 ml-auto typing-cursor select-none" />
        </div>

        {/* Real-time Live Reasoning Stream Preview */}
        {hasReasoning && (
          <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-950/20 overflow-hidden shadow-md">
            <button
              type="button"
              onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-purple-300 hover:bg-purple-900/20 text-xs font-medium transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span className="font-semibold">Live Reasoning Stream</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 rounded font-mono text-purple-200">
                  {streamData.reasoning.length} chars
                </span>
              </div>
              {isReasoningExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
              )}
            </button>

            {isReasoningExpanded && (
              <div 
                ref={reasoningScrollRef}
                className="p-3 bg-black/60 border-t border-purple-500/20 text-purple-200/90 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto select-text selectable-text"
              >
                {streamData.reasoning}
                <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-1 align-middle typing-cursor" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
