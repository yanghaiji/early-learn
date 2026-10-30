/** 复习单卡流（v0.4 C 组 / US-A4）：只练标记「不认识」的卡，每轮 ≤10 张 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ThumbsDown } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { buildReviewQueue, unknownCount } from '../../../domain/services/progress';
import { useProgressStore } from '../../../shared/store/progressStore';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { categoryColorVar } from '../../../shared/utils/classNames';
import { useSettingsStore } from '../../../shared/store/settingsStore';

export function ReviewPage() {
  const navigate = useNavigate();
  const { cards, categories } = useCatalog();
  const displayMode = useSettingsStore((state) => state.settings.displayMode);
  const markCard = useProgressStore((state) => state.mark);
  const remainingUnknown = useProgressStore((state) => unknownCount(state.doc));

  // 队列按进入时的 marks 现算、不持久化（技术方案 §4.4）；标「认识了」即从本地队列移除
  const [queue, setQueue] = useState(() =>
    buildReviewQueue(useProgressStore.getState().doc, cards),
  );
  const [index, setIndex] = useState(0);
  // 记住进入时的队列长度：区分「M=0 空态」与「练完了完成态」
  const initialCount = useRef(queue.length);

  const current = queue[index];
  const total = queue.length;

  if (initialCount.current === 0) {
    return (
      <main className="page">
        <EmptyState
          emoji="🔁"
          title="还没有标记不熟的卡片"
          description="在卡片详情页点「不认识」，这里就能只练那几张。"
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </main>
    );
  }

  if (!current) {
    return (
      <main className="page">
        <EmptyState
          emoji="🎉"
          title="这些都认识啦"
          description={
            remainingUnknown > 0
              ? `今天先到这儿，还有 ${remainingUnknown} 张下次再练。`
              : '这一轮标记不熟的卡片都练完了。'
          }
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </main>
    );
  }

  const category = categories.find((item) => item.id === current.categoryId);

  const onKnown = () => {
    markCard(current.id, 'known');
    setQueue((prev) => prev.filter((card) => card.id !== current.id));
  };

  return (
    <>
      <header className="topbar topbar--bordered">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">练一练不熟的</h1>
          <p className="topbar__sub">第 {index + 1} / {total} 张</p>
        </div>
      </header>

      <main className="detail" aria-label={`${current.zh} 复习卡片`}>
        <div className="detail__stage">
          <div className="detail__media-btn" style={categoryColorVar(category?.color)}>
            <ImageWithFallback
              src={current.image}
              alt={current.zh}
              fallbackText={current.zh}
              colorToken={category?.color}
              eager
            />
          </div>
        </div>

        <div className="detail__words">
          {displayMode !== 'en' ? <h1 className="detail__zh">{current.zh}</h1> : null}
          {displayMode !== 'en' ? <p className="detail__pinyin">{current.pinyin}</p> : null}
          {displayMode !== 'zh' ? <p className="detail__en">{current.en}</p> : null}
        </div>

        <div className="detail__actions">
          <div className="detail__speak">
            <button type="button" className="tap-btn tap-btn--primary" onClick={onKnown}>
              <Check size={22} />
              认识了
            </button>
            <button
              type="button"
              className="tap-btn"
              onClick={() => setIndex((prev) => prev + 1)}
            >
              <ThumbsDown size={22} />
              还不熟
            </button>
          </div>

          <div className="detail__nav">
            <IconButton
              label="上一张"
              small
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
              disabled={index === 0}
            >
              <ChevronLeft size={24} />
            </IconButton>
            <span className="toolbar__page" aria-label={`第 ${index + 1} 张，共 ${total} 张`}>
              {index + 1} / {total}
            </span>
            <IconButton
              label="下一张"
              small
              onClick={() => setIndex((prev) => prev + 1)}
              disabled={index + 1 >= total}
            >
              <ChevronRight size={24} />
            </IconButton>
          </div>
        </div>
      </main>
    </>
  );
}
