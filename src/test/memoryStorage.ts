/** 测试用 Storage 替身：可注入配额/安全异常 */

export class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  /** 写入次数达到该值后开始抛配额错误（0 表示从不抛） */
  failWriteAt = 0;
  failWriteName = 'QuotaExceededError';
  private writes = 0;

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    if (this.failWriteAt > 0 && this.writes >= this.failWriteAt) {
      const error = new Error('quota exceeded');
      error.name = this.failWriteName;
      throw error;
    }
    this.map.set(key, value);
  }
}

/** 清空真实 localStorage（组件测试之间隔离） */
export function resetLocalStorage(): void {
  window.localStorage.clear();
}
