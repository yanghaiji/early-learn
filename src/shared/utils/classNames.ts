/** 小工具：className 拼接 */

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** 分类主色 token → 内联 CSS 变量（供 .cat-tile__media 等使用） */
export function categoryColorVar(token?: string): Record<string, string> {
  if (!token) return {};
  return { '--cat-color': `var(--c-${token})` };
}
