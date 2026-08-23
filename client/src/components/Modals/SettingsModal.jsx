import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Settings, 
  Key, 
  Cpu, 
  Shield, 
  X, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Check,
  Search,
  RotateCw,
  Sparkles,
  Palette,
  Trash2
} from 'lucide-react';

export default function SettingsModal() {
  const { 
    isSettingsOpen, 
    setIsSettingsOpen, 
    model, 
    models, 
    autoApprove, 
    saveSettings,
    hasApiKey,
    appVersion,
    updateStatus,
    updateInfo,
    updateRepo,
    autoCheckUpdates,
    checkUpdates,
    clearUpdateCache,
    setIsUpdateModalOpen,
    theme,
    setTheme
  } = useApp();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(model);
  const [autoApp, setAutoApp] = useState(autoApprove);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [cleanMessage, setCleanMessage] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [searchModel, setSearchModel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [autoCheck, setAutoCheck] = useState(autoCheckUpdates);
  const [repoInput, setRepoInput] = useState(updateRepo);
  const [selectedTheme, setSelectedTheme] = useState(theme || 'default');

  useEffect(() => {
    setSelectedModel(model);
    setAutoApp(autoApprove);
    setAutoCheck(autoCheckUpdates);
    setRepoInput(updateRepo);
    setSelectedTheme(theme || 'default');
  }, [model, autoApprove, autoCheckUpdates, updateRepo, theme, isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const themeOptions = [
    {
      id: 'default',
      name: 'Cyber Dark',
      desc: 'Sleek matte slate',
      previewBg: '#0b0f19',
      accentColor: '#6366f1'
    },
    {
      id: 'liquid-glass',
      name: 'Liquid Glass',
      desc: 'Frosted cyan-neon blur',
      previewBg: 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(99,102,241,0.4))',
      accentColor: '#38bdf8'
    },
    {
      id: 'aurora-glass',
      name: 'Aurora Glass',
      desc: 'Emerald northern lights',
      previewBg: 'linear-gradient(135deg, rgba(16,185,129,0.4), rgba(6,182,212,0.4))',
      accentColor: '#2dd4bf'
    },
    {
      id: 'obsidian-glass',
      name: 'Obsidian Glass',
      desc: 'Deep gold specular',
      previewBg: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(15,15,22,0.8))',
      accentColor: '#fbbf24'
    }
  ];

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      await checkUpdates(repoInput);
    } catch (err) {
      // Error is caught in context
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await saveSettings({
      apiKey: apiKeyInput.trim() || undefined,
      selectedModel: selectedModel,
      autoApprove: autoApp,
      updateRepo: repoInput.trim() || undefined,
      autoCheckUpdates: autoCheck,
      selectedTheme: selectedTheme
    });
    setIsSaving(false);
  };

  const filteredModels = models.filter(m => 
    m.name?.toLowerCase().includes(searchModel.toLowerCase()) || 
    m.id?.toLowerCase().includes(searchModel.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="NexusCoder" 
              className="w-9 h-9 rounded-xl object-cover border border-cyan-500/40 shadow-md shadow-cyan-500/20" 
            />
            <div>
              <h2 className="text-base font-bold text-white">Settings & OpenRouter Configuration</h2>
              <p className="text-xs text-slate-400">NexusCoder Studio · by arnon_srirat</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>OpenRouter API Key</span>
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
              >
                <span>Get an API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={hasApiKey ? '•••••••••••••••••••••••••••••••• (API Key is set)' : 'sk-or-v1-...'}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {hasApiKey && !apiKeyInput && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> OpenRouter API Key configured and active.
              </p>
            )}
          </div>

          {/* Model Selector with search & specs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Active AI Model</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {models.length} models available
              </span>
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                placeholder="Search models (e.g. claude, deepseek, gpt-4o, gemini)..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-900">
              {filteredModels.map(m => {
                const isSelected = selectedModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-2.5 px-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-950/60 text-indigo-200' : 'hover:bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-2">
                        <span>{m.name || m.id}</span>
                        {m.pricing?.isFree && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-300 rounded font-mono">
                            FREE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{m.id}</div>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono flex-shrink-0 text-slate-400">
                      {m.contextLength && (
                        <span>{(m.contextLength / 1000).toFixed(0)}k ctx</span>
                      )}
                      {m.pricing && !m.pricing.isFree && (
                        <span>${m.pricing.prompt}/M in</span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* UI Theme & Aesthetics */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-pink-400" />
                <span>UI Theme & Aesthetics</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {themeOptions.find(t => t.id === selectedTheme)?.name || 'Default'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {themeOptions.map((t) => {
                const isSelected = selectedTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTheme(t.id);
                      setTheme(t.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-slate-900 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Visual Preview Bar */}
                    <div 
                      className="h-9 rounded-lg mb-2 overflow-hidden relative flex items-center justify-center border border-white/10 shadow-inner"
                      style={{ background: t.previewBg }}
                    >
                      <div className="w-4 h-4 rounded-full shadow-md border border-white/30" style={{ background: t.accentColor }} />
                    </div>

                    <div className="font-semibold text-xs text-slate-200 truncate">{t.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t.desc}</div>

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-Pilot / Execution Mode */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApp}
                onChange={(e) => setAutoApp(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Autonomous Auto-Pilot Mode</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  When enabled, the AI will autonomously edit files and run non-interactive terminal commands without pausing for manual approval on every step.
                </p>
              </div>
            </label>
          </div>

          {/* Software Updates & Maintenance */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Software Updates & In-App Upgrades</div>
                  <div className="text-[11px] text-slate-400">Current version: <span className="font-mono text-cyan-300 font-bold">v{appVersion || '1.0.0'}</span></div>
                </div>
              </div>

              <button
                type="button"
                disabled={isCheckingUpdate}
                onClick={handleCheckUpdate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600/80 border border-slate-700 hover:border-indigo-500 rounded-lg text-xs font-medium text-slate-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
              </button>
            </div>

            {updateStatus === 'available' && updateInfo && (
              <div className="p-3 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-slate-950 border border-cyan-500/40 rounded-lg flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-semibold text-cyan-300">✨ New version v{updateInfo.latestVersion} available!</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">You can update directly inside the app.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
                >
                  Update Now
                </button>
              </div>
            )}

            {updateStatus === 'idle' && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>You are running the latest version of NexusCoder.</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={autoCheck}
                  onChange={(e) => setAutoCheck(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-0"
                />
                <span className="text-[11px]">Automatically check for updates on startup</span>
              </label>

              <button
                type="button"
                disabled={isCleaningCache}
                onClick={async () => {
                  setIsCleaningCache(true);
                  const res = await clearUpdateCache();
                  setIsCleaningCache(false);
                  const freedMB = ((res?.freedBytes || 0) / (1024 * 1024)).toFixed(1);
                  setCleanMessage(`Cleaned ${freedMB} MB of update cache.`);
                  setTimeout(() => setCleanMessage(null), 3500);
                }}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] text-slate-400 hover:text-rose-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Clean old installer files in temp directory to free disk space"
              >
                <Trash2 className="w-3 h-3 text-slate-500" />
                <span>{isCleaningCache ? 'Cleaning...' : 'Clean Update Cache'}</span>
              </button>
            </div>

            {cleanMessage && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-300 text-[11px] flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>{cleanMessage}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
