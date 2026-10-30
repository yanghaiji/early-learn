/** 空语音实现：浏览器无语音能力时的降级（ADR-008） */

import { SpeechUnavailableError, type SpeechPort } from '../../domain/ports/speech';

export function createNullSpeechAdapter(): SpeechPort {
  return {
    isSupported: () => false,
    hasVoice: () => false,
    speak: () => Promise.reject(new SpeechUnavailableError()),
    cancel: () => undefined,
  };
}
