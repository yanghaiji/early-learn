/** 首页 · 年龄主纲（PRD M1 / US-01；v0.13 改版：年龄双大卡作主视觉 + 日常玩法区，段卡网格下沉年龄页） */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Github, Headphones, Languages, Lock, RotateCcw, Search } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { APP_SLOGAN, REPO_URL } from '../../../app/version';
import {
  AGE_BANDS,
  AGE_BAND_LABEL,
  AGE_BAND_NAME,
  AGE_BAND_TAGLINE,
  type AgeBand,
} from '../../../domain/entities/card';
import { countCardsByBand, matchesBand } from '../../../domain/services/catalog';
import { groupCategories } from '../../../domain/services/categoryGroups';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { markGatePassed } from '../../admin/gateSession';
import { ProgressEntries, ProgressStatsLine } from '../../learn/ui/ProgressStats';

/** 显示语言切换只有点开「语言」才需要，离开主 chunk（v0.10 首页改版腾预算） */
const DisplayModeSwitch = lazy(() =>
  import('../../settings/ui/DisplayModeSwitch').then((m) => ({ default: m.DisplayModeSwitch })),
);
/** 家长门（Modal + ParentGate 约 5.7 kB）同样只在点「家长管理」时才需要 */
const AdminGateModal = lazy(() =>
  import('../../admin/ui/AdminGateModal').then((m) => ({ default: m.AdminGateModal })),
);

/** 分龄大卡封面（v0.10 起复用已有分类封面，不新出图；决策 R-5） */
const BAND_COVER: Record<AgeBand, string> = {
  '1-3': 'assets/images/covers/fruit.webp',
  '3-6': 'assets/images/covers/poems.webp',
};

/** 日常玩法区绘本卡封面：复用绘本段 stories 封面，零新图 */
const STORY_COVER = 'assets/images/covers/stories.webp';

export function HomePage() {
  const { categories, cards, isReadOnly } = useCatalog();
  const [displayOpen, setDisplayOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const navigate = useNavigate();

  // 分龄入口的适龄张数（v0.8）：两档共用难度 2，计数允许交叠
  const bandCounts = useMemo(
    () => ({
      '1-3': countCardsByBand(cards, '1-3'),
      '3-6': countCardsByBand(cards, '3-6'),
    }),
    [cards],
  );

  // 分类墙分段（v0.12）：七个主题段，管理区新建的分类落兜底段「更多」
  const sections = useMemo(() => groupCategories(categories), [categories]);

  // 每档有适龄卡的段数（v0.13 大卡上的「M 段」）：段内至少一张卡命中该档才计入
  const bandSectionCounts = useMemo(() => {
    const countFor = (band: AgeBand): number => {
      const active = new Set(
        cards.filter((card) => matchesBand(card, band)).map((card) => card.categoryId),
      );
      return sections.filter((section) =>
        section.items.some((category) => active.has(category.id)),
      ).length;
    };
    return { '1-3': countFor('1-3'), '3-6': countFor('3-6') };
  }, [cards, sections]);

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
            {/* 年龄双大卡（v0.13 H-1）：v0.14 S-1 改文字压图——body 叠进 media，遮罩白字挂图下缘 */}
            <div className="band-hero" role="group" aria-label="按年龄浏览">
              {AGE_BANDS.map((band) => (
                <Link key={band} className="band-hero__card" to={`/age/${band}`}>
                  <div className="band-hero__media">
                    <ImageWithFallback
                      src={BAND_COVER[band]}
                      alt=""
                      fallbackText={AGE_BAND_NAME[band]}
                      eager
                    />
                    <div className="band-hero__body">
                      <span className="band-hero__label">
                        {AGE_BAND_LABEL[band]} · {AGE_BAND_NAME[band]}
                      </span>
                      <span className="band-hero__tagline">{AGE_BAND_TAGLINE[band]}</span>
                      <span className="band-hero__count">
                        {bandCounts[band]} 张适龄 · {bandSectionCounts[band]} 段
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 日常玩法区（v0.13 H-2）：收口绘本 / 听音 / 复习三个既有路由，零新功能（决策 R-3） */}
            <section className="play-section">
              <h2 className="section__title">日常玩法</h2>
              <div className="play-row" role="group" aria-label="日常玩法">
                <Link className="play-card play-card--story" to="/group/story">
                  <div className="play-card__media">
                    <ImageWithFallback src={STORY_COVER} alt="" fallbackText="绘本" eager />
                  </div>
                  <span className="play-card__label">绘本故事</span>
                  <span className="play-card__hint">一页一句的小故事</span>
                </Link>
                <Link className="play-card play-card--quiz" to="/quiz">
                  <div className="play-card__icon">
                    <Headphones size={26} />
                  </div>
                  <span className="play-card__label">听音选图</span>
                  <span className="play-card__hint">听声音，选出对应的卡</span>
                </Link>
                <Link className="play-card play-card--review" to="/review">
                  <div className="play-card__icon">
                    <RotateCcw size={26} />
                  </div>
                  <span className="play-card__label">练一练不熟的</span>
                  <span className="play-card__hint">把还不熟的卡练熟</span>
                </Link>
              </div>
            </section>
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
