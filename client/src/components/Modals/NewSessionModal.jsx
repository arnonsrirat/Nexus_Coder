import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Code2,
  Monitor,
  Sparkles,
  Folder,
  Cpu,
  Zap,
  ListChecks,
  MessageSquare,
  HardDrive,
  Activity,
  Terminal,
  X,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function NewSessionModal() {
  const {
    isNewSessionModalOpen,
    setIsNewSessionModalOpen,
    createNewChat,
    workspaceRoot,
    setIsFolderPickerOpen,
    currentChatId
  } = useApp();

  const [selectedType, setSelectedType] = useState('code'); // 'code' | 'system'
  const [codeSubMode, setCodeSubMode] = useState('agent'); // 'agent' | 'plan' | 'ask'
  const [withSummary, setWithSummary] = useState(false);

  if (!isNewSessionModalOpen) return null;

  const handleStart = () => {
    setIsNewSessionModalOpen(false);

    if (selectedType === 'system') {
      createNewChat({
        mode: 'system',
        withSummary: withSummary,
        baseChatId: currentChatId,
        title: withSummary ? 'Continuation: System Diagnostic' : 'System Diagnostic Session'
      });
    } else {
      // Code Agent
      createNewChat({
        mode: codeSubMode,
        withSummary: withSummary,
        baseChatId: currentChatId,
        title: withSummary ? 'Continuation: Code Session' : 'New Code Session'
      });

      // If no workspace open, open folder picker
      if (!workspaceRoot) {
        setTimeout(() => setIsFolderPickerOpen(true), 300);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl space-y-5 glow-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Choose Session Type (เลือกประเภทเซสชั่นใหม่)
              </h2>
              <p className="text-xs text-slate-400">
                แยกการทำงานให้ชัดเจนระหว่างพัฒนาโปรเจกต์ กับดูแลจัดการระบบเครื่อง
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewSessionModalOpen(false)}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two Main Session Choices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Code Agent (Project Development) */}
          <div
            onClick={() => setSelectedType('code')}
            className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedType === 'code'
                ? 'bg-slate-800/90 border-cyan-500/80 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            {/* Active Indicator Radio */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Code Agent</h3>
                  <span className="text-[10px] text-cyan-400 font-medium">Project &amp; Code Development</span>
                </div>
              </div>

              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedType === 'code' ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'
              }`}>
                {selectedType === 'code' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              สำหรับเขียนโค้ด แก้บั๊ก อ่านไฟล์ วางแผนสถาปัตยกรรม และรันคำสั่งในโฟลเดอร์โปรเจกต์
            </p>

            <div className="space-y-1.5 text-[11px] text-slate-400 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-400">✓</span>
                <span>Surgical Diff file editing &amp; Repo map</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-400">✓</span>
                <span>Visual Checklist &amp; Interactive Canvas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 font-mono text-[10px]">•</span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {workspaceRoot ? `Folder: ${workspaceRoot.split(/[\\/]/).pop()}` : 'ต้องการเลือกโฟลเดอร์โปรเจกต์'}
                </span>
              </div>
            </div>

            {/* Sub-mode selector if Code selected */}
            {selectedType === 'code' && (
              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCodeSubMode('agent'); }}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                    codeSubMode === 'agent'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Agent
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCodeSubMode('plan'); }}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                    codeSubMode === 'plan'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  📋 Plan
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCodeSubMode('ask'); }}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                    codeSubMode === 'ask'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  💬 Ask
                </button>
              </div>
            )}
          </div>

          {/* Option 2: System Agent (Host OS & Hardware) */}
          <div
            onClick={() => setSelectedType('system')}
            className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedType === 'system'
                ? 'bg-slate-800/90 border-amber-500/80 shadow-lg shadow-amber-950/50 ring-1 ring-amber-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            {/* Active Indicator Radio */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-500/30">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">System Agent</h3>
                  <span className="text-[10px] text-amber-400 font-medium">Host Machine &amp; OS Specialist</span>
                </div>
              </div>

              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedType === 'system' ? 'border-amber-400 bg-amber-500' : 'border-slate-600'
              }`}>
                {selectedType === 'system' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              สำหรับตรวจสอบสเปกเครื่อง CPU/RAM, พาร์ติชันดิสก์, ค้นหา &amp; ปิด Process, สแกนพอร์ต และดูแลระบบ
            </p>

            <div className="space-y-1.5 text-[11px] text-slate-400 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">✓</span>
                <span>CPU Real-time, RAM Breakdown, Disk Drives</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">✓</span>
                <span>Process diagnostics, Port scanner, Temp cleanup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✨</span>
                <span className="text-emerald-300 font-medium">ไม่ต้องเลือกโฟลเดอร์ — ใช้งานได้ทันทีทั่วเครื่อง</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/60 text-[10px] text-amber-300/80 font-mono">
              ⚡ Full OS Machine Access
            </div>
          </div>
        </div>

        {/* Continuation with Summary Toggle */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Continue with Task Summary (ต่อยอดงานเดิม)
              </div>
              <div className="text-[11px] text-slate-400">
                ดึงสรุปเป้าหมายและแผนงานจากแชทเดิมมาตั้งต้นในแชทใหม่ (ช่วยป้องกัน Context เต็ม)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWithSummary(!withSummary)}
            className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
              withSummary ? 'bg-purple-600' : 'bg-slate-800'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              withSummary ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setIsNewSessionModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-xs text-white shadow-lg transition-all active:scale-95 ${
              selectedType === 'system'
                ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-amber-900/40'
                : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-indigo-900/40'
            }`}
          >
            <span>{selectedType === 'system' ? 'Start System Session 🖥️' : 'Start Code Session 💻'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
