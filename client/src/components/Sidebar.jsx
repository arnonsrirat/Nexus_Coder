import React, { useState, memo } from 'react';
import { useApp } from '../context/AppContext';
import ChatHistoryList from './Sidebar/ChatHistoryList';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Pin, 
  RotateCw, 
  FileDiff,
  Layers,
  MessageSquare
} from 'lucide-react';

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'mjs':
      return <FileCode className="w-3.5 h-3.5 text-amber-400" />;
    case 'html':
    case 'css':
    case 'scss':
      return <FileCode className="w-3.5 h-3.5 text-cyan-400" />;
    case 'json':
      return <FileJson className="w-3.5 h-3.5 text-yellow-400" />;
    case 'py':
      return <FileCode className="w-3.5 h-3.5 text-emerald-400" />;
    case 'md':
    case 'txt':
      return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    default:
      return <File className="w-3.5 h-3.5 text-slate-400" />;
  }
}

const TreeNode = memo(function TreeNodeComponent({ node, depth = 0 }) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const { openFileInEditor, togglePinContextFile, pinnedContextFiles } = useApp();

  const isPinned = pinnedContextFiles.includes(node.path);

  if (node.type === 'directory') {
    return (
      <div>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className="flex items-center gap-1.5 py-1 px-2 hover:bg-slate-800/60 rounded cursor-pointer text-xs text-slate-300 group select-none transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500" />
          )}
          {isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-400/90" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-400/70" />
          )}
          <span className="font-medium truncate">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
      className={`flex items-center justify-between py-1 px-2 hover:bg-slate-800/60 rounded cursor-pointer text-xs group select-none transition-colors ${
        isPinned ? 'bg-cyan-950/30 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <div
        onClick={() => openFileInEditor(node.path)}
        className="flex items-center gap-1.5 min-w-0 flex-1 py-0.5"
      >
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePinContextFile(node.path);
        }}
        className={`p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
          isPinned
            ? 'opacity-100 text-cyan-400 hover:text-cyan-300'
            : 'text-slate-500 hover:text-slate-300'
        }`}
        title={isPinned ? 'Unpin context' : 'Pin as AI context (@file)'}
      >
        <Pin className={`w-3 h-3 ${isPinned ? 'fill-cyan-400' : ''}`} />
      </button>
    </div>
  );
});

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'chats' | 'diffs'
  const {
    workspaceRoot,
    workspaceName,
    fileTree,
    pinnedContextFiles,
    togglePinContextFile,
    refreshTree,
    fileDiffs,
    chatSessions,
    setActiveDiff,
    activeDiff
  } = useApp();

  return (
    <aside className="w-full border-r border-slate-800 bg-slate-950 flex flex-col h-full select-none overflow-hidden">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-slate-800 px-2 pt-1 gap-1 bg-slate-900/60">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'files'
              ? 'border-cyan-400 text-cyan-300 bg-slate-800/40 rounded-t'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Files</span>
        </button>

        <button
          onClick={() => setActiveTab('chats')}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'chats'
              ? 'border-indigo-400 text-indigo-300 bg-slate-800/40 rounded-t'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chats</span>
          {chatSessions.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-mono">
              {chatSessions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('diffs')}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'diffs'
              ? 'border-amber-400 text-amber-300 bg-slate-800/40 rounded-t'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileDiff className="w-3.5 h-3.5" />
          <span>Diffs</span>
          {fileDiffs.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-mono">
              {fileDiffs.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'chats' && (
        <ChatHistoryList />
      )}

      {activeTab === 'files' && (
        <>
          {/* File Explorer Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/60 bg-slate-900/20">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 truncate">
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate">{workspaceName || 'No Folder Open'}</span>
            </div>
            <button
              onClick={refreshTree}
              className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
              title="Refresh Files"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Context Files Drawer (Pinned) */}
          {pinnedContextFiles.length > 0 && (
            <div className="p-2 border-b border-slate-800 bg-cyan-950/20">
              <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Pin className="w-3 h-3 fill-cyan-400" />
                <span>AI Context Files ({pinnedContextFiles.length})</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {pinnedContextFiles.map(f => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 text-[11px] bg-cyan-900/40 text-cyan-200 border border-cyan-500/30 rounded px-1.5 py-0.5 font-mono"
                  >
                    <span className="truncate max-w-[120px]">{f.split('/').pop()}</span>
                    <button
                      onClick={() => togglePinContextFile(f)}
                      className="hover:text-rose-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Directory Tree */}
          <div className="flex-1 overflow-y-auto p-1 py-2">
            {fileTree.length > 0 ? (
              fileTree.map(node => (
                <TreeNode key={node.path} node={node} depth={0} />
              ))
            ) : (
              <div className="text-center p-6 text-xs text-slate-500 font-mono">
                {workspaceRoot ? 'No files found in folder.' : 'Select a folder to view files.'}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'diffs' && (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Recent AI Modifications
          </div>
          {fileDiffs.length > 0 ? (
            <div className="space-y-1.5">
              {fileDiffs.map(d => (
                <div
                  key={d.id}
                  onClick={() => setActiveDiff(d)}
                  className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    activeDiff?.id === d.id
                      ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-200'
                      : 'bg-slate-900/50 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="truncate font-semibold text-slate-200">{d.path}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      d.action === 'created'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                    }`}>
                      {d.action}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(d.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-xs text-slate-500">
              No files modified by AI yet.
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
