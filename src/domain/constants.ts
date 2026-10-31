/**
 * 全局常量（禁止在业务代码中出现魔法数字）
 * 对应 NFR/v0.1/技术方案.md §11、§12
 */

/** 存储文档结构版本，破坏性数据变更时 +1 并补迁移 */
export const SCHEMA_VERSION = 1;

/** 内置种子内容版本，仅用于提示与「重置为内置内容」 */
export const SEED_VERSION = 9;

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
  /** 成语（kind=idiom，v0.6）：释义 / 例句 / 近反义 / 出处 */
  IDIOM_LEN: 4,
  /** 下限 6 与门禁同源：v0.6 词表释义实测 6–34 字（PRD §13 回写第 3 条） */
  IDIOM_MEANING_MIN: 6,
  IDIOM_MEANING_MAX: 90,
  IDIOM_EXAMPLES_MIN: 2,
  IDIOM_EXAMPLES_MAX: 3,
  IDIOM_EXAMPLE_MIN: 8,
  IDIOM_EXAMPLE_MAX: 50,
  IDIOM_RELATED_MIN: 1,
  IDIOM_RELATED_MAX: 3,
  IDIOM_CITATION_MAX: 40,
  /**
   * 导入 JSON 的单卡图片体积上限。v0.9 起上传图改走压缩（原图 / 目标 / 边长见 `shared/utils/image.ts`），
   * 当前导入链路只校验图片路径格式，此值暂无代码消费，保留给导入体积校验。
   */
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

/**
 * 预录英文音频（v0.4 A 组）
 * 路径约定与图片同构：音频按卡片 id 定名，真人录音同名覆盖即生效，无需改代码
 */
export const AUDIO_ROOT = 'assets/audio';
export const AUDIO_MANIFEST_PATH = `${AUDIO_ROOT}/manifest.json`;
/** 点了没声就换路：超过该时长仍未开播，即认定这条音频没出声 */
export const AUDIO_TIMEOUT_MS = 3000;

/** 学习进度（v0.4 B 组） */
/** 「最近浏览」只保留最近这么多张不重复的卡片 */
export const RECENT_MAX = 24;
/** 复习每轮抽这么多张 */
export const REVIEW_ROUND_MAX = 10;
/** 听音选图一局这么多题 */
export const QUIZ_QUESTIONS = 10;
/** 听音选图每题这么多选项 */
export const QUIZ_OPTIONS = 4;

/** 连播（v0.4 D 组）：读完一张后停顿这么多毫秒再跳下一张（PRD US-A6） */
export const SLIDESHOW_GAP_MS = 2000;

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
/**
 * 合法轻声单字：这些字本就没有声调符，豁免「拼音需带声调」规则。
 * 与 scripts/validate-content.mjs 的 NEUTRAL_TONE_ZH 保持一致（脚本为 .mjs 无法 import TS，故两处各存一份）。
 */
export const NEUTRAL_TONE_ZH: ReadonlySet<string> = new Set(['的', '了']);

/** 脏数据兜底分类 id（卡片指向不存在分类时归入此处） */
export const UNCATEGORIZED_ID = 'uncategorized';
export const UNCATEGORIZED_NAME = '未分类';
