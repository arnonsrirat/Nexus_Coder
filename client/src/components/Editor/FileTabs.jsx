import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Save, FileCode } from 'lucide-react';

export default function FileTabs() {
  const { 
    activeTabs, 
    activeTabPath, 
    setActiveTabPath, 
    closeTab, 
    saveActiveFile 
  } = useApp();

  if (activeTabs.length === 0) return null;

  return (
    <div className="h-9 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between px-2 overflow-x-auto select-none">
      <div className="flex items-center gap-1 overflow-x-auto">
        {activeTabs.map(tab => {
          const isActive = tab.path === activeTabPath;
          return (
            <div
              key={tab.path}
              onClick={() => setActiveTabPath(tab.path)}
              className={`flex items-center gap-2 px-3 py-1 text-xs font-mono rounded-t border-t-2 cursor-pointer transition-all ${
                isActive
                  ? 'bg-slate-900 border-cyan-400 text-slate-100 shadow-sm'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="truncate max-w-[140px]">{tab.name}</span>
              
              {tab.dirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.path);
                }}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={saveActiveFile}
        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 text-xs rounded border border-slate-700 transition-all ml-2 flex-shrink-0"
        title="Save active file (Ctrl+S)"
      >
        <Save className="w-3 h-3" />
        <span>Save</span>
      </button>
    </div>
  );
}
