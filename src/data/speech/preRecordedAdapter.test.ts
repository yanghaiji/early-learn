/** 预录音频适配层单测（v0.4 A 组：英文点了必出声，音频不可用时回退设备 TTS） */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_TIMEOUT_MS } from '../../domain/constants';
import type { SpeechLang, SpeechPort } from '../../domain/ports/speech';
import { createManifestSource, type ManifestSource } from './audioManifest';
import { createPreRecordedAdapter, type AudioHandle } from './preRecordedAdapter';

interface PlayCall {
  src: string;
  rate: number;
  /** 由测试决定这条音频「出声结束了」还是「失败了」 */
  settle: (error?: Error) => void;
}

/** 真实浏览器的 ended / error 由设备决定，测试必须自己控制收尾时机 */
function createFakeAudio(): { handle: AudioHandle; plays: PlayCall[]; stops: number } {
  const plays: PlayCall[] = [];
  let pending: { resolve: () => void; reject: (error: Error) => void } | null = null;
  const state = {
    stops: 0,
    plays,
    handle: {
      play: (src: string, rate: number) =>
        new Promise<void>((resolve, reject) => {
          pending = { resolve, reject };
          plays.push({
            src,
            rate,
            settle: (error?: Error) => {
              const current = pending;
              pending = null;
              if (!current) return;
              if (error) current.reject(error);
              else current.resolve();
            },
          });
        }),
      stop: () => {
        state.stops += 1;
        const current = pending;
        pending = null;
        current?.resolve();
      },
    },
  };
  return state;
}

function createFakeFallback({ englishVoice = true, rejectWith }: { englishVoice?: boolean; rejectWith?: string } = {}) {
  const calls: Array<{ text: string; lang: SpeechLang; rate?: number; cardId?: string }> = [];
  const port: SpeechPort = {
    isSupported: () => true,
    hasVoice: (lang) => (lang === 'en-US' ? englishVoice : true),
    speak: (text, lang, options) => {
      calls.push({ text, lang, ...options });
      return rejectWith ? Promise.reject(new Error(rejectWith)) : Promise.resolve();
    },
    cancel: vi.fn(),
  };
  return { port, calls, cancel: port.cancel as ReturnType<typeof vi.fn> };
}

const MANIFEST: Record<string, string> = { 'animals-cat': 'assets/audio/animals-cat.mp3' };

function setup({
  entries = MANIFEST,
  manifestFails = false,
  englishVoice = true,
  ttsRejectWith,
}: {
  entries?: Record<string, string>;
  manifestFails?: boolean;
  englishVoice?: boolean;
  ttsRejectWith?: string;
} = {}) {
  const load = vi.fn((): Promise<Record<string, string>> =>
    manifestFails ? Promise.reject(new Error('404')) : Promise.resolve(entries),
  );
  const manifest: ManifestSource = createManifestSource(load);
  const fallback = createFakeFallback({ englishVoice, rejectWith: ttsRejectWith });
  const audio = createFakeAudio();
  const port = createPreRecordedAdapter(fallback.port, { audio: audio.handle, manifest });
  return { port, fallback, audio, load, latest: () => audio.plays[audio.plays.length - 1] };
}

