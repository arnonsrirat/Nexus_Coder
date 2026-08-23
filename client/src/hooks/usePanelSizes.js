import { useCallback, useEffect, useState } from 'react';

const STORAGE_SIZES_KEY = 'nexuscoder.panelSizes.v2';
const STORAGE_ORDER_KEY = 'nexuscoder.panelOrder.v2';
const STORAGE_VISIBILITY_KEY = 'nexuscoder.panelVisibility.v2';

export const PANEL_DEFAULTS = {
  sidebar: 256,
  chat: 480,
  canvas: 500,
  terminal: 240
};

export const DEFAULT_PANEL_ORDER = ['sidebar', 'editor', 'chat'];

export const DEFAULT_PANEL_VISIBILITY = {
  sidebar: true,
  editor: true,
  chat: true,
  canvas: true,
  terminal: false
};

export const PANEL_LIMITS = {
  sidebar: { min: 180, max: 560 },
  chat: { min: 300, max: 950 },
  canvas: { min: 280, max: 900 },
  terminal: { min: 120, max: 700 }
};

function clamp(key, value) {
  const limit = PANEL_LIMITS[key];
  if (!limit) return value;
  return Math.min(limit.max, Math.max(limit.min, Math.round(value)));
}

function loadStoredSizes() {
  try {
    const raw = localStorage.getItem(STORAGE_SIZES_KEY);
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
    return { ...PANEL_DEFAULTS };
  }
}

function loadStoredOrder() {
  try {
    const raw = localStorage.getItem(STORAGE_ORDER_KEY);
    if (!raw) return [...DEFAULT_PANEL_ORDER];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all default panels exist in the order array
      const valid = parsed.filter(k => DEFAULT_PANEL_ORDER.includes(k));
      for (const k of DEFAULT_PANEL_ORDER) {
        if (!valid.includes(k)) valid.push(k);
      }
      return valid;
    }
    return [...DEFAULT_PANEL_ORDER];
  } catch (e) {
    return [...DEFAULT_PANEL_ORDER];
  }
}

function loadStoredVisibility() {
  try {
    const raw = localStorage.getItem(STORAGE_VISIBILITY_KEY);
    if (!raw) return { ...DEFAULT_PANEL_VISIBILITY };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PANEL_VISIBILITY,
      ...parsed
    };
  } catch (e) {
    return { ...DEFAULT_PANEL_VISIBILITY };
  }
}

export function usePanelSizes() {
  const [panelSizes, setPanelSizes] = useState(loadStoredSizes);
  const [panelOrder, setPanelOrder] = useState(loadStoredOrder);
  const [panelVisibility, setPanelVisibilityState] = useState(loadStoredVisibility);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIZES_KEY, JSON.stringify(panelSizes));
    } catch (e) {}
  }, [panelSizes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(panelOrder));
    } catch (e) {}
  }, [panelOrder]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VISIBILITY_KEY, JSON.stringify(panelVisibility));
    } catch (e) {}
  }, [panelVisibility]);

  // Resize a specific panel
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

  // Toggle or set panel visibility (collapse / expand)
  const togglePanelVisibility = useCallback((key) => {
    setPanelVisibilityState(prev => {
      const nextVal = !prev[key];
      // Keep at least one main panel visible
      if (!nextVal) {
        const visibleCount = ['sidebar', 'editor', 'chat'].filter(k => k === key ? false : prev[k]).length;
        if (visibleCount === 0) return prev;
      }
      return { ...prev, [key]: nextVal };
    });
  }, []);

  const setPanelVisibility = useCallback((key, isVisible) => {
    setPanelVisibilityState(prev => ({ ...prev, [key]: Boolean(isVisible) }));
  }, []);

  // Reorder panels via drag & drop
  const movePanel = useCallback((sourceKey, targetKey) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    setPanelOrder(prev => {
      const fromIndex = prev.indexOf(sourceKey);
      const toIndex = prev.indexOf(targetKey);
      if (fromIndex === -1 || toIndex === -1) return prev;

      // Remove first, then resolve the target's *new* index. Splicing at the
      // pre-removal index shifted every rightward move one slot too far left,
      // which is why dropping a column on its right neighbour looked like it
      // did nothing.
      const next = prev.filter(k => k !== sourceKey);
      const targetIndex = next.indexOf(targetKey);
      const insertAt = fromIndex < toIndex ? targetIndex + 1 : targetIndex;
      next.splice(insertAt, 0, sourceKey);
      return next;
    });
  }, []);

  const reorderPanels = useCallback((newOrder) => {
    if (Array.isArray(newOrder) && newOrder.length > 0) {
      setPanelOrder(newOrder);
    }
  }, []);

  // Reset entire layout to default
  const resetLayout = useCallback(() => {
    setPanelSizes({ ...PANEL_DEFAULTS });
    setPanelOrder([...DEFAULT_PANEL_ORDER]);
    setPanelVisibilityState({ ...DEFAULT_PANEL_VISIBILITY });
  }, []);

  // Window resize bounds clamping
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

  return {
    panelSizes,
    panelOrder,
    panelVisibility,
    resizePanel,
    resetPanel,
    resetAllPanels,
    togglePanelVisibility,
    setPanelVisibility,
    movePanel,
    reorderPanels,
    resetLayout
  };
}
