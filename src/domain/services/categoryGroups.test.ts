/** 首页段卡清单（v0.12）：22 个内置分类七段归类，自建分类落兜底段；段内首分类为封面代表 */

import { describe, expect, it } from 'vitest';
import { SEED_CATEGORIES } from '../../data/seed/categories';
import type { Category } from '../entities/category';
import {
  CATEGORY_GROUPS,
  FALLBACK_GROUP,
  findGroup,
  groupCategories,
  isGroupId,
} from './categoryGroups';

function customCategory(id: string): Category {
  return {
    id,
    name: `自建 ${id}`,
    color: 'mint',
    sortOrder: 99,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

describe('groupCategories', () => {
  it('should_sort_all_seed_categories_into_seven_groups_without_loss_or_duplicate', () => {
    const sections = groupCategories(SEED_CATEGORIES);
    // 22 个内置分类全落前七段，兜底段空被过滤
    expect(sections).toHaveLength(7);

    const ids = sections.flatMap((section) => section.items.map((item) => item.id));
    expect(ids).toHaveLength(SEED_CATEGORIES.length);
    expect(new Set(ids).size).toBe(SEED_CATEGORIES.length);
  });

  it('should_order_sections_as_plants_things_people_nature_character_poem_story', () => {
    expect(groupCategories(SEED_CATEGORIES).map((section) => section.group.id)).toEqual([
      'plants',
      'things',
      'people',
      'nature',
      'character',
      'poem',
      'story',
    ]);
  });

  it('should_put_object_categories_into_four_themed_groups_by_list_order', () => {
    const byId = new Map(
      groupCategories(SEED_CATEGORIES).map((section) => [section.group.id, section.items]),
    );

    expect(byId.get('plants')?.map((item) => item.id)).toEqual([
      'animals',
      'insects',
      'sea',
      'fruit',
      'vegetables',
    ]);
    expect(byId.get('things')?.map((item) => item.id)).toEqual([
      'vehicles',
      'school',
      'daily',
      'food',
      'clothes',
    ]);
    expect(byId.get('people')?.map((item) => item.id)).toEqual([
      'body',
      'verbs',
      'family',
      'jobs',
    ]);
    expect(byId.get('nature')?.map((item) => item.id)).toEqual(['weather', 'colors', 'shapes']);
  });

  it('should_order_poem_group_with_idioms_first_as_cover_representative', () => {
    const sections = groupCategories(SEED_CATEGORIES);
    const byId = new Map(sections.map((section) => [section.group.id, section.items]));

    // 诗文段封面取成语（内容量与入口权重更大），段内首分类即封面代表
    expect(byId.get('poem')?.map((item) => item.id)).toEqual(['idioms', 'poems']);
    expect(byId.get('character')?.map((item) => item.id)).toEqual(['characters', 'numbers']);
    expect(byId.get('story')?.map((item) => item.id)).toEqual(['stories']);
  });

  it('should_move_custom_category_into_fallback_group_when_not_in_any_group', () => {
    const sections = groupCategories([...SEED_CATEGORIES, customCategory('my-topic')]);
    expect(sections).toHaveLength(8);

    const last = sections.at(-1);
    expect(last?.group).toBe(FALLBACK_GROUP);
    expect(last?.items.map((item) => item.id)).toEqual(['my-topic']);
  });

  it('should_drop_empty_sections_when_no_category_matches', () => {
    const sections = groupCategories([customCategory('only-one')]);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.group.id).toBe('more');
  });
});

describe('isGroupId', () => {
  it('should_accept_every_listed_group_id_and_the_fallback', () => {
    for (const group of CATEGORY_GROUPS) {
      expect(isGroupId(group.id)).toBe(true);
    }
    expect(isGroupId('more')).toBe(true);
  });

  it('should_reject_retired_object_group_id_when_v012_replaced_it', () => {
    // v0.10 的认物大段 id 已退役，旧链接不该再被二级页接受
    expect(isGroupId('object')).toBe(false);
  });

  it('should_reject_unknown_id', () => {
    expect(isGroupId('nope')).toBe(false);
    expect(isGroupId('')).toBe(false);
  });
});

describe('findGroup', () => {
  it('should_return_spec_when_id_matches_a_listed_group', () => {
    expect(findGroup('plants')?.name).toBe('动物与植物');
    expect(findGroup('more')).toBe(FALLBACK_GROUP);
  });

  it('should_return_null_when_id_is_unknown', () => {
    expect(findGroup('object')).toBeNull();
    expect(findGroup('nope')).toBeNull();
  });
});
