/** 存储键集中定义（避免拼写漂移）。对应 NFR §4.2 */

export const STORAGE_PREFIX = 'early-learn:v1:';

export const STORAGE_KEYS = {
  catalog: `${STORAGE_PREFIX}catalog`,
  settings: `${STORAGE_PREFIX}settings`,
  progress: `${STORAGE_PREFIX}progress`,
  meta: `${STORAGE_PREFIX}meta`,
  corrupted: `${STORAGE_PREFIX}corrupted`,
  autoBackup: `${STORAGE_PREFIX}auto-backup`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
