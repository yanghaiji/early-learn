/** 进度仓储单测：脏数据回退空文档、静默降级、剪枝、持久化判定。对应 NFR/v0.4/技术方案.md §2.3 */

import { describe, expect, it } from 'vitest';
import type { ProgressDocument } from '../../domain/entities/progress';
import { EMPTY_PROGRESS } from '../../domain/entities/progress';
import { STORAGE_KEYS } from './keys';
import { createProgressRepository } from './progressStorage';
import { MemoryStorage } from '../../test/memoryStorage';

function makeRepo(storage: Storage | null) {
  return createProgressRepository({ storage });
}

const DOC: ProgressDocument = {
  schemaVersion: 1,
  favorites: ['animals-cat'],
  recent: [{ cardId: 'animals-dog', at: '2026-10-30T00:00:00.000Z' }],
  marks: { 'animals-cat': { status: 'known', at: '2026-10-30T00:00:00.000Z' } },
};

describe('createProgressRepository / load', () => {
  it('should_return_empty_when_nothing_stored', () => {
    expect(makeRepo(new MemoryStorage()).load()).toEqual(EMPTY_PROGRESS);
  });

  it('should_return_empty_when_storage_unavailable', () => {
    expect(makeRepo(null).load()).toEqual(EMPTY_PROGRESS);
  });

  it('should_parse_a_valid_document', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.progress, JSON.stringify(DOC));
    expect(makeRepo(storage).load()).toEqual(DOC);
  });

  it('should_fall_back_to_empty_when_json_broken', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.progress, '{broken');
    expect(makeRepo(storage).load()).toEqual(EMPTY_PROGRESS);
  });

  it('should_fall_back_to_empty_when_schema_invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.progress, JSON.stringify({ favorites: 'not-an-array' }));
    expect(makeRepo(storage).load()).toEqual(EMPTY_PROGRESS);
  });

  it('should_prune_ids_absent_from_existing_cards_when_provided', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.progress, JSON.stringify(DOC));
    const loaded = makeRepo(storage).load(new Set(['animals-cat']));
    expect(loaded.favorites).toEqual(['animals-cat']);
    // dog 不在现存集合里 → 最近浏览剪掉
    expect(loaded.recent).toEqual([]);
  });
});

describe('createProgressRepository / save & clear', () => {
  it('should_write_document_to_storage', () => {
    const storage = new MemoryStorage();
    makeRepo(storage).save(DOC);
    expect(storage.getItem(STORAGE_KEYS.progress)).toBe(JSON.stringify(DOC));
  });

  it('should_degrade_silently_when_storage_unavailable', () => {
    expect(() => makeRepo(null).save(DOC)).not.toThrow();
  });

  it('should_degrade_silently_on_quota_error', () => {
    const storage = new MemoryStorage();
    storage.failWriteAt = 1;
    expect(() => makeRepo(storage).save(DOC)).not.toThrow();
  });

  it('should_remove_the_key_on_clear', () => {
    const storage = new MemoryStorage();
    makeRepo(storage).save(DOC);
    makeRepo(storage).clear();
    expect(storage.getItem(STORAGE_KEYS.progress)).toBeNull();
  });

  it('should_not_throw_clear_when_storage_unavailable', () => {
    expect(() => makeRepo(null).clear()).not.toThrow();
  });
});

describe('createProgressRepository / isPersistent', () => {
  it('should_be_persistent_when_storage_present', () => {
    expect(makeRepo(new MemoryStorage()).isPersistent()).toBe(true);
  });

  it('should_not_be_persistent_when_storage_unavailable', () => {
    expect(makeRepo(null).isPersistent()).toBe(false);
  });

  it('should_not_be_persistent_when_write_probe_fails', () => {
    const storage = new MemoryStorage();
    storage.failWriteAt = 1;
    expect(makeRepo(storage).isPersistent()).toBe(false);
  });
});
