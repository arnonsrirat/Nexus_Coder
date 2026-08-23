import React from 'react';

// A render-time exception anywhere in the tree used to unmount the entire app
// and leave an empty black window with no explanation. This keeps the failure
// visible and recoverable instead.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('NexusCoder render error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 p-8">
        <div className="max-w-lg w-full space-y-4 text-center">
          <h1 className="text-lg font-bold text-rose-300">Something broke while rendering</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The rest of NexusCoder is still running. Reload to recover — if it keeps
            happening, press F12 and copy the console output.
          </p>
          <pre className="text-left text-[11px] font-mono text-rose-200 bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 overflow-auto max-h-56 whitespace-pre-wrap">
            {error?.message || String(error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Reload NexusCoder
          </button>
        </div>
      </div>
    );
  }
}
