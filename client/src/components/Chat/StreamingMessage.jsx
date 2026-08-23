import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useAgentStream } from '../../context/AppContext';

/**
 * The assistant answer while it is still arriving.
 *
 * Two deliberate choices keep long answers smooth:
 *  - it subscribes to the stream context alone, so a token never re-renders
 *    the transcript, the editor or the sidebar;
 *  - it renders the partial text as plain text instead of Markdown. Re-parsing
 *    a growing document ~12x/second was the main source of the typing lag.
 *    The finished message is re-rendered as full Markdown on stream_end.
 */
export default function StreamingMessage() {
  const { streamData } = useAgentStream();
  const content = streamData?.content || '';
  const endRef = useRef(null);

  useEffect(() => {
    if (!content) return;
    const node = endRef.current;
    if (!node) return;
    const scroller = node.closest('.chat-scroll');
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [content]);

  if (!content) return null;

  return (
    <div className="flex gap-3 group animate-in fade-in duration-150">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
        <Sparkles className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-2">
          <span>NexusCoder</span>
          <span className="text-cyan-400/80 font-normal">typing…</span>
        </div>

        <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words font-sans select-text selectable-text">
          {content}
          <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 bg-cyan-400/80 animate-pulse rounded-sm" />
        </div>
      </div>

      <div ref={endRef} />
    </div>
  );
}
