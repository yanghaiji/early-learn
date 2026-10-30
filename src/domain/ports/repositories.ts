/**
 * 仓储端口。UI 只依赖本接口，不依赖 localStorage 实现（ADR-003）。
 * 方法一律 async：未来替换为 HTTP 实现时无需改动调用方。
 */

import type { Card, CardId, CardInput, CardPatch } from '../entities/card';
import type { Category, CategoryId, CategoryInput, CategoryPatch } from '../entities/category';

export interface RemoveCategoryResult {
  removedCategories: number;
  removedCards: number;
}

export interface BulkUpsertResult {
  inserted: number;
  updated: number;
}

export interface CategoryRepository {
  list(): Promise<Category[]>;
  get(id: CategoryId): Promise<Category | undefined>;
  create(input: CategoryInput): Promise<Category>;
  update(id: CategoryId, patch: CategoryPatch): Promise<Category>;
  remove(id: CategoryId): Promise<RemoveCategoryResult>;
  reorder(orderedIds: CategoryId[]): Promise<void>;
}

export interface CardRepository {
  listAll(): Promise<Card[]>;
  listByCategory(categoryId: CategoryId): Promise<Card[]>;
  get(id: CardId): Promise<Card | undefined>;
  search(keyword: string): Promise<Card[]>;
  create(input: CardInput): Promise<Card>;
  update(id: CardId, patch: CardPatch): Promise<Card>;
  remove(id: CardId): Promise<void>;
  bulkUpsert(cards: CardInput[]): Promise<BulkUpsertResult>;
  replaceAll(cards: CardInput[]): Promise<void>;
}

export interface Repositories {
  categories: CategoryRepository;
  cards: CardRepository;
}
