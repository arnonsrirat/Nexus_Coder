import React, { useState } from 'react';
import { 
  FileText, 
  FileEdit, 
  Terminal, 
  FolderSearch, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

export default function ToolCallCard({ toolName, args, result }) {
  const [isOpen, setIsOpen] = useState(false);

  const getToolInfo = () => {
    switch (toolName) {
      case 'read_file':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-blue-400" />,
          label: 'Read File',
          target: args?.path || result?.path || ''
        };
      case 'write_file':
        return {
          icon: <FileEdit className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Write File',
          target: args?.path || result?.path || ''
        };
      case 'apply_diff':
        return {
          icon: <FileEdit className="w-3.5 h-3.5 text-indigo-400" />,
          label: 'Patch Code',
          target: args?.path || result?.path || ''
        };
      case 'list_dir':
        return {
          icon: <FolderSearch className="w-3.5 h-3.5 text-amber-400" />,
          label: 'List Directory',
          target: args?.path || '.'
        };
      case 'search_code':
        return {
          icon: <Search className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Search Code',
          target: `"${args?.query || ''}"`
        };
      case 'run_command':
        return {
          icon: <Terminal className="w-3.5 h-3.5 text-orange-400" />,
          label: 'Terminal Command',
          target: args?.command || result?.command || ''
        };
      default:
        return {
          icon: <FileText className="w-3.5 h-3.5 text-slate-400" />,
          label: toolName,
          target: ''
        };
    }
  };

  const info = getToolInfo();
  const hasError = result?.error;

  return (
    <div className="my-1.5 rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden text-xs">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {info.icon}
          <span className="font-semibold text-slate-300">{info.label}:</span>
          <span className="font-mono text-slate-400 truncate max-w-xs">{info.target}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {result ? (
            hasError ? (
              <span className="flex items-center gap-1 text-rose-400 text-[10px] font-semibold">
                <AlertTriangle className="w-3 h-3" /> Error
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
                <Check className="w-3 h-3" /> Success
              </span>
            )
          ) : (
            <span className="text-[10px] text-slate-500 italic">Running...</span>
          )}

          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-3 bg-black/40 border-t border-slate-800 text-[11px] font-mono overflow-x-auto max-h-60">
          {args && (
            <div className="mb-2">
              <span className="text-slate-500 font-bold uppercase text-[9px] block mb-1">Arguments:</span>
              <pre className="text-slate-300 whitespace-pre-wrap">{JSON.stringify(args, null, 2)}</pre>
            </div>
          )}
          {result && (
            <div>
              <span className="text-slate-500 font-bold uppercase text-[9px] block mb-1">Output / Result:</span>
              <pre className={`whitespace-pre-wrap ${hasError ? 'text-rose-400' : 'text-slate-300'}`}>
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
