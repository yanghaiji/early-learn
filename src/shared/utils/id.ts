/** 通用工具：id 生成 */

export function createId(prefix?: string): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return prefix ? `${prefix}-${random}` : random;
}

/** 分类 id：用户不填时自动生成 */
export function createCategoryId(): string {
  return createId('cat');
}
