import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Zap, 
  ListChecks, 
  MessageSquare, 
  Brain, 
  Layout, 
  Sparkles,
  ChevronDown
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
    activeCanvas 
  } = useApp();

  const modes = [
    {
      id: 'agent',
      label: 'Agent',
      icon: <Zap className="w-3.5 h-3.5 text-cyan-400" />,
      desc: 'Autonomous coding & execution'
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: <ListChecks className="w-3.5 h-3.5 text-indigo-400" />,
      desc: 'Architectural planning & checklists'
    },
    {
      id: 'ask',
      label: 'Ask',
      icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
      desc: 'Code explanation & consultation'
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
      {/* Mode Buttons (Agent / Plan / Ask) */}
      <div className="flex items-center p-0.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
        {modes.map(m => {
          const isActive = agentMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setAgentMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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
