/** 语音端口（ADR-008）：隔离浏览器 Web Speech，便于测试与降级替换 */

export type SpeechLang = 'zh-CN' | 'en-US';

/** 默认文案：上层 UI 据此判断「这条错误要不要原样给用户看」 */
export const DEFAULT_SPEECH_ERROR_MESSAGE = '当前环境不支持语音朗读';

export interface SpeakOptions {
  rate?: number;
}

export interface SpeechPort {
  isSupported(): boolean;
  /** 对应语言是否有可用音色（voice 异步加载，探测可能滞后） */
  hasVoice(lang: SpeechLang): boolean;
  speak(text: string, lang: SpeechLang, options?: SpeakOptions): Promise<void>;
  cancel(): void;
}

export class SpeechUnavailableError extends Error {
  constructor(message = DEFAULT_SPEECH_ERROR_MESSAGE) {
    super(message);
    this.name = 'SpeechUnavailableError';
  }
}
