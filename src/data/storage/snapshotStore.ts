/**
 * 内容快照端口与保留策略。对应 NFR/v0.9 §6。
 *
 * 业务主数据仍存 localStorage；快照另放 IndexedDB（独立库，避免与主文档抢 5 MB 配额）。
 * 端口化的目的：测试用内存实现、隐私模式用「不支持」降级，两边都不需要 fake-indexeddb（ADR-X5）。
 * 本文件只做「建 / 列 / 取 / 删」四件事，恢复时的二次校验与写入由调用方负责（T-X11）。
 */

import type { CatalogDocument } from '../../domain/entities/card';

/** 快照来源：写进记录里给家长看「这份是什么时候、因为什么备的」 */
export type SnapshotLabel =
  | 'manual'
  | 'before-import'
  | 'before-replace'
  | 'before-csv'
  | 'before-reset'
  | 'before-restore';

/** 来源的中文说法（面板直接渲染，不再二次翻译） */
export const SNAPSHOT_LABEL_TEXT: Record<SnapshotLabel, string> = {
  manual: '手动备份',
  'before-import': '导入前',
  'before-replace': '替换前',
  'before-csv': 'CSV 录入前',
  'before-reset': '重置前',
  'before-restore': '恢复前',
};

export interface SnapshotRecord {
  id: string;
  /** ISO 时间，同时是「最旧一条」的排序依据 */
  createdAt: string;
  label: SnapshotLabel;
  cards: number;
  categories: number;
  /**
   * 体积估算：`JSON.stringify(doc).length`（字符数，与方案 §6.1 同口径）。
   * 它不是精确字节数，只用来挡「单份超过 8 MB」这一档。
   */
  bytes: number;
  doc: CatalogDocument;
}

/** 快照存取端口：IndexedDB 实现与内存实现都套这一层 */
export interface SnapshotPort {
  list(): Promise<SnapshotRecord[]>;
  put(record: SnapshotRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

/** 保留份数：超出淘汰 `createdAt` 最旧的一条 */
export const SNAPSHOT_KEEP = 5;
/** 单份上限 8 MB（按 `bytes` 估算口径） */
export const SNAPSHOT_MAX_BYTES = 8 * 1024 * 1024;

export type SnapshotCreateResult =
  | { ok: true; record: SnapshotRecord }
  | { ok: false; reason: 'too-large'; bytes: number };

export interface SnapshotStoreOptions {
  port: SnapshotPort;
  now?: () => string;
  /** 默认 `SNAPSHOT_KEEP`；测试可注入小值 */
  keep?: number;
  /** 默认 `SNAPSHOT_MAX_BYTES`；测试可注入小值 */
  maxBytes?: number;
}

export interface SnapshotStore {
  /** 建一份快照；超限时返回原因且**不写入** */
  create(doc: CatalogDocument, label: SnapshotLabel): Promise<SnapshotCreateResult>;
  /** 新在前、旧在后 */
  list(): Promise<SnapshotRecord[]>;
  /** 取出待恢复的文档；找不到返回 null（由调用方决定提示） */
  restore(id: string): Promise<CatalogDocument | null>;
  remove(id: string): Promise<void>;
}

/** 体积估算：与方案 §6.1 同口径，中文按 1 个字符计 */
export function estimateSnapshotBytes(doc: CatalogDocument): number {
  return JSON.stringify(doc).length;
}

/** id 末尾的序号，用于同一毫秒内多次备份的稳定排序 */
function sequenceOf(record: SnapshotRecord): number {
  const match = /-(\d+)$/.exec(record.id);
  return match ? Number(match[1]) : 0;
}

function newestFirst(records: readonly SnapshotRecord[]): SnapshotRecord[] {
  return [...records].sort((left, right) => {
    if (left.createdAt !== right.createdAt) return left.createdAt < right.createdAt ? 1 : -1;
    return sequenceOf(right) - sequenceOf(left);
  });
}

export function createSnapshotStore({
  port,
  now = () => new Date().toISOString(),
  keep = SNAPSHOT_KEEP,
  maxBytes = SNAPSHOT_MAX_BYTES,
}: SnapshotStoreOptions): SnapshotStore {
  const size = Math.max(1, keep);

  const list = async (): Promise<SnapshotRecord[]> => newestFirst(await port.list());

  return {
    async create(doc, label) {
      const bytes = estimateSnapshotBytes(doc);
      if (bytes > maxBytes) return { ok: false, reason: 'too-large', bytes };

      const createdAt = now();
      const sequence = (await port.list()).length + 1;
      const record: SnapshotRecord = {
        id: `snap-${createdAt}-${sequence}`,
        createdAt,
        label,
        cards: doc.cards.length,
        categories: doc.categories.length,
        bytes,
        doc,
      };
      await port.put(record);

      // 先截断再删：keptIds 只含要留的，循环里不会再回读列表
      const keptIds = new Set((await list()).slice(0, size).map((item) => item.id));
      for (const item of await port.list()) {
        if (!keptIds.has(item.id)) await port.remove(item.id);
      }
      return { ok: true, record };
    },

    list,

    async restore(id) {
      const found = (await port.list()).find((item) => item.id === id);
      return found ? found.doc : null;
    },

    async remove(id) {
      await port.remove(id);
    },
  };
}
