import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import * as api from '../../services/api';
import { 
  Folder, 
  FolderOpen, 
  HardDrive, 
  ArrowUp, 
  Clock, 
  X, 
  Check, 
  CornerDownRight,
  FolderPlus
} from 'lucide-react';

export default function FolderPickerModal() {
  const { 
    isFolderPickerOpen, 
    setIsFolderPickerOpen, 
    workspaceRoot, 
    selectWorkspaceFolder,
    recentWorkspaces 
  } = useApp();

  const [currentPath, setCurrentPath] = useState(workspaceRoot || '');
  const [parentPath, setParentPath] = useState(null);
  const [entries, setEntries] = useState([]);
  const [manualPath, setManualPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadDirectory = async (pathToGo, isDrives = false) => {
    setIsLoading(true);
    try {
      const res = await api.browseFilesystem(pathToGo, isDrives);
      setCurrentPath(res.currentPath);
      setParentPath(res.parentPath);
      setEntries(res.entries || []);
      setManualPath(res.currentPath);
    } catch (err) {
      console.error('Failed to browse directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isFolderPickerOpen) {
      loadDirectory(workspaceRoot || '');
    }
  }, [isFolderPickerOpen, workspaceRoot]);

  if (!isFolderPickerOpen) return null;

  const handleSelect = (folderPath) => {
    selectWorkspaceFolder(folderPath);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualPath.trim()) {
      handleSelect(manualPath.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Select Project Folder</h2>
              <p className="text-xs text-slate-400">Choose the folder where AI Agent should read, write, and execute code</p>
            </div>
          </div>
          <button
            onClick={() => setIsFolderPickerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Direct Path Input */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Folder Path (Absolute path):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                placeholder="e.g. D:\MyProjects\AwesomeApp"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={() => loadDirectory(manualPath)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition-colors"
              >
                Go
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-cyan-600/30 transition-colors"
              >
                Open This Folder
              </button>
            </div>
          </form>

          {/* Recent Workspaces */}
          {recentWorkspaces && recentWorkspaces.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recent Projects
              </span>
              <div className="flex flex-wrap gap-1.5">
                {recentWorkspaces.map(ws => (
                  <button
                    key={ws}
                    onClick={() => handleSelect(ws)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950/40 hover:border-cyan-500/40 border border-slate-700 text-xs text-slate-300 hover:text-cyan-300 transition-all font-mono group"
                  >
                    <Folder className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate max-w-[200px]">{ws.split(/[\\/]/).pop()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* File System Browser */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Browse Filesystem:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => loadDirectory('', true)}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors"
                  title="List Drives (C:\, D:\...)"
                >
                  <HardDrive className="w-3 h-3" /> Drives
                </button>
                {parentPath && (
                  <button
                    onClick={() => loadDirectory(parentPath)}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors"
                    title="Up one level"
                  >
                    <ArrowUp className="w-3 h-3" /> Up
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl bg-slate-950 max-h-56 overflow-y-auto divide-y divide-slate-900 font-mono text-xs">
              {isLoading ? (
                <div className="p-4 text-center text-slate-500">Loading directories...</div>
              ) : entries.length > 0 ? (
                entries.map(e => (
                  <div
                    key={e.path}
                    className="p-2 px-3 flex items-center justify-between hover:bg-slate-900 cursor-pointer transition-colors group"
                  >
                    <div
                      onClick={() => loadDirectory(e.path)}
                      className="flex items-center gap-2 flex-1 min-w-0 pr-2"
                    >
                      {e.type === 'drive' ? (
                        <HardDrive className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                      )}
                      <span className="text-slate-300 group-hover:text-white truncate">{e.name}</span>
                    </div>

                    <button
                      onClick={() => handleSelect(e.path)}
                      className="opacity-0 group-hover:opacity-100 px-2.5 py-1 bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white rounded text-[11px] font-sans font-medium transition-all"
                    >
                      Select
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500">No directories found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
