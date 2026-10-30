/** 全局 UI store：toast 与降级提示（不承载业务数据） */

import { create } from 'zustand';
import { TOAST_DURATION_MS } from '../../domain/constants';
import { createId } from '../utils/id';

export type ToastTone = 'info' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = createId('toast');
    // 同文案只保留最新一条：幼儿连点收藏 20 次不堆 20 层提示（PRD §6.3）
    const rest = get().toasts.filter((item) => item.message !== message);
    set({ toasts: [...rest, { id, message, tone }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
    }, TOAST_DURATION_MS);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export const toast = (message: string, tone: ToastTone = 'info'): void => {
  useToastStore.getState().push(message, tone);
};
