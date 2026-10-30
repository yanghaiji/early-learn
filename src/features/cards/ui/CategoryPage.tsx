/** 分类页 · 卡片墙（PRD M2 / US-02)：组筛选 + 每页 12 张分页（v0.1.7） */

import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { cardsOfCategory } from '../../../domain/services/catalog';
import type { Card } from '../../../domain/entities/card';
import { IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { categoryColorVar, cx } from '../../../shared/utils/classNames';

/** 每页卡片数：平板 4 列 × 3 行，一屏看完不用滚动 */
const PAGE_SIZE = 12;

export function CardTile({ card, colorToken }: { card: Card; colorToken?: string }) {
  const mode = useSettingsStore((state) => state.settings.displayMode);
  const location = useLocation();
  // 带上当前分组与页码：详情页按同一组内序列翻页，返回时也回到这一页
  const listUrl = `${location.pathname}${location.search}`;

  return (
    <Link
      className="card-tile"
      to={{ pathname: `/card/${card.id}`, search: location.search }}
      state={{ listUrl }}
      aria-label={`${card.zh} ${card.en}`}
    >
      <div className="card-tile__media" style={categoryColorVar(colorToken)}>
        <ImageWithFallback
          src={card.image}
          alt={card.zh}
          fallbackText={card.zh}
          colorToken={colorToken}
        />
        {/* 故事卡标出「绘本故事」，让孩子一眼看出这本可以讲（v0.2 US-S1） */}
        {card.kind === 'story' ? (
          <span className="card-tile__badge">绘本故事</span>
        ) : null}
      </div>
      <p className="card-tile__zh">{mode === 'en' ? card.en : card.zh}</p>
      {mode === 'both' ? <p className="card-tile__en">{card.en}</p> : null}
    </Link>
  );
}

export function CategoryPage() {
  const { categoryId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, cards, groupOf, groupName } = useCatalog();

  const category = categories.find((item) => item.id === categoryId);
  const list = useMemo(() => cardsOfCategory(cards, categoryId), [cards, categoryId]);

  // 同一分类里出现两个以上主题组时才展示筛选条（汉字七组、古诗两组）
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of list) {
      const key = groupOf(card);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].map(([key, count]) => ({ key, name: groupName(key), count }));
  }, [list, groupOf, groupName]);

  const requestedGroup = searchParams.get('group') ?? '';
  const activeGroup = groups.some((group) => group.key === requestedGroup) ? requestedGroup : '';
  const filtered = activeGroup ? list.filter((card) => groupOf(card) === activeGroup) : list;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1;
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goto = (nextGroup: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextGroup) params.set('group', nextGroup);
    if (nextPage > 1) params.set('page', String(nextPage));
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <header className="topbar topbar--bordered">
        <IconButton label="返回分类" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">{category?.name ?? '分类不存在'}</h1>
          <p className="topbar__sub">
            {category?.nameEn ? `${category.nameEn} · ` : ''}
            {list.length} 张卡片
          </p>
        </div>
      </header>

      <main className="page">
        {!category ? (
          <EmptyState
            emoji="🔍"
            title="没有找到这个分类"
            description="它可能已被删除，返回首页选一个主题吧。"
            action={
              <Link className="btn btn--primary" to="/">
                返回首页
              </Link>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="这个分类还没有卡片"
            description="请家长进入管理区添加卡片，孩子的第一个词由你来定。"
            action={
              <Link className="btn btn--primary" to="/admin/cards">
                去添加卡片
              </Link>
            }
          />
        ) : (
          <>
            {groups.length > 1 ? (
              <div className="chips" role="group" aria-label="按主题组筛选">
                <button
                  type="button"
                  className={cx('chip', !activeGroup && 'is-active')}
                  aria-pressed={!activeGroup}
                  onClick={() => goto('', 1)}
                >
                  全部
                  <span className="chip__count">{list.length}</span>
                </button>
                {groups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className={cx('chip', activeGroup === group.key && 'is-active')}
                    aria-pressed={activeGroup === group.key}
                    onClick={() => goto(group.key, 1)}
                  >
                    {group.name}
                    <span className="chip__count">{group.count}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid-cards">
              {visible.map((card) => (
                <CardTile key={card.id} card={card} colorToken={category.color} />
              ))}
            </div>

            {pageCount > 1 ? (
              <nav className="pager" aria-label="卡片翻页">
                <button
                  type="button"
                  className="pager__btn"
                  disabled={page <= 1}
                  onClick={() => goto(activeGroup, page - 1)}
                >
                  <ChevronLeft size={20} />
                  上一页
                </button>
                <span className="pager__status">
                  第 {page} / {pageCount} 页
                </span>
                <button
                  type="button"
                  className="pager__btn"
                  disabled={page >= pageCount}
                  onClick={() => goto(activeGroup, page + 1)}
                >
                  下一页
                  <ChevronRight size={20} />
                </button>
              </nav>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
