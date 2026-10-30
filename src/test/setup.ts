/** Vitest 全局初始化：jest-dom 断言 + 浏览器 API 兜底 */

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// jsdom 未实现 scrollTo，分类页翻页后回顶部会调用
Object.defineProperty(window, 'scrollTo', { configurable: true, value: () => undefined });

// jsdom 未实现 speechSynthesis，测试中默认走 NullSpeechAdapter
if (!('speechSynthesis' in window)) {
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

// jsdom 的 play/pause 会往 stderr 打「Not implemented」（不抛异常，拦不住），
// 自带音频适配器（v0.4）在卸载时会 cancel，这里一并兜住
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: () => Promise.resolve(),
});
Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: () => undefined,
});
