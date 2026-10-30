/** 卡片详情 · 单屏单卡（PRD M3/M4 / US-03~US-05) */

import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import type { Card } from '../../../domain/entities/card';
import { buildCardSequence } from '../../../domain/services/catalog';
import { useSwipe } from '../../../shared/hooks';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { categoryColorVar, cx } from '../../../shared/utils/classNames';
import { useSpeech } from '../../speech/hooks/useSpeech';

/** 诗词朗读整首正文，其余卡片（含故事）读中文名 */
function speechTextOf(card: Card): string {
  return card.lines && card.lines.length > 0 ? card.lines.join('') : card.zh;
}

export function CardDetailPage() {
  const { cardId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { cards, categories, speech, groupOf } = useCatalog();
  const settings = useSettingsStore((state) => state.settings);
  const { speak, speaking, enabled } = useSpeech();

  // 分类页带过来的组筛选：详情页只在该组内翻页，不串到别的主题
  const groupKey = searchParams.get('group');
  const card = cards.find((item) => item.id === cardId);
  const category = card ? categories.find((item) => item.id === card.categoryId) : undefined;
  const sequence = card
    ? buildCardSequence(
        cards,
        card.id,
        card.categoryId,
        groupKey ? (item) => groupOf(item) === groupKey : undefined,
      )
    : null;

  // 返回到刚才那页（分组 + 页码），直接打开时退回同 group 的第一页
  const listUrl =
    (location.state as { listUrl?: string } | null)?.listUrl ??
    (card ? `/c/${card.categoryId}${location.search}` : '/');

  const goPrev = useCallback(() => {
    if (!sequence?.hasPrev) return;
    const target = sequence.list[sequence.index - 1];
    if (target) navigate(`/card/${target.id}`, { replace: true });
  }, [navigate, sequence]);

  const goNext = useCallback(() => {
    if (!sequence?.hasNext) return;
    const target = sequence.list[sequence.index + 1];
    if (target) navigate(`/card/${target.id}`, { replace: true });
  }, [navigate, sequence]);

  const swipe = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

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
    if (target) void speak(speechTextOf(target), 'zh-CN');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardId, speakOnEnter]);

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
  // 进入故事页：带上分类页 URL，返回链路不断（v0.2 ADR-S5）
  const openStory = () => {
    navigate(`/story/${card.id}`, listUrl ? { state: { listUrl } } : undefined);
  };
  const speechText = speechTextOf(card);
  const speechHint = !speech.isSupported()
    ? '当前浏览器不支持语音朗读，建议使用 Chrome / Edge / Safari'
    : !settings.speechEnabled
      ? '语音已在设置中关闭'
      : undefined;

  return (
    <>
      <header className="topbar">
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
        className={cx('detail', isPoem && 'detail--poem')}
        {...swipe}
        aria-label={`${card.zh} 卡片详情`}
      >
        <div className="detail__stage">
          <button
            type="button"
            className={cx('detail__media-btn', speaking === 'zh-CN' && 'is-speaking')}
            style={categoryColorVar(category?.color)}
            onClick={() => void speak(speechText, 'zh-CN')}
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
          {mode !== 'en' ? (
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
          {mode !== 'zh' ? <p className="detail__en">{card.en}</p> : null}
          {card.kind === 'character' && mode !== 'en' ? (
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
              onClick={() => void speak(speechText, 'zh-CN')}
              disabled={!enabled}
            >
              <Volume2 size={22} />
              {isPoem ? '读全诗' : '中文'}
            </button>
            <button
              type="button"
              className="tap-btn"
              onClick={() => void speak(card.en, 'en-US')}
              disabled={!enabled}
            >
              <Volume2 size={22} />
              English
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
          </div>
        </div>
      </main>
    </>
  );
}
