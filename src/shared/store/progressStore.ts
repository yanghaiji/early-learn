/** 学习进度 store（v0.4 B 组，ADR-007 例外：进度是业务数据但本机唯一一份，形态对齐 settingsStore 的静默降级） */

import { create } from 'zustand';
import type { CardId } from '../../domain/entities/card';
import type { MarkStatus, ProgressDocument } from '../../domain/entities/progress';
import { EMPTY_PROGRESS } from '../../domain/entities/progress';
import { createProgressRepository } from '../../data/storage/progressStorage';
import { markOf, setMark, toggleFavorite, touchRecent } from '../../domain/services/progress';
import { toast } from './toastStore';

function storageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    // 隐私模式访问 localStorage 本身就会抛
    return null;
  }
}

const repository = createProgressRepository({ storage: storageOrNull() });

interface ProgressState {
  doc: ProgressDocument;
  /** 存储不可用时为 false：UI 据此提示「本次不会保存」 */
  persistent: boolean;
  toggleFavorite: (cardId: CardId) => void;
  /** 点当前已选中的标记 = 取消（status 传 null 之外由内部判定） */
  mark: (cardId: CardId, status: MarkStatus) => void;
  trackRecent: (cardId: CardId) => void;
  resetProgress: () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useProgressStore = create<ProgressState>((set, get) => {
  // 写入统一走 apply：先落盘再更新 state；repository.save 内部已静默降级
  const apply = (next: ProgressDocument) => {
    repository.save(next);
    set({ doc: next });
  };

  return {
    doc: repository.load(),
    persistent: repository.isPersistent(),
    toggleFavorite: (cardId) => apply(toggleFavorite(get().doc, cardId)),
    mark: (cardId, status) => {
      const current = markOf(get().doc, cardId);
      apply(setMark(get().doc, cardId, current === status ? null : status, nowIso()));
    },
    trackRecent: (cardId) => apply(touchRecent(get().doc, cardId, nowIso())),
    resetProgress: () => {
      // 家长主动清除：只删键不写回空文档，与「从没用过」同形（技术方案 §4.5）
      repository.clear();
      set({ doc: EMPTY_PROGRESS });
    },
  };
});

/** 派生选择器：组件按 cardId 取，避免整份 doc 变化引发全量重渲染 */
export function useIsFavorite(cardId: CardId): boolean {
  return useProgressStore((state) => state.doc.favorites.includes(cardId));
}

export function useMarkStatus(cardId: CardId): MarkStatus | undefined {
  return useProgressStore((state) => state.doc.marks[cardId]?.status);
}

/** 只读提示标记（v0.4 D 组 / PRD §6.3）：会话内只提一次「不会保存」 */
const READ_ONLY_HINT_KEY = 'early-learn:v1:progress:read-only-hinted';

export function hintReadOnlyOnce(): void {
  try {
    if (window.sessionStorage.getItem(READ_ONLY_HINT_KEY)) return;
    window.sessionStorage.setItem(READ_ONLY_HINT_KEY, '1');
  } catch {
    // 连 sessionStorage 都没有：不反复提示，也比刷屏好
    return;
  }
  toast('本机存储不可用，标记不会保存');
}
