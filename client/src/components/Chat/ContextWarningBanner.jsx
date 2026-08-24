import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  AlertOctagon,
  Plus,
  Sparkles,
  Scissors,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function ContextWarningBanner() {
  const {
    contextStats,
    createNewChat,
    compactCurrentContext,
    currentChatId
  } = useApp();

  const [dismissedChatId, setDismissedChatId] = useState(null);

  const percent = contextStats?.percent || 0;
  const isHigh = percent >= 75;
  const isCritical = percent >= 90;

  // Don't show if context is healthy or user dismissed for this chat
  if (!isHigh || dismissedChatId === currentChatId) {
    return null;
  }

  const handleNewCleanChat = () => {
    createNewChat({ withSummary: false });
  };

  const handleNewChatWithSummary = () => {
    createNewChat({ withSummary: true, baseChatId: currentChatId });
  };

  const handleCompact = () => {
    compactCurrentContext();
  };

  const handleDismiss = () => {
    setDismissedChatId(currentChatId);
  };

  return (
    <div className={`mx-4 mb-2 p-3 rounded-2xl border backdrop-blur-xl transition-all shadow-xl select-none ${
      isCritical
        ? 'bg-rose-950/80 border-rose-500/60 shadow-rose-950/50'
        : 'bg-amber-950/70 border-amber-500/50 shadow-amber-950/40'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className={`p-1.5 rounded-xl ${
            isCritical ? 'bg-rose-900/80 text-rose-300 animate-bounce' : 'bg-amber-900/80 text-amber-300'
          }`}>
            {isCritical ? <AlertOctagon className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isCritical ? 'text-rose-200' : 'text-amber-200'}`}>
                {isCritical ? '⚠️ Context Window ใกล้เต็มสูงสุด (' + percent + '%)' : '⚡ บริบทแชทเริ่มยาว (' + percent + '%)'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-300 border border-white/10">
                ~{contextStats?.estimatedTokens?.toLocaleString()} / {contextStats?.contextLimit?.toLocaleString()} tokens
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed max-w-xl">
              {isCritical
                ? 'ความจำบริบทของโมเดลใกล้ถึงขีดจำกัด การสนทนาอาจช้าลงหรือบริบทตกหล่น แนะนำสร้างแชทใหม่หรือบีบอัดทันที'
                : 'การสนทนานี้เริ่มยาว แนะนำสร้างเซสชั่นใหม่หรือบีบอัด Context เพื่อให้ AI ตอบสนองได้รวดเร็วและแม่นยำที่สุด'}
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-black/20 transition-colors"
          title="Dismiss warning"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-white/10">
        <button
          onClick={handleNewChatWithSummary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/40 transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Chat with Summary (สร้างแชทใหม่พร้อมบริบทสรุป)</span>
        </button>

        <button
          onClick={handleNewCleanChat}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 text-xs font-medium transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>New Clean Chat (แชทใหม่ว่าง)</span>
        </button>

        <button
          onClick={handleCompact}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-slate-200 text-xs font-medium transition-all"
        >
          <Scissors className="w-3.5 h-3.5 text-amber-400" />
          <span>Compact Context (บีบอัด Context เดิม)</span>
        </button>
      </div>
    </div>
  );
}
