import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'nexuscoder.panelSizes.v1';

export const PANEL_DEFAULTS = {
  sidebar: 256,
  chat: 480,
  canvas: 500,
  terminal: 240
};

export const PANEL_LIMITS = {
  sidebar: { min: 180, max: 560 },
  chat: { min: 320, max: 900 },
  canvas: { min: 280, max: 900 },
  terminal: { min: 120, max: 700 }
};

function clamp(key, value) {
  const limit = PANEL_LIMITS[key];
  if (!limit) return value;
  return Math.min(limit.max, Math.max(limit.min, Math.round(value)));
}

function loadSizes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...PANEL_DEFAULTS };
    const parsed = JSON.parse(raw);
    const merged = { ...PANEL_DEFAULTS };
    for (const key of Object.keys(PANEL_DEFAULTS)) {
      if (typeof parsed[key] === 'number' && Number.isFinite(parsed[key])) {
        merged[key] = clamp(key, parsed[key]);
      }
    }
    return merged;
  } catch (e) {
    // Private windows / blocked storage: fall back to defaults.
    return { ...PANEL_DEFAULTS };
  }
}

export function usePanelSizes() {
  const [panelSizes, setPanelSizes] = useState(loadSizes);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panelSizes));
    } catch (e) { /* storage unavailable - sizes stay session-only */ }
  }, [panelSizes]);

  // Applies a pixel delta to one panel, clamped to its limits.
  const resizePanel = useCallback((key, delta) => {
    setPanelSizes(prev => {
      const next = clamp(key, (prev[key] ?? PANEL_DEFAULTS[key]) + delta);
      if (next === prev[key]) return prev;
      return { ...prev, [key]: next };
    });
  }, []);

  const resetPanel = useCallback((key) => {
    setPanelSizes(prev => ({ ...prev, [key]: PANEL_DEFAULTS[key] }));
  }, []);

  const resetAllPanels = useCallback(() => {
    setPanelSizes({ ...PANEL_DEFAULTS });
  }, []);

  // Keep panels usable if the window shrinks below what the saved sizes assume.
  useEffect(() => {
    const onResize = () => {
      setPanelSizes(prev => {
        const maxSide = Math.max(200, Math.floor(window.innerWidth * 0.45));
        const next = {
          ...prev,
          sidebar: Math.min(prev.sidebar, maxSide),
          chat: Math.min(prev.chat, maxSide),
          canvas: Math.min(prev.canvas, maxSide),
          terminal: Math.min(prev.terminal, Math.max(120, Math.floor(window.innerHeight * 0.7)))
        };
        const changed = Object.keys(next).some(k => next[k] !== prev[k]);
        return changed ? next : prev;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { panelSizes, resizePanel, resetPanel, resetAllPanels };
}
