import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAgentStream } from '../../context/AppContext';

/**
 * Replaces the old AgentThinkingCard. That card tracked phase/percent/
 * elapsed-time with its own timers and multi-stage breadcrumbs - a lot of
 * moving parts for what the user actually needs to see: "the agent is still
 * doing something". This subscribes to nothing but a short status label and
 * re-renders on status changes only (not on every token), so there is far
 * less surface area for a stuck or wrong-looking indicator.
 */
export default function AgentStatusPulse() {
  const { agentProgress, agentStatus } = useAgentStream();

  const label =
    agentStatus === 'executing_tool'
      ? (agentProgress?.toolName ? `Running ${agentProgress.toolName}...` : 'Running action...')
      : (agentProgress?.stepText || 'NexusCoder is thinking...');

  return (
    <div className="flex items-center gap-2 px-1 py-2 text-xs text-slate-400 select-none">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
      <span className="truncate">{label}</span>
    </div>
  );
}
