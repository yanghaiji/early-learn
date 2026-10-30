/**
 * 中文数字解析（v0.5 §4.1）：出图脚本与内容门禁共用的纯函数。
 *
 * 单独成模块的原因：`prepare-images.mjs` 顶层即开始读种子、`import` 它会触发全量出图，
 * 而 `validate-content.mjs` 也不该为了一个函数拖进 sharp 依赖，故两边都从这里取同一份口径。
 *
 * 口径：只认「一~九、十、十一~十九、二十~九十、二十一~九十九、一百」的规范写法，
 * 认不出统一返回 null，由调用方抛错中止——绝不允许把数字画成 0 或空白。
 */

/** 单个数字汉字 → 值；不收录「零」（数字卡从 1 起） */
const DIGIT = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

/** 显式查自有属性：直接用 DIGIT[zh] 会命中 constructor 等原型成员 */
function digitOf(text) {
  return Object.hasOwn(DIGIT, text) ? DIGIT[text] : null;
}

/**
 * 中文数字 → 1~100 的整数，解析失败返回 null。
 * @param {unknown} zh 卡片上的中文名
 * @returns {number | null}
 */
export function cnNumberToValue(zh) {
  const src = typeof zh === 'string' ? zh.trim() : '';
  if (!src) return null;
  if (src === '一百') return 100;

  const tenAt = src.indexOf('十');
  if (tenAt < 0) return digitOf(src);

  const head = src.slice(0, tenAt);
  const tail = src.slice(tenAt + 1);
  if (head && digitOf(head) === null) return null;
  if (tail && digitOf(tail) === null) return null;
  return (head ? digitOf(head) : 1) * 10 + (tail ? digitOf(tail) : 0);
}
