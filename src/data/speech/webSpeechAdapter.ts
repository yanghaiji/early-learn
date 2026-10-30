/** Web Speech 实现（ADR-006/008）。注意：iOS 必须在用户手势内同步调用 speak()。 */

import {
  SpeechUnavailableError,
  type SpeechLang,
  type SpeechPort,
  type SpeakOptions,
} from '../../domain/ports/speech';
import { isLocalVoice, listVoices } from './detect';

const MAX_CHUNK_LENGTH = 60;

/**
 * 静音判定：调用 speak() 后这么久都没等到 onstart / onboundary，就认为这个音色根本没出声，
 * 换下一个候选音色重试。Web Speech 不暴露「有没有真的发出声音」，超时是唯一可靠的探测手段。
 */
const SILENT_TIMEOUT_MS = 1500;

/** 一次朗读最多试几个音色：再多只会让用户等更久 */
const MAX_VOICE_ATTEMPTS = 3;

const LANG_LABEL: Record<SpeechLang, string> = { 'zh-CN': '中文', 'en-US': '英文' };

function splitChunks(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_CHUNK_LENGTH) return trimmed ? [trimmed] : [];
  return trimmed
    .split(/(?<=[。！？,.!?；;])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * 候选音色排序：语言精确匹配 > 同语系 > 其它；同级里 系统默认 > 本地 > 网络。
 * 旧实现是 `find(startsWith('en'))`，在 Chrome / Edge 里很容易先选中 Google、Online(Natural)
 * 这类网络音色——国内网络下点了不出声也不报错，于是「中文有声、英文没声」。
 * 最后保留「其它语言音色」兜底：只装了中文语音包的机器上，用中文音色拼读英文单词也比静音强。
 */
export function voiceCandidates(
  voices: readonly SpeechSynthesisVoice[],
  lang: SpeechLang,
): SpeechSynthesisVoice[] {
  const lower = lang.toLowerCase();
  const prefix = lower.slice(0, 2);
  const exact: SpeechSynthesisVoice[] = [];
  const family: SpeechSynthesisVoice[] = [];
  const rest: SpeechSynthesisVoice[] = [];
  for (const voice of voices) {
    const voiceLang = voice.lang.toLowerCase();
    if (voiceLang === lower) exact.push(voice);
    else if (voiceLang.startsWith(prefix)) family.push(voice);
    else rest.push(voice);
  }
  const rank = (list: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] => [
    ...list.filter((voice) => isLocalVoice(voice) && voice.default),
    ...list.filter((voice) => isLocalVoice(voice) && !voice.default),
    ...list.filter((voice) => !isLocalVoice(voice)),
  ];
  return [...new Set([...rank(exact), ...rank(family), ...rank(rest)])];
}

/** 朗读一个分句。返回 false 表示超时无响应（没出声），交给上层换音色重试 */
function speakOnce(
  synth: SpeechSynthesis,
  chunk: string,
  lang: SpeechLang,
  rate: number,
  voice: SpeechSynthesisVoice | undefined,
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const utterance = new window.SpeechSynthesisUtterance(chunk);
    utterance.lang = lang;
    utterance.rate = rate;
    if (voice) utterance.voice = voice;

    let started = false;
    let settled = false;

    const finish = (vocalized: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(vocalized);
    };

    // 定时器先建好，再挂事件：处理器只可能由稍后的 speak() 触发，不会读到未初始化的 timer
    const timer = setTimeout(() => {
      if (started) return;
      // 先落定再 cancel，避免 cancel 触发的 interrupted 把「静默」误判成成功
      finish(false);
      try {
        synth.cancel();
      } catch {
        // 忽略
      }
    }, SILENT_TIMEOUT_MS);

    utterance.onstart = () => {
      started = true;
    };
    utterance.onboundary = () => {
      started = true;
    };
    utterance.onend = () => finish(true);
    utterance.onerror = (event) => {
      // interrupted / canceled 属正常取消，不视为失败（是否继续由上层的代数令牌决定）
      if (event.error === 'interrupted' || event.error === 'canceled') {
        finish(true);
        return;
      }
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new SpeechUnavailableError(`朗读失败（${event.error}）`));
    };

    synth.speak(utterance);
  });
}

