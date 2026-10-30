/**
 * 故事主题分组（v0.2）：分类页「组筛选」的唯一事实来源。
 *
 * 与 characterGroups.ts 同构：分组归属不写进卡片数据，
 * 由组合根把 groupOf 注入上下文，因此老数据零迁移、家长自建故事落「未分组」。
 *
 * 新增故事时必须同步本文件的组名与 stories.ts 的主题数组；
 * scripts/validate-content.mjs 会校验覆盖与重复。
 */

import type { StoryRow } from './stories';
import { STORY_GROUP_SOURCES } from './stories';

export interface StoryGroup {
  key: string;
  name: string;
}

/** 四个主题组，展示顺序即数组顺序；key 带 story- 前缀，与汉字组的 nature 区分 */
export const STORY_GROUPS: readonly StoryGroup[] = [
  { key: 'story-fairy', name: '童话故事' },
  { key: 'story-habit', name: '生活习惯' },
  { key: 'story-feeling', name: '情绪社交' },
  { key: 'story-nature', name: '自然认知' },
];

/** 组 key → 展示名 */
export const STORY_GROUP_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  STORY_GROUPS.map((group) => [group.key, group.name]),
);

/** 卡片 id（stories-{slug}）→ 组 key */
export const STORY_GROUP_BY_ID: ReadonlyMap<string, string> = new Map(
  STORY_GROUP_SOURCES.flatMap(([key, rows]: readonly [string, readonly StoryRow[]]) =>
    rows.map((row) => [`stories-${row.slug}`, key] as const),
  ),
);
