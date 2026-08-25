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
  Palette,
  LayoutGrid,
  RotateCcw,
  Code2,
  Bot,
  Monitor,
  Network,
  Sun,
  Moon,
  Droplets,
  Check
} from 'lucide-react';

export default function Header() {
  const {
    workspaceRoot,
    workspaceName,
    setIsFolderPickerOpen,
    setIsSettingsOpen,
    setIsMcpModalOpen,
    setIsSkillsModalOpen,
    mcpSummary,
    activeSkills,
    model,
    models,
    saveSettings,
    agentStatus,
    agentMode,
    autoApprove,
    terminalOpen,
    setTerminalOpen,
    appVersion,
    updateStatus,
    setIsUpdateModalOpen,
    updateInfo,
    theme,
    setTheme,
    panelVisibility,
    togglePanelVisibility,
    resetLayout
  } = useApp();

  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = React.useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = React.useState(false);

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

        {/* Workspace Folder Button or Host System Indicator */}
        {agentMode === 'system' ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/50 text-xs shadow-sm shadow-amber-950/40 max-w-[280px]"
            title="System Agent operates across the entire host machine (No project folder required)"
          >
            <Monitor className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
            <span className="truncate font-semibold text-amber-200">
              Host System (Entire Machine)
            </span>
          </div>
        ) : (
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
        )}

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

        {/* MCP Status Indicator & Menu */}
        <button
          onClick={() => setIsMcpModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            mcpSummary?.hasConnected
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/60 shadow-sm shadow-emerald-500/20'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-cyan-300 hover:border-slate-700'
          }`}
          title={`Model Context Protocol: ${mcpSummary?.connectedCount || 0} server(s) connected (${mcpSummary?.totalToolsCount || 0} tools) — Click to open MCP Manager`}
        >
          <Network className={`w-3.5 h-3.5 ${mcpSummary?.hasConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>MCP</span>
          {mcpSummary?.hasConnected ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] font-bold text-emerald-300">{mcpSummary.connectedCount}</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">Off</span>
          )}
        </button>

        {/* AI Skills Button */}
        <button
          onClick={() => setIsSkillsModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            activeSkills?.length > 0
              ? 'bg-purple-950/60 text-purple-300 border-purple-500/50 hover:bg-purple-900/60 shadow-sm shadow-purple-500/20'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-purple-300 hover:border-slate-700'
          }`}
          title={`AI Skills: ${activeSkills?.length || 0} active workflow(s) — Click to configure`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${activeSkills?.length > 0 ? 'text-purple-400' : 'text-slate-400'}`} />
          <span>Skills</span>
          {activeSkills?.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-mono font-bold">
              {activeSkills.length}
            </span>
          )}
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

        {/* Workspace Layout Customizer Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setIsLayoutMenuOpen(!isLayoutMenuOpen);
              setIsThemeMenuOpen(false);
            }}
            className={`p-2 rounded-lg border transition-all ${
              isLayoutMenuOpen 
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/20' 
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-cyan-300'
            }`}
            title="Customize Workspace Layout & Toggle Panels (พับ/ซ่อน/จัดตำแหน่งส่วนต่างๆ)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {isLayoutMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsLayoutMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 w-64 bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl z-50 backdrop-blur-xl space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  <span>Workspace Layout</span>
                  <button
                    onClick={() => {
                      resetLayout();
                      setIsLayoutMenuOpen(false);
                    }}
                    className="text-cyan-400 hover:underline text-[10px] flex items-center gap-1 font-normal capitalize"
                    title="Reset to default layout"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  {/* Explorer Toggle */}
                  <button
                    onClick={() => togglePanelVisibility('sidebar')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                      panelVisibility.sidebar
                        ? 'bg-cyan-950/50 text-cyan-200 border border-cyan-500/40'
                        : 'bg-slate-950/40 text-slate-400 border border-slate-800/60 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Files Explorer</span>
                    </span>
                    <span className="text-[10px] font-mono font-semibold">
                      {panelVisibility.sidebar ? 'Visible' : 'Hidden'}
                    </span>
                  </button>

                  {/* Editor Toggle */}
                  <button
                    onClick={() => togglePanelVisibility('editor')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                      panelVisibility.editor
                        ? 'bg-blue-950/50 text-blue-200 border border-blue-500/40'
                        : 'bg-slate-950/40 text-slate-400 border border-slate-800/60 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Code Editor</span>
                    </span>
                    <span className="text-[10px] font-mono font-semibold">
                      {panelVisibility.editor ? 'Visible' : 'Hidden'}
                    </span>
                  </button>

                  {/* AI Assistant Toggle */}
                  <button
                    onClick={() => togglePanelVisibility('chat')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                      panelVisibility.chat
                        ? 'bg-purple-950/50 text-purple-200 border border-purple-500/40'
                        : 'bg-slate-950/40 text-slate-400 border border-slate-800/60 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Bot className="w-3.5 h-3.5 text-purple-400" />
                      <span>AI Assistant (Chat)</span>
                    </span>
                    <span className="text-[10px] font-mono font-semibold">
                      {panelVisibility.chat ? 'Visible' : 'Hidden'}
                    </span>
                  </button>
                </div>

                <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 text-center select-none">
                  💡 ลากหัว Panel เพื่อสลับตำแหน่ง ซ้าย/กลาง/ขวา ได้อิสระ
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme & Layout Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsThemeMenuOpen(!isThemeMenuOpen);
              setIsLayoutMenuOpen(false);
            }}
            className={`p-2 rounded-lg border transition-all ${
              theme && theme !== 'default'
                ? 'bg-pink-950/50 text-pink-300 border-pink-500/50 hover:bg-pink-900/50 shadow-md shadow-pink-500/20'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-pink-400'
            }`}
            title="Switch UI Layout Theme & Aesthetics (สไตล์สว่าง คลีน / สไตล์ดำ คลีน / Hyper Liquid Glass)"
          >
            <Palette className="w-4 h-4" />
          </button>

          {isThemeMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsThemeMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 w-72 bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl z-50 backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-pink-400" />
                    <span>Theme & Layout</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 capitalize">{theme || 'default'}</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {/* Hyper Liquid Glass */}
                  <button
                    onClick={() => {
                      setTheme('liquid-glass');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${
                      theme === 'liquid-glass'
                        ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/50 shadow-sm'
                        : 'bg-slate-950/50 text-slate-300 border border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 shadow-sm" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Hyper Liquid Glass</div>
                        <div className="text-[10px] text-slate-400">Frosted neon glassmorphism</div>
                      </div>
                    </div>
                    {theme === 'liquid-glass' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>

                  {/* Aurora Glass */}
                  <button
                    onClick={() => {
                      setTheme('aurora-glass');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${
                      theme === 'aurora-glass'
                        ? 'bg-emerald-950/70 text-emerald-200 border border-emerald-500/50 shadow-sm'
                        : 'bg-slate-950/50 text-slate-300 border border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 shadow-sm" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Aurora Liquid Glass</div>
                        <div className="text-[10px] text-slate-400">Emerald northern lights</div>
                      </div>
                    </div>
                    {theme === 'aurora-glass' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  {/* Obsidian Onyx Glass */}
                  <button
                    onClick={() => {
                      setTheme('obsidian-glass');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${
                      theme === 'obsidian-glass'
                        ? 'bg-amber-950/70 text-amber-200 border border-amber-500/50 shadow-sm'
                        : 'bg-slate-950/50 text-slate-300 border border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-amber-400 to-slate-900 shadow-sm" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Obsidian Onyx Glass</div>
                        <div className="text-[10px] text-slate-400">Deep gold specular dark</div>
                      </div>
                    </div>
                    {theme === 'obsidian-glass' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>

                  {/* Clean Light (สว่าง คลีนๆ) */}
                  <button
                    onClick={() => {
                      setTheme('clean-light');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${
                      theme === 'clean-light'
                        ? 'bg-sky-100 text-sky-900 border border-sky-400 shadow-sm'
                        : 'bg-slate-950/50 text-slate-300 border border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-amber-500">
                        <Sun className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Clean Light (สว่าง คลีนๆ)</div>
                        <div className="text-[10px] text-slate-400">Minimalist bright layout</div>
                      </div>
                    </div>
                    {theme === 'clean-light' && <Check className="w-3.5 h-3.5 text-sky-600" />}
                  </button>

                  {/* Clean Dark (ดำ คลีนๆ) */}
                  <button
                    onClick={() => {
                      setTheme('clean-dark');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${
                      theme === 'clean-dark'
                        ? 'bg-slate-800 text-slate-100 border border-slate-600 shadow-sm'
                        : 'bg-slate-950/50 text-slate-300 border border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-700 shadow-sm flex items-center justify-center text-slate-300">
                        <Moon className="w-2.5 h-2.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Clean Dark (ดำ คลีนๆ)</div>
                        <div className="text-[10px] text-slate-400">Pitch black distraction-free</div>
                      </div>
                    </div>
                    {theme === 'clean-dark' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>

                  {/* Default Cyber Dark */}
                  <button
                    onClick={() => {
                      setTheme('default');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left ${
                      theme === 'default'
                        ? 'bg-indigo-950/70 text-indigo-200 border border-indigo-500/50 shadow-sm'
                        : 'bg-slate-950/50 text-slate-300 border border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 shadow-sm" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Cyber Studio (Default)</div>
                        <div className="text-[10px] text-slate-400">Classic matte slate layout</div>
                      </div>
                    </div>
                    {theme === 'default' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

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
