import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Folder, 
  Settings, 
  Sparkles, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Zap, 
  Terminal as TerminalIcon,
  HelpCircle,
  ShieldCheck,
  Palette
} from 'lucide-react';

export default function Header() {
  const {
    workspaceRoot,
    workspaceName,
    setIsFolderPickerOpen,
    setIsSettingsOpen,
    model,
    models,
    saveSettings,
    agentStatus,
    autoApprove,
    terminalOpen,
    setTerminalOpen,
    appVersion,
    updateStatus,
    setIsUpdateModalOpen,
    updateInfo,
    theme,
    setTheme
  } = useApp();

  const handleModelChange = (e) => {
    saveSettings({ selectedModel: e.target.value });
  };

  const getStatusBadge = () => {
    switch (agentStatus) {
      case 'streaming':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-500/40 rounded-full animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            AI Generating...
          </span>
        );
      case 'executing_tool':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 rounded-full animate-pulse">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Executing Tool...
          </span>
        );
      case 'waiting_input':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-950/60 border border-purple-500/60 rounded-full animate-bounce">
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            Waiting for Your Choice
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            Paused — can continue
          </span>
        );
      case 'stopped':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            Stopped
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready
          </span>
        );
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between select-none z-20">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 pr-3 border-r border-slate-800">
          <img 
            src="/logo.png" 
            alt="NexusCoder Logo" 
            className="w-8 h-8 rounded-lg shadow-lg shadow-cyan-500/30 object-cover border border-cyan-500/40 hover:scale-105 transition-transform" 
          />
          <div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent leading-none">
              NexusCoder
            </h1>
            <span className="text-[10px] text-slate-400 font-mono">
              OpenRouter Agent Studio{appVersion ? ` · v${appVersion}` : ''}
            </span>
          </div>
        </div>

        {/* Workspace Folder Button */}
        <button
          onClick={() => setIsFolderPickerOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 transition-all text-xs group max-w-[280px]"
          title={workspaceRoot || 'Click to select project folder'}
        >
          <Folder className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
          <span className="truncate font-mono text-slate-200">
            {workspaceName || 'Select Project Folder...'}
          </span>
        </button>

        {/* Status Indicator */}
        {getStatusBadge()}
      </div>

      {/* Model Selector & Actions */}
      <div className="flex items-center gap-3">
        {/* Model Picker */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/80 border border-slate-800 rounded-lg">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={model}
            onChange={handleModelChange}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
          >
            {models.length > 0 ? (
              models.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                  {m.name || m.id}
                </option>
              ))
            ) : (
              <option value="anthropic/claude-3.7-sonnet" className="bg-slate-900 text-slate-200">
                Claude 3.7 Sonnet
              </option>
            )}
          </select>
        </div>

        {/* Auto Approve Toggle */}
        <button
          onClick={() => saveSettings({ autoApprove: !autoApprove })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            autoApprove
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title={autoApprove ? 'Auto-Approve Enabled: AI executes file changes & commands autonomously' : 'Manual Approval: AI will ask before running commands & editing files'}
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${autoApprove ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>{autoApprove ? 'Auto-Pilot' : 'Safe Mode'}</span>
        </button>

        {/* Terminal Toggle Button */}
        <button
          onClick={() => setTerminalOpen(!terminalOpen)}
          className={`p-2 rounded-lg border transition-all ${
            terminalOpen 
              ? 'bg-indigo-950/50 text-indigo-300 border-indigo-500/40' 
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="Toggle Terminal"
        >
          <TerminalIcon className="w-4 h-4" />
        </button>

        {/* Software Update Notification Badge */}
        {(updateStatus === 'available' || updateStatus === 'ready' || updateStatus === 'downloading') && (
          <button
            onClick={() => setIsUpdateModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-cyan-500/40 hover:scale-105 transition-all animate-pulse"
            title="Click to view and install app update"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>
              {updateStatus === 'ready' 
                ? 'Restart & Update' 
                : updateStatus === 'downloading' 
                ? 'Downloading...' 
                : `Update v${updateInfo?.latestVersion || 'New'}`}
            </span>
          </button>
        )}

        {/* Quick Theme Switcher Button */}
        <button
          onClick={() => {
            const themeCycle = ['default', 'liquid-glass', 'aurora-glass', 'obsidian-glass'];
            const currentIndex = themeCycle.indexOf(theme || 'default');
            const nextTheme = themeCycle[(currentIndex + 1) % themeCycle.length];
            setTheme(nextTheme);
          }}
          className={`p-2 rounded-lg border transition-all ${
            theme && theme !== 'default'
              ? 'bg-pink-950/50 text-pink-300 border-pink-500/50 hover:bg-pink-900/50 shadow-md shadow-pink-500/20'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-pink-400'
          }`}
          title={`Theme: ${theme === 'liquid-glass' ? 'Hyper Liquid Glass' : theme === 'aurora-glass' ? 'Aurora Liquid Glass' : theme === 'obsidian-glass' ? 'Obsidian Onyx Glass' : 'Default (Cyber Dark)'} — Click to cycle themes`}
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all"
          title="Settings & OpenRouter API Key"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
