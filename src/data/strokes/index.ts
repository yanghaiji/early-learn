/**
 * 笔顺数据运行时入口（v0.9 ADR-X2）。
 *
 * 分工：manifest.json 给构建脚本与门禁 V8 用（覆盖 / 笔画数一致），**不进主 chunk**；
 * 运行时用已有的事实源 CHARACTER_GROUP_BY_ZH 判「有没有按钮」，组数据点开那一笔才动态 import。
 */

import { CHARACTER_GROUP_BY_ZH } from '../seed/characterGroups';
import type { StrokeCharData, StrokeGroupData } from './types';

/**
 * 该字是否有可播放的笔顺数据。
 *
 * 不读 manifest 的原因：manifest gzip 还有 2.6 kB，进了主 chunk 就破了「首屏不增长」的预算
 * （NFR/v0.9 §7.1），而汉字卡与主题组本来就是一对一的两份 321 字。
 * 两者同源由门禁保证：V3 让 8 组覆盖全部汉字卡，V8 让 manifest 与这 321 字双向相等；
 * 脚本遇到缺字直接非零退出，不会「有组没数据」地蒙混过去。
 */
export function hasStrokeData(zh: string): boolean {
  return CHARACTER_GROUP_BY_ZH.has(zh);
}

type GroupLoader = (key: string) => Promise<StrokeGroupData>;

/**
 * 组数据缓存：同一会话里同组只载一次。
 * 只缓存成功路径——断网时那次失败要从缓存里摘掉，不然「检查网络后再试」永远重试不了。
 */
export function createGroupCache(load: GroupLoader): (key: string) => Promise<StrokeGroupData> {
  const cache = new Map<string, Promise<StrokeGroupData>>();
  return (key) => {
    const hit = cache.get(key);
    if (hit) return hit;
    const pending = load(key);
    cache.set(key, pending);
    void pending.catch(() => {
      if (cache.get(key) === pending) cache.delete(key);
    });
    return pending;
  };
}

/** 用字面量动态 import：Vite 才会把 8 个组各切一个 chunk（ADR-X2） */
function loadGroupByKey(key: string): Promise<StrokeGroupData> {
  switch (key) {
    case 'numbers':
      return import('./group-numbers').then((module) => module.DATA);
    case 'body':
      return import('./group-body').then((module) => module.DATA);
    case 'nature':
      return import('./group-nature').then((module) => module.DATA);
    case 'animals':
      return import('./group-animals').then((module) => module.DATA);
    case 'space':
      return import('./group-space').then((module) => module.DATA);
    case 'action':
      return import('./group-action').then((module) => module.DATA);
    case 'daily':
      return import('./group-daily').then((module) => module.DATA);
    case 'speech':
      return import('./group-speech').then((module) => module.DATA);
    default:
      return Promise.reject(new Error(`未知的笔顺分组：${key}`));
  }
}

const groupCache = createGroupCache(loadGroupByKey);

/** 载入该字所在的组；字不在任何组里（家长自建字）直接拒绝，由调用方静默降级 */
export function loadStrokeGroup(zh: string): Promise<StrokeGroupData> {
  const key = CHARACTER_GROUP_BY_ZH.get(zh);
  if (!key) return Promise.reject(new Error('no-group'));
  return groupCache(key);
}

/** 单字数据，给 hanzi-writer 的 charDataLoader 用 */
export async function loadCharStrokeData(zh: string): Promise<StrokeCharData> {
  const group = await loadStrokeGroup(zh);
  const data = group[zh];
  if (!data) throw new Error('missing');
  return data;
}
