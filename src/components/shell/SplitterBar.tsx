import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/** Pixels to nudge per keyboard arrow press. */
const KB_STEP = 40;

type SplitterBarProps = {
  /** Called with pixel delta from the drag start position. */
  onResize: (deltaX: number) => void;
};

/**
 * Thin vertical resize handle between two horizontal panels.
 *
 * Supports mouse, touch (via pointer events), and keyboard (ArrowLeft /
 * ArrowRight) resizing.  Drag draws a ghost guide line teleported to
 * `document.body` so layout is not affected while the handle is active.
 *
 * Pattern borrowed from KMD's SplitterBar but simplified for a single
 * two-panel split.
 */
export function SplitterBar({ onResize }: SplitterBarProps) {
  const [dragging, setDragging] = useState(false);
  const [ghostX, setGhostX] = useState(0);
  const startXRef = useRef(0);

  // ── Pointer ──────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only respond to primary pointer (mouse left / first touch).
    if (e.pointerId !== 0 && e.pointerType !== 'mouse') return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    setGhostX(e.clientX);
    setDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setGhostX(e.clientX);
    },
    [dragging],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      const deltaX = e.clientX - startXRef.current;
      onResize(deltaX);
      setDragging(false);
    },
    [dragging, onResize],
  );

  // Prevent text selection while dragging.
  useEffect(() => {
    if (dragging) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging]);

  // ── Keyboard ─────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onResize(KB_STEP);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onResize(-KB_STEP);
      }
    },
    [onResize],
  );

  return (
    <>
      {/* Visible handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="拖拽调整面板宽度"
        tabIndex={0}
        className="group relative z-10 w-[8px] flex-shrink-0 cursor-col-resize touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <div className="mx-auto h-full w-[2px] bg-[#e4ded3] transition-colors group-hover:bg-[#8ba89a] group-focus-visible:bg-[#3b8a6f]" />
      </div>

      {/* Ghost overlay — teleported to avoid layout shifts */}
      {dragging &&
        createPortal(
          <div className="fixed inset-0 z-[9999] cursor-col-resize">
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-[#3b8a6f] shadow-[0_0_8px_rgba(59,138,111,0.6)]"
              style={{ left: ghostX }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
