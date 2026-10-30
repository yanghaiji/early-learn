/**
 * 应用装配 + 目录上下文（组合根）。
 * 这里是唯一知道「用什么实现」的地方：未来接后端只改本文件（ADR-003）。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { APP_VERSION } from './version';
import { createCardRepository } from '../data/repositories/localCardRepository';
import { createCategoryRepository } from '../data/repositories/localCategoryRepository';
import { getSeedCatalog, SEED_VERSION } from '../data/seed';
import { CHARACTER_GROUP_BY_ZH, GROUP_NAMES, POEM_GROUP_BY_DYNASTY } from '../data/seed/characterGroups';
import { IDIOM_GROUP_BY_ID, IDIOM_GROUP_NAMES } from '../data/seed/idioms';
import { STORY_GROUP_BY_ID, STORY_GROUP_NAMES } from '../data/seed/storyGroups';
import { createSpeechPort } from '../data/speech';
import { createCatalogStorage, type CatalogStatus, type CatalogStorage } from '../data/storage/catalogStorage';
import type { Card, CardInput, CardPatch, ExportBundle, ImportMode } from '../domain/entities/card';
import type { Category, CategoryInput, CategoryPatch } from '../domain/entities/category';
import type { Repositories, RemoveCategoryResult } from '../domain/ports/repositories';
import type { SpeechPort } from '../domain/ports/speech';
import { applyImport, buildExportBundle } from '../domain/services/importExport';
import { countCardsByCategory, sortCategories, sortCards } from '../domain/services/catalog';
import { toast } from '../shared/store/toastStore';

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__early_learn_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

interface CatalogContextValue {
  status: CatalogStatus;
  message?: string;
  isReadOnly: boolean;
  categories: Category[];
  cards: Card[];
  counts: Record<string, number>;
  speech: SpeechPort;
  seedVersion: number;
  /** 分类内的主题分组 key（汉字 / 诗词 / 故事有），无分组返回 undefined */
  groupOf: (card: Card) => string | undefined;
  /** 组 key → 展示名 */
  groupName: (key: string) => string;
  usageBytes: () => number;
  createCategory: (input: CategoryInput) => Promise<Category>;
  updateCategory: (id: string, patch: CategoryPatch) => Promise<void>;
  removeCategory: (id: string) => Promise<RemoveCategoryResult>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  createCard: (input: CardInput) => Promise<Card>;
  updateCard: (id: string, patch: CardPatch) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  exportBundle: () => ExportBundle;
  importBundle: (bundle: ExportBundle, mode: ImportMode) => Promise<void>;
  resetToSeed: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

/** 汉字组、故事组与成语组共用一张 key → 展示名 的表 */
const ALL_GROUP_NAMES: Readonly<Record<string, string>> = {
  ...GROUP_NAMES,
  ...STORY_GROUP_NAMES,
  ...IDIOM_GROUP_NAMES,
};

export function CatalogProvider({ children }: { children: ReactNode }) {
  const bootRef = useRef<{
    storage: CatalogStorage;
    repos: Repositories;
    speech: SpeechPort;
    initial: ReturnType<CatalogStorage['load']>;
  } | null>(null);

  if (!bootRef.current) {
    const storage = createCatalogStorage({
      storage: safeLocalStorage(),
      seed: getSeedCatalog,
      seedVersion: SEED_VERSION,
    });
    const initial = storage.load();
    bootRef.current = {
      storage,
      initial,
      repos: {
        categories: createCategoryRepository({ storage }),
        cards: createCardRepository({ storage }),
      },
      speech: createSpeechPort(),
    };
  }

  const boot = bootRef.current;
  const [doc, setDoc] = useState(boot.initial.doc);
  const [status, setStatus] = useState<CatalogStatus>(boot.initial.status);
  const [message, setMessage] = useState<string | undefined>(boot.initial.message);

  const refresh = useCallback(() => {
    const next = boot.storage.load();
    setDoc(next.doc);
    setStatus(next.status);
    setMessage(next.message);
  }, [boot]);

  // 内置内容升级提示（只读/损坏已有横幅，不重复提示）
  const initialMessage = boot.initial.message;
  useEffect(() => {
    if (status === 'ready' && initialMessage) toast(initialMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 多标签页写入：提示并刷新（不做自动合并，PRD §8）
  useEffect(
    () =>
      boot.storage.subscribe(() => {
        refresh();
        toast('内容已在其他标签页更新，已刷新');
      }),
    [boot, refresh],
  );

  const categories = useMemo(() => sortCategories(doc.categories), [doc.categories]);
  const cards = useMemo(() => sortCards(doc.cards), [doc.cards]);
  const counts = useMemo(() => countCardsByCategory(doc.cards), [doc.cards]);

  // 分组归属由内置表决定，不写进卡片数据：老数据无需迁移，家长自建卡自动落在「未分组」
  const groupOf = useCallback((card: Card): string | undefined => {
    if (card.kind === 'character') return CHARACTER_GROUP_BY_ZH.get(card.zh);
    if (card.kind === 'poem') return POEM_GROUP_BY_DYNASTY[card.dynasty ?? ''] ?? 'other';
    if (card.kind === 'story') return STORY_GROUP_BY_ID.get(card.id);
    if (card.kind === 'idiom') return IDIOM_GROUP_BY_ID.get(card.id);
    return undefined;
  }, []);

  const groupName = useCallback((key: string): string => ALL_GROUP_NAMES[key] ?? key, []);

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      try {
        const result = await action();
        refresh();
        return result;
      } catch (error) {
        // 存储类错误升级为全局降级提示
        if (error instanceof Error && /Storage/.test(error.name)) {
          refresh();
        }
        throw error;
      }
    },
    [refresh],
  );

  const value: CatalogContextValue = {
    status,
    ...(message ? { message } : {}),
    isReadOnly: status === 'readonly',
    categories,
    cards,
    counts,
    speech: boot.speech,
    seedVersion: SEED_VERSION,
    groupOf,
    groupName,
    usageBytes: () => boot.storage.usageBytes(),
    createCategory: (input) => run(() => boot.repos.categories.create(input)),
    updateCategory: (id, patch) => run(async () => {
      await boot.repos.categories.update(id, patch);
    }),
    removeCategory: (id) => run(() => boot.repos.categories.remove(id)),
    reorderCategories: (orderedIds) =>
      run(async () => {
        await boot.repos.categories.reorder(orderedIds);
      }),
    createCard: (input) => run(() => boot.repos.cards.create(input)),
    updateCard: (id, patch) =>
      run(async () => {
        await boot.repos.cards.update(id, patch);
      }),
    removeCard: (id) =>
      run(async () => {
        await boot.repos.cards.remove(id);
      }),
    exportBundle: () => buildExportBundle(doc, APP_VERSION, new Date().toISOString()),
    importBundle: (bundle, mode) =>
      run(async () => {
        const next = applyImport(doc, bundle, mode, new Date().toISOString());
        boot.storage.replace(next);
      }),
    resetToSeed: () =>
      run(async () => {
        boot.storage.replace(getSeedCatalog());
      }),
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog 必须在 CatalogProvider 内使用');
  return context;
}
