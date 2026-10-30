/**
 * 本地存储适配器：单 key 原子读写 + 版本迁移 + 损坏自愈（ADR-009）。
 * 领域层不感知本文件；仓储实现依赖本文件。
 */

import {
  SCHEMA_VERSION,
  UNCATEGORIZED_ID,
  UNCATEGORIZED_NAME,
} from '../../domain/constants';
import type { Card, CatalogDocument } from '../../domain/entities/card';
import type { Category } from '../../domain/entities/category';
import { parseCatalogDocument } from '../../domain/services/validation';
import { STORAGE_KEYS } from './keys';
import { migrateDocument } from './migrations';

export class StorageUnavailableError extends Error {
  constructor(message = '当前浏览器无法使用本地存储') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

export class StorageQuotaError extends Error {
  constructor(message = '存储空间已满') {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export class StorageWriteError extends Error {
  constructor(message = '保存失败') {
    super(message);
    this.name = 'StorageWriteError';
  }
}

export type CatalogStatus = 'ready' | 'readonly' | 'corrupted';

export interface LoadResult {
  doc: CatalogDocument;
  status: CatalogStatus;
  /** 需要向用户展示的降级说明 */
  message?: string;
}

export interface CatalogStorage {
  load(): LoadResult;
  get(): CatalogDocument;
  getStatus(): CatalogStatus;
  isReadOnly(): boolean;
  mutate(updater: (doc: CatalogDocument) => CatalogDocument, options?: { backup?: boolean }): CatalogDocument;
  replace(doc: CatalogDocument): void;
  backup(current: CatalogDocument): void;
  usageBytes(): number;
  subscribe(listener: () => void): () => void;
}

interface StorageDeps {
  storage: Storage | null;
  seed: () => CatalogDocument;
  /** 内置内容版本；为 0 时不做种子增量合并（默认，兼容测试替身） */
  seedVersion?: number;
  now?: () => string;
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (error as { code?: number }).code === 22
  );
}

function isSecurityError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'SecurityError' || error.name === 'InvalidAccessError');
}

/** 悬空卡片归入「未分类」，避免 UI 出现无主数据（PRD §8） */
function repairDanglingCards(doc: CatalogDocument, now: string): { doc: CatalogDocument; repaired: number } {
  const categoryIds = new Set(doc.categories.map((category) => category.id));
  const dangling = doc.cards.filter((card) => !categoryIds.has(card.categoryId));
  if (dangling.length === 0) return { doc, repaired: 0 };

  const categories = [...doc.categories];
  if (!categoryIds.has(UNCATEGORIZED_ID)) {
    categories.push({
      id: UNCATEGORIZED_ID,
      name: UNCATEGORIZED_NAME,
      color: 'ink',
      sortOrder: Number.MAX_SAFE_INTEGER,
      createdAt: now,
      updatedAt: now,
    });
  }
  const cards = doc.cards.map((card) =>
    categoryIds.has(card.categoryId) ? card : { ...card, categoryId: UNCATEGORIZED_ID },
  );
  return { doc: { ...doc, categories, cards }, repaired: dangling.length };
}

function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

