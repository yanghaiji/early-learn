/** 首页 · 分类墙（PRD M1 / US-01） */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Github, Languages, Lock, Search } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { APP_SLOGAN, REPO_URL } from '../../../app/version';
import {
  AGE_BANDS,
  AGE_BAND_LABEL,
  AGE_BAND_NAME,
  AGE_BAND_TAGLINE,
  type AgeBand,
} from '../../../domain/entities/card';
import { countCardsByBand } from '../../../domain/services/catalog';
import { groupCategories } from '../../../domain/services/categoryGroups';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { markGatePassed } from '../../admin/gateSession';
import { ProgressEntries, ProgressStatsLine } from '../../learn/ui/ProgressStats';
import { CategoryTile } from './CategoryTile';

/** 显示语言切换只有点开「语言」才需要，离开主 chunk（v0.10 首页改版腾预算） */
const DisplayModeSwitch = lazy(() =>
  import('../../settings/ui/DisplayModeSwitch').then((m) => ({ default: m.DisplayModeSwitch })),
);
/** 家长门（Modal + ParentGate 约 5.7 kB）同样只在点「家长管理」时才需要 */
const AdminGateModal = lazy(() =>
  import('../../admin/ui/AdminGateModal').then((m) => ({ default: m.AdminGateModal })),
);

/** 分龄卡封面（v0.10）：复用已有的分类封面，不新出图 */
const BAND_COVER: Record<AgeBand, string> = {
  '1-3': 'assets/images/covers/fruit.webp',
  '3-6': 'assets/images/covers/poems.webp',
};

/**
 * 三小段（v0.10）：字卡 / 诗文 / 绘本各只有 1–2 张分类，铺在 6 列网格里会空出大半行，
 * 改为三列并排、每列一张横卡；其余段（认物 / 更多）继续走整行分类墙。
 */
const RAIL_GROUPS = new Set(['character', 'poem', 'story']);

export function HomePage() {
  const { categories, cards, counts, isReadOnly } = useCatalog();
  const [displayOpen, setDisplayOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const navigate = useNavigate();

  // 分龄入口的张数（v0.8）：两档共用难度 2，计数允许交叠
  const bandCounts = useMemo(
    () => ({
      '1-3': countCardsByBand(cards, '1-3'),
      '3-6': countCardsByBand(cards, '3-6'),
    }),
    [cards],
  );

  // 分类墙分段（v0.10）：认物 / 字卡 / 诗文 / 绘本，管理区新建的分类落「更多」兜底组
  const sections = useMemo(() => groupCategories(categories), [categories]);

  const onPass = () => {
    markGatePassed();
    setGateOpen(false);
    navigate('/admin');
  };

  // 桌面端按 / 直接进搜索：焦点已在输入框时不抢键（US-V2）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      navigate('/search');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <>
      {/* v0.7：标题、入口条、图标合并为一条 hero 顶栏，省掉原来单独一行的入口条高度 */}
      <header className="topbar topbar--hero">
        <div className="topbar__brand">
          <h1 className="topbar__title">童识 · 认知卡片</h1>
          <p className="topbar__sub">{APP_SLOGAN}</p>
        </div>
        <ProgressEntries />
        <div className="topbar__tools">
          <IconButton label="搜索卡片" plain onClick={() => navigate('/search')}>
            <Search size={24} />
          </IconButton>
          <a
            className="icon-btn icon-btn--plain"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="源码 · GitHub"
            title="源码 · GitHub"
          >
            <Github size={22} />
          </a>
          <IconButton label="切换显示语言" plain onClick={() => setDisplayOpen(true)}>
            <Languages size={24} />
          </IconButton>
        </div>
      </header>

      <main className="page page--wide">
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
            {/* 分龄入口（v0.10 H-1）：两张带封面的分龄大卡，与下方分类卡同一套视觉语言 */}
            <div className="band-row" role="group" aria-label="按年龄浏览">
              {AGE_BANDS.map((band) => (
                <Link key={band} className="band-card" to={`/age/${band}`}>
                  <div className="band-card__body">
                    <span className="band-card__label">
                      {AGE_BAND_LABEL[band]} · {AGE_BAND_NAME[band]}
                    </span>
                    <span className="band-card__tagline">{AGE_BAND_TAGLINE[band]}</span>
                    <span className="band-card__count">{bandCounts[band]} 张适龄</span>
                  </div>
                  <div className="band-card__media">
                    <ImageWithFallback
                      src={BAND_COVER[band]}
                      alt=""
                      fallbackText={AGE_BAND_NAME[band]}
                      eager
                    />
                  </div>
                </Link>
              ))}
            </div>
            {/* 分类墙分段（v0.10 H-2）：整行段（认物 / 更多）先排，三小段随后三列并排 */}
            {sections
              .filter((section) => !RAIL_GROUPS.has(section.group.id))
              .map((section) => (
                <section key={section.group.id} className="cat-section">
                  <h2 className="cat-section__title">
                    <span className="cat-section__name">{section.group.name}</span>
                    <span className="cat-section__hint">{section.group.hint}</span>
                  </h2>
                  <div className="grid-cats">
                    {section.items.map((category) => (
                      <CategoryTile
                        key={category.id}
                        category={category}
                        count={counts[category.id] ?? 0}
                      />
                    ))}
                  </div>
                </section>
              ))}
            {sections.some((section) => RAIL_GROUPS.has(section.group.id)) ? (
              <div className="cat-row">
                {sections
                  .filter((section) => RAIL_GROUPS.has(section.group.id))
                  .map((section) => (
                    <section key={section.group.id} className="cat-section">
                      <h2 className="cat-section__title">
                        <span className="cat-section__name">{section.group.name}</span>
                        <span className="cat-section__hint">{section.group.hint}</span>
                      </h2>
                      {section.items.map((category) => (
                        <CategoryTile
                          key={category.id}
                          category={category}
                          count={counts[category.id] ?? 0}
                          row
                        />
                      ))}
                    </section>
                  ))}
              </div>
            ) : null}
          </>
        )}

        <div className="inline" style={{ justifyContent: 'center', marginTop: 24 }}>
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

      {displayOpen ? (
        <Suspense fallback={null}>
          <DisplayModeSwitch open onClose={() => setDisplayOpen(false)} />
        </Suspense>
      ) : null}

      {gateOpen ? (
        <Suspense fallback={null}>
          <AdminGateModal
            title="家长管理"
            onClose={() => setGateOpen(false)}
            onPass={onPass}
          />
        </Suspense>
      ) : null}
    </>
  );
}
