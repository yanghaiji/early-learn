/** 卡片仓储：localStorage 实现（ADR-003） */

import { NotFoundError, ValidationError } from '../../domain/errors';
import type { Card, CardId, CardInput, CardPatch } from '../../domain/entities/card';
import type { BulkUpsertResult, CardRepository } from '../../domain/ports/repositories';
import { nextSortOrder, normalizeSpace, searchCards, sortCards } from '../../domain/services/catalog';
import { cardSchema, validateCardRules } from '../../domain/services/validation';
import { createId } from '../../shared/utils/id';
import type { CatalogStorage } from '../storage/catalogStorage';

interface Deps {
  storage: CatalogStorage;
  now?: () => string;
}

function buildCard(
  input: CardInput,
  base: { id: CardId; createdAt: string; sortOrder: number },
  now: string,
): Card {
  const card: Card = {
    id: base.id,
    kind: input.kind,
    categoryId: input.categoryId,
    zh: normalizeSpace(input.zh),
    pinyin: normalizeSpace(input.pinyin).replace(/\s+/g, ' ').toLowerCase(),
    en: normalizeSpace(input.en),
    image: input.image,
    tags: (input.tags ?? []).map(normalizeSpace).filter(Boolean),
    difficulty: input.difficulty ?? 1,
    sortOrder: input.sortOrder ?? base.sortOrder,
    createdAt: base.createdAt,
    updatedAt: now,
  };
  if (input.phonetic) card.phonetic = normalizeSpace(input.phonetic);
  if (typeof input.strokes === 'number') card.strokes = input.strokes;
  if (input.words && input.words.length > 0) card.words = input.words.map(normalizeSpace).filter(Boolean);
  if (input.radical) card.radical = normalizeSpace(input.radical);
  if (input.pages && input.pages.length > 0) {
    card.pages = input.pages.map((page) => {
      const text = normalizeSpace(page.text);
      // 页图降为可选：旧数据里有就留着，新数据只存正文（ADR-S7）
      const image = page.image ? normalizeSpace(page.image) : '';
      return image ? { text, image } : { text };
    });
  }
  if (input.moral) card.moral = normalizeSpace(input.moral);
  if (input.source) card.source = input.source;
  return card;
}

function assertValid(card: Card): void {
  const ruleErrors = validateCardRules(card);
  if (ruleErrors.length > 0) throw new ValidationError(ruleErrors);
  const parsed = cardSchema.safeParse(card);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ValidationError([{ field: String(issue?.path[0] ?? 'zh'), message: issue?.message ?? '卡片信息不合法' }]);
  }
}

export function createCardRepository({ storage, now = () => new Date().toISOString() }: Deps): CardRepository {
  const ensureCategory = (categoryId: string): void => {
    const exists = storage.get().categories.some((category) => category.id === categoryId);
    if (!exists) throw new ValidationError([{ field: 'categoryId', message: '请选择一个存在的分类' }]);
  };

  return {
    listAll: async () => sortCards(storage.get().cards),

    listByCategory: async (categoryId) =>
      sortCards(storage.get().cards.filter((card) => card.categoryId === categoryId)),

    get: async (id) => storage.get().cards.find((card) => card.id === id),

    search: async (keyword) => sortCards(searchCards(storage.get().cards, keyword)),

    create: async (input) => {
      ensureCategory(input.categoryId);
      const doc = storage.get();
      const timestamp = now();
      const siblings = doc.cards.filter((card) => card.categoryId === input.categoryId);
      const card = buildCard(
        input,
        {
          id: input.id ?? createId(input.categoryId),
          createdAt: timestamp,
          sortOrder: input.sortOrder ?? nextSortOrder(siblings),
        },
        timestamp,
      );
      if (doc.cards.some((item) => item.id === card.id)) {
        throw new ValidationError([{ field: 'id', message: '卡片标识已存在' }]);
      }
      assertValid(card);
      storage.mutate((current) => ({ ...current, cards: [...current.cards, card], savedAt: timestamp }));
      return card;
    },

    update: async (id, patch: CardPatch) => {
      const doc = storage.get();
      const current = doc.cards.find((card) => card.id === id);
      if (!current) throw new NotFoundError('卡片不存在');
      if (patch.categoryId !== undefined) ensureCategory(patch.categoryId);

      const timestamp = now();
      const candidate = buildCard(
        {
          ...current,
          ...patch,
          tags: patch.tags ?? current.tags,
          difficulty: patch.difficulty ?? current.difficulty,
          sortOrder: patch.sortOrder ?? current.sortOrder,
        },
        { id: current.id, createdAt: current.createdAt, sortOrder: current.sortOrder },
        timestamp,
      );
      assertValid(candidate);
      storage.mutate((document) => ({
        ...document,
        cards: document.cards.map((card) => (card.id === id ? candidate : card)),
        savedAt: timestamp,
      }));
      return candidate;
    },

    remove: async (id) => {
      const exists = storage.get().cards.some((card) => card.id === id);
      if (!exists) throw new NotFoundError('卡片不存在');
      const timestamp = now();
      storage.mutate((doc) => ({
        ...doc,
        cards: doc.cards.filter((card) => card.id !== id),
        savedAt: timestamp,
      }));
    },

    bulkUpsert: async (inputs): Promise<BulkUpsertResult> => {
      const doc = storage.get();
      const timestamp = now();
      const existing = new Map(doc.cards.map((card) => [card.id, card]));
      let inserted = 0;
      let updated = 0;
      const nextCards = [...doc.cards];

      for (const input of inputs) {
        ensureCategory(input.categoryId);
        const sibling = existing.get(input.id ?? '');
        const built = buildCard(
          input,
          {
            id: input.id ?? createId(input.categoryId),
            createdAt: sibling?.createdAt ?? timestamp,
            sortOrder:
              input.sortOrder ??
              sibling?.sortOrder ??
              nextSortOrder(nextCards.filter((card) => card.categoryId === input.categoryId)),
          },
          timestamp,
        );
        assertValid(built);
        if (sibling) {
          updated += 1;
          const index = nextCards.findIndex((card) => card.id === built.id);
          if (index >= 0) nextCards[index] = built;
        } else {
          inserted += 1;
          nextCards.push(built);
        }
      }

      storage.mutate((document) => ({ ...document, cards: nextCards, savedAt: timestamp }));
      return { inserted, updated };
    },

    replaceAll: async (inputs) => {
      const timestamp = now();
      const cards = inputs.map((input, index) =>
        buildCard(
          input,
          {
            id: input.id ?? createId(input.categoryId),
            createdAt: timestamp,
            sortOrder: input.sortOrder ?? index + 1,
          },
          timestamp,
        ),
      );
      cards.forEach(assertValid);
      storage.mutate((doc) => ({ ...doc, cards, savedAt: timestamp }));
    },
  };
}
