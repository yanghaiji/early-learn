/** 语音端口装配：有 Web Speech 用真实实现，否则用空实现降级 */

import type { SpeechPort } from '../../domain/ports/speech';
import { hasSpeechApi, warmVoices } from './detect';
import { createNullSpeechAdapter } from './nullSpeechAdapter';
import { createWebSpeechAdapter } from './webSpeechAdapter';

export function createSpeechPort(): SpeechPort {
  if (!hasSpeechApi()) return createNullSpeechAdapter();
  // 音色列表是异步加载的，装配时就预热，避免用户第一次点 English 时 getVoices() 还是空的
  warmVoices();
  try {
    return createWebSpeechAdapter();
  } catch {
    return createNullSpeechAdapter();
  }
}

export { detectSpeechSupport, hasSpeechApi, isLocalVoice, listVoices, voiceReport, waitForVoices, warmVoices } from './detect';
export type { VoiceReport } from './detect';
export { createNullSpeechAdapter } from './nullSpeechAdapter';
