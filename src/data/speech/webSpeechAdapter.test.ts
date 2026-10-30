/** Web Speech 适配层单测：音色优先级、静音重试、任务取消（对应「English 按钮点了没声音」回归） */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpeechUnavailableError } from '../../domain/ports/speech';
import { createWebSpeechAdapter, voiceCandidates } from './webSpeechAdapter';

const SILENT_MS = 1600;

type FakeUtterance = {
  text: string;
  lang: string;
  rate: number;
  voice?: SpeechSynthesisVoice;
  onstart: (() => void) | null;
  onboundary: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

function makeVoice(
  name: string,
  lang: string,
  options: { local?: boolean; isDefault?: boolean } = {},
): SpeechSynthesisVoice {
  return {
    default: options.isDefault ?? false,
    lang,
    localService: options.local ?? true,
    name,
    voiceURI: `voice://${name}`,
  };
}

class UtteranceCtor {
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | undefined = undefined;
  onstart: (() => void) | null = null;
  onboundary: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(readonly text: string) {}
}

function makeSynth(
  voices: readonly SpeechSynthesisVoice[],
  onSpeak: (utterance: FakeUtterance) => void,
  state: { speaking?: boolean; pending?: boolean } = {},
) {
  const spoken: FakeUtterance[] = [];
  const cancel = vi.fn();
  const synth = {
    getVoices: () => [...voices],
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance);
      onSpeak(utterance);
    },
    cancel,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    speaking: state.speaking ?? false,
    pending: state.pending ?? false,
  };
  return { synth: synth as unknown as SpeechSynthesis, spoken, cancel };
}

/** 浏览器原语是 window 上的，detect.ts 读的是 window.speechSynthesis，测试必须替换全局对象 */
const originalSpeech = {
  synthesis: Object.getOwnPropertyDescriptor(window, 'speechSynthesis'),
  utterance: Object.getOwnPropertyDescriptor(window, 'SpeechSynthesisUtterance'),
};

function installSpeech(synth: SpeechSynthesis): void {
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    writable: true,
    value: UtteranceCtor,
  });
}

describe('voiceCandidates', () => {
  it('should_prefer_local_voice_over_network_voice_for_the_same_language', () => {
    const voices = [
      makeVoice('Google US English', 'en-US', { local: false }),
      makeVoice('Microsoft Zira', 'en-US'),
    ];
    expect(voiceCandidates(voices, 'en-US')[0]?.name).toBe('Microsoft Zira');
  });

  it('should_prefer_default_voice_among_local_matches', () => {
    const voices = [makeVoice('Microsoft David', 'en-US'), makeVoice('Microsoft Zira', 'en-US', { isDefault: true })];
    expect(voiceCandidates(voices, 'en-US').map((voice) => voice.name)).toEqual(['Microsoft Zira', 'Microsoft David']);
  });

  it('should_keep_other_language_voices_as_last_resort_when_language_has_none', () => {
    const voices = [makeVoice('Microsoft Huihui', 'zh-CN'), makeVoice('Microsoft Zira', 'en-US')];
    expect(voiceCandidates(voices, 'en-US').map((voice) => voice.name)).toEqual(['Microsoft Zira', 'Microsoft Huihui']);
  });
});

