/**
 * 可注入的随机源（纯函数，无浏览器依赖）。对应 NFR/v0.4/技术方案.md §2.2
 *
 * rng 一律由调用方注入（默认 Math.random），出题与复习队列单测靠它做确定性重放。
 */

export type Rng = () => number;

/** Fisher-Yates，返回新数组，不改入参 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const picked = result[i];
    if (picked !== undefined && result[j] !== undefined) {
      [result[i], result[j]] = [result[j], picked];
    }
  }
  return result;
}
