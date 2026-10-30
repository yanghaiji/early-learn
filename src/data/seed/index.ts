/** 种子数据装配：首次访问写入本地 / 只读模式下直接使用 */

import { SCHEMA_VERSION, SEED_VERSION } from '../../domain/constants';
import type { CatalogDocument } from '../../domain/entities/card';
import { SEED_CARDS } from './cards';
import { SEED_CATEGORIES, SEED_TIME } from './categories';

export { SEED_VERSION };

export function getSeedCatalog(): CatalogDocument {
  // 深拷贝，避免 UI 修改种子常量
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: SEED_CATEGORIES.map((category) => ({ ...category })),
    cards: SEED_CARDS.map((card) => ({ ...card, tags: [...card.tags] })),
    savedAt: SEED_TIME,
  };
}
