/**
 * 内置分类种子（22 类）。内容口径见 FR/v0.1/内容体系与首批卡片清单.md §1、FR/v0.5/PRD.md §4.4 与 FR/v0.6/PRD-成语词典.md §2.2
 * id 一经发布不得修改；修改分类主色/名称不影响卡片关联。
 */

import type { Category } from '../../domain/entities/category';

export const SEED_TIME = '2026-10-01T00:00:00.000Z';

type SeedCategory = Omit<Category, 'createdAt' | 'updatedAt'>;

const IMAGE_ROOT = 'assets/images/covers';

const rows: SeedCategory[] = [
  { id: 'animals', name: '动物', nameEn: 'Animals', color: 'mint', cover: `${IMAGE_ROOT}/animals.webp`, sortOrder: 1 },
  { id: 'fruit', name: '水果', nameEn: 'Fruit', color: 'coral', cover: `${IMAGE_ROOT}/fruit.webp`, sortOrder: 2 },
  { id: 'vegetables', name: '蔬菜', nameEn: 'Vegetables', color: 'leaf', cover: `${IMAGE_ROOT}/vegetables.webp`, sortOrder: 3 },
  { id: 'vehicles', name: '交通工具', nameEn: 'Vehicles', color: 'sky', cover: `${IMAGE_ROOT}/vehicles.webp`, sortOrder: 4 },
  { id: 'daily', name: '日常用品', nameEn: 'Daily Items', color: 'sand', cover: `${IMAGE_ROOT}/daily.webp`, sortOrder: 5 },
  { id: 'body', name: '身体部位', nameEn: 'Body Parts', color: 'peach', cover: `${IMAGE_ROOT}/body.webp`, sortOrder: 6 },
  { id: 'colors', name: '颜色', nameEn: 'Colors', color: 'rainbow', cover: `${IMAGE_ROOT}/colors.webp`, sortOrder: 7 },
  { id: 'shapes', name: '形状', nameEn: 'Shapes', color: 'lilac', cover: `${IMAGE_ROOT}/shapes.webp`, sortOrder: 8 },
  { id: 'numbers', name: '数字', nameEn: 'Numbers', color: 'ocean', cover: `${IMAGE_ROOT}/numbers.webp`, sortOrder: 9 },
  { id: 'characters', name: '汉字', nameEn: 'Characters', color: 'ink', cover: `${IMAGE_ROOT}/characters.webp`, sortOrder: 10 },
  { id: 'family', name: '家人', nameEn: 'Family', color: 'rose', cover: `${IMAGE_ROOT}/family.webp`, sortOrder: 11 },
  { id: 'weather', name: '天气', nameEn: 'Weather', color: 'cloud', cover: `${IMAGE_ROOT}/weather.webp`, sortOrder: 12 },
  { id: 'verbs', name: '动作', nameEn: 'Verbs', color: 'lime', cover: `${IMAGE_ROOT}/verbs.webp`, sortOrder: 13 },
  { id: 'food', name: '食物', nameEn: 'Food', color: 'apricot', cover: `${IMAGE_ROOT}/food.webp`, sortOrder: 14 },
  { id: 'school', name: '学校用品', nameEn: 'School', color: 'violet', cover: `${IMAGE_ROOT}/school.webp`, sortOrder: 15 },
  { id: 'poems', name: '古诗', nameEn: 'Poems', color: 'xuan', cover: `${IMAGE_ROOT}/poems.webp`, sortOrder: 16 },
  { id: 'stories', name: '故事', nameEn: 'Stories', color: 'berry', cover: `${IMAGE_ROOT}/stories.webp`, sortOrder: 17 },
  // v0.5 四个新主题分类（sortOrder 追加 18–21，不插队）
  { id: 'sea', name: '海洋动物', nameEn: 'Sea Animals', color: 'wave', cover: `${IMAGE_ROOT}/sea.webp`, sortOrder: 18 },
  { id: 'insects', name: '小虫子', nameEn: 'Insects', color: 'moss', cover: `${IMAGE_ROOT}/insects.webp`, sortOrder: 19 },
  { id: 'jobs', name: '职业', nameEn: 'Jobs', color: 'denim', cover: `${IMAGE_ROOT}/jobs.webp`, sortOrder: 20 },
  { id: 'clothes', name: '穿戴', nameEn: 'Clothes', color: 'linen', cover: `${IMAGE_ROOT}/clothes.webp`, sortOrder: 21 },
  // v0.6 成语词典：复用已注册色板 denim（与 jobs 同色），排在分类墙最后
  { id: 'idioms', name: '成语', nameEn: 'Idioms', color: 'denim', cover: `${IMAGE_ROOT}/idioms.webp`, sortOrder: 22 },
];

export const SEED_CATEGORIES: Category[] = rows.map((row) => ({
  ...row,
  createdAt: SEED_TIME,
  updatedAt: SEED_TIME,
}));
