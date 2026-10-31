/** 分龄浏览 · 分类墙（v0.8 US-W2）：只露出该龄段有卡的分类 */

import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { AGE_BAND_LABEL, AGE_BAND_NAME } from '../../../domain/entities/card';
import { isAgeBand, matchesBand } from '../../../domain/services/catalog';
import { IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { CategoryTile } from './CategoryTile';

export function AgePage() {
  const { band = '' } = useParams();
  const navigate = useNavigate();
  const { categories, cards } = useCatalog();

  // 每分类的适龄张数：0 张的分类不渲染（避免家长点进去看到空墙）
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    if (!isAgeBand(band)) return result;
    for (const card of cards) {
      if (!matchesBand(card, band)) continue;
      result.set(card.categoryId, (result.get(card.categoryId) ?? 0) + 1);
    }
    return result;
  }, [band, cards]);

  const total = useMemo(
    () => [...counts.values()].reduce((sum, count) => sum + count, 0),
    [counts],
  );
  const items = categories.filter((category) => (counts.get(category.id) ?? 0) > 0);

  if (!isAgeBand(band)) {
    return (
      <>
        <header className="topbar topbar--bordered topbar--wide">
          <IconButton label="返回首页" plain onClick={() => navigate('/')}>
            <ArrowLeft size={26} />
          </IconButton>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="topbar__title">分龄浏览</h1>
          </div>
        </header>
        <main className="page page--wide">
          <EmptyState
            emoji="🧭"
            title="没有这一档年龄"
            description="分龄浏览只有「1–3 岁」与「3–6 岁」两档，回首页重新选一档吧。"
            action={
              <Link className="btn btn--primary" to="/">
                返回首页
              </Link>
            }
          />
        </main>
      </>
    );
  }

  return (
    <>
      <header className="topbar topbar--bordered topbar--wide">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">
            {AGE_BAND_LABEL[band]} · {AGE_BAND_NAME[band]}
          </h1>
          <p className="topbar__sub">{total} 张适龄卡片</p>
        </div>
      </header>

      <main className="page page--wide">
        {items.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="这一档还没有内容"
            description="请家长进入管理区给卡片标上难度，或者先看看另一档。"
            action={
              <Link className="btn btn--primary" to="/admin/cards">
                去管理卡片
              </Link>
            }
          />
        ) : (
          <>
            <p className="section-hint">按主题挑一个，只显示这一档能看的卡</p>
            <div className="grid-cats">
              {items.map((category) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  count={counts.get(category.id) ?? 0}
                  countSuffix="张适龄"
                  search={`?band=${band}`}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
