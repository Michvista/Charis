'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * A horizontal, drag-to-scroll carousel with no visible buttons.
 * Snap + native momentum scrolling on touch; drag-to-pan with the mouse on desktop.
 */
export default function DragCarousel({
  children,
  className = '',
  snap = true,
}: {
  children: React.ReactNode;
  className?: string;
  snap?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);
  const [dragged, setDragged] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    setIsDown(true);
    setDragged(false);
    setStartX(e.pageX - el.offsetLeft);
    setStartScrollLeft(el.scrollLeft);
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!isDown || !el) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const delta = x - startX;
      if (Math.abs(delta) > 4) setDragged(true);
      el.scrollLeft = startScrollLeft - delta;
    },
    [isDown, startX, startScrollLeft]
  );

  const stopDrag = useCallback(() => setIsDown(false), []);

  // Prevent click-through after a drag gesture on child elements
  useEffect(() => {
    if (!isDown) return;
    const el = ref.current;
    if (!el) return;
    const handler = () => setDragged(false);
    el.addEventListener('mouseup', handler);
    return () => el.removeEventListener('mouseup', handler);
  }, [isDown]);

  return (
    <div
      ref={ref}
      className={`overflow-x-auto no-scrollbar select-none snap-x snap-mandatory ${
        isDown ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
      style={{ scrollbarWidth: 'none' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}