/** 种子数据装配：首次访问写入本地 / 只读模式下直接使用 */

import { SCHEMA_VERSION, SEED_VERSION } from '../../domain/constants';
import type { CatalogDocument } from '../../domain/entities/card';
import { SEED_CARDS } from './cards';
import { SEED_CATEGORIES, SEED_TIME } from './categories';

export { SEED_VERSION };

/**
 * v0.11 分类归属纠偏后退役的内置卡 id（旧分类-旧 slug）。
 * 卡 id 形如 `${categoryId}-${slug}`，挪卡就会换 id；本地还存着旧 id 的卡要剔除，
 * 否则老用户会看到旧卡与新卡并列（mergeSeedCards 只增量补齐、从不删）。
 * 只按 id 剔：家长自建卡的 id 是 uid，撞不上这 7 个。
 */
export const RETIRED_SEED_CARD_IDS: readonly string[] = [
  'animals-bee',
  'animals-butterfly',
  'animals-fish',
  'daily-shoes',
  'daily-hat',
  'daily-backpack',
  'family-teacher',
];

export function getSeedCatalog(): CatalogDocument {
  // 深拷贝，避免 UI 修改种子常量
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: SEED_CATEGORIES.map((category) => ({ ...category })),
    cards: SEED_CARDS.map((card) => ({ ...card, tags: [...card.tags] })),
    savedAt: SEED_TIME,
  };
}
