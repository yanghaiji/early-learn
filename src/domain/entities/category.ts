/** 分类实体。对应 NFR/v0.1/技术方案.md §3.2 */

export type CategoryId = string;

export const COLOR_TOKENS = [
  'mint',
  'coral',
  'leaf',
  'sky',
  'sand',
  'peach',
  'lilac',
  'ocean',
  'rainbow',
  'ink',
  // v0.1.3 主题分类（家人 / 天气 / 动作 / 食物 / 学校用品）
  'rose',
  'cloud',
  'lime',
  'apricot',
  'violet',
  // v0.2 诗词
  'xuan',
  // v0.2 故事绘本
  'berry',
  // v0.5 新增主题分类（海洋动物 / 小虫子 / 职业 / 穿戴）
  'wave',
  'moss',
  'denim',
  'linen',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export interface Category {
  id: CategoryId;
  name: string;
  nameEn?: string;
  color: ColorToken;
  cover?: string;
  sortOrder: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/** 新建分类时由调用方提供的内容（id 可省略，省略则自动生成） */
export interface CategoryInput {
  id?: CategoryId;
  name: string;
  nameEn?: string;
  color: ColorToken;
  cover?: string;
  sortOrder?: number;
  description?: string;
}

export type CategoryPatch = Partial<Omit<CategoryInput, 'id'>>;
