/**
 * 预录音频适配器（v0.4 A 组，ADR-P1）：英文优先播应用自带音频，任何一步不成即回退设备 TTS。
 *
 * 存在理由：设备上没有本地英文音色时，TTS 侧再怎么重试也可能整条链路静默失败
 * （根因与取证见 NFR/v0.1/技术方案.md §9.4）。自带音频把「能不能出声」从设备条件变成应用条件。
 */

import { AUDIO_TIMEOUT_MS } from '../../domain/constants';
import type { SpeechLang, SpeechPort, SpeakOptions } from '../../domain/ports/speech';
import type { ManifestSource } from './audioManifest';

export interface AudioHandle {
  /** 播到自然结束 resolve；被 stop 打断同样 resolve（此时不再关心结果）；出错或被关闭 reject */
  play(src: string, rate: number): Promise<void>;
  stop(): void;
}

export interface PreRecordedSpeechPort extends SpeechPort {
  /** 应用启动时预热清单：让首次点击就能同步决定走音频还是 TTS（iOS 要求派发在手势内） */
  warmUp(): Promise<void>;
}

/** 浏览器 <audio>：全站共享一个实例，天然避免两层声音叠加 */
export function createBrowserAudio(): AudioHandle {
  const element = new Audio();
  let settle: ((error: Error | null) => void) | null = null;

  const detach = (): ((error: Error | null) => void) | null => {
    element.onended = null;
    element.onerror = null;
    const current = settle;
    settle = null;
    return current;
  };

  const pause = () => {
    try {
      element.pause();
      element.currentTime = 0;
    } catch {
      // 未加载完就暂停会抛 InvalidStateError：此时本就没有声音要停
    }
  };

  return {
    play: (src, rate) =>
      new Promise<void>((resolve, reject) => {
        pause();
        detach()?.(null);
        element.src = src;
        element.playbackRate = rate;
        settle = (error) => (error ? reject(error) : resolve());
        element.onended = () => detach()?.(null);
        element.onerror = () => detach()?.(new Error('音频加载失败'));
        try {
          // jsdom 与部分浏览器里 play() 可能不返回 Promise：包一层保证不炸调用方
          void Promise.resolve(element.play()).catch((error: unknown) =>
            detach()?.(error instanceof Error ? error : new Error('音频被阻止播放')),
          );
        } catch (error) {
          detach()?.(error instanceof Error ? error : new Error('音频无法播放'));
        }
      }),
    stop: () => {
      pause();
      detach()?.(null);
    },
  };
}

export function createPreRecordedAdapter(
  fallback: SpeechPort,
  { audio, manifest }: { audio: AudioHandle; manifest: ManifestSource },
): PreRecordedSpeechPort {
  /** 任务令牌：cancel 或新任务都会让旧链条立即收手（与 webSpeechAdapter 同一套语义） */
  let generation = 0;

  const audioUsable = (): boolean => {
    const entries = manifest.peek();
    return Boolean(entries && Object.keys(entries).length > 0);
  };

  const pathFor = (lang: SpeechLang, cardId?: string): string | undefined =>
    lang === 'en-US' && cardId ? manifest.peek()?.[cardId] : undefined;

  /** 返回是否真出声：false 意味着该换 TTS 了，而不是「已经读完了」 */
  const playOnce = (src: string, rate: number): Promise<boolean> =>
    new Promise((resolve) => {
      let settled = false;
      const finish = (vocalized: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(vocalized);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        // 超时：这条音频可能还在后台响，先掐掉再交回 TTS，否则两层声音叠加
        audio.stop();
        finish(false);
      }, AUDIO_TIMEOUT_MS);

      audio.stop();
      audio.play(src, rate).then(
        () => finish(true),
        () => {
          audio.stop();
          finish(false);
        },
      );
    });

  const run = async (text: string, lang: SpeechLang, options: SpeakOptions, token: number): Promise<void> => {
    let src = pathFor(lang, options.cardId);

    // 清单还没预热过才等这一次网络；预热命中后 speak() 到 audio.play() 全程同步
    if (src === undefined && lang === 'en-US' && options.cardId && !manifest.peek()) {
      await manifest.load();
      if (token !== generation) return;
      src = manifest.peek()?.[options.cardId];
    }

    if (src !== undefined) {
      const vocalized = await playOnce(src, options.rate ?? 1);
      if (token !== generation) return;
      if (vocalized) return;
    }

    await fallback.speak(text, lang, options);
  };

  return {
    isSupported: () => fallback.isSupported() || audioUsable(),
    // 自带音频能出声时，不该再被「设备没这个语言的音色」判死
    hasVoice: (lang) => (lang === 'en-US' && audioUsable()) || fallback.hasVoice(lang),
    speak: (text, lang, options) => run(text, lang, options ?? {}, ++generation),
    cancel: () => {
      generation += 1;
      audio.stop();
      fallback.cancel();
    },
    warmUp: () => manifest.load().then(() => undefined),
  };
}
