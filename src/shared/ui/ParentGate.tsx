/** 家长门（PRD US-07）：长按 3 秒 + 10 以内算题；连错 3 次冷却 30 秒 */

import { useEffect, useMemo, useState } from 'react';
import { GATE } from '../../domain/constants';
import { useLongPress } from '../hooks';
import { Button } from './Button';

interface Props {
  onPass: () => void;
}

interface Question {
  text: string;
  answer: number;
  options: number[];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function makeQuestion(): Question {
  const plus = Math.random() > 0.4;
  if (plus) {
    const a = randomInt(2, 9);
    const b = randomInt(1, 9);
    const answer = a + b;
    const options = new Set<number>([answer]);
    while (options.size < 4) options.add(randomInt(2, 18));
    return { text: `${a} + ${b} = ?`, answer, options: [...options].sort(() => Math.random() - 0.5) };
  }
  const a = randomInt(5, 12);
  const b = randomInt(1, a - 1);
  const answer = a - b;
  const options = new Set<number>([answer]);
  while (options.size < 4) options.add(randomInt(0, 12));
  return { text: `${a} − ${b} = ?`, answer, options: [...options].sort(() => Math.random() - 0.5) };
}

export function ParentGate({ onPass }: Props) {
  const [step, setStep] = useState<'hold' | 'quiz' | 'cooldown'>('hold');
  const [attempts, setAttempts] = useState(0);
  const [question, setQuestion] = useState<Question>(() => makeQuestion());
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const longPress = useLongPress(GATE.LONG_PRESS_MS, () => setStep('quiz'));

  useEffect(() => {
    if (step !== 'cooldown') return;
    setCooldownLeft(Math.ceil(GATE.COOLDOWN_MS / 1000));
    const timer = window.setInterval(() => {
      setCooldownLeft((left) => {
        if (left <= 1) {
          window.clearInterval(timer);
          setStep('hold');
          setAttempts(0);
          longPress.cancel();
          return 0;
        }
        return left - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // longPress.cancel 稳定，不加入依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const hint = useMemo(() => {
    if (step === 'cooldown') return `尝试次数过多，请等待 ${cooldownLeft} 秒后再试`;
    if (step === 'quiz') return '请回答下面的问题，确认由家长操作';
    return '家长管理入口：请长按下方按钮 3 秒';
  }, [step, cooldownLeft]);

  const answer = (value: number) => {
    if (value === question.answer) {
      onPass();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= GATE.MAX_ATTEMPTS) {
      setStep('cooldown');
      return;
    }
    setQuestion(makeQuestion());
  };

  return (
    <div className="panel" role="group" aria-label="家长验证">
      <h2 className="panel__title">家长验证</h2>
      <p className="muted text-sm" style={{ marginTop: 0 }}>
        {hint}
      </p>

      {step === 'hold' ? (
        <button
          type="button"
          className="gate-hold"
          onPointerDown={longPress.start}
          onPointerUp={longPress.cancel}
          onPointerLeave={longPress.cancel}
          onPointerCancel={longPress.cancel}
          aria-label="长按 3 秒进入家长管理"
        >
          <span className="gate-hold__fill" style={{ height: `${Math.round(longPress.progress * 100)}%` }} aria-hidden="true" />
          <span style={{ position: 'relative' }}>{longPress.holding ? '继续按住…' : '按住这里 3 秒'}</span>
        </button>
      ) : null}

      {step === 'quiz' ? (
        <>
          <p className="gate-question">{question.text}</p>
          <div className="gate-answers">
            {question.options.map((option) => (
              <Button key={option} size="lg" onClick={() => answer(option)}>
                {option}
              </Button>
            ))}
          </div>
          <p className="field__hint" style={{ marginTop: 12 }}>
            已答错 {attempts} 次，累计 {GATE.MAX_ATTEMPTS} 次将冷却 {Math.round(GATE.COOLDOWN_MS / 1000)} 秒
          </p>
        </>
      ) : null}

      {step === 'cooldown' ? (
        <div className="empty" style={{ padding: '24px 0' }}>
          <div className="empty__emoji" aria-hidden="true">
            ⏳
          </div>
          <p className="empty__desc">冷却中，还剩 {cooldownLeft} 秒</p>
        </div>
      ) : null}
    </div>
  );
}
