/**
 * 成语种子行类型（v0.6）。
 * 内容清单见 FR/v0.6/PRD-成语词典.md §5；释义为 PRD 原文，例句按 §5.6 规范撰写。
 */

import type { Difficulty } from '../../../domain/entities/card';

export interface IdiomRow {
  /** 图片文件名与卡片 id 后缀，全库唯一 */
  slug: string;
  zh: string;
  pinyin: string;
  difficulty: Difficulty;
  /** 白话释义（20–90 字） */
  meaning: string;
  /** 例句：第 1 条短（生活场景），第 2 条长（带因果） */
  examples: readonly string[];
  synonyms: readonly string[];
  antonyms: readonly string[];
  citation: string;
}

/** 五个主题组的 key（展示顺序以 IDIOM_GROUPS 数组顺序为准）；带 idiom- 前缀，避免与汉字组的 nature 撞名 */
export type IdiomGroupKey =
  | 'idiom-fable'
  | 'idiom-study'
  | 'idiom-moral'
  | 'idiom-nature'
  | 'idiom-life';
