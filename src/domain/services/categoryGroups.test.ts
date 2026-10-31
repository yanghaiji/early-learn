/** 首页分类墙分段（v0.10）：22 个内置分类四段归类，新建分类落兜底组 */

import { describe, expect, it } from 'vitest';
import { SEED_CATEGORIES } from '../../data/seed/categories';
import type { Category } from '../entities/category';
import { CATEGORY_GROUPS, FALLBACK_GROUP, groupCategories } from './categoryGroups';

const OBJECT_IDS = CATEGORY_GROUPS[0]?.ids ?? [];

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
  it('should_sort_all_seed_categories_into_four_groups_without_loss_or_duplicate', () => {
    const sections = groupCategories(SEED_CATEGORIES);
    expect(sections).toHaveLength(4);

    const ids = sections.flatMap((section) => section.items.map((item) => item.id));
    expect(ids).toHaveLength(SEED_CATEGORIES.length);
    expect(new Set(ids).size).toBe(SEED_CATEGORIES.length);
  });

  it('should_order_sections_as_object_character_poem_story', () => {
    expect(groupCategories(SEED_CATEGORIES).map((section) => section.group.id)).toEqual([
      'object',
      'character',
      'poem',
      'story',
    ]);
  });

  it('should_order_items_by_group_list_instead_of_category_sort_order', () => {
    const [object] = groupCategories(SEED_CATEGORIES);
    expect(object?.items).toHaveLength(17);
    // 组内顺序由分组清单决定，不按分类的 sortOrder 重排
    expect(object?.items.map((item) => item.id)).toEqual([...OBJECT_IDS]);
  });

  it('should_put_characters_poems_and_stories_in_their_own_groups', () => {
    const sections = groupCategories(SEED_CATEGORIES);
    const byId = new Map(sections.map((section) => [section.group.id, section.items]));

    expect(byId.get('character')?.map((item) => item.id)).toEqual(['characters', 'numbers']);
    expect(byId.get('poem')?.map((item) => item.id)).toEqual(['poems', 'idioms']);
    expect(byId.get('story')?.map((item) => item.id)).toEqual(['stories']);
  });

  it('should_move_custom_category_into_fallback_group_when_not_in_any_group', () => {
    const sections = groupCategories([...SEED_CATEGORIES, customCategory('my-topic')]);
    expect(sections).toHaveLength(5);

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
