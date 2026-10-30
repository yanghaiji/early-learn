/**
 * 卡片主题分组（v0.1.7）：分类页「组筛选」的唯一事实来源。
 *
 * 汉字：把 cards.ts 里 CHARACTERS 的二十个学习组归并为七个主题，
 * 让孩子一屏 12 张就能看完整组，家长不必在 241 张里翻找。
 * 诗词：按朝代分唐诗 / 宋词 / 汉魏与明清（五代归入宋词，口径见 NFR/v0.5 §4.2）。
 *
 * 新增汉字时必须同步本文件，scripts/validate-content.mjs 会校验覆盖与重复。
 * 归并结果：241 字。
 */

export interface CardGroup {
  key: string;
  name: string;
}

/** 汉字七个主题组，展示顺序即数组顺序 */
export const CHARACTER_GROUPS: readonly CardGroup[] = [
  { key: 'numbers', name: '数字与量' },
  { key: 'body', name: '身体与家人' },
  { key: 'nature', name: '自然与季节' },
  { key: 'animals', name: '动物与植物' },
  { key: 'space', name: '方位与地点' },
  { key: 'action', name: '动作与形容' },
  { key: 'daily', name: '生活与学习' },
];

/** 诗词按朝代分三组：v0.5 起非唐非宋的（汉乐府 / 南北朝 / 明 / 清）单独成组 */
export const POEM_GROUPS: readonly CardGroup[] = [
  { key: 'tang', name: '唐诗' },
  { key: 'song', name: '宋词' },
  { key: 'other', name: '汉魏与明清' },
];

/**
 * 朝代 → 诗词组 key。
 * 写死成映射而不是「不是唐就归宋」：v0.5 加了明清诗之后，二元判断会把《所见》塞进宋词。
 * 未列出的朝代由门禁 V4 拦下，不允许静默落到兜底组。
 */
export const POEM_GROUP_BY_DYNASTY: Readonly<Record<string, string>> = {
  唐: 'tang',
  宋: 'song',
  五代: 'song',
  汉乐府: 'other',
  南北朝: 'other',
  唐前: 'other',
  明: 'other',
  清: 'other',
};

/** 组 key → 展示名，供分类页与详情页共用 */
export const GROUP_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  [...CHARACTER_GROUPS, ...POEM_GROUPS].map((group) => [group.key, group.name]),
);

/** 数字与量（25 字）：原始组 一、十六 */
const NUMBERS = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '年', '今', '早', '晚', '午', '百', '千', '万', '个', '只',
  '条', '把', '件', '双', '半',
] as const;

/** 身体与家人（37 字）：原始组 二、十、十七 */
const BODY = [
  '人', '口', '手', '目', '耳', '心', '头', '足', '力', '女',
  '哥', '弟', '姐', '妹', '爷', '奶', '她', '子', '儿', '男',
  '友', '朋', '爱', '亲', '老', '父', '母', '眼', '鼻', '嘴',
  '牙', '舌', '脚', '腿', '指', '背', '身',
] as const;

/** 自然与季节（28 字）：原始组 三、十三 */
const NATURE = [
  '山', '水', '火', '日', '月', '木', '天', '地', '石', '田',
  '云', '雨', '风', '绿', '春', '夏', '秋', '冬', '雪', '雷',
  '星', '光', '海', '河', '土', '林', '叶', '果',
] as const;

/** 动物与植物（22 字）：原始组 四、十八 */
const ANIMALS = [
  '牛', '羊', '马', '鸟', '鱼', '虫', '花', '草', '竹', '米',
  '鸡', '鸭', '鹅', '猫', '狗', '猪', '兔', '虎', '狮', '象',
  '鹿', '鼠',
] as const;

/** 方位与地点（34 字）：原始组 五、九、十九 */
const SPACE = [
  '大', '小', '上', '下', '多', '少', '高', '中', '左', '右',
  '前', '后', '里', '外', '东', '南', '西', '北', '近', '远',
  '边', '间', '回', '船', '飞', '机', '路', '桥', '街', '城',
  '乡', '湖', '江', '沙',
] as const;

/** 动作与形容（40 字）：原始组 六、十一、二十 */
const ACTION = [
  '我', '你', '他', '爸', '妈', '走', '跑', '看', '听', '说',
  '吃', '喝', '坐', '来', '去', '跳', '抱', '笑', '哭', '睡',
  '起', '站', '拿', '放', '开', '关', '写', '画', '唱', '玩',
  '长', '短', '快', '慢', '冷', '热', '新', '旧', '美', '丑',
] as const;

/** 生活与学习（55 字）：原始组 七、八、十二、十四、十五 */
const DAILY = [
  '红', '黄', '蓝', '白', '黑', '好', '门', '车', '书', '家',
  '衣', '鞋', '帽', '床', '灯', '桌', '椅', '碗', '筷', '洗',
  '穿', '脱', '房', '窗', '园', '饭', '菜', '肉', '蛋', '糖',
  '面', '包', '汤', '茶', '甜', '酸', '饿', '饱', '油', '盐',
  '数', '字', '学', '习', '文', '名', '自', '时', '事', '话',
  '问', '同', '别', '几', '岁',
] as const;

const GROUP_CHARS: readonly (readonly [string, readonly string[]])[] = [
  ['numbers', NUMBERS],
  ['body', BODY],
  ['nature', NATURE],
  ['animals', ANIMALS],
  ['space', SPACE],
  ['action', ACTION],
  ['daily', DAILY],
];

/** 汉字 → 组 key。家长自建或改过字的卡片查不到，不参与组筛选 */
export const CHARACTER_GROUP_BY_ZH: ReadonlyMap<string, string> = new Map(
  GROUP_CHARS.flatMap(([key, chars]) => chars.map((zh) => [zh, key] as const)),
);
