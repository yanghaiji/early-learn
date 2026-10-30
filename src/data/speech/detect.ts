/** 语音能力探测（浏览器差异集中在此）。对应 NFR §9.2 */

export interface SpeechSupport {
  supported: boolean;
  zh: boolean;
  en: boolean;
}

/** 本机音色清单摘要（设置页展示，用于远程判断「点了没声音」是哪一类环境问题） */
export interface VoiceReport {
  total: number;
  zh: number;
  en: number;
  zhLocal: number;
  enLocal: number;
}

/**
 * 网络音色（Chrome 的 Google 系列、Edge 的 Online / Natural 系列）要连到厂商服务器才出声，
 * 国内网络下的典型表现是「点了没声音、也不报错」。选音色时必须把它们排到本地音色后面。
 */
const REMOTE_NAME = /(online|natural|neural|google|\bweb\b)/i;

export function isLocalVoice(voice: SpeechSynthesisVoice): boolean {
  if (voice.localService === false) return false;
  return !REMOTE_NAME.test(voice.name);
}

function getSynth(): SpeechSynthesis | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  return window.speechSynthesis;
}

export function hasSpeechApi(): boolean {
  return getSynth() !== undefined && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

function readVoices(): SpeechSynthesisVoice[] {
  const synth = getSynth();
  if (!synth) return [];
  try {
    return synth.getVoices();
  } catch {
    return [];
  }
}

/**
 * 音色缓存。Chrome / Edge 首次 `getVoices()` 几乎总是返回空数组，要等 `voiceschanged`；
 * 不缓存就会出现「中文有声、英文点了没反应」——英文音色压根没被读到，只能退回系统默认（中文）音色。
 */
let voiceCache: SpeechSynthesisVoice[] = [];
let warmedUp = false;

/** 应用启动时调用一次：主动拉取并持续跟随 voiceschanged 更新 */
export function warmVoices(): void {
  const synth = getSynth();
  if (!synth || warmedUp) return;
  warmedUp = true;
  voiceCache = readVoices();
  const refresh = () => {
    const next = readVoices();
    if (next.length > 0) voiceCache = next;
  };
  try {
    synth.addEventListener('voiceschanged', refresh);
  } catch {
    // 忽略：极少数实现不支持事件监听，后面两次兜底拉取仍然有效
  }
  setTimeout(refresh, 300);
  setTimeout(refresh, 1500);
}

export function listVoices(): SpeechSynthesisVoice[] {
  const fresh = readVoices();
  if (fresh.length > 0) {
    voiceCache = fresh;
    return fresh;
  }
  return voiceCache;
}

function countBy(prefix: string, localOnly: boolean, voices: readonly SpeechSynthesisVoice[]): number {
  return voices.filter(
    (voice) => voice.lang.toLowerCase().startsWith(prefix) && (!localOnly || isLocalVoice(voice)),
  ).length;
}

export function detectSpeechSupport(): SpeechSupport {
  if (!hasSpeechApi()) return { supported: false, zh: false, en: false };
  const voices = listVoices();
  return {
    supported: true,
    zh: voices.some((voice) => voice.lang.toLowerCase().startsWith('zh')),
    en: voices.some((voice) => voice.lang.toLowerCase().startsWith('en')),
  };
}

/** 中文 / 英文各有几个音色、其中几个是本地音色（en 为 0 即「英文按钮不可能出声」） */
export function voiceReport(): VoiceReport {
  const voices = listVoices();
  return {
    total: voices.length,
    zh: countBy('zh', false, voices),
    en: countBy('en', false, voices),
    zhLocal: countBy('zh', true, voices),
    enLocal: countBy('en', true, voices),
  };
}

/**
 * voice 列表可能异步加载（首次 getVoices() 常为空）。
 * 最多等待 timeoutMs，避免阻塞交互。
 */
export function waitForVoices(timeoutMs = 1000): Promise<SpeechSynthesisVoice[]> {
  const synth = getSynth();
  if (!synth) return Promise.resolve([]);
  const immediate = listVoices();
  if (immediate.length > 0) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', finish);
      resolve(listVoices());
    };
    synth.addEventListener('voiceschanged', finish);
    setTimeout(finish, timeoutMs);
  });
}
