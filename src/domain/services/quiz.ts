/**
 * 听音选图出题领域服务（纯函数，无浏览器依赖）。对应 NFR/v0.4/技术方案.md §2.2
 *
 * 随机性全部走注入的 rng（默认 Math.random），单测可确定性重放；
 * 「同局不重复」「干扰项同分类优先」这类规则只在这里定，页面不做二次抽取。
 */

import { QUIZ_OPTIONS, QUIZ_QUESTIONS } from '../constants';
import type { Card, CardId } from '../entities/card';
import type { ProgressDocument } from '../entities/progress';
import type { SpeechLang } from '../ports/speech';
import { shuffle, type Rng } from './random';

/** 开局前二选一：认汉字 / 认英文（PRD §3，默认 zh 由页面决定） */
export type QuizMode = 'zh' | 'en';

export interface Question {
  answer: Card;
  options: Card[];
}

/** mode → 朗读语言 */
export function pickLangOptions(mode: QuizMode): SpeechLang {
  return mode === 'zh' ? 'zh-CN' : 'en-US';
}

/**
 * 出题池：成语卡排除在外（PRD v0.6 §4.3 / E-10）。
 * 四字卡的卡面就是成语本身，拿它出题等于把答案印在选项上。
 */
export function quizPool(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.kind !== 'idiom');
}

/** 按 id 去重取卡（进度里的 id 可能指向已删除的卡，取不到即跳过） */
function uniqueCards(ids: Iterable<CardId>, byId: Map<CardId, Card>): Card[] {
  const seen = new Set<CardId>();
  const cards: Card[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const card = byId.get(id);
    if (card) {
      seen.add(id);
      cards.push(card);
    }
  }
  return cards;
}

/**
 * 一局卡组：正确项优先取「浏览过的卡」（recent ∪ favorites ∪ 已标记），
 * 不足从全库随机补；同局不重复，最多 size 张。
 */
export function buildDeck(
  cards: readonly Card[],
  progress: ProgressDocument,
  size: number = QUIZ_QUESTIONS,
  rng: Rng = Math.random,
): Card[] {
  if (size <= 0) return [];
  const byId = new Map(cards.map((card) => [card.id, card]));
  const browsed = uniqueCards(
    [
      ...progress.recent.map((entry) => entry.cardId),
      ...progress.favorites,
      ...Object.keys(progress.marks),
    ],
    byId,
  );
  const browsedIds = new Set(browsed.map((card) => card.id));
  const rest = cards.filter((card) => !browsedIds.has(card.id));
  return [...shuffle(browsed, rng), ...shuffle(rest, rng)].slice(0, size);
}

/**
 * 单题：1 个正确项 + QUIZ_OPTIONS-1 个干扰；干扰优先同分类，不足全库补，
 * 选项位置打乱；同 id 只出现一次（异常装配也不出双选项）。
 */
export function buildQuestion(answer: Card, pool: readonly Card[], rng: Rng = Math.random): Question {
  const taken = new Set<CardId>([answer.id]);
  const candidates = pool.filter((card) => card.id !== answer.id);
  const sameCategory = shuffle(candidates.filter((card) => card.categoryId === answer.categoryId), rng);
  const others = shuffle(candidates.filter((card) => card.categoryId !== answer.categoryId), rng);
  const distractors: Card[] = [];
  for (const card of [...sameCategory, ...others]) {
    if (distractors.length >= QUIZ_OPTIONS - 1) break;
    if (taken.has(card.id)) continue;
    taken.add(card.id);
    distractors.push(card);
  }
  return { answer, options: shuffle([answer, ...distractors], rng) };
}
