import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ResizeHandle from '../ResizeHandle';
import { 
  Layout, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Code2, 
  FileText, 
  Eye, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Sparkles, 
  ListChecks,
  Layers,
  X
} from 'lucide-react';

export default function CanvasPanel() {
  const { 
    activePlan, 
    activeCanvas, 
    isCanvasOpen, 
    setIsCanvasOpen, 
    canvasViewMode,
    setCanvasViewMode,
    panelSizes,
    resizePanel,
    resetPanel
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isCanvasOpen && !activePlan && !activeCanvas) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCompletedCount = () => {
    if (!activePlan?.steps) return 0;
    return activePlan.steps.filter(s => s.status === 'completed').length;
  };

  const totalSteps = activePlan?.steps?.length || 0;
  const completedSteps = getCompletedCount();
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <>
      {/* Divider is only meaningful while the canvas is docked. */}
      {!isFullscreen && (
        <ResizeHandle
          orientation="horizontal"
          onDelta={(dx) => resizePanel('canvas', -dx)}
          onDoubleClick={() => resetPanel('canvas')}
          title="Resize canvas panel"
        />
      )}
    <div
      style={isFullscreen ? undefined : { width: `${panelSizes.canvas}px` }}
      className={`border-l border-slate-800 bg-slate-950 flex flex-col z-10 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'flex-shrink-0 h-full'
      }`}>
      {/* Canvas Top Bar */}
      <div className="h-11 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Layout className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs bg-gradient-to-r from-cyan-400 to-indigo-300 bg-clip-text text-transparent">
            Interactive Canvas
          </span>

          {activePlan && (
            <span className="px-2 py-0.5 text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/40 rounded-full font-mono">
              Plan: {completedSteps}/{totalSteps}
            </span>
          )}
        </div>

        {/* View Mode Tabs & Controls */}
        <div className="flex items-center gap-1.5">
          {activePlan && (
            <button
              onClick={() => setCanvasViewMode('plan')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                canvasViewMode === 'plan'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 inline mr-1" />
              Plan
            </button>
          )}

          {activeCanvas && (
            <button
              onClick={() => setCanvasViewMode('artifact')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                canvasViewMode === 'artifact'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Artifact
            </button>
          )}

          {activeCanvas?.type === 'html_preview' && (
            <button
              onClick={() => setCanvasViewMode('preview')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                canvasViewMode === 'preview'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1" />
              Preview
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsCanvasOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
            title="Close Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs select-text">
        {/* VIEW 1: Visual Plan Timeline */}
        {canvasViewMode === 'plan' && activePlan && (
          <div className="space-y-4">
            {/* Plan Header & Progress Bar */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {activePlan.title}
                </h3>
                <span className="font-mono text-xs text-indigo-300 font-bold">
                  {progressPercent}%
                </span>
              </div>

              {activePlan.summary && (
                <p className="text-slate-300 text-xs mb-3 leading-relaxed">
                  {activePlan.summary}
                </p>
              )}

              {/* Progress track */}
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Checklist of Steps */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Execution Steps:
              </div>

              {activePlan.steps?.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isInProgress = step.status === 'in_progress';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-slate-900/60 border-emerald-500/40 text-slate-300'
                        : isInProgress
                        ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md shadow-indigo-950/50 glow-box'
                        : 'bg-slate-900/30 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isInProgress ? (
                          <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold text-xs ${
                            isCompleted ? 'line-through text-slate-400' : isInProgress ? 'text-indigo-200' : 'text-slate-300'
                          }`}>
                            {idx + 1}. {step.title}
                          </span>

                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono uppercase font-bold ${
                            isCompleted
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : isInProgress
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40 animate-pulse'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {step.status || 'pending'}
                          </span>
                        </div>

                        {step.description && (
                          <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: Artifact / Markdown Document */}
        {canvasViewMode === 'artifact' && activeCanvas && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                {activeCanvas.title}
              </h3>
              <button
                onClick={() => handleCopy(activeCanvas.content)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 bg-slate-900 rounded border border-slate-800 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeCanvas.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* VIEW 3: Live HTML Preview */}
        {canvasViewMode === 'preview' && activeCanvas && (
          <div className="h-full flex flex-col">
            <div className="text-[11px] text-slate-400 mb-2 font-mono">
              Live Sandboxed Preview:
            </div>
            <iframe
              srcDoc={activeCanvas.content}
              title={activeCanvas.title}
              sandbox="allow-scripts"
              className="w-full flex-1 min-h-[450px] bg-white rounded-xl border border-slate-800 shadow-2xl"
            />
          </div>
        )}

        {!activePlan && !activeCanvas && (
          <div className="text-center p-8 text-slate-500 font-mono">
            No active plan or canvas artifact open.
          </div>
        )}
      </div>
    </div>
    </>
  );
}
