/** 测试用快照端口：内存实现，可注入失败（NFR/v0.9 §6.1、ADR-X5） */

import type { SnapshotPort, SnapshotRecord } from '../data/storage/snapshotStore';

export interface MemorySnapshotPort extends SnapshotPort {
  /** 当前持有记录，直接断言「写进去了没有」 */
  readonly records: SnapshotRecord[];
  /** 置成某个方法名后该调用抛错（验调用方降级用） */
  failOn: 'list' | 'put' | 'remove' | null;
}

export function createMemorySnapshotPort(initial: readonly SnapshotRecord[] = []): MemorySnapshotPort {
  const records: SnapshotRecord[] = [...initial];
  const port: MemorySnapshotPort = {
    records,
    failOn: null,

    async list() {
      if (port.failOn === 'list') throw new Error('snapshot list failed');
      return [...records];
    },

    async put(record) {
      if (port.failOn === 'put') throw new Error('snapshot put failed');
      const at = records.findIndex((item) => item.id === record.id);
      if (at < 0) records.push(record);
      else records[at] = record;
    },

    async remove(id) {
      if (port.failOn === 'remove') throw new Error('snapshot remove failed');
      const at = records.findIndex((item) => item.id === id);
      if (at >= 0) records.splice(at, 1);
    },
  };
  return port;
}
