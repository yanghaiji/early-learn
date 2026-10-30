/**
 * 进度仓储实现（v0.4 B 组，ADR-P3）：单切片 `early-learn:v1:progress` 读写。
 *
 * 形态对齐 settingsStore 的静默降级：读脏 → 空文档；写失败（配额 / 隐私模式）不抛，
 * 会话内仍可用。与 catalogStorage 分开，避免学习痕迹混进内容导入导出包。
 */

import type { CardId } from '../../domain/entities/card';
import type { ProgressDocument } from '../../domain/entities/progress';
import { EMPTY_PROGRESS } from '../../domain/entities/progress';
import type { ProgressRepository } from '../../domain/ports/repositories';
import { prune } from '../../domain/services/progress';
import { parseProgress } from '../../domain/services/validation';
import { STORAGE_KEYS } from './keys';

interface ProgressStorageDeps {
  storage: Storage | null;
}

export function createProgressRepository({ storage }: ProgressStorageDeps): ProgressRepository {
  const load = (existingIds?: ReadonlySet<CardId>): ProgressDocument => {
    if (!storage) return EMPTY_PROGRESS;
    let raw: string | null;
    try {
      raw = storage.getItem(STORAGE_KEYS.progress);
    } catch {
      // 隐私模式读取也可能抛安全异常：当作无数据
      return EMPTY_PROGRESS;
    }
    if (!raw) return EMPTY_PROGRESS;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return EMPTY_PROGRESS;
    }
    const doc = parseProgress(parsed) ?? EMPTY_PROGRESS;
    return existingIds ? prune(doc, existingIds) : doc;
  };

  const save = (doc: ProgressDocument): void => {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEYS.progress, JSON.stringify(doc));
    } catch {
      // 存储不可用时静默降级：进度仅在本次会话生效
    }
  };

  const clear = (): void => {
    if (!storage) return;
    try {
      storage.removeItem(STORAGE_KEYS.progress);
    } catch {
      // 清不掉也不影响主流程
    }
  };

  const isPersistent = (): boolean => {
    if (!storage) return false;
    const probe = `${STORAGE_KEYS.progress}:probe`;
    try {
      storage.setItem(probe, '1');
      storage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  };

  return { load, save, clear, isPersistent };
}