/**
 * 试音顺序：取排好序的前几个，但给「本地音色」留一个名额。
 * 本地 Chrome 实测有 3 个英文音色、其中 0 个本地——如果不留这个名额，三个网络音色全部静默后
 * 就只能弹提示；而最后用本地中文音色把单词拼读出来，对孩子也比沉默有用。
 */
function attemptOrder(candidates: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const head = candidates.slice(0, MAX_VOICE_ATTEMPTS);
  if (head.length < MAX_VOICE_ATTEMPTS || head.some(isLocalVoice)) return head;
  const local = candidates.find(isLocalVoice);
  return local ? [...head.slice(0, MAX_VOICE_ATTEMPTS - 1), local] : head;
}

/** 全都试完了还没出声：把「为什么」说清楚，家长才知道下一步做什么 */
function silentHint(
  lang: SpeechLang,
  candidates: readonly SpeechSynthesisVoice[],
  attempts: readonly SpeechSynthesisVoice[],
): string {
  const label = LANG_LABEL[lang];
  if (candidates.length === 0) return `本机没有${label}语音，读不出${label}发音`;
  if (attempts.every((voice) => !isLocalVoice(voice))) {
    return `${label}只有网络语音且当前连不上，在系统语音设置里加装本地${label}语音即可`;
  }
  return `${label}没有出声，可能被系统静音或浏览器限制`;
}

export function createWebSpeechAdapter(synth?: SpeechSynthesis): SpeechPort {
  const resolved: SpeechSynthesis | undefined =
    synth ?? (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined);

  if (!resolved) {
    throw new SpeechUnavailableError();
  }

  const supported = typeof window !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';

  /**
   * 任务令牌：speak / cancel 各自增一次代。旧的 Promise 链发现代数控了就不再往下念，
   * 修掉「点停止后剩下的分句还在念」以及连续点两个按钮互相打断的问题。
   */
  let generation = 0;

  const speakChunk = async (
    chunk: string,
    lang: SpeechLang,
    rate: number,
    token: number,
  ): Promise<void> => {
    const candidates = voiceCandidates(listVoices(), lang);
    const ordered = attemptOrder(candidates);
    const attempts: (SpeechSynthesisVoice | undefined)[] = ordered.length > 0 ? ordered : [undefined];
    for (const voice of attempts) {
      if (token !== generation) return;
      const vocalized = await speakOnce(resolved, chunk, lang, rate, voice);
      if (token !== generation) return;
      if (vocalized) return;
    }
    throw new SpeechUnavailableError(silentHint(lang, candidates, ordered));
  };

  return {
    isSupported: () => supported,

    hasVoice: (lang) =>
      supported &&
      listVoices().some((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())),

    // 首句必须在点击手势内同步派发（iOS Safari 在手势外调用 speak 会被静默丢弃）：
    // 这里到 speakOnce 之前的所有调用都是同步的，await 只影响后续分句
    speak: (text, lang, options?: SpeakOptions) => {
      if (!supported) return Promise.reject(new SpeechUnavailableError());
      const chunks = splitChunks(text);
      if (chunks.length === 0) return Promise.resolve();

      const token = ++generation;
      const rate = options?.rate ?? 1;
      // Chrome 有个老毛病：cancel() 紧接着 speak() 会把这条 utterance 丢掉。
      // 没在念的时候不 cancel，既避开这个竞态，也不影响「上一条还在念要先打断」的场景。
      if (resolved.speaking || resolved.pending) {
        try {
          resolved.cancel();
        } catch {
          // 忽略
        }
      }

      return (async () => {
        for (const chunk of chunks) {
          if (token !== generation) return;
          await speakChunk(chunk, lang, rate, token);
        }
      })();
    },

    cancel: () => {
      generation += 1;
      try {
        resolved.cancel();
      } catch {
        // 忽略：部分浏览器在无任务时 cancel 会抛错
      }
    },
  };
}
