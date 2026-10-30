/**
 * 学习进度聚合（v0.4 B 组，ADR-P3）。本机唯一一份，只读 catalog 的卡片 id，不反向依赖。
 * 对应 NFR/v0.4/技术方案.md §2.1
 */

import type { CardId } from './card';

/** 「认识 / 不认识」标记只有两态，取消标记 = 键不存在 */
export type MarkStatus = 'known' | 'unknown';

export const MARK_STATUSES: readonly MarkStatus[] = ['known', 'unknown'];

/** 最近浏览的一条：同一 cardId 全文档唯一 */
export interface RecentEntry {
  cardId: CardId;
  /** ISO8601 时间戳 */
  at: string;
}

export interface MarkEntry {
  status: MarkStatus;
  at: string;
}

/** 聚合根：收藏 / 最近浏览 / 认识·不认识标记 */
export interface ProgressDocument {
  schemaVersion: 1;
  /** 顺序 = 收藏时间倒序（队头最新） */
  favorites: CardId[];
  /** ≤ RECENT_MAX，队头最新 */
  recent: RecentEntry[];
  /** 只存已标记的 */
  marks: Record<CardId, MarkEntry>;
}

/** 空文档：加载脏数据或首次访问时的初值 */
export const EMPTY_PROGRESS: ProgressDocument = Object.freeze({
  schemaVersion: 1,
  favorites: [],
  recent: [],
  marks: {},
});
