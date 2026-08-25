import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Network,
  Plus,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Zap,
  Folder,
  Globe,
  Brain,
  GitBranch,
  Database,
  Compass,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  X,
  Play
} from 'lucide-react';

const ICON_MAP = {
  Folder: Folder,
  Globe: Globe,
  Brain: Brain,
  Github: GitBranch,
  Database: Database,
  Chrome: Compass,
  Terminal: Terminal
};

export default function McpModal() {
  const {
    isMcpModalOpen,
    setIsMcpModalOpen,
    mcpServers,
    mcpSummary,
    mcpTemplates,
    connectMcpServer,
    disconnectMcpServer,
    saveMcpServer,
    deleteMcpServer,
    testMcpServer,
    refreshMcp
  } = useApp();

  const [activeTab, setActiveTab] = useState('servers'); // 'servers' | 'add' | 'templates'
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [expandedTools, setExpandedTools] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [testResults, setTestResults] = useState({});

  // New Server Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('stdio');
  const [formCommand, setFormCommand] = useState('npx');
  const [formArgs, setFormArgs] = useState('-y @modelcontextprotocol/server-filesystem .');
  const [formEnv, setFormEnv] = useState('');
  const [formError, setFormError] = useState(null);

  if (!isMcpModalOpen) return null;

  const handleToggleConnect = async (server) => {
    setIsProcessing(true);
    try {
      if (server.status === 'connected' || server.status === 'connecting') {
        await disconnectMcpServer(server.id);
      } else {
        await connectMcpServer(server.id);
      }
    } catch (err) {
      console.error('Toggle MCP connect failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestPing = async (serverId) => {
    setTestResults(prev => ({ ...prev, [serverId]: { testing: true } }));
    try {
      const res = await testMcpServer(serverId);
      setTestResults(prev => ({
        ...prev,
        [serverId]: { testing: false, success: res.success, latencyMs: res.latencyMs }
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [serverId]: { testing: false, error: err.message }
      }));
    }
  };

  const handleAddFromTemplate = async (template) => {
    setIsProcessing(true);
    try {
      await saveMcpServer({
        name: template.name,
        description: template.description,
        type: template.type,
        command: template.command,
        args: template.args,
        env: template.env,
        enabled: true
      });
      setActiveTab('servers');
    } catch (err) {
      console.error('Failed to add from template:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCustomServer = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please enter a server name.');
      return;
    }
    setFormError(null);
    setIsProcessing(true);

    try {
      const parsedArgs = formArgs.trim().split(/\s+/).filter(Boolean);
      let parsedEnv = {};
      if (formEnv.trim()) {
        try {
          parsedEnv = JSON.parse(formEnv);
        } catch (e) {
          // Parse key=value lines
          const lines = formEnv.split('\n');
          for (const l of lines) {
            const [k, ...v] = l.split('=');
            if (k && v.length) parsedEnv[k.trim()] = v.join('=').trim();
          }
        }
      }

      await saveMcpServer({
        name: formName.trim(),
        description: formDesc.trim(),
        type: formType,
        command: formCommand.trim(),
        args: parsedArgs,
        env: parsedEnv,
        enabled: true
      });

      // Reset form
      setFormName('');
      setFormDesc('');
      setFormArgs('');
      setFormEnv('');
      setActiveTab('servers');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleToolExpand = (serverId, toolIndex) => {
    const key = `${serverId}_${toolIndex}`;
    setExpandedTools(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Model Context Protocol (MCP)</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 rounded-full font-mono">
                  {mcpSummary?.connectedCount || 0} Connected · {mcpSummary?.totalToolsCount || 0} Tools
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connect standard MCP servers to equip NexusCoder with external databases, APIs, and tools.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshMcp}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
              title="Refresh MCP status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMcpModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 flex items-center gap-4 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('servers')}
            className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'servers'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Configured Servers ({mcpServers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Quick-Add Presets ({mcpTemplates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'add'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Server</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: CONFIGURED SERVERS */}
          {activeTab === 'servers' && (
            <div className="space-y-3">
              {mcpServers.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-3">
                  <Network className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                  <div className="text-sm font-semibold text-slate-300">No MCP Servers Configured</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add standard MCP servers from the Quick-Add presets or configure a custom stdio process.
                  </p>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Browse Quick-Add Presets
                  </button>
                </div>
              ) : (
                mcpServers.map((server) => {
                  const isConnected = server.status === 'connected';
                  const isConnecting = server.status === 'connecting';
                  const isError = server.status === 'error';
                  const testInfo = testResults[server.id];

                  return (
                    <div
                      key={server.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isConnected
                          ? 'bg-slate-950/70 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                          : isError
                          ? 'bg-slate-950/70 border-rose-500/40'
                          : 'bg-slate-950/50 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isConnected ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50' : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            <Terminal className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-200 truncate">{server.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium flex items-center gap-1 ${
                                isConnected
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                  : isConnecting
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse'
                                  : isError
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}>
                                {isConnecting ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : isConnected ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                ) : isError ? (
                                  <AlertCircle className="w-2.5 h-2.5" />
                                ) : null}
                                <span>{isConnected ? 'Connected' : isConnecting ? 'Connecting...' : isError ? 'Error' : 'Disconnected'}</span>
                              </span>
                              {server.latencyMs !== null && isConnected && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {server.latencyMs}ms
                                </span>
                              )}
                            </div>

                            {server.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{server.description}</p>
                            )}

                            <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-500">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                                {server.command} {server.args?.join(' ')}
                              </span>
                            </div>

                            {server.error && (
                              <div className="mt-2 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300 font-mono">
                                {server.error}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isConnected && (
                            <button
                              onClick={() => handleTestPing(server.id)}
                              disabled={testInfo?.testing}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/80 hover:border-cyan-500/40 transition-all flex items-center gap-1.5"
                              title="Test MCP connection & ping"
                            >
                              {testInfo?.testing ? (
                                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                              ) : (
                                <Zap className="w-3 h-3 text-amber-400" />
                              )}
                              <span>Test</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleConnect(server)}
                            disabled={isProcessing}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                              isConnected
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-600/30'
                            }`}
                          >
                            {isConnected ? 'Disconnect' : 'Connect'}
                          </button>

                          <button
                            onClick={() => deleteMcpServer(server.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/30 transition-colors"
                            title="Delete server configuration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Discovered Tools List */}
                      {isConnected && server.tools && server.tools.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80">
                          <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Radio className="w-3 h-3 text-cyan-400" />
                              <span>Exposed Tools ({server.tools.length})</span>
                            </span>
                            <span className="text-[10px] text-cyan-400 font-mono">
                              Available in AI prompt context
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {server.tools.map((tool, idx) => {
                              const toolKey = `${server.id}_${idx}`;
                              const isExpanded = !!expandedTools[toolKey];

                              return (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-all text-xs"
                                >
                                  <div
                                    onClick={() => toggleToolExpand(server.id, idx)}
                                    className="flex items-center justify-between cursor-pointer"
                                  >
                                    <span className="font-mono text-[11px] font-semibold text-cyan-300 truncate">
                                      {tool.name}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                  </div>

                                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                                    {tool.description || 'No description provided.'}
                                  </div>

                                  {isExpanded && tool.inputSchema && (
                                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded">
                                      <pre className="overflow-x-auto">
                                        {JSON.stringify(tool.inputSchema, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Click any official template to immediately add and configure it in your workspace.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mcpTemplates.map((tpl) => {
                  const IconComp = ICON_MAP[tpl.icon] || Terminal;
                  const isAlreadyAdded = mcpServers.some(s => s.name === tpl.name);

                  return (
                    <div
                      key={tpl.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                            {tpl.category}
                          </span>
                        </div>

                        <div>
                          <div className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300 transition-colors">
                            {tpl.name}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {tpl.description}
                          </p>
                        </div>

                        <div className="text-[10px] font-mono text-slate-500 truncate bg-slate-900 p-1.5 rounded">
                          {tpl.command} {tpl.args?.join(' ')}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        {isAlreadyAdded ? (
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Added
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">1-Click Install</span>
                        )}

                        <button
                          onClick={() => handleAddFromTemplate(tpl)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Preset</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ADD CUSTOM SERVER */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateCustomServer} className="space-y-4 max-w-xl mx-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Server Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Custom Database MCP"
                  required
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What capabilities does this MCP server provide?"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Command</label>
                  <input
                    type="text"
                    value={formCommand}
                    onChange={(e) => setFormCommand(e.target.value)}
                    placeholder="npx, python, node, uvx"
                    required
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Transport Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="stdio">stdio (Subprocess)</option>
                    <option value="sse">SSE (HTTP endpoint)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Arguments (Space separated)</label>
                <input
                  type="text"
                  value={formArgs}
                  onChange={(e) => setFormArgs(e.target.value)}
                  placeholder="-y @modelcontextprotocol/server-postgres postgresql://..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500">
                  Use '.' in arguments to automatically substitute the active workspace directory path.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Environment Variables (Optional)</label>
                <textarea
                  value={formEnv}
                  onChange={(e) => setFormEnv(e.target.value)}
                  placeholder="KEY=VALUE or { &quot;API_KEY&quot;: &quot;secret&quot; }"
                  rows={3}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('servers')}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save & Connect Server</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
