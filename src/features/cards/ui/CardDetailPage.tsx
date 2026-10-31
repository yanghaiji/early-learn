/** 卡片详情 · 单屏单卡（PRD M3/M4 / US-03~US-05) */

import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Play,
  Square,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import type { Card } from '../../../domain/entities/card';
import { buildCardSequence, isAgeBand, matchesBand } from '../../../domain/services/catalog';
import { useSwipe } from '../../../shared/hooks';
import {
  hintReadOnlyOnce,
  useProgressStore,
  useIsFavorite,
  useMarkStatus,
} from '../../../shared/store/progressStore';
import { toast } from '../../../shared/store/toastStore';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { categoryColorVar, cx } from '../../../shared/utils/classNames';
import {
  bindSlideshow,
  markDetailPageAlive,
  notifySlideshowCard,
  useSlideshow,
} from '../hooks/useSlideshow';
import { useSpeech } from '../../speech/hooks/useSpeech';

/** 诗词朗读整首正文，成语读「成语 + 释义」，其余卡片（含故事）读中文名 */
function speechTextOf(card: Card): string {
  if (card.kind === 'idiom') return card.meaning ? `${card.zh}，${card.meaning}` : card.zh;
  return card.lines && card.lines.length > 0 ? card.lines.join('') : card.zh;
}

