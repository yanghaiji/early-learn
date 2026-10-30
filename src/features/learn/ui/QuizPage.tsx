/** 听音选图（v0.4 C 组 / US-A5）：听一个词、点一张图；答错只高亮正确项，不判负不计分 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { QUIZ_OPTIONS } from '../../../domain/constants';
import type { Card } from '../../../domain/entities/card';
import type { Category } from '../../../domain/entities/category';
import {
  buildDeck,
  buildQuestion,
  pickLangOptions,
  quizPool,
  type Question,
  type QuizMode,
} from '../../../domain/services/quiz';
import { useProgressStore } from '../../../shared/store/progressStore';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { cx, categoryColorVar } from '../../../shared/utils/classNames';
import { useSpeech } from '../../speech/hooks/useSpeech';

type Phase = 'setup' | 'play' | 'done';

/** 题干读什么：认汉字读中文名，认英文读英文词 */
function promptOf(card: Card, mode: QuizMode): string {
  return mode === 'zh' ? card.zh : card.en;
}

export function QuizPage() {
  const navigate = useNavigate();
  const { cards, categories, speech } = useCatalog();
  const { speak, enabled } = useSpeech();

  const [phase, setPhase] = useState<Phase>('setup');
  // 成语卡不进听音选图：卡面就是四个字，出题等于把答案印在选项上（v0.6 PRD E-10）
  const pool = useMemo(() => quizPool(cards), [cards]);
  const [mode, setMode] = useState<QuizMode>('zh');
  const [blocked, setBlocked] = useState<string | null>(null);
  const [deck, setDeck] = useState<Card[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [locked, setLocked] = useState(false);

  const lang = pickLangOptions(mode);

  // 每题自动播一次题干；再点「再听一遍」可重播
  useEffect(() => {
    if (phase === 'play' && question) {
      void speak(promptOf(question.answer, mode), lang, question.answer.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question]);

  const startRound = () => {
    if (pool.length < QUIZ_OPTIONS) {
      setBlocked('卡片太少，玩不了：先去添加几张卡片吧。');
      return;
    }
    // 开局前探测（技术方案 §4.4）：发音完全不可用就不进题目，不白屏不死循环
    if (!speech.hasVoice(lang)) {
      setBlocked(
        `这台设备的发音用不了，先在系统里加装${mode === 'zh' ? '中文' : '英文'}语音（可在设置页查看「本机音色」那一行）`,
      );
      return;
    }
    if (!enabled) {
      setBlocked('朗读当前不可用：检查设置里的语音开关后重试。');
      return;
    }
    setBlocked(null);
    const next = buildDeck(pool, useProgressStore.getState().doc);
    const first = next[0];
    if (!first) {
      setBlocked('卡片太少，玩不了：先去添加几张卡片吧。');
      return;
    }
    setDeck(next);
    setQuestionIndex(0);
    setQuestion(buildQuestion(first, pool));
    setRevealed(false);
    setLocked(false);
    setPhase('play');
  };

  const advance = () => {
    const nextIndex = questionIndex + 1;
    if (nextIndex >= deck.length) {
      setPhase('done');
      return;
    }
    setQuestionIndex(nextIndex);
    const nextCard = deck[nextIndex];
    if (nextCard) setQuestion(buildQuestion(nextCard, pool));
    setRevealed(false);
    setLocked(false);
  };

  const pick = (picked: Card) => {
    if (!question || locked) return;
    if (picked.id !== question.answer.id) {
      // 答错：高亮正确项并播它的发音，同题允许再选，不判负不扣分
      setRevealed(true);
      void speak(promptOf(question.answer, mode), lang, question.answer.id);
      return;
    }
    setLocked(true);
    void speak(promptOf(picked, mode), lang, picked.id).then(advance);
  };

  if (phase === 'done') {
    return (
      <main className="page">
        <EmptyState
          emoji="🎈"
          title="这一局玩完啦"
          description="不比分数，孩子愿意再来一局就很好。"
          action={
            <div className="inline">
              <Button variant="primary" onClick={startRound}>
                再来一局
              </Button>
              <Link className="btn btn--ghost" to="/">
                返回首页
              </Link>
            </div>
          }
        />
      </main>
    );
  }

  if (phase === 'setup' || !question) {
    return (
      <>
        <header className="topbar topbar--bordered">
          <IconButton label="返回首页" plain onClick={() => navigate('/')}>
            <ArrowLeft size={26} />
          </IconButton>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="topbar__title">听音选图</h1>
            <p className="topbar__sub">听一个词，点那张图</p>
          </div>
        </header>
        <main className="page">
          <div className="inline" role="group" aria-label="选择出题语言">
            <button
              type="button"
              className={cx('tap-btn', mode === 'zh' && 'tap-btn--active')}
              onClick={() => setMode('zh')}
              aria-pressed={mode === 'zh'}
            >
              认汉字
            </button>
            <button
              type="button"
              className={cx('tap-btn', mode === 'en' && 'tap-btn--active')}
              onClick={() => setMode('en')}
              aria-pressed={mode === 'en'}
            >
              认英文
            </button>
          </div>
          {blocked ? (
            <p className="banner" role="status">
              {blocked}
            </p>
          ) : null}
          <div style={{ marginTop: 24 }}>
            <Button variant="primary" size="lg" onClick={startRound}>
              开始游戏
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="topbar topbar--bordered">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">听音选图</h1>
          <p className="topbar__sub">
            第 {questionIndex + 1} / {deck.length} 题
          </p>
        </div>
      </header>

      <main className="page">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button
            type="button"
            className="tap-btn tap-btn--primary"
            onClick={() => void speak(promptOf(question.answer, mode), lang, question.answer.id)}
            disabled={!enabled}
          >
            <Volume2 size={22} />
            再听一遍
          </button>
        </div>

        <div className="grid-cards quiz-options" role="group" aria-label="四张选项">
          {question.options.map((card) => {
            const isRight = revealed && card.id === question.answer.id;
            return (
              <button
                key={card.id}
                type="button"
                className={cx('quiz-option', isRight && 'quiz-option--right')}
                onClick={() => pick(card)}
                disabled={locked}
                aria-label={isRight ? `正确答案 ${card.zh}` : `选择 ${card.zh}`}
              >
                <span className="quiz-option__media" style={categoryColorVar(categories.find((item: Category) => item.id === card.categoryId)?.color)}>
                  <ImageWithFallback
                    src={card.image}
                    alt=""
                    fallbackText={card.zh}
                    colorToken={categories.find((item: Category) => item.id === card.categoryId)?.color}
                    eager
                  />
                </span>
                <span className="quiz-option__caption">{mode === 'zh' ? card.zh : card.en}</span>
              </button>
            );
          })}
        </div>
      </main>
    </>
  );
}
