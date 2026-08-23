import React, { useState } from 'react';
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
import ResizeHandle from './components/ResizeHandle';
import { 
  Folder, 
  Code2, 
  Bot, 
  GripVertical, 
  ChevronRight, 
  ChevronLeft, 
  Maximize2,
  Minimize2,
  Move
} from 'lucide-react';

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

  // Drag and Drop Layout Reordering State
  const [draggedKey, setDraggedKey] = useState(null);
  const [dropTargetKey, setDropTargetKey] = useState(null);

  const handleDragStart = (e, key) => {
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedKey(key);
  };

  const handleDragOver = (e, key) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedKey && draggedKey !== key) {
      setDropTargetKey(key);
    }
  };

  const handleDragLeave = (e, key) => {
    if (dropTargetKey === key) {
      setDropTargetKey(null);
    }
  };

  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    if (draggedKey && draggedKey !== targetKey) {
      movePanel(draggedKey, targetKey);
    }
    setDraggedKey(null);
    setDropTargetKey(null);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDropTargetKey(null);
  };

  // Render individual panel content
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

  const getPanelInfo = (key) => {
    switch (key) {
      case 'sidebar':
        return { name: 'Explorer', icon: <Folder className="w-3.5 h-3.5 text-cyan-400" /> };
      case 'editor':
        return { name: 'Code Editor', icon: <Code2 className="w-3.5 h-3.5 text-blue-400" /> };
      case 'chat':
        return { name: 'AI Chat', icon: <Bot className="w-3.5 h-3.5 text-purple-400" /> };
      default:
        return { name: key, icon: <Move className="w-3.5 h-3.5" /> };
    }
  };

  // Find the primary stretch panel (default: editor if visible, otherwise the middle or first visible)
  const visiblePanels = (panelOrder || ['sidebar', 'editor', 'chat']).filter(k => panelVisibility[k] !== false);
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
        {(panelOrder || ['sidebar', 'editor', 'chat']).map((key, index) => {
          const isVisible = panelVisibility[key] !== false;
          const isTarget = dropTargetKey === key;
          const isDragging = draggedKey === key;
          const panelInfo = getPanelInfo(key);
          const isPrimary = key === primaryFlexKey;

          // Collapsed Dock Strip
          if (!isVisible) {
            return (
              <div
                key={key}
                draggable
                onDragStart={(e) => handleDragStart(e, key)}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={(e) => handleDragLeave(e, key)}
                onDrop={(e) => handleDrop(e, key)}
                onDragEnd={handleDragEnd}
                onClick={() => togglePanelVisibility(key)}
                className={`w-9 flex-shrink-0 h-full border-r border-slate-800 bg-slate-950/90 hover:bg-slate-900/90 cursor-pointer flex flex-col items-center py-3 transition-colors relative group select-none ${
                  isTarget ? 'ring-2 ring-cyan-400 bg-cyan-950/40' : ''
                } ${isDragging ? 'opacity-40' : ''}`}
                title={`Click to expand ${panelInfo.name} · Drag to reposition`}
              >
                {/* Drag Handle */}
                <div className="p-1 text-slate-600 group-hover:text-slate-400 cursor-grab mb-2">
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
                style={isPrimary ? undefined : { width: panelWidth }}
                className={`flex flex-col h-full overflow-hidden relative ${
                  isPrimary ? 'flex-1 min-w-0' : 'flex-shrink-0'
                } ${isGlassTheme ? 'liquid-glass-container' : 'bg-slate-950'} ${
                  isTarget ? 'ring-2 ring-cyan-400/80 shadow-xl shadow-cyan-500/20' : ''
                } ${isDragging ? 'opacity-40 scale-[0.99]' : ''}`}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={(e) => handleDragLeave(e, key)}
                onDrop={(e) => handleDrop(e, key)}
              >
                {/* Subtle Draggable Header Grip Indicator */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, key)}
                  onDragEnd={handleDragEnd}
                  className="h-1.5 w-full bg-slate-900/60 hover:bg-cyan-500/30 cursor-grab active:cursor-grabbing transition-colors flex items-center justify-center group"
                  title={`Drag header to reposition ${panelInfo.name} column`}
                >
                  <div className="w-12 h-1 rounded-full bg-slate-700/50 group-hover:bg-cyan-400/80 transition-colors" />
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

              {/* Dynamic Resizer Handle between visible panels */}
              {index < (panelOrder || []).length - 1 && (
                <ResizeHandle
                  orientation="horizontal"
                  onDelta={(dx) => {
                    // If resizing the left panel, positive dx expands; if right panel, negative dx expands
                    const delta = index === 0 ? dx : -dx;
                    resizePanel(key, delta);
                  }}
                  onDoubleClick={() => resetPanel(key)}
                  title={`Resize ${panelInfo.name} panel`}
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
    </div>
  );
}
