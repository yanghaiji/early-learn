/** 导入导出领域服务。对应 NFR §3.3、PRD US-10 */

import { SCHEMA_VERSION } from '../constants';
import type { Card, CatalogDocument, ExportBundle, ImportMode, ImportPlan } from '../entities/card';
import type { Category } from '../entities/category';

export const APP_ID = 'early-learn' as const;

export function buildExportBundle(
  doc: CatalogDocument,
  appVersion: string,
  now: string,
): ExportBundle {
  return {
    app: APP_ID,
    appVersion,
    exportedAt: now,
    schemaVersion: doc.schemaVersion,
    categories: doc.categories,
    cards: doc.cards,
    savedAt: doc.savedAt,
  };
}

function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

/** 合并：导入项按 id 覆盖，未涉及项保留；替换：整体以导入为准 */
export function planImport(
  current: Pick<CatalogDocument, 'categories' | 'cards'>,
  incoming: Pick<CatalogDocument, 'categories' | 'cards'>,
  mode: ImportMode,
): ImportPlan {
  const currentCategories = indexById(current.categories);
  const currentCards = indexById(current.cards);

  if (mode === 'replace') {
    const removed = current.cards.filter((card) => !incoming.cards.some((c) => c.id === card.id));
    return {
      mode,
      categoriesAdded: incoming.categories.length,
      categoriesUpdated: 0,
      categoriesTotal: incoming.categories.length,
      cardsAdded: incoming.cards.length,
      cardsUpdated: 0,
      cardsRemoved: removed.length,
      cardsTotal: incoming.cards.length,
    };
  }

  return {
    mode,
    categoriesAdded: incoming.categories.filter((c) => !currentCategories.has(c.id)).length,
    categoriesUpdated: incoming.categories.filter((c) => currentCategories.has(c.id)).length,
    categoriesTotal: new Set([
      ...current.categories.map((c) => c.id),
      ...incoming.categories.map((c) => c.id),
    ]).size,
    cardsAdded: incoming.cards.filter((c) => !currentCards.has(c.id)).length,
    cardsUpdated: incoming.cards.filter((c) => currentCards.has(c.id)).length,
    cardsRemoved: 0,
    cardsTotal: new Set([...current.cards.map((c) => c.id), ...incoming.cards.map((c) => c.id)])
      .size,
  };
}

function mergeWithMeta<T extends { id: string; createdAt: string }>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const existing = merged.get(item.id);
    // 合并时保留原创建时间，避免排序上下文被打乱
    merged.set(item.id, existing ? { ...item, createdAt: existing.createdAt } : item);
  }
  return [...merged.values()];
}

export function applyImport(
  current: CatalogDocument,
  incoming: Pick<CatalogDocument, 'categories' | 'cards'>,
  mode: ImportMode,
  now: string,
): CatalogDocument {
  if (mode === 'replace') {
    return {
      schemaVersion: SCHEMA_VERSION,
      categories: [...incoming.categories],
      cards: [...incoming.cards],
      savedAt: now,
    };
  }
  const categories = mergeWithMeta<Category>(current.categories, incoming.categories);
  const cards = mergeWithMeta<Card>(current.cards, incoming.cards);
  return {
    schemaVersion: SCHEMA_VERSION,
    categories,
    cards,
    savedAt: now,
  };
}

export function exportFileName(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `early-learn-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}.json`;
}
