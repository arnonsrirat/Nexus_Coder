import React from 'react';
import { useApp } from '../../context/AppContext';
import { FileDiff, X, Check, ArrowLeft } from 'lucide-react';

export default function DiffViewer() {
  const { activeDiff, setActiveDiff } = useApp();

  if (!activeDiff) return null;

  const lines = (activeDiff.diff || '').split('\n');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-xs font-mono overflow-hidden">
      {/* Diff Header */}
      <div className="h-10 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveDiff(null)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Back to editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <FileDiff className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">{activeDiff.path}</span>
          <span className="px-2 py-0.5 text-[10px] rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
            {activeDiff.action}
          </span>
        </div>

        <button
          onClick={() => setActiveDiff(null)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5 bg-black/40">
        {lines.map((line, idx) => {
          let bgClass = 'bg-transparent text-slate-400';
          let indicator = ' ';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            bgClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500';
            indicator = '+';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bgClass = 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500';
            indicator = '-';
          } else if (line.startsWith('@@')) {
            bgClass = 'bg-indigo-950/40 text-indigo-300 font-bold my-1 py-0.5 rounded';
          }

          return (
            <div
              key={idx}
              className={`px-3 py-0.5 whitespace-pre-wrap leading-relaxed ${bgClass}`}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
