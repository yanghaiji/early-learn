/** 首页学习进度块（v0.4 C 组）：入口条 + 统计一句话（US-A3 末条），分类墙仍是主体 */

import { Link } from 'react-router-dom';
import { Heart, Headphones, History, Repeat } from 'lucide-react';
import { knownCount, unknownCount } from '../../../domain/services/progress';
import { useProgressStore } from '../../../shared/store/progressStore';

/**
 * 顶部入口条：接着看 / 我的收藏 / 练一练不熟的（M） / 听音选图（ADR-P5：不加家长门）。
 * 「接着看」无浏览记录时不出：没有可继续的就不占位置（v0.5.1 从首页正文横滑区收进来）
 */
export function ProgressEntries() {
  const unknown = useProgressStore((state) => unknownCount(state.doc));
  const recentCount = useProgressStore((state) => state.doc.recent.length);
  return (
    <div className="inline entry-bar">
      {recentCount > 0 ? (
        <Link className="btn btn--ghost" to="/recent">
          <History size={18} />
          接着看（{recentCount}）
        </Link>
      ) : null}
      <Link className="btn btn--ghost" to="/favorites">
        <Heart size={18} />
        我的收藏
      </Link>
      <Link className="btn btn--ghost" to="/review">
        <Repeat size={18} />
        练一练不熟的（{unknown}）
      </Link>
      <Link className="btn btn--ghost" to="/quiz">
        <Headphones size={18} />
        听音选图
      </Link>
    </div>
  );
}

/** 底部统计一句话：「已标记 N 张 · 其中 M 张还不熟」；N=0 时给引导而不是空统计 */
export function ProgressStatsLine() {
  const doc = useProgressStore((state) => state.doc);
  const known = knownCount(doc);
  const unknown = unknownCount(doc);
  const marked = known + unknown;

  if (marked === 0) {
    return (
      <p className="muted text-sm" style={{ textAlign: 'center', margin: 0 }}>
        翻翻卡片，点「认识 / 不认识」，这里会看到进度。
      </p>
    );
  }
  return (
    <p className="muted text-sm" style={{ textAlign: 'center', margin: 0 }}>
      已标记 {marked} 张 · 其中 {unknown} 张还不熟
    </p>
  );
}
