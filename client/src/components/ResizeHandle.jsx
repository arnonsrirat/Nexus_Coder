import React, { useCallback, useRef, useState } from 'react';

/**
 * A draggable divider between layout panels.
 *
 * Uses pointer capture so the drag keeps tracking even when the cursor moves
 * over the Monaco editor or an iframe, and disables text/iframe hit-testing
 * while dragging so the pointer never gets "stolen" mid-drag.
 *
 * @param {'horizontal'|'vertical'} orientation - 'horizontal' resizes width
 *        (a vertical bar you drag left/right), 'vertical' resizes height.
 * @param {(delta:number)=>void} onDelta - called with the pixel delta along
 *        the resize axis. The caller applies the sign it needs.
 * @param {()=>void} [onDoubleClick] - typically resets the panel to default.
 */
export default function ResizeHandle({ orientation = 'horizontal', onDelta, onDoubleClick, title }) {
  const [active, setActive] = useState(false);
  const lastRef = useRef(0);
  // Mirrors `active` in a ref: the pointermove handler must not depend on a
  // state update having been committed, or the first few pixels of a fast drag
  // are dropped and the divider feels stuck.
  const activeRef = useRef(false);

  const isHorizontal = orientation === 'horizontal';

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    lastRef.current = isHorizontal ? e.clientX : e.clientY;
    activeRef.current = true;
    setActive(true);
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [isHorizontal]);

  const handlePointerMove = useCallback((e) => {
    if (!activeRef.current) return;
    const current = isHorizontal ? e.clientX : e.clientY;
    const delta = current - lastRef.current;
    if (delta !== 0) {
      lastRef.current = current;
      onDelta(delta);
    }
  }, [isHorizontal, onDelta]);

  const endDrag = useCallback((e) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    setActive(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
      title={title || 'Drag to resize · double-click to reset'}
      className={
        (isHorizontal
          ? 'w-1 h-full cursor-col-resize flex-shrink-0'
          : 'h-1 w-full cursor-row-resize flex-shrink-0') +
        ' relative group z-20 transition-colors ' +
        (active ? 'bg-cyan-500' : 'bg-slate-800 hover:bg-cyan-600/70')
      }
    >
      {/* Widened invisible hit area so the divider is easy to grab. */}
      <span
        className={
          isHorizontal
            ? 'absolute inset-y-0 -left-1.5 -right-1.5'
            : 'absolute inset-x-0 -top-1.5 -bottom-1.5'
        }
      />
      {/* Full-screen shield: keeps the pointer out of iframes/editors mid-drag. */}
      {active && <span className="fixed inset-0 z-50" style={{ cursor: isHorizontal ? 'col-resize' : 'row-resize' }} />}
    </div>
  );
}