export function createCatalogStorage({ storage, seed, seedVersion = 0, now = () => new Date().toISOString() }: StorageDeps): CatalogStorage {
  let cached: LoadResult | null = null;

  const safeGet = (key: string): string | null => {
    if (!storage) throw new StorageUnavailableError();
    try {
      return storage.getItem(key);
    } catch (error) {
      if (isSecurityError(error)) throw new StorageUnavailableError();
      throw new StorageWriteError('读取本地数据失败');
    }
  };

  const writeDocument = (doc: CatalogDocument): void => {
    if (!storage) throw new StorageUnavailableError();
    try {
      storage.setItem(STORAGE_KEYS.catalog, JSON.stringify(doc));
    } catch (error) {
      if (isQuotaError(error)) throw new StorageQuotaError();
      if (isSecurityError(error)) throw new StorageUnavailableError();
      throw new StorageWriteError();
    }
  };

  const backupRaw = (raw: string): void => {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEYS.corrupted, raw);
    } catch {
      // 备份失败不影响主流程（空间可能已满）
    }
  };

  const normalize = (doc: CatalogDocument): CatalogDocument => ({
    ...doc,
    schemaVersion: SCHEMA_VERSION,
    categories: dedupeById<Category>(doc.categories),
    cards: dedupeById<Card>(doc.cards),
  });

  const seedDocument = (): CatalogDocument => normalize({ ...seed(), schemaVersion: SCHEMA_VERSION });

  const readSeedVersion = (): number => {
    try {
      const raw = safeGet(STORAGE_KEYS.meta);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { seedVersion?: unknown };
      return Number(parsed.seedVersion ?? 0) || 0;
    } catch {
      return 0;
    }
  };

  const writeSeedVersion = (): void => {
    if (!storage) return;
    try {
      const raw = storage.getItem(STORAGE_KEYS.meta);
      const meta = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      storage.setItem(STORAGE_KEYS.meta, JSON.stringify({ ...meta, seedVersion }));
    } catch {
      // 忽略：只影响下次是否重复合并
    }
  };

  /**
   * 内置内容升级：按 id 增量补齐新增分类与卡片，不覆盖家长已有内容。
   * 仅当本地记录的版本落后于当前 SEED_VERSION 时生效。
   */
  const mergeSeedCards = (doc: CatalogDocument): { doc: CatalogDocument; added: number } => {
    if (readSeedVersion() >= seedVersion) return { doc, added: 0 };
    const fresh = seedDocument();
    const cardIds = new Set(doc.cards.map((card) => card.id));
    const categoryIds = new Set(doc.categories.map((category) => category.id));
    const addedCategories = fresh.categories.filter((category) => !categoryIds.has(category.id));
    const addedCards = fresh.cards.filter((card) => !cardIds.has(card.id));
    return {
      doc: {
        ...doc,
        categories: [...doc.categories, ...addedCategories],
        cards: [...doc.cards, ...addedCards],
      },
      added: addedCards.length,
    };
  };

  const compute = (): LoadResult => {
    // 1. 存储不可用 → 只读种子
    if (!storage) {
      return {
        doc: seedDocument(),
        status: 'readonly',
        message: '当前浏览器无法保存数据（可能处于隐私模式），已切换为只读浏览。',
      };
    }

    let raw: string | null = null;
    try {
      raw = safeGet(STORAGE_KEYS.catalog);
    } catch {
      return {
        doc: seedDocument(),
        status: 'readonly',
        message: '当前浏览器禁止访问本地存储，已切换为只读浏览。',
      };
    }

    // 2. 首次访问 → 写入种子
    if (!raw) {
      const doc = seedDocument();
      try {
        const repaired = repairDanglingCards(doc, now());
        writeDocument(repaired.doc);
        writeSeedVersion();
        return { doc: repaired.doc, status: 'ready' };
      } catch {
        return {
          doc,
          status: 'readonly',
          message: '无法写入本地存储，已切换为只读浏览（内容不会被保存）。',
        };
      }
    }

    // 3. 解析
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(raw);
    } catch {
      backupRaw(raw);
      const doc = seedDocument();
      try {
        writeDocument(doc);
      } catch {
        return {
          doc,
          status: 'readonly',
          message: '本地数据损坏且无法重写，已加载内置内容（只读）。',
        };
      }
      return {
        doc,
        status: 'corrupted',
        message: '本地数据已损坏，已恢复为内置内容，原始数据已备份。',
      };
    }

    // 4. 高版本数据不降级写入
    const rawVersion =
      typeof parsedRaw === 'object' && parsedRaw !== null
        ? Number((parsedRaw as { schemaVersion?: unknown }).schemaVersion ?? 0)
        : 0;
    if (rawVersion > SCHEMA_VERSION) {
      const fallback = seedDocument();
      return {
        doc: fallback,
        status: 'readonly',
        message: '本地数据来自更新版本的应用，为避免数据损坏，已切换为只读浏览。',
      };
    }

    // 5. 迁移
    let migratedDoc: unknown = parsedRaw;
    let migrated = false;
    try {
      const result = migrateDocument(parsedRaw);
      migratedDoc = result.doc;
      migrated = result.migrated;
    } catch {
      backupRaw(raw);
      const doc = seedDocument();
      return {
        doc,
        status: 'corrupted',
        message: '本地数据版本无法识别，已恢复为内置内容，原始数据已备份。',
      };
    }

    // 6. 结构校验
    const parsed = parseCatalogDocument(migratedDoc);
    if (!parsed.ok) {
      backupRaw(raw);
      const doc = seedDocument();
      try {
        writeDocument(doc);
      } catch {
        return {
          doc,
          status: 'readonly',
          message: '本地数据结构异常且无法重写，已加载内置内容（只读）。',
        };
      }
      return {
        doc,
        status: 'corrupted',
        message: `本地数据结构异常（${parsed.path ?? ''}${parsed.path ? ' ' : ''}${parsed.message}），已恢复为内置内容，原始数据已备份。`,
      };
    }

    const normalized = normalize(parsed.data);
    const repaired = repairDanglingCards(normalized, now());
    // 7. 内置内容升级：补齐新版本新增的卡片
    const synced = mergeSeedCards(repaired.doc);
    if (migrated || repaired.repaired > 0 || synced.added > 0) {
      try {
        writeDocument(synced.doc);
        writeSeedVersion();
      } catch {
        return { doc: synced.doc, status: 'readonly', message: '数据已读取，但无法回写本地存储。' };
      }
    }
    return {
      doc: synced.doc,
      status: 'ready',
      ...(repaired.repaired > 0
        ? { message: `有 ${repaired.repaired} 张卡片指向不存在的分类，已归入「未分类」。` }
        : synced.added > 0
          ? { message: `内置内容已更新，新增 ${synced.added} 张卡片。` }
          : {}),
    };
  };

  const load = (): LoadResult => {
    cached ??= compute();
    return cached;
  };

  const ensureWritable = (): void => {
    const result = load();
    if (result.status === 'readonly' || !storage) {
      throw new StorageUnavailableError();
    }
  };

  return {
    load,
    get: () => load().doc,
    getStatus: () => load().status,
    isReadOnly: () => load().status === 'readonly' || !storage,
    mutate: (updater, options) => {
      const current = load();
      ensureWritable();
      if (options?.backup) {
        try {
          storage?.setItem(STORAGE_KEYS.autoBackup, JSON.stringify(current.doc));
        } catch {
          // 备份失败不阻断主流程
        }
      }
      const next = normalize(updater(current.doc));
      writeDocument(next);
      cached = { ...current, doc: next, status: 'ready' };
      return next;
    },
    replace: (doc) => {
      ensureWritable();
      const next = normalize(doc);
      writeDocument(next);
      writeSeedVersion();
      cached = { doc: next, status: 'ready' };
    },
    backup: (current) => {
      if (!storage) return;
      try {
        storage.setItem(STORAGE_KEYS.autoBackup, JSON.stringify(current));
      } catch {
        // 忽略：备份是尽力而为
      }
    },
    usageBytes: () => {
      if (!storage) return 0;
      let total = 0;
      try {
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          if (!key || !key.startsWith('early-learn:')) continue;
          total += (key.length + (storage.getItem(key)?.length ?? 0)) * 2;
        }
      } catch {
        return 0;
      }
      return total;
    },
    subscribe: (listener) => {
      if (typeof window === 'undefined') return () => undefined;
      // 仅监听其它标签页的写入；本页写入由 CatalogProvider 主动刷新
      const onStorage = (event: StorageEvent) => {
        if (event.key && event.key !== STORAGE_KEYS.catalog) return;
        cached = null;
        listener();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}