describe('createPreRecordedAdapter：出声来源', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should_play_pre_recorded_audio_when_card_is_in_manifest', async () => {
    const { port, fallback, audio, latest } = setup();
    await port.warmUp();

    const task = port.speak('cat', 'en-US', { cardId: 'animals-cat', rate: 0.8 });
    latest()?.settle();
    await expect(task).resolves.toBeUndefined();

    expect(audio.plays.map((play) => play.src)).toEqual(['assets/audio/animals-cat.mp3']);
    expect(fallback.calls).toHaveLength(0);
  });

  it('should_fall_back_to_tts_when_card_has_no_audio_entry', async () => {
    const { port, fallback, audio } = setup();
    await port.warmUp();

    await port.speak('big banana', 'en-US', { cardId: 'custom-card-1' });

    expect(audio.plays).toHaveLength(0);
    expect(fallback.calls).toEqual([{ text: 'big banana', lang: 'en-US', cardId: 'custom-card-1', rate: undefined }]);
  });

  it('should_fall_back_to_tts_when_no_card_id_is_given', async () => {
    const { port, fallback, audio } = setup();

    await port.speak('cat', 'en-US');

    expect(audio.plays).toHaveLength(0);
    expect(fallback.calls).toHaveLength(1);
  });

  it('should_always_use_tts_for_chinese', async () => {
    const { port, fallback, audio, load } = setup();

    await port.speak('猫', 'zh-CN', { cardId: 'animals-cat' });

    expect(audio.plays).toHaveLength(0);
    expect(fallback.calls).toHaveLength(1);
    // 只读中文就不该为清单打一次网络
    expect(load).not.toHaveBeenCalled();
  });

  it('should_propagate_rate_to_audio_playback', async () => {
    const { port, audio, latest } = setup();
    await port.warmUp();

    const task = port.speak('cat', 'en-US', { cardId: 'animals-cat', rate: 1.2 });
    latest()?.settle();
    await task;

    expect(audio.plays[0]?.rate).toBe(1.2);
  });

  it('should_reach_the_parent_when_audio_playback_fails', async () => {
    const { port, fallback, latest } = setup();
    await port.warmUp();

    const task = port.speak('cat', 'en-US', { cardId: 'animals-cat' });
    latest()?.settle(new Error('not allowed to play'));

    await expect(task).resolves.toBeUndefined();
    expect(fallback.calls).toHaveLength(1);
  });

  it('should_stop_silent_audio_and_retry_with_tts_before_timeout', async () => {
    const { port, fallback, audio } = setup();
    await port.warmUp();

    const task = port.speak('cat', 'en-US', { cardId: 'animals-cat' });
    expect(audio.plays).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(AUDIO_TIMEOUT_MS + 50);
    await expect(task).resolves.toBeUndefined();

    // 超时的那条可能还在后台响，必须掐掉再交给 TTS，否则两层声音叠加
    expect(audio.stops).toBeGreaterThan(0);
    expect(fallback.calls).toHaveLength(1);
    expect(audio.plays).toHaveLength(1);
  });

  it('should_reject_with_the_reason_when_both_paths_fail', async () => {
    const { port, fallback, audio, latest } = setup({ ttsRejectWith: '英文只有网络语音且当前连不上' });
    await port.warmUp();

    const task = port.speak('cat', 'en-US', { cardId: 'animals-cat' });
    latest()?.settle(new Error('blocked'));

    await expect(task).rejects.toThrow('英文只有网络语音且当前连不上');
    expect(fallback.calls).toHaveLength(1);
    expect(audio.plays).toHaveLength(1);
  });

  it('should_stop_previous_audio_when_a_new_speak_starts', async () => {
    const { port, audio, latest } = setup();
    await port.warmUp();

    const first = port.speak('cat', 'en-US', { cardId: 'animals-cat' });
    latest()?.settle();
    await first;

    const second = port.speak('cat', 'en-US', { cardId: 'animals-cat' });
    expect(audio.stops).toBeGreaterThan(0);
    latest()?.settle();
    await second;

    expect(audio.plays).toHaveLength(2);
  });

  it('should_stop_both_sources_and_settle_on_cancel', async () => {
    const { port, fallback, audio } = setup();
    await port.warmUp();

    const task = port.speak('cat', 'en-US', { cardId: 'animals-cat' });
    port.cancel();

    await expect(task).resolves.toBeUndefined();
    expect(audio.stops).toBeGreaterThan(0);
    expect(fallback.cancel).toHaveBeenCalled();
  });
});

describe('清单加载与可用性判定', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should_request_manifest_only_once_across_repeated_speaks', async () => {
    const { port, audio, load, latest } = setup();
    await port.warmUp();

    for (let round = 0; round < 3; round += 1) {
      const task = port.speak('cat', 'en-US', { cardId: 'animals-cat' });
      latest()?.settle();
      await task;
    }

    expect(load).toHaveBeenCalledTimes(1);
    expect(audio.plays).toHaveLength(3);
  });

  it('should_stop_requesting_manifest_after_a_failure', async () => {
    const { port, fallback, load } = setup({ manifestFails: true });

    await port.speak('cat', 'en-US', { cardId: 'animals-cat' });
    await port.speak('cat', 'en-US', { cardId: 'animals-cat' });

    expect(load).toHaveBeenCalledTimes(1);
    expect(fallback.calls).toHaveLength(2);
  });

  it('should_trust_pre_recorded_audio_when_device_has_no_english_voice', async () => {
    const { port } = setup({ englishVoice: false });

    expect(port.hasVoice('en-US')).toBe(false);
    expect(port.isSupported()).toBe(true);

    await port.warmUp();

    // 清单到手后：自带音频能出声，不该再被「设备没音色」判死
    expect(port.hasVoice('en-US')).toBe(true);
    expect(port.hasVoice('zh-CN')).toBe(true);
  });

  it('should_keep_english_unavailable_when_manifest_load_failed_and_device_has_no_voice', async () => {
    const { port } = setup({ manifestFails: true, englishVoice: false });

    await port.warmUp();

    expect(port.hasVoice('en-US')).toBe(false);
  });
});
