/**
 * 首页段卡清单（v0.12）：展示层静态映射，把 22 个内置分类归入七个段，
 * 家长后台新建的分类落兜底段「更多」——新增分类零改动即可出现在首页。
 *
 * 与 v0.10 四段版的区别：认物 17 类按主题拆成四段（动物与植物 / 身边的物什 /
 * 人物与动作 / 自然与概念），首页每段渲染一张摘要卡，点进去是二级页
 * /group/:groupId；字卡 / 诗文 / 绘本三段与四段同网格，不再双轨。
 *
 * 段不是实体：不给 Category 加字段、不动 schemaVersion / SEED_VERSION。
 * 段内 id 顺序即段页 tile 顺序，且**首分类充当段卡封面代表**
 * （如诗文段 idioms 在前 → 段卡用成语封面），封面复用现有分类图，零新图。
 */

import type { Category, CategoryId } from '../entities/category';

export interface CategoryGroupSpec {
  id: string;
  name: string;
  hint: string;
  ids: readonly CategoryId[];
}

export const CATEGORY_GROUPS: readonly CategoryGroupSpec[] = [
  {
    id: 'plants',
    name: '动物与植物',
    hint: '鱼虫瓜果蔬菜',
    ids: ['animals', 'insects', 'sea', 'fruit', 'vegetables'],
  },
  {
    id: 'things',
    name: '身边的物什',
    hint: '交通与日用品',
    ids: ['vehicles', 'school', 'daily', 'food', 'clothes'],
  },
  {
    id: 'people',
    name: '人物与动作',
    hint: '身体 · 家人 · 职业 · 动作',
    ids: ['body', 'verbs', 'family', 'jobs'],
  },
  {
    id: 'nature',
    name: '自然与概念',
    hint: '天气 · 颜色 · 形状',
    ids: ['weather', 'colors', 'shapes'],
  },
  {
    id: 'character',
    name: '字卡',
    hint: '汉字与数字',
    ids: ['characters', 'numbers'],
  },
  {
    id: 'poem',
    name: '诗文',
    hint: '成语与古诗',
    ids: ['idioms', 'poems'],
  },
  {
    id: 'story',
    name: '绘本',
    hint: '一页一句的小故事',
    ids: ['stories'],
  },
];

/** 兜底段：家长后台自建分类的归宿，恒排在最后 */
export const FALLBACK_GROUP: CategoryGroupSpec = {
  id: 'more',
  name: '更多',
  hint: '后台新建的分类',
  ids: [],
};

/** 段 id 是否合法（含兜底段）；v0.10 的 'object' 已退役，不在列 */
export function isGroupId(raw: string): boolean {
  return raw === FALLBACK_GROUP.id || CATEGORY_GROUPS.some((group) => group.id === raw);
}

/** 按 id 查段规格（含兜底段）；未知返回 null */
export function findGroup(raw: string): CategoryGroupSpec | null {
  if (raw === FALLBACK_GROUP.id) {
    return FALLBACK_GROUP;
  }
  return CATEGORY_GROUPS.find((group) => group.id === raw) ?? null;
}

export interface CategoryGroupSection {
  group: CategoryGroupSpec;
  items: Category[];
}

/** 把分类按清单归段：段内按清单排序，未知分类进兜底段，空段过滤（纯函数） */
export function groupCategories(categories: readonly Category[]): CategoryGroupSection[] {
  const listed = new Set<CategoryId>(CATEGORY_GROUPS.flatMap((group) => [...group.ids]));
  const sections = [...CATEGORY_GROUPS, FALLBACK_GROUP].map((group) => {
    const items = categories
      .filter((category) =>
        group.ids.length > 0 ? group.ids.includes(category.id) : !listed.has(category.id),
      )
      .sort((a, b) => {
        const index = group.ids.indexOf(a.id);
        // 兜底段（ids 为空）与未列分类同权，退回 sortOrder 次序
        if (index === -1) {
          return a.sortOrder - b.sortOrder;
        }
        return index - group.ids.indexOf(b.id);
      });
    return { group, items };
  });
  return sections.filter((section) => section.items.length > 0);
}
