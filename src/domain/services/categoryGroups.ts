/**
 * 首页分类墙分段（v0.10）：22 个内置分类语义上分四种，平铺在一个网格里家长分不出
 * 「这是认物图卡还是字卡/诗文/绘本」。这里只做**归类**，不给分类加字段、不改 schemaVersion。
 *
 * 管理区可以新建分类，新分类不会落进任何内置组，必须进「更多」兜底组 ——
 * 首页不能因为改版把家长自己建的分类吞掉。
 */

import type { Category, CategoryId } from '../entities/category';

export interface CategoryGroupSpec {
  id: string;
  name: string;
  hint: string;
  ids: readonly CategoryId[];
}

/** 内置分组：顺序即首页从上到下的顺序，组内顺序也由清单决定（不沿用分类 sortOrder） */
export const CATEGORY_GROUPS: readonly CategoryGroupSpec[] = [
  {
    id: 'object',
    name: '认物',
    hint: '看图认东西',
    ids: [
      'animals',
      'fruit',
      'vegetables',
      'vehicles',
      'daily',
      'body',
      'colors',
      'shapes',
      'family',
      'weather',
      'verbs',
      'food',
      'school',
      'sea',
      'insects',
      'jobs',
      'clothes',
    ],
  },
  { id: 'character', name: '字卡', hint: '汉字与数字', ids: ['characters', 'numbers'] },
  { id: 'poem', name: '诗文', hint: '古诗与成语', ids: ['poems', 'idioms'] },
  { id: 'story', name: '绘本', hint: '一页一句的小故事', ids: ['stories'] },
];

/** 兜底组：不在任何内置组里的分类（管理区新建的）都落这里 */
export const FALLBACK_GROUP: CategoryGroupSpec = {
  id: 'more',
  name: '更多',
  hint: '管理区新建的分类',
  ids: [],
};

export interface CategorySection {
  group: CategoryGroupSpec;
  items: Category[];
}

/**
 * 把分类按内置分组切开。空组不返回（新建分类只加在最后一组时，前面的空段不会占版面）。
 * 组内顺序按分组清单排（而不是分类的 sortOrder）：字卡组要让张数最多的汉字排在数字前面。
 */
export function groupCategories(categories: readonly Category[]): CategorySection[] {
  const known = new Set<CategoryId>(CATEGORY_GROUPS.flatMap((group) => group.ids));
  const sections: CategorySection[] = CATEGORY_GROUPS.map((group) => ({
    group,
    items: categories
      .filter((category) => group.ids.includes(category.id))
      .sort((left, right) => group.ids.indexOf(left.id) - group.ids.indexOf(right.id)),
  }));
  const rest = categories.filter((category) => !known.has(category.id));
  if (rest.length > 0) sections.push({ group: FALLBACK_GROUP, items: rest });
  return sections.filter((section) => section.items.length > 0);
}
