import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SplitterBar } from './SplitterBar';

export type DockPreset = 'editor-with-converter';

type DockLayoutProps = {
  preset: DockPreset;
  left: ReactNode;
  right: ReactNode;
};

/** Pixels to reserve for the splitter bar itself. */
const SPLITTER_WIDTH = 8;
/** Minimum panel width in pixels. */
const MIN_PANEL_PX = 280;
/** Default left-panel percentage (editor). */
const DEFAULT_LEFT_PCT = 65;
/** Narrow-screen breakpoint — below this we stack vertically. */
const NARROW_BREAKPOINT = 1180;

/**
 * Preset-driven dock layout.
 *
 * On wide viewports (> 1180 px) renders two horizontal panels separated by a
 * draggable splitter.  On narrow viewports the panels stack vertically with
 * no splitter.
 *
 * Panel widths are stored as a percentage of the container width (UI state
 * only — never persisted to ScreenplayDocument).
 */
export function DockLayout({ preset: _preset, left, right }: DockLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(DEFAULT_LEFT_PCT);
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= NARROW_BREAKPOINT,
  );

  // Observe viewport width for responsive switching.
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= NARROW_BREAKPOINT);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleResize = useCallback(
    (deltaX: number) => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.getBoundingClientRect().width;
      const availableWidth = containerWidth - SPLITTER_WIDTH;
      const currentLeftPx = (leftPct / 100) * availableWidth;
      const newLeftPx = Math.max(
        MIN_PANEL_PX,
        Math.min(availableWidth - MIN_PANEL_PX, currentLeftPx + deltaX),
      );
      setLeftPct((newLeftPx / availableWidth) * 100);
    },
    [leftPct],
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-h-0 overflow-hidden p-4 gap-0"
      data-dock-preset={_preset}
    >
      {isNarrow ? (
        /* ── Narrow: stacked vertically ── */
        <div className="flex flex-col flex-1 min-h-0 gap-3 overflow-auto">
          <div className="min-h-[360px] flex-shrink-0">{left}</div>
          <div className="min-h-[380px] flex-1">{right}</div>
        </div>
      ) : (
        /* ── Wide: side-by-side with splitter ── */
        <>
          <div
            className="flex flex-col min-h-0 min-w-0 gap-3 overflow-hidden"
            style={{ flex: `0 0 ${leftPct}%` }}
          >
            {left}
          </div>
          <SplitterBar onResize={handleResize} />
          <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">{right}</div>
        </>
      )}
    </div>
  );
}
