/** 设置实体。对应 NFR/v0.1/技术方案.md §4.1 */

import { SPEECH_DEFAULT_RATE, type SpeechRate } from '../constants';

export type DisplayMode = 'zh' | 'en' | 'both';

export const DISPLAY_MODES: readonly DisplayMode[] = ['zh', 'en', 'both'];

export const DISPLAY_MODE_LABEL: Record<DisplayMode, string> = {
  zh: '中文',
  en: '英文',
  both: '中英对照',
};

export interface Settings {
  displayMode: DisplayMode;
  speechEnabled: boolean;
  speechRate: SpeechRate;
  speakOnEnter: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  displayMode: 'zh',
  speechEnabled: true,
  speechRate: SPEECH_DEFAULT_RATE,
  speakOnEnter: false,
  reduceMotion: false,
};
