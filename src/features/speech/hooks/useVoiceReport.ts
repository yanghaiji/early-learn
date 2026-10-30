/** 音色探测 hook：本机中英文音色数量（部署后家长自查「点了没声音」用） */

import { useEffect, useState } from 'react';
import { voiceReport, type VoiceReport } from '../../../data/speech/detect';

export function useVoiceReport(): VoiceReport {
  const [report, setReport] = useState<VoiceReport>(voiceReport);

  useEffect(() => {
    const refresh = () => setReport(voiceReport());
    refresh();
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    synth?.addEventListener('voiceschanged', refresh);
    // 音色列表异步加载，稍后再补拉一次
    const timer = setTimeout(refresh, 1500);
    return () => {
      synth?.removeEventListener('voiceschanged', refresh);
      clearTimeout(timer);
    };
  }, []);

  return report;
}
