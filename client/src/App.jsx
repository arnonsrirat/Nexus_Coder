import React, { useCallback, useRef, useState } from 'react';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatContainer from './components/Chat/ChatContainer';
import CodeEditor from './components/Editor/CodeEditor';
import DiffViewer from './components/Editor/DiffViewer';
import TerminalDrawer from './components/Terminal/TerminalDrawer';
import CanvasPanel from './components/Canvas/CanvasPanel';
import SettingsModal from './components/Modals/SettingsModal';
import FolderPickerModal from './components/Modals/FolderPickerModal';
import UpdateModal from './components/Modals/UpdateModal';
import NewSessionModal from './components/Modals/NewSessionModal';
import McpModal from './components/Modals/McpModal';
import SkillsModal from './components/Modals/SkillsModal';
import ResizeHandle from './components/ResizeHandle';
import {
  Folder,
  Code2,
  Bot,
  GripVertical,
  ChevronRight,
  ChevronsLeft,
  Move
} from 'lucide-react';

const PANEL_META = {
  sidebar: { name: 'Explorer', icon: <Folder className="w-3.5 h-3.5 text-cyan-400" /> },
  editor: { name: 'Code Editor', icon: <Code2 className="w-3.5 h-3.5 text-blue-400" /> },
  chat: { name: 'AI Chat', icon: <Bot className="w-3.5 h-3.5 text-purple-400" /> }
};

function getPanelInfo(key) {
  return PANEL_META[key] || { name: key, icon: <Move className="w-3.5 h-3.5" /> };
}