describe('createWebSpeechAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalSpeech.synthesis) {
      Object.defineProperty(window, 'speechSynthesis', originalSpeech.synthesis);
    }
    if (originalSpeech.utterance) {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', originalSpeech.utterance);
    } else {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: undefined });
    }
  });

  it('should_speak_english_with_local_voice_first', async () => {
    const { synth, spoken } = makeSynth(
      [makeVoice('Google US English', 'en-US', { local: false }), makeVoice('Microsoft Zira', 'en-US')],
      (utterance) => {
        utterance.onstart?.();
        utterance.onend?.();
      },
    );
    installSpeech(synth);
    const port = createWebSpeechAdapter(synth);

    await port.speak('apple', 'en-US');

    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.voice?.name).toBe('Microsoft Zira');
    expect(spoken[0]?.lang).toBe('en-US');
  });

  it('should_retry_next_voice_when_first_voice_never_starts', async () => {
    const { synth, spoken } = makeSynth(
      [makeVoice('Microsoft Zira', 'en-US'), makeVoice('Microsoft Zira Online (Natural)', 'en-US', { local: false })],
      (utterance) => {
        // 本地音色装死（点了没声音），网络音色才出声
        if (utterance.voice?.name.startsWith('Microsoft Zira Online')) {
          utterance.onstart?.();
          utterance.onend?.();
        }
      },
    );
    installSpeech(synth);
    const port = createWebSpeechAdapter(synth);

    const task = port.speak('apple', 'en-US');
    await vi.advanceTimersByTimeAsync(SILENT_MS);
    await expect(task).resolves.toBeUndefined();

    expect(spoken.map((utterance) => utterance.voice?.name)).toEqual([
      'Microsoft Zira',
      'Microsoft Zira Online (Natural)',
    ]);
  });

  it('should_reject_with_readable_hint_when_no_candidate_makes_a_sound', async () => {
    const voices = [
      makeVoice('v1', 'en-US'),
      makeVoice('v2', 'en-US'),
      makeVoice('v3', 'en-US'),
      makeVoice('v4', 'en-US'),
    ];
    const { synth, spoken } = makeSynth(voices, () => undefined);
    installSpeech(synth);
    const port = createWebSpeechAdapter(synth);

    const task = port.speak('apple', 'en-US');
    // 先把断言挂上去再推进定时器：否则 Node 会在「 reject 到 await 之间」把它记成 unhandled rejection
    const assertions = [
      expect(task).rejects.toBeInstanceOf(SpeechUnavailableError),
      expect(task).rejects.toThrow(/英文没有出声/),
    ];
    await vi.runAllTimersAsync();
    await Promise.all(assertions);
    // 最多只试 3 个音色，不会把用户的点击拖成无限等待
    expect(spoken).toHaveLength(3);
  });

  it('should_tell_the_parent_to_install_a_local_voice_when_only_network_voices_exist', async () => {
    // 真实环境（本地 Chrome 探测结果）：英文音色全是网络音色，国内网络连不上 → 旧实现静默失败
    const { synth } = makeSynth(
      [
        makeVoice('Google US English', 'en-US', { local: false }),
        makeVoice('Microsoft Ava Online (Natural)', 'en-US', { local: false }),
      ],
      () => undefined,
    );
    installSpeech(synth);
    const port = createWebSpeechAdapter(synth);

    const task = port.speak('apple', 'en-US');
    const assertion = expect(task).rejects.toThrow(/英文只有网络语音且当前连不上/);
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('should_reserve_one_attempt_slot_for_a_local_voice_of_any_language', async () => {
    const { synth, spoken } = makeSynth(
      [
        makeVoice('en1', 'en-US', { local: false }),
        makeVoice('en2', 'en-US', { local: false }),
        makeVoice('en3', 'en-US', { local: false }),
        makeVoice('Microsoft Huihui', 'zh-CN'),
      ],
      (utterance) => {
        // 三个网络英文音色全部装死，只有本地中文音色能出声
        if (utterance.voice?.name === 'Microsoft Huihui') {
          utterance.onstart?.();
          utterance.onend?.();
        }
      },
    );
    installSpeech(synth);
    const port = createWebSpeechAdapter(synth);

    const task = port.speak('apple', 'en-US');
    await vi.runAllTimersAsync();
    await expect(task).resolves.toBeUndefined();

    expect(spoken.map((utterance) => utterance.voice?.name)).toEqual(['en1', 'en2', 'Microsoft Huihui']);
  });

  it('should_stop_reading_remaining_chunks_after_cancel', async () => {
    const { synth, spoken } = makeSynth([makeVoice('Microsoft Zira', 'en-US')], (utterance) => {
      utterance.onstart?.();
      // 故意不触发 onend：由测试手动收尾
    });
    installSpeech(synth);
    const port = createWebSpeechAdapter(synth);

    const text = `${'a'.repeat(50)}。${'b'.repeat(20)}`;
    void port.speak(text, 'en-US');
    expect(spoken).toHaveLength(1);

    port.cancel();
    spoken[0]?.onend?.();
    await vi.runAllTimersAsync();

    expect(spoken).toHaveLength(1);
  });

  it('should_use_default_voice_when_machine_has_no_voice_list_yet', async () => {
    const { synth, spoken } = makeSynth([], (utterance) => {
      utterance.onstart?.();
      utterance.onend?.();
    });
    installSpeech(synth);
    // 重置模块：detect 的音色缓存已被上一个用例填过，这里要的是「一个音色都没读到」的冷启动
    vi.resetModules();
    const mod = await import('./webSpeechAdapter');
    const port = mod.createWebSpeechAdapter(synth);

    await port.speak('cat', 'en-US');

    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.voice).toBeUndefined();
    expect(spoken[0]?.lang).toBe('en-US');
  });

  it('should_cancel_previous_utterance_only_when_still_speaking', async () => {
    const idle = makeSynth([makeVoice('Microsoft Zira', 'en-US')], (utterance) => {
      utterance.onstart?.();
      utterance.onend?.();
    });
    installSpeech(idle.synth);
    const port = createWebSpeechAdapter(idle.synth);
    await port.speak('cat', 'en-US');
    // 空闲时不 cancel：避开 Chrome「cancel 紧跟 speak 会把这条丢掉」的竞态
    expect(idle.cancel).not.toHaveBeenCalled();

    const busy = makeSynth(
      [makeVoice('Microsoft Zira', 'en-US')],
      (utterance) => {
        utterance.onstart?.();
        utterance.onend?.();
      },
      { speaking: true },
    );
    installSpeech(busy.synth);
    const busyPort = createWebSpeechAdapter(busy.synth);
    await busyPort.speak('cat', 'en-US');
    expect(busy.cancel).toHaveBeenCalledTimes(1);
  });
});

describe('detect 音色缓存', () => {
  afterEach(() => {
    if (originalSpeech.synthesis) {
      Object.defineProperty(window, 'speechSynthesis', originalSpeech.synthesis);
    }
    vi.resetModules();
  });

  it('should_fall_back_to_cache_when_getVoices_temporarily_returns_empty', async () => {
    vi.resetModules();
    let available: SpeechSynthesisVoice[] = [makeVoice('Microsoft Zira', 'en-US')];
    const listeners: Array<() => void> = [];
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => [...available],
        speak: vi.fn(),
        cancel: vi.fn(),
        addEventListener: (_type: string, handler: () => void) => {
          listeners.push(handler);
        },
        removeEventListener: vi.fn(),
      },
    });

    const mod = await import('./detect');
    mod.warmVoices();

    // 部分浏览器会在某些时刻返回空列表：回退到缓存，避免英文音色被当成「不存在」
    available = [];
    expect(mod.listVoices().map((voice) => voice.name)).toEqual(['Microsoft Zira']);

    available = [makeVoice('Microsoft Zira', 'en-US'), makeVoice('Microsoft Huihui', 'zh-CN')];
    listeners.forEach((listener) => listener());
    expect(mod.listVoices()).toHaveLength(2);
    expect(mod.voiceReport()).toEqual({ total: 2, zh: 1, en: 1, zhLocal: 1, enLocal: 1 });
  });
});
