/**
 * 存储迁移链（ADR-009）：只前进不后退。
 * 新增 schema 版本时：
 *   1. domain/constants.ts 的 SCHEMA_VERSION + 1
 *   2. 此处补一条 MIGRATIONS[旧版本] 函数
 *   3. NFR 技术方案 §4.3 记录变更
 */

import { SCHEMA_VERSION } from '../../domain/constants';

export type MigrationFn = (doc: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: Record<number, MigrationFn> = {
  // 1: (doc) => ({ ...doc, schemaVersion: 2, cards: ... }),
};

export class MigrationError extends Error {
  constructor(version: number) {
    super(`缺少从 v${version} 到 v${version + 1} 的迁移脚本`);
    this.name = 'MigrationError';
  }
}

export interface MigrationResult {
  doc: Record<string, unknown>;
  migrated: boolean;
}

export function migrateDocument(raw: unknown): MigrationResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new MigrationError(SCHEMA_VERSION);
  }
  let doc = { ...(raw as Record<string, unknown>) };
  let version = typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 0;
  let migrated = false;

  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version];
    if (!migration) throw new MigrationError(version);
    doc = migration(doc);
    doc.schemaVersion = version + 1;
    version += 1;
    migrated = true;
  }

  return { doc, migrated };
}
