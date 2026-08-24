import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Search, 
  Clock, 
  Zap, 
  ListChecks, 
  Sparkles,
  Bot,
  Monitor,
  Code2
} from 'lucide-react';

export default function ChatHistoryList() {
  const { 
    chatSessions, 
    currentChatId, 
    switchChat, 
    createNewChat, 
    renameChatSession, 
    deleteChatSession,
    setIsNewSessionModalOpen
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'code' | 'system'
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredChats = chatSessions.filter(c => {
    const matchesSearch = (c.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'system') return c.mode === 'system';
    if (filterType === 'code') return c.mode !== 'system';
    return true;
  });

  const startRename = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title || '');
  };

  const handleSaveRename = (e, chatId) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      renameChatSession(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  const handleDelete = (e, chatId) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation history?')) {
      deleteChatSession(chatId);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60 select-none">
      {/* Top Actions: Split Code vs System Session Buttons */}
      <div className="p-3 border-b border-slate-800 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {/* 1. New Code Chat */}
          <button
            onClick={() => createNewChat({ mode: 'agent' })}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-[11px] shadow-md shadow-indigo-900/30 transition-all active:scale-95"
            title="Create New Code Agent Session (Project Development)"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>+ Code Chat</span>
          </button>

          {/* 2. New System Chat */}
          <button
            onClick={() => createNewChat({ mode: 'system', title: 'System Diagnostic Session' })}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-[11px] shadow-md shadow-amber-900/30 transition-all active:scale-95"
            title="Create New System Agent Session (No Folder Required)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>+ System Chat</span>
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="space-y-1.5">
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-semibold text-slate-400">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                filterType === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'hover:text-slate-200'
              }`}
            >
              All ({chatSessions.length})
            </button>
            <button
              onClick={() => setFilterType('code')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                filterType === 'code' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'hover:text-slate-200'
              }`}
            >
              💻 Code
            </button>
            <button
              onClick={() => setFilterType('system')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                filterType === 'system' ? 'bg-amber-950 text-amber-300 border border-amber-500/30 shadow-sm' : 'hover:text-slate-200'
              }`}
            >
              🖥️ System
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
      </div>

      {/* Chat Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredChats.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No conversations found.</p>
          </div>
        ) : (
          filteredChats.map(chat => {
            const isActive = currentChatId === chat.id;
            const isEditing = editingChatId === chat.id;
            const isSystem = chat.mode === 'system';

            return (
              <div
                key={chat.id}
                onClick={() => !isEditing && switchChat(chat.id)}
                className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? isSystem
                      ? 'bg-slate-900 border-amber-500/70 shadow-lg shadow-amber-950/40 text-white'
                      : 'bg-slate-900 border-indigo-500/70 shadow-lg shadow-indigo-950/40 text-white'
                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(e, chat.id)}
                      autoFocus
                      className="flex-1 px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={(e) => handleSaveRename(e, chat.id)}
                      className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isSystem ? (
                          <Monitor className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isActive ? 'text-amber-400' : 'text-amber-500/70'
                          }`} />
                        ) : (
                          <Code2 className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                          }`} />
                        )}
                        <span className="font-medium text-xs truncate">
                          {chat.title}
                        </span>
                      </div>

                      {/* Action buttons (Branch / Rename / Delete) */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            createNewChat({ mode: chat.mode, withSummary: true, baseChatId: chat.id });
                          }}
                          className="p-1 hover:text-purple-300 rounded hover:bg-slate-800 text-slate-400 transition-colors"
                          title="Branch into new session with context summary (แตกแชทใหม่พร้อมสรุป)"
                        >
                          <Sparkles className="w-3 h-3 text-purple-400" />
                        </button>
                        <button
                          onClick={(e) => startRename(e, chat)}
                          className="p-1 hover:text-cyan-300 rounded hover:bg-slate-800 text-slate-400 transition-colors"
                          title="Rename"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, chat.id)}
                          className="p-1 hover:text-rose-400 rounded hover:bg-slate-800 text-slate-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeAgo(chat.updatedAt)}
                      </span>

                      <div className="flex items-center gap-1">
                        {chat.mode === 'plan' ? (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/20 font-mono">
                            Plan
                          </span>
                        ) : chat.mode === 'ask' ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/20 font-mono">
                            Ask
                          </span>
                        ) : chat.mode === 'system' ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 font-mono font-bold">
                            🖥️ System
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/20 font-mono">
                            Code
                          </span>
                        )}

                        {chat.estimatedTokens > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 font-mono">
                            ~{chat.estimatedTokens >= 1000 ? `${(chat.estimatedTokens / 1000).toFixed(1)}k` : chat.estimatedTokens} tok
                          </span>
                        )}

                        {chat.messageCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {chat.messageCount} msgs
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

