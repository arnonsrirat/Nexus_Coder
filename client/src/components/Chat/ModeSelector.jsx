import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Zap, 
  ListChecks, 
  MessageSquare, 
  Monitor,
  Brain, 
  Layout, 
  Sparkles,
  ChevronDown,
  Code2,
  HardDrive,
  Cpu,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';

export default function ModeSelector() {
  const { 
    agentMode, 
    setAgentMode, 
    reasoningEffort, 
    setReasoningEffort, 
    isCanvasOpen, 
    setIsCanvasOpen, 
    activePlan,
    activeCanvas,
    createNewChat,
    setIsNewSessionModalOpen,
    sendMessage
  } = useApp();

  const isSystemMode = agentMode === 'system';

  const codeModes = [
    {
      id: 'agent',
      label: 'Agent (Code & Diff)',
      icon: <Zap className="w-3.5 h-3.5 text-cyan-400" />,
      desc: 'Autonomous coding, surgical file edits & execution in project'
    },
    {
      id: 'plan',
      label: 'Plan Mode',
      icon: <ListChecks className="w-3.5 h-3.5 text-indigo-400" />,
      desc: 'Architectural planning, checklist & design doc'
    },
    {
      id: 'ask',
      label: 'Ask Mode',
      icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
      desc: 'Code consultation, explanation & questions'
    }
  ];

  const reasoningOptions = [
    { id: 'high', label: 'Deep Reasoning', icon: '🧠', desc: 'Max thinking depth' },
    { id: 'medium', label: 'Medium Reasoning', icon: '💡', desc: 'Balanced thinking' },
    { id: 'low', label: 'Fast Reasoning', icon: '⚡', desc: 'Quick thinking' },
    { id: 'off', label: 'Reasoning Off', icon: '🚫', desc: 'Standard speed' }
  ];

  return (
    <div className="flex items-center justify-between px-1 pb-2 select-none gap-2">
      {/* Left: Mode Buttons or System Agent Badge */}
      {isSystemMode ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-300 shadow-sm shadow-amber-950/40">
            <Monitor className="w-4 h-4 text-amber-400 animate-pulse" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-200">System Agent Session</span>
              <span className="text-[10px] text-amber-400/80 font-mono bg-black/40 px-1.5 py-0.2 rounded border border-amber-500/20">
                Machine Wide
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => createNewChat({ mode: 'agent' })}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all text-[11px]"
            title="Switch / Create a new Code Agent Session"
          >
            <Code2 className="w-3 h-3 text-cyan-400" />
            <span>Switch to Code Agent</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Code Sub-modes (Agent / Plan / Ask) */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
            {codeModes.map(m => {
              const isActive = agentMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAgentMode(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-md border border-slate-600/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title={m.desc}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Switch to System Agent Button */}
          <button
            type="button"
            onClick={() => createNewChat({ mode: 'system', title: 'System Diagnostic Session' })}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 transition-all text-[11px]"
            title="Switch to Host System Agent (No project folder required)"
          >
            <Monitor className="w-3 h-3 text-amber-400" />
            <span>System Agent</span>
          </button>
        </div>
      )}

      {/* Right Controls: Reasoning Selector & Canvas Toggle */}
      <div className="flex items-center gap-1.5">
        {/* Reasoning Level Selector */}
        <div className="relative flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <select
            value={reasoningEffort}
            onChange={(e) => setReasoningEffort(e.target.value)}
            className="bg-transparent text-xs text-purple-300 font-medium focus:outline-none cursor-pointer pr-1"
            title="Configure AI Deep Thinking / Reasoning effort"
          >
            {reasoningOptions.map(opt => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-200">
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Canvas Panel Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCanvasOpen(!isCanvasOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
            isCanvasOpen
              ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/50'
              : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
          }`}
          title="Toggle Canvas / Artifacts panel"
        >
          <Layout className="w-3.5 h-3.5 text-indigo-400" />
          <span>Canvas</span>
          {(activePlan || activeCanvas) && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>
      </div>
    </div>
  );
}

