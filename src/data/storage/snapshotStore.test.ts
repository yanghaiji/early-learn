/** 快照端口与保留策略单测（NFR/v0.9 §6）。端口用内存实现，不需要 fake-indexeddb（ADR-X5） */

import { describe, expect, it } from 'vitest';
import type { Card, CatalogDocument } from '../../domain/entities/card';
import type { Category } from '../../domain/entities/category';
import { createMemorySnapshotPort } from '../../test/snapshotPort';
import {
  SNAPSHOT_KEEP,
  SNAPSHOT_LABEL_TEXT,
  SNAPSHOT_MAX_BYTES,
  createSnapshotStore,
  estimateSnapshotBytes,
} from './snapshotStore';

const AT = '2026-10-31T00:00:00.000Z';

const CATEGORY: Category = {
  id: 'animals',
  name: '动物',
  color: 'mint',
  sortOrder: 1,
  createdAt: AT,
  updatedAt: AT,
};

function makeCard(index: number): Card {
  return {
    id: `card-${index}`,
    kind: 'object',
    categoryId: CATEGORY.id,
    zh: '狗',
    pinyin: 'gǒu',
    en: 'dog',
    image: 'dog.png',
    tags: [],
    difficulty: 1,
    sortOrder: index,
    createdAt: AT,
    updatedAt: AT,
  };
}

function makeDoc(cards: number): CatalogDocument {
  return {
    schemaVersion: 1,
    categories: [CATEGORY],
    cards: Array.from({ length: cards }, (_, index) => makeCard(index)),
    savedAt: AT,
  };
}

/** 逐次 +1 秒，保证 createdAt 严格递增 */
function makeClock() {
  let tick = 0;
  return () => `2026-10-31T00:00:${String(tick++).padStart(2, '0')}.000Z`;
}

describe('createSnapshotStore / create', () => {
  it('should_record_counts_bytes_and_label_when_document_is_accepted', async () => {
    const port = createMemorySnapshotPort();
    const store = createSnapshotStore({ port, now: makeClock() });
    const doc = makeDoc(2);

    const result = await store.create(doc, 'manual');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.id.startsWith('snap-')).toBe(true);
    expect(result.record.label).toBe('manual');
    expect(result.record.cards).toBe(2);
    expect(result.record.categories).toBe(1);
    expect(result.record.bytes).toBe(estimateSnapshotBytes(doc));
    expect(port.records).toHaveLength(1);
  });

  it('should_refuse_without_writing_when_document_exceeds_max_bytes', async () => {
    const port = createMemorySnapshotPort();
    const store = createSnapshotStore({ port, maxBytes: 64 });

    const result = await store.create(makeDoc(2), 'manual');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('too-large');
    expect(result.bytes).toBeGreaterThan(64);
    // 超限只报原因，不落库 —— 否则「备份」会先把配额吃掉再失败
    expect(port.records).toHaveLength(0);
  });
});

describe('createSnapshotStore / 保留策略', () => {
  it('should_keep_only_five_newest_when_a_sixth_is_created', async () => {
    const port = createMemorySnapshotPort();
    const store = createSnapshotStore({ port, now: makeClock() });

    const ids: string[] = [];
    for (let index = 0; index < SNAPSHOT_KEEP + 1; index += 1) {
      const result = await store.create(makeDoc(1), 'manual');
      if (!result.ok) throw new Error('期望创建成功');
      ids.push(result.record.id);
    }

    const listed = await store.list();
    expect(listed).toHaveLength(SNAPSHOT_KEEP);
    // 最早那份被淘汰，其余按新在前排列
    expect(listed.map((item) => item.id)).toEqual([...ids].reverse().slice(0, SNAPSHOT_KEEP));
  });

  it('should_list_newest_first_when_records_were_written_out_of_order', async () => {
    const port = createMemorySnapshotPort();
    const store = createSnapshotStore({ port, now: makeClock() });
    await store.create(makeDoc(1), 'before-import');
    await store.create(makeDoc(2), 'before-replace');

    const listed = await store.list();

    expect(listed[0]?.createdAt).toBe('2026-10-31T00:00:01.000Z');
    expect(listed[1]?.createdAt).toBe('2026-10-31T00:00:00.000Z');
  });
});

describe('createSnapshotStore / 取与删', () => {
  it('should_return_stored_document_when_restoring_an_existing_id', async () => {
    const port = createMemorySnapshotPort();
    const store = createSnapshotStore({ port, now: makeClock() });
    const doc = makeDoc(3);
    const created = await store.create(doc, 'before-import');
    if (!created.ok) throw new Error('期望创建成功');

    await expect(store.restore(created.record.id)).resolves.toEqual(doc);
  });

  it('should_return_null_when_restoring_an_unknown_id', async () => {
    const port = createMemorySnapshotPort();
    const store = createSnapshotStore({ port, now: makeClock() });

    await expect(store.restore('snap-missing')).resolves.toBeNull();
  });

  it('should_drop_the_record_when_removed', async () => {
    const port = createMemorySnapshotPort();
    const store = createSnapshotStore({ port, now: makeClock() });
    const created = await store.create(makeDoc(1), 'manual');
    if (!created.ok) throw new Error('期望创建成功');

    await store.remove(created.record.id);

    await expect(store.list()).resolves.toEqual([]);
  });
});

describe('快照常量', () => {
  it('should_name_every_label_in_chinese', () => {
    expect(Object.keys(SNAPSHOT_LABEL_TEXT)).toHaveLength(6);
    for (const text of Object.values(SNAPSHOT_LABEL_TEXT)) expect(text.length).toBeGreaterThan(0);
    expect(SNAPSHOT_LABEL_TEXT['before-csv']).toBe('CSV 录入前');
    expect(SNAPSHOT_KEEP).toBe(5);
    expect(SNAPSHOT_MAX_BYTES).toBe(8 * 1024 * 1024);
  });
});
