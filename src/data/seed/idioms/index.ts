/**
 * 成语种子装配（v0.6）：五组 150 条 → 卡片。
 *
 * 与 stories.ts 同构：分组归属由本文件的内置表决定，不写进卡片数据，
 * 组合根把 groupOf 注入上下文，因此家长自建成语卡自动落「未分组」。
 * 内容清单见 FR/v0.6/PRD-成语词典.md §5；新增成语时必须同步组数组与门禁。
 */

import type { Card } from '../../../domain/entities/card';
import { SEED_TIME } from '../categories';
import { FABLE_IDIOMS } from './fable';
import { LIFE_IDIOMS } from './life';
import { MORAL_IDIOMS } from './moral';
import { NATURE_IDIOMS } from './nature';
import { STUDY_IDIOMS } from './study';
import type { IdiomGroupKey, IdiomRow } from './types';

export interface IdiomGroup {
  key: IdiomGroupKey;
  name: string;
}

/** 五个主题组，展示顺序即数组顺序；key 带 idiom- 前缀，与汉字组的 nature 区分 */
export const IDIOM_GROUPS: readonly IdiomGroup[] = [
  { key: 'idiom-fable', name: '寓言故事' },
  { key: 'idiom-study', name: '学习求知' },
  { key: 'idiom-moral', name: '品德修养' },
  { key: 'idiom-nature', name: '自然景物' },
  { key: 'idiom-life', name: '生活常理' },
];

/** 组 key → 展示名 */
export const IDIOM_GROUP_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  IDIOM_GROUPS.map((group) => [group.key, group.name]),
);

/** 组 → 条目；数组顺序同时决定分类内的 sortOrder（先寓言、后生活） */
const IDIOM_SOURCES: readonly (readonly [IdiomGroupKey, readonly IdiomRow[]])[] = [
  ['idiom-fable', FABLE_IDIOMS],
  ['idiom-study', STUDY_IDIOMS],
  ['idiom-moral', MORAL_IDIOMS],
  ['idiom-nature', NATURE_IDIOMS],
  ['idiom-life', LIFE_IDIOMS],
];

/** 卡片 id（idioms-{slug}）→ 组 key */
export const IDIOM_GROUP_BY_ID: ReadonlyMap<string, string> = new Map(
  IDIOM_SOURCES.flatMap(([key, rows]) => rows.map((row) => [`idioms-${row.slug}`, key] as const)),
);

const IMAGE_ROOT = 'assets/images/idioms';

const GENERATED_SOURCE = {
  provider: 'generated',
  license: 'AI 生成素材，仅限本项目使用',
} as const;

/** 全部成语卡：en 为空串（成语无英文，PRD §3.2） */
export function buildIdioms(): Card[] {
  const rows = IDIOM_SOURCES.flatMap(([, list]) => list);
  return rows.map((row, index) => ({
    id: `idioms-${row.slug}`,
    kind: 'idiom',
    categoryId: 'idioms',
    zh: row.zh,
    pinyin: row.pinyin,
    en: '',
    image: `${IMAGE_ROOT}/${row.slug}.webp`,
    tags: [],
    difficulty: row.difficulty,
    sortOrder: index + 1,
    meaning: row.meaning,
    examples: [...row.examples],
    synonyms: [...row.synonyms],
    antonyms: [...row.antonyms],
    citation: row.citation,
    source: { ...GENERATED_SOURCE },
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  }));
}
