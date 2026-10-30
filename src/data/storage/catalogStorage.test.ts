/** 本地存储适配器单测：种子、损坏恢复、版本降级、配额、悬空卡片修复 */

import { describe, expect, it, vi } from 'vitest';
import {
  createCatalogStorage,
  StorageQuotaError,
  StorageUnavailableError,
} from './catalogStorage';
import { STORAGE_KEYS } from './keys';
import { SCHEMA_VERSION, UNCATEGORIZED_ID } from '../../domain/constants';
import type { Card, CatalogDocument } from '../../domain/entities/card';
import type { Category } from '../../domain/entities/category';
import { MemoryStorage } from '../../test/memoryStorage';

const TIME = '2026-10-01T00:00:00.000Z';
const NOW = () => '2026-10-28T00:00:00.000Z';

const CATEGORY: Category = {
  id: 'animals',
  name: '动物',
  color: 'mint',
  sortOrder: 1,
  createdAt: TIME,
  updatedAt: TIME,
};

const CARD: Card = {
  id: 'animals-cat',
  kind: 'object',
  categoryId: 'animals',
  zh: '猫',
  pinyin: 'māo',
  en: 'cat',
  image: 'assets/images/animals/cat.webp',
  tags: [],
  difficulty: 1,
  sortOrder: 1,
  createdAt: TIME,
  updatedAt: TIME,
};

function seedDocument(): CatalogDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: [{ ...CATEGORY }],
    cards: [{ ...CARD, tags: [] }],
    savedAt: TIME,
  };
}

function makeStorage(storage: Storage | null) {
  return createCatalogStorage({ storage, seed: seedDocument, now: NOW });
}

/** 带内置内容版本的实例：用于覆盖种子增量升级 */
function makeVersionedStorage(storage: Storage | null, seedVersion: number) {
  return createCatalogStorage({ storage, seed: seedDocument, seedVersion, now: NOW });
}

describe('createCatalogStorage / load', () => {
  it('should_return_readonly_seed_when_storage_unavailable', () => {
    const result = makeStorage(null).load();
    expect(result.status).toBe('readonly');
    expect(result.doc.categories).toHaveLength(1);
    expect(result.message).toContain('无法保存');
  });

  it('should_write_seed_on_first_load', () => {
    const storage = new MemoryStorage();
    const result = makeStorage(storage).load();
    expect(result.status).toBe('ready');
    expect(storage.getItem(STORAGE_KEYS.catalog)).not.toBeNull();
  });

  it('should_cache_load_result', () => {
    const storage = new MemoryStorage();
    const catalog = makeStorage(storage);
    expect(catalog.load()).toBe(catalog.load());
  });

  it('should_backup_and_recover_when_json_broken', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.catalog, '{broken json');
    const result = makeStorage(storage).load();
    expect(result.status).toBe('corrupted');
    expect(storage.getItem(STORAGE_KEYS.corrupted)).toBe('{broken json');
    expect(result.message).toContain('损坏');
  });

  it('should_downgrade_to_readonly_when_schema_version_is_newer', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.catalog, JSON.stringify({ ...seedDocument(), schemaVersion: 99 }));
    const result = makeStorage(storage).load();
    expect(result.status).toBe('readonly');
    expect(result.message).toContain('更新版本');
  });

  it('should_repair_dangling_cards_into_uncategorized', () => {
    const storage = new MemoryStorage();
    const doc = seedDocument();
    doc.cards = [{ ...CARD, categoryId: 'ghost' }];
    storage.setItem(STORAGE_KEYS.catalog, JSON.stringify(doc));

    const result = makeStorage(storage).load();
    expect(result.status).toBe('ready');
    expect(result.doc.categories.some((item) => item.id === UNCATEGORIZED_ID)).toBe(true);
    expect(result.doc.cards[0]?.categoryId).toBe(UNCATEGORIZED_ID);
    expect(result.message).toContain('未分类');
  });

  it('should_fall_back_to_readonly_when_seed_write_is_rejected', () => {
    const storage = new MemoryStorage();
    storage.failWriteAt = 1;
    const result = makeStorage(storage).load();
    expect(result.status).toBe('readonly');
  });

  it('should_dedupe_categories_and_cards_by_id', () => {
    const storage = new MemoryStorage();
    const doc = seedDocument();
    doc.categories = [{ ...CATEGORY }, { ...CATEGORY }];
    doc.cards = [{ ...CARD, tags: [] }, { ...CARD, zh: '猫猫', tags: [] }];
    storage.setItem(STORAGE_KEYS.catalog, JSON.stringify(doc));

    const result = makeStorage(storage).load();
    expect(result.doc.categories).toHaveLength(1);
    expect(result.doc.cards).toHaveLength(1);
  });
});

