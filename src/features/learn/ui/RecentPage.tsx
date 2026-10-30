/** 接着看 / 最近浏览独立页（v0.5.1）：从首页正文横滑区移出，把版面还给分类墙 */

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { RECENT_MAX } from '../../../domain/constants';
import { useProgressStore } from '../../../shared/store/progressStore';
import { IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { CardTile } from '../../cards/ui/CardTile';

export function RecentPage() {
  const navigate = useNavigate();
  const { cards, categories } = useCatalog();
  const recent = useProgressStore((state) => state.doc.recent);

  // 按最近浏览顺序映射真实卡：删掉的卡自动过滤，顺序与文档一致
  const colorById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const recentCards = useMemo(() => {
    const cardById = new Map(cards.map((card) => [card.id, card]));
    return recent
      .map((entry) => cardById.get(entry.cardId))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));
  }, [recent, cards]);

  return (
    <>
      <header className="topbar topbar--bordered">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">接着看</h1>
          <p className="topbar__sub">
            {recentCards.length > 0
              ? `最近翻过的 ${recentCards.length} 张（最多保留 ${RECENT_MAX} 张）`
              : '翻过的卡片会留在这里'}
          </p>
        </div>
      </header>

      <main className="page page--wide">
        {recentCards.length === 0 ? (
          <EmptyState
            emoji="🕘"
            title="还没有浏览记录"
            description="随便点开一张卡片，这里就会留下脚印，下次接着看。"
            action={
              <Link className="btn btn--primary" to="/">
                去挑一张
              </Link>
            }
          />
        ) : (
          <div className="grid-cards">
            {recentCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                colorToken={colorById.get(card.categoryId)?.color}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
