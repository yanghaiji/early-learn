/**
 * 全局常量（禁止在业务代码中出现魔法数字）
 * 对应 NFR/v0.1/技术方案.md §11、§12
 */

/** 存储文档结构版本，破坏性数据变更时 +1 并补迁移 */
export const SCHEMA_VERSION = 1;

/** 内置种子内容版本，仅用于提示与「重置为内置内容」 */
export const SEED_VERSION = 7;

export const LIMITS = {
  CATEGORY_NAME_MAX: 12,
  CATEGORY_NAME_EN_MAX: 24,
  ZH_MIN: 1,
  /** 物件/汉字卡 ≤ 8；诗词标题（含词牌与副题）可到 20，见 validateCardRules */
  ZH_MAX: 8,
  ZH_MAX_POEM: 20,
  PINYIN_MAX: 40,
  EN_MAX_WORDS: 3,
  TAG_MAX: 5,
  TAG_LEN: 8,
  WORDS_MAX: 3,
  WORD_LEN: 4,
  STROKES_MIN: 1,
  STROKES_MAX: 30,
  /** 诗词（kind=poem） */
  POEM_LINE_MAX: 14,
  POEM_LINES_MIN: 2,
  POEM_LINES_MAX: 8,
  AUTHOR_MAX: 12,
  DYNASTY_MAX: 6,
  TRANSLATION_MAX: 90,
  /** 故事（kind=story，v0.2）：`pages` 存正文段落，一个故事只配 1 张综合图 */
  STORY_TITLE_MAX: 20,
  STORY_PAGES_MIN: 4,
  STORY_PAGES_MAX: 8,
  STORY_PAGE_TEXT_MAX: 60,
  STORY_MORAL_MAX: 60,
  IMAGE_MAX_BYTES: 500 * 1024,
  IMPORT_MAX_BYTES: 5 * 1024 * 1024,
  IMPORT_MAX_CARDS: 2000,
  STORAGE_WARN_BYTES: 3 * 1024 * 1024,
  CARD_PAGE_PRELOAD: 2,
} as const;

/** 语音语速档位（幼儿默认 0.8，偏慢） */
export const SPEECH_RATES = [0.6, 0.8, 1.0, 1.2] as const;
export type SpeechRate = (typeof SPEECH_RATES)[number];
export const SPEECH_DEFAULT_RATE: SpeechRate = 0.8;
export const SPEECH_RATE_MIN = 1;

/** 家长门 */
export const GATE = {
  LONG_PRESS_MS: 3000,
  MAX_ATTEMPTS: 3,
  COOLDOWN_MS: 30_000,
} as const;

export const SEARCH_DEBOUNCE_MS = 200;
export const TOAST_DURATION_MS = 3200;
export const SWIPE_THRESHOLD_PX = 48;
export const STORAGE_EVENT_KEY = 'early-learn:storage-changed';

/** 拼音声调字符（校验是否带调） */
export const PINYIN_TONE_CHARS = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ';
export const PINYIN_TONE_REGEX = new RegExp(`[${PINYIN_TONE_CHARS}]`);

/** 脏数据兜底分类 id（卡片指向不存在分类时归入此处） */
export const UNCATEGORIZED_ID = 'uncategorized';
export const UNCATEGORIZED_NAME = '未分类';
