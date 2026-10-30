/** 首页 · 分类墙（PRD M1 / US-01） */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Languages, Lock } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { APP_SLOGAN } from '../../../app/version';
import type { Category } from '../../../domain/entities/category';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { IconButton, Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { Modal } from '../../../shared/ui/Modal';
import { ParentGate } from '../../../shared/ui/ParentGate';
import { categoryColorVar } from '../../../shared/utils/classNames';
import { useProgressStore } from '../../../shared/store/progressStore';
import { markGatePassed } from '../../admin/gateSession';
import { CardTile } from '../../cards/ui/CategoryPage';
import { ProgressEntries, ProgressStatsLine } from '../../learn/ui/ProgressStats';
import { DisplayModeSwitch } from '../../settings/ui/DisplayModeSwitch';

function CategoryTile({ category, count }: { category: Category; count: number }) {
  return (
    <Link className="cat-tile" to={`/c/${category.id}`} aria-label={`${category.name} ${count} 张卡片`}>
      <div className="cat-tile__media" style={categoryColorVar(category.color)}>
        <ImageWithFallback
          src={category.cover}
          alt={category.name}
          fallbackText={category.name}
          colorToken={category.color}
          eager
        />
      </div>
      <div>
        <h2 className="cat-tile__name">
          {category.name}
          {category.nameEn ? <span className="cat-tile__en">{category.nameEn}</span> : null}
        </h2>
        <span className="cat-tile__count">{count} 张</span>
      </div>
    </Link>
  );
}

export function HomePage() {
  const { categories, cards, counts, isReadOnly } = useCatalog();
  const [displayOpen, setDisplayOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const navigate = useNavigate();
  const recent = useProgressStore((state) => state.doc.recent);

  // 「接着看」横滑：按最近浏览顺序映射真实卡，删掉的自动过滤（US-A2）
  const recentCards = useMemo(() => {
    const cardById = new Map(cards.map((card) => [card.id, card]));
    const colorById = new Map(categories.map((category) => [category.id, category]));
    return recent
      .map((entry) => cardById.get(entry.cardId))
      .filter((card): card is NonNullable<typeof card> => Boolean(card))
      .map((card) => ({ card, color: colorById.get(card.categoryId)?.color }));
  }, [recent, cards, categories]);

  const onPass = () => {
    markGatePassed();
    setGateOpen(false);
    navigate('/admin');
  };

  return (
    <>
      <header className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">童识 · 认知卡片</h1>
          <p className="topbar__sub">{APP_SLOGAN}</p>
        </div>
        <IconButton label="切换显示语言" plain onClick={() => setDisplayOpen(true)}>
          <Languages size={26} />
        </IconButton>
      </header>

      <main className="page">
        <ProgressEntries />

        {recentCards.length > 0 ? (
          <section aria-labelledby="continue-heading" style={{ marginTop: 20 }}>
            <h2 className="section__title" id="continue-heading">
              接着看
            </h2>
            <div className="slide-row">
              {recentCards.map(({ card, color }) => (
                <CardTile key={card.id} card={card} colorToken={color} />
              ))}
            </div>
          </section>
        ) : null}

        {categories.length === 0 ? (
          <EmptyState
            emoji="🗂️"
            title="还没有分类"
            description="请家长进入管理区创建第一个分类，或者恢复内置内容。"
            action={
              <Button variant="primary" onClick={() => setGateOpen(true)}>
                进入家长管理
              </Button>
            }
          />
        ) : (
          <>
            <p className="muted text-sm" style={{ marginTop: 0 }}>
              选一个主题开始吧
            </p>
            <div className="grid-cats">
              {categories.map((category) => (
                <CategoryTile key={category.id} category={category} count={counts[category.id] ?? 0} />
              ))}
            </div>
          </>
        )}

        <div className="inline" style={{ justifyContent: 'center', marginTop: 32 }}>
          <Button variant="ghost" onClick={() => setGateOpen(true)} disabled={isReadOnly}>
            <Lock size={18} />
            家长管理
          </Button>
          <Link className="btn btn--ghost" to="/settings">
            更多设置
          </Link>
          <Link className="btn btn--ghost" to="/guide">
            给家长的使用说明
          </Link>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressStatsLine />
        </div>
        {isReadOnly ? (
          <p className="text-xs muted" style={{ textAlign: 'center' }}>
            只读模式下无法进入管理区
          </p>
        ) : null}
      </main>

      <DisplayModeSwitch open={displayOpen} onClose={() => setDisplayOpen(false)} />

      {gateOpen ? (
        <Modal title="家长管理" onClose={() => setGateOpen(false)}>
          <ParentGate onPass={onPass} />
        </Modal>
      ) : null}
    </>
  );
}
