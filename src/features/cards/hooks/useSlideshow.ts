/**
 * 连播状态机（v0.4 D 组 / US-A6，技术方案 §4.3、任务 11）
 *
 * 控制器放在模块级：详情页换卡是路由替换（组件重挂），React 状态活不过每一次跳张，
 * 队列与定时器只能由模块持有——这也是「手动翻页 / 切页即停」能被观察到的前提。
 * 四类中断：点「停止」、手动翻页、离开详情页、页面切后台。
 *
 * 节拍分工：详情页挂上卡片时调 notifySlideshowCard —— 由它先「读完整整一张」（speak 的 Promise 就是「读完」信号），
 * 读完才排下一个 2s 节拍；定时器只负责「跳下一张」，跳转后新页面重挂再次进入 notify，单一入口不会双通道重复排程。
 * （技术方案 §4.3：reading --读完--> waiting(2000ms) --到下一张--> reading，不能用计时器猜朗读时长。）
 */

import { useCallback, useEffect, useState } from 'react';
import { SLIDESHOW_GAP_MS } from '../../../domain/constants';
import { toast } from '../../../shared/store/toastStore';

interface Chain {
  ids: string[];
  index: number;
  running: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  /** 返回是否真读完出声：false = 没出声，不得继续往后跳 */
  speak: (cardId: string) => Promise<boolean>;
  goCard: (cardId: string) => void;
  cancelSpeech: () => void;
}

let chain: Chain | null = null;

/**
 * 详情页存活标志：路由替换时分不清「换卡」还是「离页」，由页面 effect 的挂载/销毁维护。
 * 定时器到点时若页面已不在，按「离开详情页」中断，不得把用户拽回卡片流。
 */
let detailPageAlive = false;
export function markDetailPageAlive(alive: boolean): void {
  detailPageAlive = alive;
}

// 间隔可覆盖：契约值 2s（SLIDESHOW_GAP_MS），行为测试用短间隔加速
let gapMs = SLIDESHOW_GAP_MS;
export function __setSlideshowGapForTest(ms: number): void {
  gapMs = ms;
}

const GROUP_DONE_MESSAGE = '这一组看完啦';

/**
 * 播放态订阅：链在模块级，组件只能靠通知才知道「这一组自己走完了」——
 * 否则末位卡播完后按钮还停在「停止连播」。
 */
type RunningListener = (running: boolean) => void;
const runningListeners = new Set<RunningListener>();

function emitRunning(): void {
  const running = chain?.running ?? false;
  for (const listener of runningListeners) listener(running);
}

function halt(cancelSpeech: boolean): void {
  if (!chain) return;
  if (chain.timer !== null) {
    clearTimeout(chain.timer);
    chain.timer = null;
  }
  if (cancelSpeech) chain.cancelSpeech();
  chain.running = false;
  emitRunning();
}

/** 对外停止（点「停止」/ 手动翻页）：停表并停掉当前正在读的声音 */
export function stopSlideshow(): void {
  halt(true);
}

function scheduleNext(): void {
  if (!chain || !chain.running) return;
  chain.timer = setTimeout(() => {
    if (!chain || !chain.running) return;
    chain.timer = null;
    if (!detailPageAlive) {
      halt(true);
      return;
    }
    const next = chain.index + 1;
    if (next >= chain.ids.length) {
      // 到末尾：停止并提示，不循环（ADR-P6）
      chain.running = false;
      emitRunning();
      toast(GROUP_DONE_MESSAGE);
      return;
    }
    chain.index = next;
    const nextId = chain.ids[next];
    // 「读下一张」交给跳转后详情页重挂的 notify
    if (nextId) chain.goCard(nextId);
  }, gapMs);
}

/** 详情页每次渲染后刷新回调：设置（开关 / 语速）变化后，下一个节拍用新闭包，不让旧闭包把已失效的朗读当可用 */
export function bindSlideshow(handlers: {
  speak: (cardId: string) => Promise<boolean>;
  goCard: (cardId: string) => void;
  cancelSpeech: () => void;
}): void {
  if (!chain) return;
  chain.speak = handlers.speak;
  chain.goCard = handlers.goCard;
  chain.cancelSpeech = handlers.cancelSpeech;
}

/**
 * 详情页挂载 / 换卡时登记当前卡：
 * 连播推进到预期卡 → 读这张并排下一个节拍；
 * 其余出现方式（手动翻页、直连别的 URL）→ 视作中断。
 */
export function notifySlideshowCard(cardId: string): void {
  if (!chain?.running) return;
  if (chain.ids[chain.index] !== cardId) {
    halt(true);
    return;
  }
  const current = chain;
  void current.speak(cardId).then((finished) => {
    // 朗读期间可能已被停止 / 重新开播：只接受同一个链的后续
    if (chain !== current || !current.running) return;
    // 没出声就停，绝不「静默地一张张跳过」（PRD US-A6 末条）
    if (!finished) halt(true);
    else scheduleNext();
  });
}

export interface SlideshowStartOptions {
  ids: string[];
  index: number;
  /** 读第 index 张：在点击手势内同步派发，规避 iOS 非手势播放被拦（风险 R2）；返回是否真读完出声 */
  speak: (cardId: string) => Promise<boolean>;
  goCard: (cardId: string) => void;
  cancelSpeech: () => void;
}

/** 点「连播」即在手势内启动：首句在这个调用里同步派发（风险 R2），读完它才排第一个节拍 */
export function startSlideshow(options: SlideshowStartOptions): void {
  halt(true);
  chain = {
    ids: [...options.ids],
    index: options.index,
    running: true,
    timer: null,
    speak: options.speak,
    goCard: options.goCard,
    cancelSpeech: options.cancelSpeech,
  };
  const firstId = chain.ids[options.index];
  emitRunning();
  if (firstId) {
    const current = chain;
    void current.speak(firstId).then((finished) => {
      if (chain !== current || !current.running) return;
      if (!finished) halt(true);
      else scheduleNext();
    });
  } else {
    scheduleNext();
  }
}

/** 详情页用：running 状态 + 开关入口（朗读不可用时由页面先行拦截并提示） */
export function useSlideshow() {
  const [running, setRunning] = useState(chain?.running ?? false);

  // 切后台立即停止；回前台不自动续播（PRD §6.3）
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') halt(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // 链在模块级：挂载时同步一次，之后靠订阅跟上每一次停止（含末位卡自动播完）
  useEffect(() => {
    const listener: RunningListener = (value) => setRunning(value);
    runningListeners.add(listener);
    setRunning(chain?.running ?? false);
    return () => {
      runningListeners.delete(listener);
    };
  }, []);

  const start = useCallback((options: SlideshowStartOptions) => {
    startSlideshow(options);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    stopSlideshow();
    setRunning(false);
  }, []);

  return { running, start, stop };
}
