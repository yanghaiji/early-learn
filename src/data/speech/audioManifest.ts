/**
 * 预录音频清单（cardId → 相对路径）。
 * 单飞加载 + 失败即缓存空集：拉不到清单就当「这台部署没有自带音频」，不再反复打网络。
 * 对应 NFR/v0.4/技术方案.md §4.2、ADR-P2
 */

import { AUDIO_MANIFEST_PATH } from '../../domain/constants';

export type AudioEntries = Readonly<Record<string, string>>;

const EMPTY: AudioEntries = Object.freeze({});

/** 清单是外部静态资源，脏值（数组、嵌套、非字符串路径）一律丢弃 */
function sanitize(raw: unknown): AudioEntries {
  if (typeof raw !== 'object' || raw === null) return EMPTY;
  const entries: Record<string, string> = {};
  for (const [cardId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) entries[cardId] = value;
  }
  return entries;
}

async function fetchEntries(): Promise<AudioEntries> {
  const response = await fetch(AUDIO_MANIFEST_PATH, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`音频清单响应 ${response.status}`);
  return sanitize(await response.json());
}

export interface ManifestSource {
  /** 首次调用发起请求；成功或失败都会缓存结论，后续调用不再打网络 */
  load(): Promise<AudioEntries>;
  /** 已加载结果；未加载返回 null，调用方据此决定要不要等网络 */
  peek(): AudioEntries | null;
}

export function createManifestSource(loadEntries: () => Promise<AudioEntries> = fetchEntries): ManifestSource {
  let cached: AudioEntries | null = null;
  let pending: Promise<AudioEntries> | null = null;

  const load = (): Promise<AudioEntries> => {
    if (cached) return Promise.resolve(cached);
    pending ??= loadEntries()
      .then((entries) => {
        cached = entries;
        return cached;
      })
      .catch(() => {
        cached = EMPTY;
        return cached;
      });
    return pending;
  };

  return { load, peek: () => cached };
}
