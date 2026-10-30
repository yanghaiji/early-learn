/**
 * 学习进度领域服务（纯函数，无浏览器依赖）。对应 NFR/v0.4/技术方案.md §2.2
 *
 * 一律返回新文档、不改入参：ProgressDocument 会被 store 直接引用做相等判断。
 * 「取消收藏 / 取消标记」都靠再次调用同一函数完成，不另设反向方法。
 */

import { RECENT_MAX, REVIEW_ROUND_MAX } from '../constants';
import type { Card, CardId, Difficulty } from '../entities/card';
import type { MarkStatus, ProgressDocument } from '../entities/progress';
import { shuffle, type Rng } from './random';

/** 在则移除、不在则插入队头（收藏时间倒序；收藏列表只存 id，不需时间戳） */
export function toggleFavorite(doc: ProgressDocument, cardId: CardId): ProgressDocument {
  const favorites = doc.favorites.includes(cardId)
    ? doc.favorites.filter((id) => id !== cardId)
    : [cardId, ...doc.favorites];
  return { ...doc, favorites };
}

/** 去重后插入队头，截断到 RECENT_MAX；空 id 忽略 */
export function touchRecent(doc: ProgressDocument, cardId: CardId, at: string): ProgressDocument {
  if (!cardId) return doc;
  const rest = doc.recent.filter((entry) => entry.cardId !== cardId);
  return { ...doc, recent: [{ cardId, at }, ...rest].slice(0, RECENT_MAX) };
}

/** status = null 表示删键（支持「再点一次取消标记」） */
export function setMark(
  doc: ProgressDocument,
  cardId: CardId,
  status: MarkStatus | null,
  at: string,
): ProgressDocument {
  const marks = { ...doc.marks };
  if (status === null) {
    delete marks[cardId];
  } else {
    marks[cardId] = { status, at };
  }
  return { ...doc, marks };
}

/** 按现存卡片 id 过滤三处集合；用于仓储加载与卡片删除后剪枝 */
export function prune(doc: ProgressDocument, existingIds: ReadonlySet<CardId>): ProgressDocument {
  return {
    ...doc,
    favorites: doc.favorites.filter((id) => existingIds.has(id)),
    recent: doc.recent.filter((entry) => existingIds.has(entry.cardId)),
    marks: Object.fromEntries(
      Object.entries(doc.marks).filter(([id]) => existingIds.has(id)),
    ) as ProgressDocument['marks'],
  };
}

export function isFavorite(doc: ProgressDocument, cardId: CardId): boolean {
  return doc.favorites.includes(cardId);
}

export function markOf(doc: ProgressDocument, cardId: CardId): MarkStatus | undefined {
  return doc.marks[cardId]?.status;
}

/** 统计默认只算仍存在的卡（传入 existingIds 时），避免删卡后数字虚高 */
function countByStatus(doc: ProgressDocument, status: MarkStatus, existingIds?: ReadonlySet<CardId>): number {
  return Object.entries(doc.marks).filter(
    ([id, entry]) => entry.status === status && (!existingIds || existingIds.has(id)),
  ).length;
}

export function knownCount(doc: ProgressDocument, existingIds?: ReadonlySet<CardId>): number {
  return countByStatus(doc, 'known', existingIds);
}

export function unknownCount(doc: ProgressDocument, existingIds?: ReadonlySet<CardId>): number {
  return countByStatus(doc, 'unknown', existingIds);
}

/**
 * 复习队列（ADR-P4 硬规则）：只取标记「不认识」且仍存在的卡，
 * 按 difficulty 升序、同级随机（rng 注入可确定性重放），截断到每轮上限。
 * 每次进入 /review 现算，不持久化（技术方案 §4.4）。
 */
export function buildReviewQueue(
  doc: ProgressDocument,
  cards: readonly Card[],
  limit: number = REVIEW_ROUND_MAX,
  rng: Rng = Math.random,
): Card[] {
  const unknowns = cards.filter((card) => markOf(doc, card.id) === 'unknown');
  const byLevel = new Map<Difficulty, Card[]>();
  for (const card of unknowns) {
    const bucket = byLevel.get(card.difficulty);
    if (bucket) bucket.push(card);
    else byLevel.set(card.difficulty, [card]);
  }
  const ordered = [...byLevel.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, group]) => shuffle(group, rng));
  return limit > 0 ? ordered.slice(0, limit) : [];
}
