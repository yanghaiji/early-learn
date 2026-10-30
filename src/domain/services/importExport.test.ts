/** 导入导出领域服务单测 */

import { describe, expect, it } from 'vitest';
import { applyImport, buildExportBundle, exportFileName, planImport } from './importExport';
import { SCHEMA_VERSION } from '../constants';
import type { Card, CatalogDocument } from '../entities/card';
import type { Category } from '../entities/category';

const TIME = '2026-10-01T00:00:00.000Z';

function makeCategory(id: string, name: string, sortOrder = 1): Category {
  return { id, name, color: 'mint', sortOrder, createdAt: TIME, updatedAt: TIME };
}

function makeCard(id: string, zh: string, categoryId = 'animals', createdAt = TIME): Card {
  return {
    id,
    kind: 'object',
    categoryId,
    zh,
    pinyin: 'māo',
    en: 'cat',
    image: `assets/images/${categoryId}/${id}.webp`,
    tags: [],
    difficulty: 1,
    sortOrder: 1,
    createdAt,
    updatedAt: TIME,
  };
}

const current: CatalogDocument = {
  schemaVersion: SCHEMA_VERSION,
  categories: [makeCategory('animals', '动物')],
  cards: [makeCard('cat', '猫'), makeCard('dog', '狗')],
  savedAt: TIME,
};

describe('buildExportBundle', () => {
  it('should_attach_app_metadata_without_mutating_document', () => {
    const bundle = buildExportBundle(current, '0.1.0', '2026-10-28T00:00:00.000Z');
    expect(bundle.app).toBe('early-learn');
    expect(bundle.appVersion).toBe('0.1.0');
    expect(bundle.exportedAt).toBe('2026-10-28T00:00:00.000Z');
    expect(bundle.cards).toBe(current.cards);
    expect(current).not.toHaveProperty('app');
  });
});

describe('planImport', () => {
  it('should_count_added_and_updated_when_merging', () => {
    const plan = planImport(
      current,
      {
        categories: [makeCategory('animals', '动物'), makeCategory('fruit', '水果', 2)],
        cards: [makeCard('cat', '猫猫'), makeCard('fish', '鱼')],
      },
      'merge',
    );
    expect(plan).toEqual({
      mode: 'merge',
      categoriesAdded: 1,
      categoriesUpdated: 1,
      categoriesTotal: 2,
      cardsAdded: 1,
      cardsUpdated: 1,
      cardsRemoved: 0,
      cardsTotal: 3,
    });
  });

  it('should_count_removed_cards_when_replacing', () => {
    const plan = planImport(current, { categories: [], cards: [makeCard('cat', '猫')] }, 'replace');
    expect(plan.cardsRemoved).toBe(1);
    expect(plan.cardsTotal).toBe(1);
    expect(plan.categoriesTotal).toBe(0);
  });
});

describe('applyImport', () => {
  it('should_keep_original_created_at_when_merging_existing_card', () => {
    const next = applyImport(
      current,
      { categories: [], cards: [makeCard('cat', '猫猫', 'animals', '2026-12-01T00:00:00.000Z')] },
      'merge',
      '2027-01-01T00:00:00.000Z',
    );
    const merged = next.cards.find((card) => card.id === 'cat');
    expect(merged?.zh).toBe('猫猫');
    expect(merged?.createdAt).toBe(TIME);
    expect(next.savedAt).toBe('2027-01-01T00:00:00.000Z');
    expect(next.cards).toHaveLength(2);
  });

  it('should_replace_everything_in_replace_mode', () => {
    const next = applyImport(
      current,
      { categories: [makeCategory('fruit', '水果')], cards: [makeCard('apple', '苹果', 'fruit')] },
      'replace',
      '2027-01-01T00:00:00.000Z',
    );
    expect(next.categories.map((item) => item.id)).toEqual(['fruit']);
    expect(next.cards.map((item) => item.id)).toEqual(['apple']);
    expect(next.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('should_not_mutate_current_document', () => {
    applyImport(current, { categories: [], cards: [] }, 'merge', '2027-01-01T00:00:00.000Z');
    expect(current.cards).toHaveLength(2);
  });
});

describe('exportFileName', () => {
  it('should_format_as_early_learn_timestamp_json', () => {
    expect(exportFileName(new Date(2026, 9, 28, 9, 5))).toBe('early-learn-20261028-0905.json');
  });
});