describe('createCatalogStorage / mutate', () => {
  it('should_persist_and_update_cache_when_writable', () => {
    const storage = new MemoryStorage();
    const catalog = makeStorage(storage);
    catalog.load();

    const next = catalog.mutate((doc) => ({
      ...doc,
      cards: [...doc.cards, { ...CARD, id: 'animals-dog', zh: '狗', tags: [] }],
    }));

    expect(next.cards).toHaveLength(2);
    expect(catalog.get().cards).toHaveLength(2);
    expect(storage.getItem(STORAGE_KEYS.catalog)).toContain('animals-dog');
  });

  it('should_throw_unavailable_when_readonly', () => {
    const catalog = makeStorage(null);
    expect(() => catalog.mutate((doc) => doc)).toThrow(StorageUnavailableError);
  });

  it('should_map_quota_error_when_write_fails', () => {
    const storage = new MemoryStorage();
    const catalog = makeStorage(storage);
    catalog.load();
    storage.failWriteAt = 2;

    expect(() => catalog.mutate((doc) => doc)).toThrow(StorageQuotaError);
  });

  it('should_store_auto_backup_when_requested', () => {
    const storage = new MemoryStorage();
    const catalog = makeStorage(storage);
    catalog.load();
    catalog.mutate((doc) => doc, { backup: true });
    expect(storage.getItem(STORAGE_KEYS.autoBackup)).not.toBeNull();
  });
});

describe('createCatalogStorage / misc', () => {
  it('should_replace_document_and_reset_status', () => {
    const storage = new MemoryStorage();
    const catalog = makeStorage(storage);
    catalog.load();
    catalog.replace({ ...seedDocument(), cards: [] });
    expect(catalog.get().cards).toHaveLength(0);
    expect(catalog.getStatus()).toBe('ready');
  });

  it('should_report_usage_bytes_of_own_keys_only', () => {
    const storage = new MemoryStorage();
    storage.setItem('other-app:data', 'x'.repeat(100));
    const catalog = makeStorage(storage);
    catalog.load();

    const raw = storage.getItem(STORAGE_KEYS.catalog) ?? '';
    const metaRaw = storage.getItem(STORAGE_KEYS.meta) ?? '';
    const expected =
      (STORAGE_KEYS.catalog.length + raw.length) * 2 +
      (STORAGE_KEYS.meta.length + metaRaw.length) * 2;
    expect(catalog.usageBytes()).toBe(expected);
  });

  it('should_merge_new_seed_cards_when_seed_version_increased', () => {
    const storage = new MemoryStorage();
    // 旧版本数据：只有分类没有卡片
    storage.setItem(
      STORAGE_KEYS.catalog,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, categories: [CATEGORY], cards: [], savedAt: TIME }),
    );
    storage.setItem(STORAGE_KEYS.meta, JSON.stringify({ seedVersion: 1 }));

    const result = makeVersionedStorage(storage, 2).load();

    expect(result.status).toBe('ready');
    expect(result.doc.cards.map((card) => card.id)).toContain(CARD.id);
    expect(result.message).toContain('新增 1 张卡片');
    expect(storage.getItem(STORAGE_KEYS.meta)).toContain('"seedVersion":2');
  });

  it('should_keep_parent_edits_when_merging_new_seed_cards', () => {
    const storage = new MemoryStorage();
    // 家长把「猫」改成了「猫咪」
    storage.setItem(
      STORAGE_KEYS.catalog,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        categories: [CATEGORY],
        cards: [{ ...CARD, zh: '猫咪', tags: [] }],
        savedAt: TIME,
      }),
    );
    storage.setItem(STORAGE_KEYS.meta, JSON.stringify({ seedVersion: 1 }));

    // 新种子：同一个 id 仍叫「猫」，另多了一张「狗」
    const seedWithMore = (): CatalogDocument => ({
      schemaVersion: SCHEMA_VERSION,
      categories: [{ ...CATEGORY }],
      cards: [{ ...CARD, tags: [] }, { ...CARD, id: 'animals-dog', zh: '狗', tags: [] }],
      savedAt: TIME,
    });
    const result = createCatalogStorage({
      storage,
      seed: seedWithMore,
      seedVersion: 2,
      now: NOW,
    }).load();

    // 只增不改：家长改过的「猫咪」不被种子的「猫」覆盖，新卡「狗」被补齐
    expect(result.doc.cards.find((card) => card.id === 'animals-cat')?.zh).toBe('猫咪');
    expect(result.doc.cards.some((card) => card.id === 'animals-dog')).toBe(true);
    expect(result.message).toContain('新增 1 张卡片');
  });

  it('should_skip_seed_merge_when_seed_version_already_applied', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEYS.catalog,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, categories: [CATEGORY], cards: [], savedAt: TIME }),
    );
    storage.setItem(STORAGE_KEYS.meta, JSON.stringify({ seedVersion: 2 }));

    const result = makeVersionedStorage(storage, 2).load();

    // 家长删掉的卡片不会因为同版本重开而复活
    expect(result.doc.cards).toHaveLength(0);
    expect(result.message).toBeUndefined();
  });

  it('should_notify_listener_on_storage_event_from_other_tab', () => {
    const storage = new MemoryStorage();
    const catalog = makeStorage(storage);
    const listener = vi.fn();
    const unsubscribe = catalog.subscribe(listener);

    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.catalog }));
    expect(listener).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', { key: 'other-key' }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.catalog }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
