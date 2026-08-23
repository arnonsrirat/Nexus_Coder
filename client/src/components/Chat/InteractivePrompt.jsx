import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Send, 
  Terminal, 
  FileEdit, 
  ShieldAlert, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function InteractivePrompt({ prompt }) {
  const { respondInteractivePrompt, saveSettings, autoApprove } = useApp();
  const [customText, setCustomText] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  if (!prompt) return null;

  const isAskUser = prompt.type === 'ask_user';
  const isApproval = prompt.type === 'action_approval';

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    respondInteractivePrompt(prompt.id, option);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    respondInteractivePrompt(prompt.id, customText);
    setCustomText('');
  };

  const handleApprove = () => {
    respondInteractivePrompt(prompt.id, 'approved');
  };

  const handleReject = () => {
    respondInteractivePrompt(prompt.id, 'rejected');
  };

  return (
    <div className="my-4 rounded-xl border border-indigo-500/50 bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950/90 p-4 shadow-xl shadow-indigo-950/50 backdrop-blur-md glow-box">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-500/20">
        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
          {isAskUser ? <HelpCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5 text-amber-400" />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            {isAskUser ? 'AI Requires Your Decision' : 'Action Approval Required'}
            <span className="px-2 py-0.5 text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 rounded-full font-mono">
              Interactive Prompt
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            {isAskUser
              ? 'Select one of the choices below or type your own instructions to guide the AI.'
              : 'Please review and approve this action before the AI executes it.'}
          </p>
        </div>
      </div>

      {/* Content: Ask User */}
      {isAskUser && (
        <div className="space-y-3">
          {/* Question */}
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-sm text-slate-200 font-medium whitespace-pre-wrap">
            {prompt.question}
          </div>

          {/* Clickable Option Cards */}
          {prompt.options && prompt.options.length > 0 && (
            <div className="grid grid-cols-1 gap-2 pt-1">
              {prompt.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(opt)}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 hover:bg-indigo-900/40 border border-slate-700/80 hover:border-indigo-400 text-left text-xs text-slate-200 group transition-all transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-200 group-hover:text-white">
                      {opt}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          )}

          {/* Custom Response Input */}
          {prompt.allowCustomInput !== false && (
            <form onSubmit={handleCustomSubmit} className="pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Or type custom instructions / answer here..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!customText.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all shadow-md shadow-indigo-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Content: Action Approval */}
      {isApproval && (
        <div className="space-y-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
            {prompt.toolName === 'run_command' && (
              <div>
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Terminal Command:</span>
                </div>
                <div className="p-2 bg-black/60 rounded text-slate-200">
                  {prompt.toolArgs?.command}
                </div>
              </div>
            )}

            {prompt.toolName === 'write_file' && (
              <div>
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Write / Overwrite File:</span>
                </div>
                <div className="text-slate-200">{prompt.toolArgs?.path}</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={!!autoApprove}
                onChange={(e) => saveSettings({ autoApprove: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
              />
              <span>Remember: Auto-approve future actions</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReject}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-medium rounded-lg border border-rose-500/30 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-emerald-600/30 transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve & Run</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
