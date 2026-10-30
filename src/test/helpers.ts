/** 测试公共装配：本地存储复位与最小 TTS 桩（组件测试共用，避免每个文件抄一份） */

import { vi } from 'vitest';

export { resetLocalStorage } from './memoryStorage';

/**
 * jsdom 默认没有 SpeechSynthesisUtterance，语音装配会降级成空实现（点了不出声）。
 * 装一个中文音色桩：speak 即视为立刻念完，让连播与游戏的可玩链路在 jsdom 里能走通。
 */
export function stubChineseVoices(): void {
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: class {
      text: string;
      lang = '';
      rate = 1;
      voice: SpeechSynthesisVoice | undefined;
      onstart: (() => void) | null = null;
      onboundary: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor(text = '') {
        this.text = text;
      }
    },
  });
  const voice = {
    name: 'test-zh',
    voiceURI: 'test-zh',
    lang: 'zh-CN',
    localService: true,
    default: true,
  } as unknown as SpeechSynthesisVoice;
  vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([voice]);
  window.speechSynthesis.speak = vi.fn((utterance: SpeechSynthesisUtterance) => {
    const target = utterance as unknown as { onstart: (() => void) | null; onend: (() => void) | null };
    target.onstart?.();
    target.onend?.();
  });
}

/** 撤销桩：用例之间不共享语音能力 */
export function clearSpeechStub(): void {
  delete (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
}
