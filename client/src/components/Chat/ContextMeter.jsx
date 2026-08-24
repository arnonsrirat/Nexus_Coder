import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  Sparkles,
  Plus,
  Scissors,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  Zap,
  Info
} from 'lucide-react';

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

export default function ContextMeter() {
  const {
    contextStats,
    createNewChat,
    compactCurrentContext,
    model,
    currentChatId
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [compactMessage, setCompactMessage] = useState(null);
  const dropdownRef = useRef(null);

  const percent = contextStats?.percent || 0;
  const estimatedTokens = contextStats?.estimatedTokens || 0;
  const contextLimit = contextStats?.contextLimit || 200000;
  const isHigh = percent >= 75;
  const isCritical = percent >= 90;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCompact = async () => {
    setCompacting(true);
    setCompactMessage(null);
    try {
      compactCurrentContext();
      setCompactMessage('Context compacted successfully!');
      setTimeout(() => setCompactMessage(null), 3500);
    } catch (e) {
      setCompactMessage(`Failed: ${e.message}`);
    } finally {
      setCompacting(false);
    }
  };

  const handleNewCleanChat = () => {
    setIsOpen(false);
    createNewChat({ withSummary: false });
  };

  const handleNewChatWithSummary = () => {
    setIsOpen(false);
    createNewChat({ withSummary: true, baseChatId: currentChatId });
  };

  // Color scheme calculation
  const getMeterColor = () => {
    if (isCritical) return 'from-rose-500 to-red-600 shadow-rose-500/50';
    if (isHigh) return 'from-amber-500 to-orange-500 shadow-amber-500/40';
    if (percent >= 50) return 'from-cyan-500 to-indigo-500 shadow-indigo-500/30';
    return 'from-emerald-500 to-cyan-500 shadow-emerald-500/30';
  };

  const getTextColor = () => {
    if (isCritical) return 'text-rose-400';
    if (isHigh) return 'text-amber-400';
    if (percent >= 50) return 'text-cyan-300';
    return 'text-emerald-400';
  };

  const getBadgeBg = () => {
    if (isCritical) return 'bg-rose-950/60 border-rose-500/40 text-rose-300';
    if (isHigh) return 'bg-amber-950/60 border-amber-500/40 text-amber-300';
    return 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700';
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all shadow-sm ${getBadgeBg()} ${
          isCritical ? 'animate-pulse' : ''
        }`}
        title={`Context Window: ~${formatNumber(estimatedTokens)} / ${formatNumber(contextLimit)} tokens (${percent}%) — Click to manage session & context`}
      >
        <Layers className={`w-3.5 h-3.5 ${getTextColor()}`} />

        <div className="flex items-center gap-1">
          <span className="font-mono">{formatNumber(estimatedTokens)}</span>
          <span className="text-slate-500">/</span>
          <span className="font-mono text-slate-400">{formatNumber(contextLimit)}</span>
        </div>

        {/* Mini progress bar inside badge */}
        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-0.5 relative">
          <div
            className={`h-full bg-gradient-to-r ${getMeterColor()} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
          />
        </div>

        <span className={`text-[10px] font-mono font-bold ${getTextColor()}`}>
          {percent}%
        </span>

        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-9 w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl z-50 backdrop-blur-xl space-y-3 select-none text-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Context Window Status</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
              isCritical
                ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                : isHigh
                ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
            }`}>
              {isCritical ? 'Critical' : isHigh ? 'High Load' : 'Optimal'}
            </span>
          </div>

          {/* Usage Meter Breakdown */}
          <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Used Memory:</span>
              <span className="font-mono text-slate-200 font-semibold">
                ~{estimatedTokens.toLocaleString()} tokens ({percent}%)
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className={`h-full bg-gradient-to-r ${getMeterColor()} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
              <span>0</span>
              <span>Model Limit: {contextLimit.toLocaleString()} tokens</span>
            </div>
          </div>

          {/* Info Notice */}
          <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/30 p-2 rounded-lg border border-slate-800 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <span>
              {isHigh
                ? 'Context ใกล้เต็มแล้ว อาจทำให้โมเดลคิดช้าลง แนะนำสร้างแชทใหม่หรือบีบอัด Context เพื่อความเร็วสูงสุด'
                : 'การสร้างแชทใหม่เป็นระยะช่วยให้ AI ทำงานได้รวดเร็ว แม่นยำ และประหยัด Token'}
            </span>
          </div>

          {compactMessage && (
            <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{compactMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-1">
            {/* Action 1: New Clean Code Chat */}
            <button
              onClick={() => {
                setIsOpen(false);
                createNewChat({ mode: 'agent', withSummary: false });
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 text-slate-200 transition-all group"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-cyan-950 text-cyan-400 group-hover:bg-cyan-900">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-200">New Code Chat</div>
                  <div className="text-[10px] text-slate-400">เริ่มเซสชั่นโค้ดใหม่ 0 token</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Ctrl+Shift+N
              </span>
            </button>

            {/* Action 2: New System Chat */}
            <button
              onClick={() => {
                setIsOpen(false);
                createNewChat({ mode: 'system', withSummary: false, title: 'System Diagnostic Session' });
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-slate-200 transition-all group"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-amber-950 text-amber-400 group-hover:bg-amber-900">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-amber-200">New System Chat</div>
                  <div className="text-[10px] text-slate-400">จัดการ OS &amp; เครื่อง (ไม่ต้องใช้โฟลเดอร์)</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                OS
              </span>
            </button>

            {/* Action 3: New Chat with Task Summary */}
            <button
              onClick={handleNewChatWithSummary}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 hover:from-indigo-900/60 hover:to-purple-900/50 border border-indigo-500/30 hover:border-indigo-500/60 text-slate-200 transition-all group"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-purple-950 text-purple-300 group-hover:bg-purple-900">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-purple-200">New Chat with Task Summary</div>
                  <div className="text-[10px] text-slate-400">ต่อยอดงานเดิมด้วยแชทใหม่พร้อมบริบทสรุป</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-purple-300 font-semibold">
                Branch ✨
              </span>
            </button>

            {/* Action 4: Compact Context */}
            <button
              onClick={handleCompact}
              disabled={compacting}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-slate-200 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-amber-950 text-amber-400 group-hover:bg-amber-900">
                  <Scissors className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-200">Compact Current Context</div>
                  <div className="text-[10px] text-slate-400">ย่อ Tool เก่าในแชทนี้ ลด Token ทันที 70-85%</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-300">
                {compacting ? 'Cleaning...' : 'Prune 🧹'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