export default function App() {
  const {
    activeDiff,
    panelSizes,
    panelOrder,
    panelVisibility,
    resizePanel,
    resetPanel,
    movePanel,
    togglePanelVisibility,
    theme
  } = useApp();

  const isGlassTheme = theme && theme !== 'default';

  // ── Column reordering ────────────────────────────────────────────────────
  // Pointer events, not HTML5 drag-and-drop. The old implementation dropped
  // drags constantly: Monaco, the terminal and the chat form all swallow
  // dragover/drop, and a drag that starts over any of them never reaches the
  // layout. Pointer capture keeps every move event coming to us instead.
  const [draggedKey, setDraggedKey] = useState(null);
  const [dropTargetKey, setDropTargetKey] = useState(null);
  const panelRefs = useRef({});
  const dragRef = useRef(null);

  const order = panelOrder || ['sidebar', 'editor', 'chat'];

  const findKeyAtPoint = useCallback((clientX) => {
    for (const [key, node] of Object.entries(panelRefs.current)) {
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return key;
    }
    return null;
  }, []);

  const handleGripPointerDown = useCallback((e, key) => {
    // Left button / primary touch only.
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { key, startX: e.clientX, pointerId: e.pointerId, moved: false };
  }, []);

  const handleGripPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (!drag.moved) {
      // Small threshold so a plain click on the grip is not treated as a drag.
      if (Math.abs(e.clientX - drag.startX) < 5) return;
      drag.moved = true;
      setDraggedKey(drag.key);
      document.body.style.cursor = 'grabbing';
    }

    const overKey = findKeyAtPoint(e.clientX);
    setDropTargetKey(overKey && overKey !== drag.key ? overKey : null);
  }, [findKeyAtPoint]);

  const endGripDrag = useCallback((e) => {
    const drag = dragRef.current;
    dragRef.current = null;
    document.body.style.cursor = '';

    try {
      if (e && e.pointerId !== undefined) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) { /* already released */ }

    if (drag && drag.moved && e) {
      const overKey = findKeyAtPoint(e.clientX);
      if (overKey && overKey !== drag.key) movePanel(drag.key, overKey);
    }

    setDraggedKey(null);
    setDropTargetKey(null);
  }, [findKeyAtPoint, movePanel]);

  const gripHandlers = (key) => ({
    onPointerDown: (e) => handleGripPointerDown(e, key),
    onPointerMove: handleGripPointerMove,
    onPointerUp: endGripDrag,
    onPointerCancel: endGripDrag
  });

  // ── Panel content ────────────────────────────────────────────────────────
  const renderPanelContent = (key) => {
    switch (key) {
      case 'sidebar':
        return <Sidebar />;
      case 'editor':
        return (
          <main className={`flex-1 flex flex-col h-full relative min-w-0 ${isGlassTheme ? 'bg-slate-950/40 backdrop-blur-md' : ''}`}>
            {activeDiff ? <DiffViewer /> : <CodeEditor />}
            <TerminalDrawer />
          </main>
        );
      case 'chat':
        return <ChatContainer />;
      default:
        return null;
    }
  };

  const visiblePanels = order.filter(k => panelVisibility[k] !== false);
  const primaryFlexKey = visiblePanels.includes('editor') ? 'editor' : (visiblePanels[0] || 'editor');

  return (
    <div className={`h-screen w-screen flex flex-col text-slate-100 overflow-hidden font-sans select-none relative ${
      isGlassTheme ? 'bg-[#070913]' : 'bg-slate-950'
    }`}>
      {/* Ambient Liquid Orbs for Liquid Glass Themes */}
      {isGlassTheme && (
        <div className="liquid-ambient-canvas">
          <div className="liquid-orb liquid-orb-1" />
          <div className="liquid-orb liquid-orb-2" />
          <div className="liquid-orb liquid-orb-3" />
        </div>
      )}

      {/* Top Navbar */}
      <Header />

      {/* Main Studio Workspace with Drag-and-Drop & Collapsible Panels */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {order.map((key) => {
          const isVisible = panelVisibility[key] !== false;
          const isTarget = dropTargetKey === key;
          const isDragging = draggedKey === key;
          const panelInfo = getPanelInfo(key);
          const isPrimary = key === primaryFlexKey;
          const visibleIndex = visiblePanels.indexOf(key);
          const nextVisibleKey = visibleIndex === -1 ? null : visiblePanels[visibleIndex + 1];

          // Collapsed Dock Strip
          if (!isVisible) {
            return (
              <div
                key={key}
                ref={(node) => { panelRefs.current[key] = node; }}
                onClick={() => togglePanelVisibility(key)}
                className={`w-9 flex-shrink-0 h-full border-r border-slate-800 bg-slate-950/90 hover:bg-slate-900/90 cursor-pointer flex flex-col items-center py-3 transition-colors relative group select-none ${
                  isTarget ? 'ring-2 ring-cyan-400 bg-cyan-950/40' : ''
                } ${isDragging ? 'opacity-40' : ''}`}
                title={`Click to expand ${panelInfo.name} · Drag the grip to reposition`}
              >
                {/* Drag Handle */}
                <div
                  {...gripHandlers(key)}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing mb-2 touch-none"
                  title={`Drag to reposition ${panelInfo.name}`}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Panel Icon */}
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-cyan-500/50 mb-3 text-slate-300">
                  {panelInfo.icon}
                </div>

                {/* Vertical Label */}
                <div
                  className="text-[11px] font-medium text-slate-400 group-hover:text-cyan-300 tracking-wider flex-1 flex items-center justify-center font-mono"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {panelInfo.name}
                </div>

                {/* Unfold Button */}
                <div className="mt-auto p-1 rounded hover:bg-slate-800 text-slate-500 group-hover:text-cyan-400 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          }

          // Visible Panel Container
          const panelWidth = isPrimary ? undefined : `${panelSizes[key] || 320}px`;

          return (
            <React.Fragment key={key}>
              <div
                ref={(node) => { panelRefs.current[key] = node; }}
                style={isPrimary ? undefined : { width: panelWidth }}
                className={`flex flex-col h-full overflow-hidden relative ${
                  isPrimary ? 'flex-1 min-w-0' : 'flex-shrink-0'
                } ${isGlassTheme ? 'liquid-glass-container' : 'bg-slate-950'} ${
                  isTarget ? 'ring-2 ring-cyan-400/80 shadow-xl shadow-cyan-500/20' : ''
                } ${isDragging ? 'opacity-40 scale-[0.99]' : ''}`}
              >
                {/* Panel chrome: drag grip, title, fold button */}
                <div className="h-6 flex-shrink-0 flex items-center gap-1.5 px-1.5 bg-slate-900/70 border-b border-slate-800/80 text-slate-400 select-none">
                  <div
                    {...gripHandlers(key)}
                    className="flex items-center gap-1 px-0.5 py-1 rounded cursor-grab active:cursor-grabbing hover:text-cyan-300 hover:bg-slate-800/70 transition-colors touch-none"
                    title={`Drag to reposition ${panelInfo.name} · ลากเพื่อสลับตำแหน่ง`}
                  >
                    <GripVertical className="w-3 h-3" />
                  </div>

                  {panelInfo.icon}

                  <span className="text-[10px] font-semibold uppercase tracking-wider truncate">
                    {panelInfo.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => togglePanelVisibility(key)}
                    className="ml-auto p-0.5 rounded hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                    title={`Fold ${panelInfo.name} · พับเก็บแผงนี้`}
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {renderPanelContent(key)}
                </div>

                {/* Drop Highlight Overlay */}
                {isTarget && (
                  <div className="absolute inset-0 bg-cyan-950/30 border-2 border-cyan-400 border-dashed rounded-xl z-50 pointer-events-none flex items-center justify-center backdrop-blur-[2px] animate-pulse">
                    <div className="px-3 py-1.5 rounded-lg bg-cyan-900/90 border border-cyan-400 text-cyan-200 font-semibold text-xs shadow-xl flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5" />
                      <span>วางที่นี่เพื่อสลับตำแหน่ง (Drop to move)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resizer between two visible panels. The flexible (primary)
                  column has no explicit width, so always resize its neighbour. */}
              {nextVisibleKey && (
                <ResizeHandle
                  orientation="horizontal"
                  onDelta={(dx) => {
                    if (!isPrimary) resizePanel(key, dx);
                    else resizePanel(nextVisibleKey, -dx);
                  }}
                  onDoubleClick={() => resetPanel(isPrimary ? nextVisibleKey : key)}
                  title={`Resize ${isPrimary ? getPanelInfo(nextVisibleKey).name : panelInfo.name} panel`}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Floating Canvas Panel (Visual Plans & Previews) */}
        <CanvasPanel />
      </div>

      {/* Global Modals */}
      <SettingsModal />
      <FolderPickerModal />
      <UpdateModal />
      <NewSessionModal />
      <McpModal />
      <SkillsModal />
    </div>
  );
}
