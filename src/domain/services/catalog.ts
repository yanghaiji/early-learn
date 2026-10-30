/** 目录领域服务：纯函数，无副作用，可 100% 单测。对应 NFR §3.3 */

import type { Card, CardId } from '../entities/card';
import type { Category, CategoryId } from '../entities/category';

/** 去首尾空白并压缩内部空白 */
export function normalizeSpace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** 比较用归一化（大小写 + 空白） */
export function normalizeForCompare(text: string): string {
  return normalizeSpace(text).toLowerCase();
}

/** 去掉拼音声调，便于「pingguo」也能搜到「píng guǒ」 */
export function stripTones(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function sortCards(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function cardsOfCategory(cards: readonly Card[], categoryId: CategoryId): Card[] {
  return sortCards(cards.filter((card) => card.categoryId === categoryId));
}

export function countCardsByCategory(cards: readonly Card[]): Record<CategoryId, number> {
  return cards.reduce<Record<CategoryId, number>>((acc, card) => {
    acc[card.categoryId] = (acc[card.categoryId] ?? 0) + 1;
    return acc;
  }, {});
}

/** 管理区搜索：中文 / 英文 / 拼音（含无声调输入） */
export function searchCards(cards: readonly Card[], keyword: string): Card[] {
  const raw = normalizeForCompare(keyword);
  if (!raw) return [...cards];
  const plain = stripTones(keyword);
  return cards.filter((card) => {
    if (normalizeForCompare(card.zh).includes(raw)) return true;
    if (normalizeForCompare(card.en).includes(raw)) return true;
    if (normalizeSpace(card.pinyin).toLowerCase().includes(raw)) return true;
    if (plain && stripTones(card.pinyin).includes(plain)) return true;
    return card.tags.some((tag) => normalizeForCompare(tag).includes(raw));
  });
}

export interface CardSequence {
  list: Card[];
  index: number;
  card: Card | undefined;
  hasPrev: boolean;
  hasNext: boolean;
}

/** 构建详情页翻页上下文：同分类内按 sortOrder 排序（可传入筛选器，如只看当前分组） */
export function buildCardSequence(
  cards: readonly Card[],
  cardId: CardId,
  categoryId: CategoryId,
  filter?: (card: Card) => boolean,
): CardSequence {
  const list = cardsOfCategory(cards, categoryId).filter(filter ?? (() => true));
  const index = list.findIndex((card) => card.id === cardId);
  return {
    list,
    index,
    card: index >= 0 ? list[index] : undefined,
    hasPrev: index > 0,
    hasNext: index >= 0 && index < list.length - 1,
  };
}

/** 分类内下一张可用排序值（追加到末尾） */
export function nextSortOrder(items: readonly { sortOrder: number }[]): number {
  return items.reduce((max, item) => (item.sortOrder > max ? item.sortOrder : max), 0) + 1;
}

/** 文本首字（图片兜底占位用） */
export function firstChar(text: string): string {
  return Array.from(text.trim())[0] ?? '?';
}
