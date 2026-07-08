import React, { useCallback, useRef, useEffect, useState } from 'react';

interface SplitterProps {
  ratio: number;
  onRatioChange: (ratio: number) => void;
}

export function Splitter({ ratio, onRatioChange }: SplitterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startRatioRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startRatioRef.current = ratio;
    },
    [ratio],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const parent = splitterRef.current?.parentElement;
      if (!parent) return;

      const parentWidth = parent.getBoundingClientRect().width;
      const deltaX = e.clientX - startXRef.current;
      const newRatio = startRatioRef.current + deltaX / parentWidth;

      // Clamp between 0.3 and 0.8
      const clamped = Math.max(0.3, Math.min(0.8, newRatio));
      onRatioChange(clamped);
    },
    [isDragging, onRatioChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={splitterRef}
      className={`splitter ${isDragging ? 'splitter--active' : ''}`}
      onMouseDown={handleMouseDown}
      title="Drag to resize panels"
    />
  );
}
