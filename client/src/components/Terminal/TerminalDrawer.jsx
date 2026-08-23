import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Terminal, X, Trash2, Send, CornerDownLeft, Square } from 'lucide-react';
import ResizeHandle from '../ResizeHandle';

export default function TerminalDrawer() {
  const { 
    terminalOpen, 
    setTerminalOpen, 
    terminalLogs, 
    setTerminalLogs, 
    runTerminalCommand,
    killTerminalCommand,
    workspaceRoot,
    panelSizes,
    resizePanel,
    resetPanel
  } = useApp();

  const [cmdInput, setCmdInput] = useState('');
  const logEndRef = useRef(null);

  useEffect(() => {
    if (terminalOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs, terminalOpen]);

  if (!terminalOpen) return null;

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!cmdInput.trim()) return;
    runTerminalCommand(cmdInput.trim());
    setCmdInput('');
  };

  return (
    <>
      <ResizeHandle
        orientation="vertical"
        onDelta={(dy) => resizePanel('terminal', -dy)}
        onDoubleClick={() => resetPanel('terminal')}
        title="Resize terminal"
      />
    <div
      style={{ height: `${panelSizes.terminal}px` }}
      className="border-t border-slate-800 bg-slate-950 flex flex-col font-mono text-xs z-10 select-text flex-shrink-0 overflow-hidden"
    >
      {/* Terminal Bar */}
      <div className="h-8 border-b border-slate-800/80 bg-slate-900/90 px-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-[11px]">Integrated Terminal ({workspaceRoot ? workspaceRoot.split(/[\\/]/).pop() : 'No Project'})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => killTerminalCommand()}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
            title="Stop running command (Kill process)"
          >
            <Square className="w-3.5 h-3.5 fill-rose-500/20" />
          </button>
          <button
            onClick={() => setTerminalLogs([])}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Clear terminal output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTerminalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Close terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Output Screen */}
      <div className="flex-1 overflow-y-auto p-3 bg-black/60 text-slate-300 whitespace-pre-wrap leading-relaxed">
        {terminalLogs.length > 0 ? (
          terminalLogs.map((log, idx) => (
            <span key={idx} className="font-mono">{log}</span>
          ))
        ) : (
          <span className="text-slate-600 italic">Terminal ready. Run commands or let AI execute tasks here.</span>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Input Line */}
      <form onSubmit={handleCommandSubmit} className="h-9 border-t border-slate-800/80 bg-slate-900/60 px-3 flex items-center gap-2">
        <span className="text-emerald-400 font-bold">$</span>
        <input
          type="text"
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          placeholder="Type shell command (e.g. npm test, git status)..."
          className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder-slate-600 font-mono text-xs"
        />
        <button
          type="submit"
          disabled={!cmdInput.trim()}
          className="p-1 text-slate-400 hover:text-indigo-400 disabled:opacity-30"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
    </>
  );
}
