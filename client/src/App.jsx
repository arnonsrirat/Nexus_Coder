import React from 'react';
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

export default function App() {
  const { activeDiff, panelSizes, resizePanel, resetPanel, theme } = useApp();

  const isGlassTheme = theme && theme !== 'default';

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

      {/* Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left: Project File Explorer & Diffs */}
        <div
          style={{ width: `${panelSizes.sidebar}px` }}
          className={`flex-shrink-0 h-full overflow-hidden ${isGlassTheme ? 'liquid-glass-container' : ''}`}
        >
          <Sidebar />
        </div>
        <ResizeHandle
          orientation="horizontal"
          onDelta={(dx) => resizePanel('sidebar', dx)}
          onDoubleClick={() => resetPanel('sidebar')}
          title="Resize file explorer"
        />

        {/* Center: Monaco Code Editor or Visual Diff Viewer */}
        <main className={`flex-1 flex flex-col h-full relative min-w-0 ${isGlassTheme ? 'bg-slate-950/40 backdrop-blur-md' : ''}`}>
          {activeDiff ? <DiffViewer /> : <CodeEditor />}
          <TerminalDrawer />
        </main>

        {/* Canvas Panel (Visual Plans, Live Previews, Artifacts) */}
        <CanvasPanel />

        {/* Right: AI Agent Interaction & Chat Stream */}
        <ResizeHandle
          orientation="horizontal"
          onDelta={(dx) => resizePanel('chat', -dx)}
          onDoubleClick={() => resetPanel('chat')}
          title="Resize chat panel"
        />
        <section
          style={{ width: `${panelSizes.chat}px` }}
          className={`flex-shrink-0 flex flex-col h-full z-0 overflow-hidden ${
            isGlassTheme ? 'liquid-glass-container' : 'bg-slate-950/90'
          }`}
        >
          <ChatContainer />
        </section>
      </div>

      {/* Global Modals */}
      <SettingsModal />
      <FolderPickerModal />
      <UpdateModal />
    </div>
  );
}
