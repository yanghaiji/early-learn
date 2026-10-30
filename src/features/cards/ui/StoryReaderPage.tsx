/** 故事页（v0.2 / PRD US-S3~US-S5）：一页读完 + 一张综合图，不翻页 */

import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, List, Volume2 } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { categoryColorVar, cx } from '../../../shared/utils/classNames';
import { useSpeech } from '../../speech/hooks/useSpeech';

export function StoryReaderPage() {
  const { cardId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { cards, categories, speech } = useCatalog();
  const settings = useSettingsStore((state) => state.settings);
  const { speak, speaking, enabled } = useSpeech();

  const card = cards.find((item) => item.id === cardId);
  const category = card ? categories.find((item) => item.id === card.categoryId) : undefined;
  const paragraphs = (card?.pages ?? []).map((page) => page.text).filter((text) => text.trim());
  const fullText = paragraphs.join('');

  // 返回故事详情；详情把分类页 URL 透传下来，链路不断
  const listUrl = (location.state as { listUrl?: string } | null)?.listUrl;
  const detailUrl = card ? `/card/${card.id}` : '/';
  const back = useCallback(() => {
    navigate(detailUrl, listUrl ? { state: { listUrl } } : undefined);
  }, [detailUrl, listUrl, navigate]);

  // Esc 返回详情（家长在桌面端使用）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') back();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [back]);

  // 进入即朗读整篇（默认关闭，家长在设置中开启）
  const speakOnEnter = settings.speakOnEnter;
  useEffect(() => {
    if (!speakOnEnter || !fullText || !speech.isSupported()) return;
    void speak(fullText, 'zh-CN');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, speakOnEnter]);

  const readAll = () => {
    if (fullText) void speak(fullText, 'zh-CN');
  };

  if (!card) {
    return (
      <main className="page">
        <EmptyState
          emoji="📕"
          title="故事不存在"
          description="它可能已被删除，回到故事列表再选一本吧。"
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </main>
    );
  }

  if (paragraphs.length === 0) {
    return (
      <main className="page">
        <EmptyState
          emoji="📖"
          title="这个故事还没有内容"
          description="请家长进入管理区补充故事正文。"
          action={
            <Button variant="primary" onClick={back}>
              返回故事详情
            </Button>
          }
        />
      </main>
    );
  }

  const speechHint = !speech.isSupported()
    ? '当前浏览器不支持语音朗读'
    : !settings.speechEnabled
      ? '语音已在设置中关闭'
      : undefined;

  return (
    <>
      <header className="topbar topbar--story">
        <IconButton label="返回故事详情" plain onClick={back}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">{card.zh}</h1>
          <p className="topbar__sub">{paragraphs.length} 段 · 一页读完</p>
        </div>
      </header>

      <main className="story" aria-label={`${card.zh} 故事正文`}>
        <button
          type="button"
          className={cx('story__media', speaking === 'zh-CN' && 'is-speaking')}
          style={categoryColorVar(category?.color)}
          onClick={readAll}
          aria-label="朗读整篇故事"
          disabled={!enabled}
        >
          <ImageWithFallback
            src={card.image}
            alt={card.zh}
            fallbackText={card.zh.slice(0, 1)}
            colorToken={category?.color}
            eager
          />
        </button>

        <article className="story__body">
          <p className="story__meta">
            {card.pinyin}
            <span aria-hidden="true"> · </span>
            {card.en}
          </p>
          {paragraphs.map((text, index) => (
            <p key={`${index}-${text.slice(0, 4)}`} className="story__para">
              {text}
            </p>
          ))}
          {card.moral ? (
            <p className="story__moral">
              <span className="story__moral-label">这个故事告诉我们</span>
              {card.moral}
            </p>
          ) : null}
        </article>

        <div className="story__actions">
          <Button variant="primary" onClick={readAll} disabled={!enabled}>
            <Volume2 size={20} />
            读整篇
          </Button>
          <Button onClick={back}>
            <List size={18} />
            返回故事详情
          </Button>
        </div>

        {speechHint ? (
          <p className="story__hint text-xs muted" style={{ margin: 0 }}>
            {speechHint}
          </p>
        ) : null}
      </main>
    </>
  );
}