export function CardDetailPage() {
  const { cardId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { cards, categories, speech, groupOf } = useCatalog();
  const settings = useSettingsStore((state) => state.settings);
  const { speak, cancel, speaking, enabled } = useSpeech();
  const favorite = useIsFavorite(cardId);
  const mark = useMarkStatus(cardId);
  const persistent = useProgressStore((state) => state.persistent);
  const toggleFavorite = useProgressStore((state) => state.toggleFavorite);
  const markCard = useProgressStore((state) => state.mark);
  const trackRecent = useProgressStore((state) => state.trackRecent);
  const { running: slideshowRunning, start: startSlideshow, stop: stopSlideshow } = useSlideshow();

  // 分类页带过来的筛选：详情页只在该组 / 该龄段内翻页，不串到别的主题或年龄段
  const groupKey = searchParams.get('group');
  const bandParam = searchParams.get('band');
  const band = isAgeBand(bandParam) ? bandParam : '';
  const card = cards.find((item) => item.id === cardId);
  const category = card ? categories.find((item) => item.id === card.categoryId) : undefined;
  const sequence = card
    ? buildCardSequence(
        cards,
        card.id,
        card.categoryId,
        (item) =>
          (groupKey ? groupOf(item) === groupKey : true) &&
          (band ? matchesBand(item, band) : true),
      )
    : null;

  // 翻页与连播都要带着原查询串，否则 ?group= / ?band= 会在第一次翻页时丢掉（v0.8 修既有缺陷）
  const search = location.search;

  // 返回到刚才那页（分组 + 页码），直接打开时退回同 group 的第一页
  const listUrl =
    (location.state as { listUrl?: string } | null)?.listUrl ??
    (card ? `/c/${card.categoryId}${location.search}` : '/');

  const goPrev = useCallback(() => {
    if (!sequence?.hasPrev) return;
    stopSlideshow();
    const target = sequence.list[sequence.index - 1];
    if (target) navigate(`/card/${target.id}${search}`, { replace: true, state: location.state });
  }, [location.state, navigate, search, sequence, stopSlideshow]);

  const goNext = useCallback(() => {
    if (!sequence?.hasNext) return;
    stopSlideshow();
    const target = sequence.list[sequence.index + 1];
    if (target) navigate(`/card/${target.id}${search}`, { replace: true, state: location.state });
  }, [location.state, navigate, search, sequence, stopSlideshow]);

  const swipe = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  // 连播（US-A6）：控制器在模块级，页面只负责提供「读这张 / 跳这张」的回调
  const speakCardById = useCallback(
    async (id: string): Promise<boolean> => {
      const target = cards.find((item) => item.id === id);
      if (!target) {
        stopSlideshow();
        return false;
      }
      // await 到这张读完为止：连播的 2s 停顿是从「读完」开始算的（技术方案 §4.3）
      const ok = await speak(speechTextOf(target), 'zh-CN', target.id);
      // 没出声就停，绝不「静默地一张张跳过」（PRD US-A6 末条）
      if (!ok) stopSlideshow();
      return ok;
    },
    [cards, speak, stopSlideshow],
  );

  const goCardById = useCallback(
    (id: string) => navigate(`/card/${id}${search}`, { replace: true, state: location.state }),
    [location.state, navigate, search],
  );

  // 每次渲染后刷新回调：设置里改语速 / 开关后，下一个节拍用新闭包
  useEffect(() => {
    bindSlideshow({ speak: speakCardById, goCard: goCardById, cancelSpeech: cancel });
  });

  // 挂上哪张卡就告知状态机（非连播推进的出现方式 = 中断）
  useEffect(() => {
    if (cardId) notifySlideshowCard(cardId);
  }, [cardId]);

  // 组件实例只在真正离开详情页时销毁（同路由换卡是复用）
  useEffect(() => {
    markDetailPageAlive(true);
    return () => markDetailPageAlive(false);
  }, []);

  // 播到一半朗读突然不可用（关开关 / 音色丢失）：停在当前这张并说明原因，不静默翻页
  useEffect(() => {
    if (!slideshowRunning || enabled) return;
    stopSlideshow();
    toast('连播已停止：当前无法朗读，请检查语音设置');
  }, [enabled, slideshowRunning, stopSlideshow]);

  const toggleSlideshow = () => {
    if (slideshowRunning) {
      stopSlideshow();
      return;
    }
    if (!enabled) {
      toast('连播需要朗读能力：请在系统里加装语音，并检查设置里的语音开关');
      return;
    }
    const ids = sequence?.list.map((item) => item.id) ?? [];
    const index = sequence?.index ?? 0;
    if (ids.length === 0) return;
    // 点下去就在手势内读出首句（风险 R2：iOS 拦非手势播放）
    startSlideshow({ ids, index, speak: speakCardById, goCard: goCardById, cancelSpeech: cancel });
  };

  // 键盘导航（家长在桌面端使用）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'Escape') navigate(listUrl);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrev, goNext, navigate, listUrl]);

  // 进入即朗读（默认关闭，需家长在设置中开启）；依赖卡片 id，避免刷新时重复朗读
  const speakOnEnter = settings.speakOnEnter;
  const currentCardId = card?.id;
  useEffect(() => {
    if (!speakOnEnter || !currentCardId || !speech.isSupported()) return;
    const target = cards.find((item) => item.id === currentCardId);
    if (target) void speak(speechTextOf(target), 'zh-CN', target.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardId, speakOnEnter]);

  // 进入即记入「最近浏览」（US-A2，只在换卡时触发一次）
  useEffect(() => {
    if (currentCardId) trackRecent(currentCardId);
  }, [currentCardId, trackRecent]);

  if (!card) {
    return (
      <main className="page">
        <EmptyState
          emoji="🃏"
          title="卡片不存在"
          description="它可能已被删除，回到分类里再选一张吧。"
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </main>
    );
  }

  const mode = settings.displayMode;
  const total = sequence?.list.length ?? 1;
  const index = (sequence?.index ?? 0) + 1;
  const isPoem = card.kind === 'poem';
  const isStory = card.kind === 'story';
  const isIdiom = card.kind === 'idiom';
  // 成语卡没有英文：看英文模式下仍显示中文块，否则整页只剩一张图
  const showChinese = mode !== 'en' || isIdiom;
  // 只读模式（存储不可用）首次写入提一次「不会保存」（PRD §6.3）
  const hintIfReadOnly = () => {
    if (!persistent) hintReadOnlyOnce();
  };
  const onToggleFavorite = () => {
    const willFavorite = !favorite;
    hintIfReadOnly();
    toggleFavorite(card.id);
    toast(willFavorite ? '已加入收藏' : '已取消收藏');
  };
  const onMark = (status: 'known' | 'unknown') => {
    hintIfReadOnly();
    markCard(card.id, status);
  };
  // 进入故事页：带上分类页 URL 与筛选串，返回链路不断（v0.2 ADR-S5 / v0.8 补 ?band=）
  const openStory = () => {
    navigate(`/story/${card.id}${search}`, listUrl ? { state: { listUrl } } : undefined);
  };
  const speechText = speechTextOf(card);
  const speechHint = !speech.isSupported()
    ? '当前浏览器不支持语音朗读，建议使用 Chrome / Edge / Safari'
    : !settings.speechEnabled
      ? '语音已在设置中关闭'
      : undefined;

  return (
    <>
      <header className="topbar topbar--narrow">
        <IconButton label="返回卡片列表" plain onClick={() => navigate(listUrl)}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="topbar__sub" style={{ margin: 0 }}>
            {category?.name ?? '卡片'}
          </p>
        </div>
      </header>

      <main
        className={cx('detail', isPoem && 'detail--poem', isIdiom && 'detail--idiom')}
        {...swipe}
        aria-label={`${card.zh} 卡片详情`}
      >
        <div className="detail__stage">
          <button
            type="button"
            className={cx('detail__media-btn', speaking === 'zh-CN' && 'is-speaking')}
            style={categoryColorVar(category?.color)}
            onClick={() => void speak(speechText, 'zh-CN', card.id)}
            aria-label={`朗读 ${card.zh}`}
            disabled={!enabled}
          >
            <ImageWithFallback
              src={card.image}
              alt={card.zh}
              fallbackText={card.zh}
              colorToken={category?.color}
              eager
            />
          </button>
        </div>

        <div className="detail__words">
          {showChinese ? (
            isPoem ? (
              <>
                <h1 className="detail__poem-title">{card.zh}</h1>
                <p className="detail__author">
                  {card.dynasty} · {card.author}
                </p>
                <div className="detail__poem">
                  {(card.lines ?? []).map((line, lineIndex) => (
                    <p className="detail__poem-line" key={`${lineIndex}-${line}`}>
                      {line}
                    </p>
                  ))}
                </div>
                {card.translation ? <p className="detail__translation">{card.translation}</p> : null}
              </>
            ) : isStory ? (
              <>
                <h1 className="detail__zh">{card.zh}</h1>
                <p className="detail__pinyin">{card.pinyin}</p>
                {card.moral ? <p className="detail__translation">{card.moral}</p> : null}
              </>
            ) : (
              <>
                {card.kind === 'character' ? (
                  <p className="detail__char">{card.zh}</p>
                ) : (
                  <h1 className="detail__zh">{card.zh}</h1>
                )}
                <p className="detail__pinyin">{card.pinyin}</p>
              </>
            )
          ) : null}
          {mode !== 'zh' && card.en ? <p className="detail__en">{card.en}</p> : null}
          {card.kind === 'character' && showChinese ? (
            <p className="detail__meta">
              {card.strokes ? <span>{card.strokes} 画</span> : null}
              {card.words && card.words.length > 0 ? <span>{card.words.join(' / ')}</span> : null}
            </p>
          ) : null}
          {speechHint ? (
            <p className="text-xs muted" style={{ margin: 0 }}>
              {speechHint}
            </p>
          ) : null}
        </div>

        {/* 成语版式（v0.6 PRD §4.2）：释义 → 例句 → 近义·反义 → 出处 */}
        {isIdiom ? (
          <section className="detail__idiom" aria-label="成语释义与用法">
            {card.meaning ? <p className="detail__meaning">{card.meaning}</p> : null}
            {card.examples && card.examples.length > 0 ? (
              <ul className="detail__examples">
                {card.examples.map((example, exampleIndex) => (
                  <li className="detail__example" key={`${exampleIndex}-${example}`}>
                    <span className="detail__example-badge" aria-hidden="true">
                      例
                    </span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {card.synonyms && card.synonyms.length > 0 ? (
              <div className="detail__related">
                <span className="detail__related-label">近义</span>
                {card.synonyms.map((word) => (
                  <span className="detail__word-chip" key={word}>
                    {word}
                  </span>
                ))}
              </div>
            ) : null}
            {card.antonyms && card.antonyms.length > 0 ? (
              <div className="detail__related">
                <span className="detail__related-label">反义</span>
                {card.antonyms.map((word) => (
                  <span className="detail__word-chip" key={word}>
                    {word}
                  </span>
                ))}
              </div>
            ) : null}
            {card.citation ? <p className="detail__citation">出处 · {card.citation}</p> : null}
          </section>
        ) : null}

        <div className="detail__actions">
          {isStory ? (
            <Button variant="primary" size="lg" block className="detail__open-story" onClick={openStory}>
              开始阅读
            </Button>
          ) : null}
          <div className="detail__speak">
            <button
              type="button"
              className="tap-btn tap-btn--primary"
              onClick={() => void speak(speechText, 'zh-CN', card.id)}
              disabled={!enabled}
            >
              <Volume2 size={22} />
              {isPoem ? '读全诗' : '中文'}
            </button>
            {/* 成语卡无英文（PRD §3.2）：不显示 English 按钮 */}
            {isIdiom ? null : (
              <button
                type="button"
                className="tap-btn"
                onClick={() => void speak(card.en, 'en-US', card.id)}
                disabled={!enabled}
              >
                <Volume2 size={22} />
                English
              </button>
            )}
          </div>

          <div className="detail__learn">
            <button
              type="button"
              className={cx('tap-btn', favorite && 'tap-btn--active')}
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? '取消收藏' : '收藏这张卡'}
            >
              <Heart size={20} fill={favorite ? 'currentColor' : 'none'} />
              收藏
            </button>
            <button
              type="button"
              className={cx('tap-btn', mark === 'known' && 'tap-btn--active')}
              onClick={() => onMark('known')}
              aria-pressed={mark === 'known'}
            >
              <ThumbsUp size={20} />
              认识
            </button>
            <button
              type="button"
              className={cx('tap-btn', mark === 'unknown' && 'tap-btn--active')}
              onClick={() => onMark('unknown')}
              aria-pressed={mark === 'unknown'}
            >
              <ThumbsDown size={20} />
              不认识
            </button>
          </div>

          <div className="detail__nav">
            <IconButton label="上一张" small onClick={goPrev} disabled={!sequence?.hasPrev}>
              <ChevronLeft size={24} />
            </IconButton>
            <span className="toolbar__page" aria-label={`第 ${index} 张，共 ${total} 张`}>
              {index} / {total}
            </span>
            <IconButton label="下一张" small onClick={goNext} disabled={!sequence?.hasNext}>
              <ChevronRight size={24} />
            </IconButton>
            {/* 连播开关放在翻页那一行：与「一张一张看」是同一个动作的两面 */}
            <button
              type="button"
              className={cx('tap-btn', 'tap-btn--mini', slideshowRunning && 'tap-btn--active')}
              onClick={toggleSlideshow}
              aria-pressed={slideshowRunning}
              aria-label={slideshowRunning ? '停止连播' : '连播'}
            >
              {slideshowRunning ? <Square size={18} /> : <Play size={18} />}
              {slideshowRunning ? '停止' : '连播'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
