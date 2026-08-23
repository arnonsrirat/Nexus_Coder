import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Download, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  HardDrive, 
  FileText,
  Trash2,
  Check
} from 'lucide-react';

export default function UpdateModal() {
  const {
    isUpdateModalOpen,
    setIsUpdateModalOpen,
    appVersion,
    updateStatus,
    updateInfo,
    updateProgress,
    startDownloadUpdate,
    applyUpdate,
    clearUpdateCache
  } = useApp();

  const [isApplying, setIsApplying] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanNotice, setCleanNotice] = useState(null);

  if (!isUpdateModalOpen || !updateInfo) return null;

  const isDownloading = updateStatus === 'downloading';
  const isReady = updateStatus === 'ready';
  const isError = updateStatus === 'error';

  const handleApplyUpdate = async () => {
    setIsApplying(true);
    await applyUpdate();
  };

  const handleCleanCache = async () => {
    setIsCleaning(true);
    const res = await clearUpdateCache();
    setIsCleaning(false);
    const freedMB = ((res?.freedBytes || 0) / (1024 * 1024)).toFixed(1);
    setCleanNotice(`Cleaned ${freedMB} MB of update cache.`);
    setTimeout(() => setCleanNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="NexusCoder" 
              className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 shadow-lg shadow-cyan-500/20" 
            />
            <div>
              <h2 className="text-base font-bold text-white">
                {isReady ? 'Update Ready to Install' : 'Software Update Available'}
              </h2>
              <p className="text-xs text-slate-400">
                NexusCoder Studio · by arnon_srirat
              </p>
            </div>
          </div>
          {!isDownloading && !isApplying && (
            <button
              onClick={() => setIsUpdateModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Version Comparison Card */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-semibold text-slate-500 font-mono">Current Version</div>
              <div className="text-xs font-bold text-slate-300 font-mono">v{appVersion || '1.0.0'}</div>
            </div>

            <div className="p-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="space-y-0.5 text-right">
              <div className="text-[10px] uppercase font-semibold text-cyan-400 font-mono">New Version</div>
              <div className="text-xs font-bold text-cyan-300 font-mono">v{updateInfo.latestVersion || 'Latest'}</div>
            </div>
          </div>

          {/* Release Title & Details */}
          {updateInfo.releaseName && (
            <div className="text-sm font-semibold text-slate-200">
              {updateInfo.releaseName}
            </div>
          )}

          {/* Release Notes */}
          {updateInfo.releaseNotes && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>What's New in this Update:</span>
              </div>
              <div className="p-3 bg-black/40 border border-slate-800 rounded-xl text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto text-[11px]">
                {updateInfo.releaseNotes}
              </div>
            </div>
          )}

          {/* Download Progress Bar */}
          {isDownloading && (
            <div className="space-y-2 p-3.5 bg-indigo-950/20 border border-indigo-500/30 rounded-xl">
              <div className="flex items-center justify-between text-slate-200">
                <span className="font-semibold flex items-center gap-1.5 text-indigo-300">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  Downloading Update directly...
                </span>
                <span className="font-mono font-bold text-cyan-400">{updateProgress.percent}%</span>
              </div>

              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, updateProgress.percent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Speed: {updateProgress.speed || 'Calculating...'}</span>
                {updateProgress.total > 0 && (
                  <span>
                    {(updateProgress.transferred / (1024 * 1024)).toFixed(1)}MB / {(updateProgress.total / (1024 * 1024)).toFixed(1)}MB
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Ready State Notice */}
          {isReady && !isApplying && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2 text-emerald-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">ดาวน์โหลดเสร็จสมบูรณ์ พร้อมอัปเดตแล้ว!</span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed pl-6">
                เมื่อกด <strong>Restart & Apply Update</strong> ระบบจะปิดตัวเก่า ติดตั้งเวอร์ชันใหม่ และเปิดโปรแกรมขึ้นมาใหม่อัตโนมัติ พร้อมลบไฟล์แคชตัวติดตั้งเพื่อคืนพื้นที่ดิสก์
              </p>
            </div>
          )}

          {/* Applying / Restarting State */}
          {isApplying && (
            <div className="p-4 bg-cyan-950/40 border border-cyan-500/50 rounded-xl flex items-center gap-3 text-cyan-200 animate-pulse">
              <RotateCw className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
              <div>
                <div className="font-bold text-sm text-cyan-100">กำลังเปิดโปรแกรมติดตั้งและรีสตาร์ท...</div>
                <div className="text-[11px] text-cyan-300/80">NexusCoder กำลังเตรียมรีสตาร์ทเข้าสู่เวอร์ชันใหม่ กรุณารอสักครู่</div>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{updateInfo.error || 'An error occurred during update.'}</span>
            </div>
          )}

          {/* Cache Cleaning Notice */}
          {cleanNotice && (
            <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-300 text-[11px] flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>{cleanNotice}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            {!isDownloading && !isApplying && (
              <button
                type="button"
                disabled={isCleaning}
                onClick={handleCleanCache}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-[11px] text-slate-400 hover:text-rose-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Delete temporary update installer files from disk"
              >
                <Trash2 className="w-3 h-3 text-slate-500" />
                <span>{isCleaning ? 'Cleaning...' : 'Clear Temp Cache'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {!isDownloading && !isApplying && (
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
              >
                {isReady ? 'Later' : 'Cancel'}
              </button>
            )}

            {!isReady && !isDownloading && (
              <button
                onClick={startDownloadUpdate}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Update Now (1-Click)</span>
              </button>
            )}

            {isReady && !isApplying && (
              <button
                onClick={handleApplyUpdate}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Restart & Apply Update</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
