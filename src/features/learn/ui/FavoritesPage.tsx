/** 收藏与最近浏览页（v0.4 B 组 / US-A1、US-A2）：本机学习痕迹的落点 */

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import type { Card } from '../../../domain/entities/card';
import { useProgressStore } from '../../../shared/store/progressStore';
import { IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { CardTile } from '../../cards/ui/CategoryPage';

/** 按收藏/最近顺序把 id 映射成真实卡片，删掉的卡自然被过滤掉 */
function resolve(orderIds: string[], byId: Map<string, Card>): Card[] {
  const cards: Card[] = [];
  for (const id of orderIds) {
    const card = byId.get(id);
    if (card) cards.push(card);
  }
  return cards;
}

function colorFor(card: Card, byId: Map<string, { color: string }>): string | undefined {
  return byId.get(card.categoryId)?.color;
}

export function FavoritesPage() {
  const navigate = useNavigate();
  const { cards, categories } = useCatalog();
  const favorites = useProgressStore((state) => state.doc.favorites);
  const recent = useProgressStore((state) => state.doc.recent);
  const persistent = useProgressStore((state) => state.persistent);

  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const colorById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const favoriteCards = useMemo(() => resolve(favorites, cardById), [favorites, cardById]);
  const recentCards = useMemo(
    () => resolve(recent.map((entry) => entry.cardId), cardById),
    [recent, cardById],
  );

  const empty = favoriteCards.length === 0 && recentCards.length === 0;

  return (
    <>
      <header className="topbar topbar--bordered">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">我的收藏</h1>
          <p className="topbar__sub">
            {persistent ? '收藏与最近浏览都保存在这台设备上' : '当前浏览器无法保存，仅本次有效'}
          </p>
        </div>
      </header>

      <main className="page">
        {empty ? (
          <EmptyState
            emoji="⭐"
            title="还没有收藏"
            description="在卡片详情页点「收藏」，孩子常翻的那几张会留在这里。"
            action={
              <Link className="btn btn--primary" to="/">
                去挑一张
              </Link>
            }
          />
        ) : (
          <>
            {favoriteCards.length > 0 ? (
              <section aria-labelledby="favorites-heading">
                <h2 className="section__title" id="favorites-heading">
                  收藏（{favoriteCards.length}）
                </h2>
                <div className="grid-cards">
                  {favoriteCards.map((card) => (
                    <CardTile key={card.id} card={card} colorToken={colorFor(card, colorById)} />
                  ))}
                </div>
              </section>
            ) : null}

            {recentCards.length > 0 ? (
              <section aria-labelledby="recent-heading" style={{ marginTop: 24 }}>
                <h2 className="section__title" id="recent-heading">
                  最近浏览（{recentCards.length}）
                </h2>
                <div className="grid-cards">
                  {recentCards.map((card) => (
                    <CardTile key={card.id} card={card} colorToken={colorFor(card, colorById)} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
