/** 卡片实体。对应 NFR/v0.1/技术方案.md §3.2、§4.1 */

import type { Category, CategoryId } from './category';

export type CardId = string;
export type CardKind = 'object' | 'character' | 'poem' | 'story' | 'idiom';
export type Difficulty = 1 | 2 | 3;

export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3];

/** 故事段落：一段一句话，整个故事在一页读完（仅 kind=story，NFR/v0.2 §2） */
export interface StoryPage {
  text: string;
  /** 兼容 v0.2.0 分页数据：旧插图路径，新种子不写 */
  image?: string;
}

export interface ImageSource {
  provider: string;
  author?: string;
  url?: string;
  license: string;
}

export interface Card {
  id: CardId;
  kind: CardKind;
  categoryId: CategoryId;
  zh: string;
  pinyin: string;
  en: string;
  phonetic?: string;
  image: string;
  tags: string[];
  difficulty: Difficulty;
  /** 分类内排序，升序 */
  sortOrder: number;
  /** 仅 kind=character */
  strokes?: number;
  words?: string[];
  radical?: string;
  /** 仅 kind=poem：作者、朝代、正文（按句分行）、白话译文（v0.2 诗词） */
  author?: string;
  dynasty?: string;
  lines?: string[];
  translation?: string;
  /** 仅 kind=story：故事段落（4–8 段），整篇在同一页展示 */
  pages?: StoryPage[];
  /** 仅 kind=story：一句寓意，展示在正文下方与详情页 */
  moral?: string;
  /** 仅 kind=idiom（v0.6）：白话释义（20–90 字） */
  meaning?: string;
  /** 仅 kind=idiom：例句，本版逐条写 2 条（第 1 条短、第 2 条长） */
  examples?: string[];
  /** 仅 kind=idiom：近义成语（1–3 个，必须也是四字成语） */
  synonyms?: string[];
  /** 仅 kind=idiom：反义成语（0–3 个，确实没有合适反义时为空） */
  antonyms?: string[];
  /** 仅 kind=idiom：出处，形如「《论语·为政》」或「现代常用语」。不复用 source（已被图片版权占用） */
  citation?: string;
  source?: ImageSource;
  createdAt: string;
  updatedAt: string;
}

/** 表单/导入使用的内容型输入（id 可省略，省略则自动生成） */
export interface CardInput {
  id?: CardId;
  kind: CardKind;
  categoryId: CategoryId;
  zh: string;
  pinyin: string;
  en: string;
  phonetic?: string;
  image: string;
  tags?: string[];
  difficulty?: Difficulty;
  sortOrder?: number;
  strokes?: number;
  words?: string[];
  radical?: string;
  author?: string;
  dynasty?: string;
  lines?: string[];
  translation?: string;
  pages?: StoryPage[];
  moral?: string;
  meaning?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  citation?: string;
  source?: ImageSource;
}

export type CardPatch = Partial<Omit<CardInput, 'id'>>;

/** 导入导出与本地存储共用的文档结构 */
export interface CatalogDocument {
  schemaVersion: number;
  categories: Category[];
  cards: Card[];
  savedAt: string;
}

export type ImportMode = 'merge' | 'replace';

export interface ExportBundle extends CatalogDocument {
  app: 'early-learn';
  appVersion: string;
  exportedAt: string;
}

export interface ImportPlan {
  mode: ImportMode;
  categoriesAdded: number;
  categoriesUpdated: number;
  categoriesTotal: number;
  cardsAdded: number;
  cardsUpdated: number;
  cardsRemoved: number;
  cardsTotal: number;
}
