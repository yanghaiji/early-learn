/** 语音端口（ADR-008）：隔离浏览器 Web Speech，便于测试与降级替换 */

export type SpeechLang = 'zh-CN' | 'en-US';

/** 默认文案：上层 UI 据此判断「这条错误要不要原样给用户看」 */
export const DEFAULT_SPEECH_ERROR_MESSAGE = '当前环境不支持语音朗读';

export interface SpeakOptions {
  rate?: number;
  /**
   * 传入卡片 id 即允许适配层尝试该卡的预录音频（v0.4 A 组）；
   * 音频不存在或没出声时依旧回退设备 TTS，行为与不传一致
   */
  cardId?: string;
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
