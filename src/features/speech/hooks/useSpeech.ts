/** 语音 hook：屏蔽浏览器差异，统一给出可用性/朗读中状态 */

import { useCallback, useEffect, useState } from 'react';
import { useCatalog } from '../../../app/CatalogProvider';
import { DEFAULT_SPEECH_ERROR_MESSAGE, type SpeechLang } from '../../../domain/ports/speech';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { toast } from '../../../shared/store/toastStore';

export function useSpeech() {
  const { speech } = useCatalog();
  const settings = useSettingsStore((state) => state.settings);
  const [speaking, setSpeaking] = useState<SpeechLang | null>(null);

  const supported = speech.isSupported();
  const enabled = supported && settings.speechEnabled;

  const speak = useCallback(
    async (text: string, lang: SpeechLang) => {
      if (!enabled) {
        toast('当前浏览器或设置不支持朗读');
        return;
      }
      setSpeaking(lang);
      try {
        await speech.speak(text, lang, { rate: settings.speechRate });
      } catch (error) {
        // 适配层给出的具体原因（如「没有可用的英文音色」）直接告诉家长，比一句“朗读失败”有用
        const reason = error instanceof Error ? error.message : '';
        toast(
          reason && reason !== DEFAULT_SPEECH_ERROR_MESSAGE
            ? reason
            : '朗读失败，建议使用 Chrome / Edge / Safari',
          'error',
        );
      } finally {
        setSpeaking((current) => (current === lang ? null : current));
      }
    },
    [enabled, settings.speechRate, speech],
  );

  const cancel = useCallback(() => {
    speech.cancel();
    setSpeaking(null);
  }, [speech]);

  // 离开页面立即停止朗读（PRD §9.2）
  useEffect(() => () => speech.cancel(), [speech]);

  return { speak, cancel, speaking, enabled, supported };
}
