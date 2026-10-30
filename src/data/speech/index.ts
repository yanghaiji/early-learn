/** 语音端口装配：预录音频优先，不行再用设备 Web Speech，两者都没有则空实现降级 */

import type { SpeechPort } from '../../domain/ports/speech';
import { hasSpeechApi, warmVoices } from './detect';
import { createNullSpeechAdapter } from './nullSpeechAdapter';
import { createManifestSource } from './audioManifest';
import { createBrowserAudio, createPreRecordedAdapter } from './preRecordedAdapter';
import { createWebSpeechAdapter } from './webSpeechAdapter';

export function createSpeechPort(): SpeechPort {
  let fallback: SpeechPort;
  if (!hasSpeechApi()) {
    fallback = createNullSpeechAdapter();
  } else {
    // 音色列表是异步加载的，装配时就预热，避免用户第一次点 English 时 getVoices() 还是空的
    warmVoices();
    try {
      fallback = createWebSpeechAdapter();
    } catch {
      fallback = createNullSpeechAdapter();
    }
  }

  const port = createPreRecordedAdapter(fallback, {
    audio: createBrowserAudio(),
    manifest: createManifestSource(),
  });
  // 清单预热：首次点 English 时要能同步决定走音频还是 TTS（iOS 要求派发在手势内）
  void port.warmUp();
  return port;
}

export { detectSpeechSupport, hasSpeechApi, isLocalVoice, listVoices, voiceReport, waitForVoices, warmVoices } from './detect';
export type { VoiceReport } from './detect';
export { createNullSpeechAdapter } from './nullSpeechAdapter';
export { createManifestSource, type ManifestSource } from './audioManifest';
export { createBrowserAudio, createPreRecordedAdapter, type AudioHandle } from './preRecordedAdapter';
