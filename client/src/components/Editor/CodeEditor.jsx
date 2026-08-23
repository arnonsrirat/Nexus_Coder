import React, { Suspense, lazy } from 'react';
import { useApp } from '../../context/AppContext';
import FileTabs from './FileTabs';
import { Code2, Loader2 } from 'lucide-react';

// Monaco weighs several MB - load it only when a file is actually opened.
const MonacoEditor = lazy(() => import('./MonacoEditor'));

function getLanguageFromPath(filePath) {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'md':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bat':
      return 'shell';
    case 'yml':
    case 'yaml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export default function CodeEditor() {
  const { activeTabs, activeTabPath, updateTabContent, saveActiveFile, theme } = useApp();

  const currentTab = activeTabs.find(t => t.path === activeTabPath);

  const handleEditorChange = (value) => {
    if (activeTabPath && value !== undefined) {
      updateTabContent(activeTabPath, value);
    }
  };

  const handleEditorMount = (editor, monaco) => {
    // Add save command Ctrl+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveFile();
    });
  };

  if (!currentTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/80 text-slate-500 font-mono text-xs">
        <Code2 className="w-10 h-10 text-slate-700 mb-2" />
        <p>No file open in editor.</p>
        <p className="text-[11px] text-slate-600 mt-1">Select a file from the sidebar to inspect or edit.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      <FileTabs />
      <div className="flex-1 relative">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-slate-500 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
              Loading editor...
            </div>
          }
        >
          <MonacoEditor
            height="100%"
            language={getLanguageFromPath(currentTab.path)}
            value={currentTab.content}
            theme="vs-dark"
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 13,
              fontFamily: 'Consolas, "Courier New", monospace',
              // The minimap re-renders the whole file on every keystroke;
              // off by default keeps typing smooth and saves CPU/RAM in large files.
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              tabSize: 2,
              stopRenderingLineAfter: 4000,
              automaticLayout: true,
              fixedOverflowWidgets: true
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
