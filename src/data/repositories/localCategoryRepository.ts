/** 分类仓储：localStorage 实现（ADR-003） */

import { NotFoundError, ValidationError } from '../../domain/errors';
import type { Category, CategoryId, CategoryInput, CategoryPatch } from '../../domain/entities/category';
import type { CategoryRepository, RemoveCategoryResult } from '../../domain/ports/repositories';
import { nextSortOrder, normalizeSpace, sortCategories } from '../../domain/services/catalog';
import { categorySchema, validateCategoryRules } from '../../domain/services/validation';
import { createCategoryId } from '../../shared/utils/id';
import type { CatalogStorage } from '../storage/catalogStorage';

interface Deps {
  storage: CatalogStorage;
  now?: () => string;
}

function toCategory(input: CategoryInput, base: { id: string; createdAt: string; sortOrder: number }, now: string): Category {
  return {
    id: base.id,
    name: normalizeSpace(input.name),
    ...(input.nameEn ? { nameEn: normalizeSpace(input.nameEn) } : {}),
    color: input.color,
    ...(input.cover ? { cover: input.cover } : {}),
    sortOrder: input.sortOrder ?? base.sortOrder,
    ...(input.description ? { description: normalizeSpace(input.description) } : {}),
    createdAt: base.createdAt,
    updatedAt: now,
  };
}

export function createCategoryRepository({ storage, now = () => new Date().toISOString() }: Deps): CategoryRepository {
  const readAll = (): Category[] => sortCategories(storage.get().categories);

  return {
    list: async () => readAll(),

    get: async (id) => storage.get().categories.find((category) => category.id === id),

    create: async (input) => {
      const existing = storage.get().categories;
      const errors = validateCategoryRules(existing, input);
      if (errors.length > 0) throw new ValidationError(errors);

      const timestamp = now();
      const category = toCategory(
        input,
        {
          id: input.id ?? createCategoryId(),
          createdAt: timestamp,
          sortOrder: input.sortOrder ?? nextSortOrder(existing),
        },
        timestamp,
      );
      if (existing.some((item) => item.id === category.id)) {
        throw new ValidationError([{ field: 'id', message: '分类标识已存在' }]);
      }
      const parsed = categorySchema.safeParse(category);
      if (!parsed.success) {
        throw new ValidationError([{ field: 'name', message: '分类信息不合法' }]);
      }
      storage.mutate((doc) => ({ ...doc, categories: [...doc.categories, category], savedAt: timestamp }));
      return category;
    },

    update: async (id, patch: CategoryPatch) => {
      const doc = storage.get();
      const current = doc.categories.find((category) => category.id === id);
      if (!current) throw new NotFoundError('分类不存在');
      if (patch.name) {
        const errors = validateCategoryRules(doc.categories, { name: patch.name }, id);
        if (errors.length > 0) throw new ValidationError(errors);
      }
      const timestamp = now();
      const merged: Category = {
        ...current,
        ...(patch.name !== undefined ? { name: normalizeSpace(patch.name) } : {}),
        ...(patch.nameEn !== undefined ? { nameEn: normalizeSpace(patch.nameEn) } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.cover !== undefined ? { cover: patch.cover } : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
        ...(patch.description !== undefined ? { description: normalizeSpace(patch.description) } : {}),
        updatedAt: timestamp,
      };
      storage.mutate((currentDoc) => ({
        ...currentDoc,
        categories: currentDoc.categories.map((category) => (category.id === id ? merged : category)),
        savedAt: timestamp,
      }));
      return merged;
    },

    remove: async (id): Promise<RemoveCategoryResult> => {
      const doc = storage.get();
      const exists = doc.categories.some((category) => category.id === id);
      if (!exists) throw new NotFoundError('分类不存在');
      const removedCards = doc.cards.filter((card) => card.categoryId === id);
      const timestamp = now();
      storage.mutate(
        (currentDoc) => ({
          ...currentDoc,
          categories: currentDoc.categories
            .filter((category) => category.id !== id)
            .map((category, index) => ({ ...category, sortOrder: index + 1 })),
          cards: currentDoc.cards.filter((card) => card.categoryId !== id),
          savedAt: timestamp,
        }),
        { backup: true },
      );
      return { removedCategories: 1, removedCards: removedCards.length };
    },

    reorder: async (orderedIds) => {
      const timestamp = now();
      storage.mutate((doc) => {
        const orderMap = new Map(orderedIds.map((categoryId, index) => [categoryId, index + 1]));
        const categories = doc.categories.map((category) => {
          const nextOrder = orderMap.get(category.id);
          return nextOrder === undefined
            ? category
            : { ...category, sortOrder: nextOrder, updatedAt: timestamp };
        });
        return { ...doc, categories, savedAt: timestamp };
      });
    },
  };
}

export type { CategoryId };
