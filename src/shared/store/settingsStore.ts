/** 设置 store（ADR-007：只存 UI 与设置，业务数据走仓储） */

import { create } from 'zustand';
import { DEFAULT_SETTINGS, type DisplayMode, type Settings } from '../../domain/entities/settings';
import { parseSettings } from '../../domain/services/validation';
import { STORAGE_KEYS } from '../../data/storage/keys';
import type { SpeechRate } from '../../domain/constants';

interface SettingsState {
  settings: Settings;
  setDisplayMode: (mode: DisplayMode) => void;
  setSpeechEnabled: (enabled: boolean) => void;
  setSpeechRate: (rate: SpeechRate) => void;
  setSpeakOnEnter: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  resetSettings: () => void;
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return DEFAULT_SETTINGS;
    return parseSettings(JSON.parse(raw)) ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persist(settings: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch {
    // 存储不可用时静默降级：设置仅在本次会话生效
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const apply = (patch: Partial<Settings>) => {
    const next = { ...get().settings, ...patch };
    persist(next);
    set({ settings: next });
  };

  return {
    settings: loadSettings(),
    setDisplayMode: (displayMode) => apply({ displayMode }),
    setSpeechEnabled: (speechEnabled) => apply({ speechEnabled }),
    setSpeechRate: (speechRate) => apply({ speechRate }),
    setSpeakOnEnter: (speakOnEnter) => apply({ speakOnEnter }),
    setReduceMotion: (reduceMotion) => apply({ reduceMotion }),
    resetSettings: () => {
      persist(DEFAULT_SETTINGS);
      set({ settings: DEFAULT_SETTINGS });
    },
  };
});
