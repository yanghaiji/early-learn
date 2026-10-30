/** 仓储实现单测：校验、排序、级联删除、批量导入 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createCardRepository } from './localCardRepository';
import { createCategoryRepository } from './localCategoryRepository';
import { createCatalogStorage, type CatalogStorage } from '../storage/catalogStorage';
import { NotFoundError, ValidationError } from '../../domain/errors';
import { SCHEMA_VERSION } from '../../domain/constants';
import type { CatalogDocument } from '../../domain/entities/card';
import { MemoryStorage } from '../../test/memoryStorage';

const TIME = '2026-10-01T00:00:00.000Z';

function seed(): CatalogDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: [
      { id: 'animals', name: '动物', color: 'mint', sortOrder: 1, createdAt: TIME, updatedAt: TIME },
      { id: 'fruit', name: '水果', color: 'coral', sortOrder: 2, createdAt: TIME, updatedAt: TIME },
    ],
    cards: [
      {
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
      },
    ],
    savedAt: TIME,
  };
}

let storage: CatalogStorage;

beforeEach(() => {
  storage = createCatalogStorage({ storage: new MemoryStorage(), seed });
  storage.load();
});

describe('categoryRepository', () => {
  it('should_append_with_next_sort_order_when_creating', async () => {
    const repo = createCategoryRepository({ storage });
    const created = await repo.create({ name: '蔬菜', color: 'leaf' });
    expect(created.sortOrder).toBe(3);
    expect((await repo.list()).map((item) => item.name)).toEqual(['动物', '水果', '蔬菜']);
  });

  it('should_reject_duplicated_name_when_creating', async () => {
    const repo = createCategoryRepository({ storage });
    await expect(repo.create({ name: ' 动物 ', color: 'mint' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('should_trim_and_update_fields_when_updating', async () => {
    const repo = createCategoryRepository({ storage });
    const updated = await repo.update('animals', { name: '  小动物  ', nameEn: ' Animals ' });
    expect(updated.name).toBe('小动物');
    expect(updated.nameEn).toBe('Animals');
  });

  it('should_throw_not_found_when_updating_missing_category', async () => {
    const repo = createCategoryRepository({ storage });
    await expect(repo.update('ghost', { name: '幽灵' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should_reorder_categories_by_given_ids', async () => {
    const repo = createCategoryRepository({ storage });
    await repo.reorder(['fruit', 'animals']);
    expect((await repo.list()).map((item) => item.id)).toEqual(['fruit', 'animals']);
  });

  it('should_cascade_delete_cards_when_removing_category', async () => {
    const repo = createCategoryRepository({ storage });
    const result = await repo.remove('animals');
    expect(result.removedCategories).toBe(1);
    expect(result.removedCards).toBe(1);
    expect(storage.get().cards).toHaveLength(0);
  });
});

describe('cardRepository', () => {
  it('should_create_card_with_next_sort_order_in_category', async () => {
    const repo = createCardRepository({ storage });
    const created = await repo.create({
      kind: 'object',
      categoryId: 'animals',
      zh: '狗',
      pinyin: 'gǒu',
      en: 'dog',
      image: 'assets/images/animals/dog.webp',
    });
    expect(created.sortOrder).toBe(2);
    expect(created.difficulty).toBe(1);
    expect(created.tags).toEqual([]);
  });

  it('should_reject_unknown_category_when_creating', async () => {
    const repo = createCardRepository({ storage });
    await expect(
      repo.create({
        kind: 'object',
        categoryId: 'ghost',
        zh: '鬼',
        pinyin: 'guǐ',
        en: 'ghost',
        image: 'x.webp',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should_reject_character_card_without_strokes', async () => {
    const repo = createCardRepository({ storage });
    await expect(
      repo.create({
        kind: 'character',
        categoryId: 'animals',
        zh: '人',
        pinyin: 'rén',
        en: 'person',
        image: 'x.webp',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should_lowercase_pinyin_when_saving', async () => {
    const repo = createCardRepository({ storage });
    const created = await repo.create({
      kind: 'object',
      categoryId: 'animals',
      zh: '狗',
      pinyin: 'Gǒu',
      en: 'dog',
      image: 'x.webp',
    });
    expect(created.pinyin).toBe('gǒu');
  });

  it('should_update_content_but_keep_created_at', async () => {
    const repo = createCardRepository({ storage });
    const updated = await repo.update('animals-cat', { zh: '小猫', en: 'kitten' });
    expect(updated.zh).toBe('小猫');
    expect(updated.createdAt).toBe(TIME);
  });

  it('should_throw_not_found_when_removing_missing_card', async () => {
    const repo = createCardRepository({ storage });
    await expect(repo.remove('ghost')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should_filter_by_category_and_keyword', async () => {
    const repo = createCardRepository({ storage });
    await repo.create({
      kind: 'object',
      categoryId: 'fruit',
      zh: '苹果',
      pinyin: 'píng guǒ',
      en: 'apple',
      image: 'x.webp',
    });
    expect((await repo.listByCategory('fruit')).map((item) => item.zh)).toEqual(['苹果']);
    expect((await repo.search('pingguo')).map((item) => item.zh)).toEqual(['苹果']);
  });

  it('should_count_inserted_and_updated_in_bulk_upsert', async () => {
    const repo = createCardRepository({ storage });
    const result = await repo.bulkUpsert([
      {
        id: 'animals-cat',
        kind: 'object',
        categoryId: 'animals',
        zh: '猫猫',
        pinyin: 'māo',
        en: 'cat',
        image: 'x.webp',
      },
      {
        kind: 'object',
        categoryId: 'fruit',
        zh: '香蕉',
        pinyin: 'xiāng jiāo',
        en: 'banana',
        image: 'x.webp',
      },
    ]);
    expect(result).toEqual({ inserted: 1, updated: 1 });
    expect(storage.get().cards).toHaveLength(2);
  });

  it('should_replace_all_cards_with_dense_sort_order', async () => {
    const repo = createCardRepository({ storage });
    await repo.replaceAll([
      {
        kind: 'object',
        categoryId: 'fruit',
        zh: '苹果',
        pinyin: 'píng guǒ',
        en: 'apple',
        image: 'x.webp',
      },
      {
        kind: 'object',
        categoryId: 'fruit',
        zh: '香蕉',
        pinyin: 'xiāng jiāo',
        en: 'banana',
        image: 'y.webp',
      },
    ]);
    expect(storage.get().cards.map((card) => card.sortOrder)).toEqual([1, 2]);
  });
});
