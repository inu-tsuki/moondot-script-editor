import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

type SplitterBarProps = {
  /** Called with pixel delta from the drag start position. */
  onResize: (deltaX: number) => void;
};

/**
 * Thin vertical resize handle between two horizontal panels.
 *
 * Drag starts a full-screen overlay (teleported to document.body) that tracks
 * mouse movement and draws a ghost guide line.  On release the delta is
 * reported back via `onResize` so the parent can update panel widths.
 *
 * Pattern borrowed from KMD's SplitterBar but simplified: no percentage math
 * here — the parent owns the container measurements and ratio logic.
 */
export function SplitterBar({ onResize }: SplitterBarProps) {
  const [dragging, setDragging] = useState(false);
  const [ghostX, setGhostX] = useState(0);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    setGhostX(e.clientX);
    setDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setGhostX(e.clientX);
  }, []);

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      onResize(deltaX);
      setDragging(false);
    },
    [onResize],
  );

  useEffect(() => {
    if (!dragging) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Prevent text selection while dragging.
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <>
      {/* Visible handle */}
      <div
        className="group relative z-10 w-[8px] flex-shrink-0 cursor-col-resize"
        onMouseDown={handleMouseDown}
      >
        <div className="mx-auto h-full w-[2px] bg-[#e4ded3] transition-colors group-hover:bg-[#8ba89a]" />
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
