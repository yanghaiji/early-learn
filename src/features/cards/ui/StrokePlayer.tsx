/**
 * 笔顺演示（v0.9 US-X1~US-X3）。
 *
 * 方块与原来的大字同位置：没播放时方块里就是那张静态大字，点「看笔顺」才载入该字所在组、
 * 用 hanzi-writer 在原位逐笔演示。状态机 idle → loading → playing →（done | stopped），
 * 再点回到 playing。设置里开了「减少动画」就不做逐笔推进，直接显示整字并说明原因。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { loadCharStrokeData } from '../../../data/strokes';
import type { StrokeCharData } from '../../../data/strokes/types';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { toast } from '../../../shared/store/toastStore';

/** idle / loading / playing / stopped / done（NFR/v0.9 §3.2） */
type Phase = 'idle' | 'loading' | 'playing' | 'stopped' | 'done';

const BUTTON_LABELS: Readonly<Record<Phase, string>> = {
  idle: '看笔顺',
  loading: '载入中…',
  playing: '停止',
  stopped: '重播',
  done: '重播',
};

/** 读 CSS 变量：主题改了笔顺颜色跟着变，不写死色值 */
function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function StrokePlayer({ zh }: { zh: string }) {
  const reduceMotion = useSettingsStore((state) => state.settings.reduceMotion);
  const [phase, setPhase] = useState<Phase>('idle');
  const [size, setSize] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const builtSizeRef = useRef(0);
  const dataRef = useRef<StrokeCharData | null>(null);
  const runRef = useRef(0);

  // 只读方块实际像素：库要求固定 width/height，尺寸变了就销毁重建（§10 风险表：变化 > 8px 才重建）
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      setSize((prev) => (Math.abs(prev - next) > 8 ? next : prev));
    };
    measure();
    // jsdom 与老浏览器没有 ResizeObserver：只用首帧测量，够画一张字
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // 同一路由换卡时组件被复用：回到 idle，丢掉上一张的 writer 与数据
  useEffect(() => {
    runRef.current += 1;
    writerRef.current = null;
    builtSizeRef.current = 0;
    dataRef.current = null;
    setPhase('idle');
    canvasRef.current?.replaceChildren();
  }, [zh]);

  const ensureWriter = useCallback((): HanziWriter => {
    const node = canvasRef.current;
    const data = dataRef.current;
    if (!node || !data) throw new Error('stroke-player-not-ready');
    // 尺寸量不到时（jsdom / 隐藏）给一个兜底边长，别让库拿到 0
    const side = size > 0 ? size : 160;
    if (writerRef.current && builtSizeRef.current === side) return writerRef.current;
    node.replaceChildren();
    const writer = HanziWriter.create(node, zh, {
      width: side,
      height: side,
      padding: 8,
      showOutline: true,
      showCharacter: reduceMotion,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 220,
      strokeColor: readCssVar('--c-ink', '#2a2823'),
      outlineColor: readCssVar('--c-line', '#e6dfd2'),
      radicalColor: null,
      highlightColor: readCssVar('--c-primary', '#2f6b57'),
      // 数据已在组 chunk 里，这里只做「把这一字交出去」的适配
      charDataLoader: (_char, onLoad) => onLoad(data),
    });
    writerRef.current = writer;
    builtSizeRef.current = side;
    return writer;
  }, [reduceMotion, size, zh]);

  const onClick = () => {
    if (phase === 'loading') return;
    if (phase === 'playing') {
      void writerRef.current?.pauseAnimation();
      setPhase('stopped');
      return;
    }
    const run = ++runRef.current;
    setPhase('loading');
    void (async () => {
      try {
        const data = await loadCharStrokeData(zh);
        if (runRef.current !== run) return;
        dataRef.current = data;
        const writer = ensureWriter();
        setPhase('playing');
        if (reduceMotion) {
          // 减少动画：不逐笔推进，只做一次淡入到整字
          await writer.showCharacter({ duration: 200 });
        } else {
          await writer.animateCharacter();
        }
        if (runRef.current === run) setPhase('done');
      } catch {
        if (runRef.current !== run) return;
        setPhase('idle');
        toast('笔顺数据没加载成功，检查网络后再试', 'error');
      }
    })();
  };

  // loading 期间仍显示静态大字：先把数据拿到再换画布，避免白一块
  const isPlaying = phase === 'playing' || phase === 'stopped' || phase === 'done';
  const label = reduceMotion && phase === 'idle' ? '显示整字' : BUTTON_LABELS[phase];

  return (
    <section className="stroke-player" aria-label="笔顺演示" aria-busy={phase === 'loading'}>
      <div className="stroke-player__stage" ref={stageRef}>
        <div className="stroke-player__canvas" ref={canvasRef} hidden={!isPlaying} />
        {isPlaying ? null : <p className="detail__char">{zh}</p>}
      </div>
      <div className="stroke-player__bar">
        <button
          type="button"
          className="tap-btn tap-btn--mini"
          onClick={onClick}
          disabled={phase === 'loading'}
        >
          {label}
        </button>
        {reduceMotion ? (
          <p className="stroke-player__note">设置里已开启减少动画，这里只显示完整字形</p>
        ) : null}
      </div>
    </section>
  );
}
