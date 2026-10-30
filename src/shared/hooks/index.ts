/** 通用 hooks */

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';

/** 防抖值（管理区搜索用） */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** 长按（家长门）：返回进度 0~1 */
export function useLongPress(durationMs: number, onComplete: () => void): {
  progress: number;
  holding: boolean;
  start: () => void;
  cancel: () => void;
} {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (timerRef.current !== null) return;
    startRef.current = Date.now();
    setHolding(true);
    setProgress(0);
    timerRef.current = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startRef.current) / durationMs);
      setProgress(ratio);
      if (ratio >= 1) {
        clear();
        completeRef.current();
      }
    }, 50);
  }, [durationMs, clear]);

  const cancel = useCallback(() => {
    if (timerRef.current === null) return;
    clear();
    setProgress(0);
  }, [clear]);

  useEffect(() => cancel, [cancel]);

  return { progress, holding, start, cancel };
}

/** 左右滑动（卡片详情翻页） */
export function useSwipe(handlers: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}): {
  onTouchStart: (event: TouchEvent) => void;
  onTouchEnd: (event: TouchEvent) => void;
} {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const { onSwipeLeft, onSwipeRight, threshold = 48 } = handlers;

  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      startRef.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchEnd: (event) => {
      const start = startRef.current;
      startRef.current = null;
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
  };
}
