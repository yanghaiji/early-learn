/** 卡片管理（PRD M7 / US-12）：搜索 + 分类筛选 + 增删改 */

import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import type { Card } from '../../../domain/entities/card';
import { SEARCH_DEBOUNCE_MS } from '../../../domain/constants';
import { searchCards, sortCards } from '../../../domain/services/catalog';
import { useDebouncedValue } from '../../../shared/hooks';
import { Button, IconButton } from '../../../shared/ui/Button';
import { DangerConfirm } from '../../../shared/ui/DangerConfirm';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { toast } from '../../../shared/store/toastStore';
import { CardForm } from './CardForm';

export function CardAdmin() {
  const { cards, categories, counts, removeCard } = useCatalog();
  const [keyword, setKeyword] = useState('');
  const [filterId, setFilterId] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | undefined>(undefined);
  const [deleting, setDeleting] = useState<Card | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const debounced = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS);

  const list = useMemo(() => {
    const scoped = filterId === 'all' ? cards : cards.filter((card) => card.categoryId === filterId);
    return sortCards(searchCards(scoped, debounced));
  }, [cards, filterId, debounced]);

  const categoryName = (id: string): string =>
    categories.find((category) => category.id === id)?.name ?? '未分类';

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (card: Card) => {
    setEditing(card);
    setFormOpen(true);
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await removeCard(deleting.id);
      toast(`已删除「${deleting.zh}」`);
      setDeleting(undefined);
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="panel">
        <h2 className="panel__title">
          卡片（{cards.length}）
          <Button variant="primary" onClick={openCreate}>
            <Plus size={18} />
            新建卡片
          </Button>
        </h2>

        <input
          className="input"
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索中文 / 英文 / 拼音（可不带声调）"
          aria-label="搜索卡片"
        />
        <div style={{ marginTop: 6, marginBottom: 12 }} className="muted text-xs">
          <Search size={12} aria-hidden="true" /> 共 {list.length} 张符合条件
        </div>

        <div className="chip-row">
          <button
            type="button"
            className={filterId === 'all' ? 'chip chip--active' : 'chip'}
            aria-pressed={filterId === 'all'}
            onClick={() => setFilterId('all')}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={filterId === category.id ? 'chip chip--active' : 'chip'}
              aria-pressed={filterId === category.id}
              onClick={() => setFilterId(category.id)}
            >
              {category.name}（{counts[category.id] ?? 0}）
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="没有匹配的卡片"
            description={keyword ? '换个关键词试试，或清空筛选条件。' : '这个分类还没有卡片。'}
            action={
              <Button variant="primary" onClick={openCreate}>
                新建卡片
              </Button>
            }
          />
        ) : (
          list.map((card) => (
            <div className="row" key={card.id}>
              <div className="row__thumb">
                <ImageWithFallback
                  src={card.image}
                  alt={card.zh}
                  fallbackText={card.zh}
                  colorToken={categories.find((item) => item.id === card.categoryId)?.color}
                />
              </div>
              <div className="row__grow">
                <p className="row__title">
                  {card.zh}
                  {card.kind === 'character' ? <span className="chip" style={{ marginLeft: 8 }}>汉字</span> : null}
                </p>
                <p className="row__meta">
                  {card.pinyin} · {card.en} · {categoryName(card.categoryId)}
                </p>
              </div>
              <IconButton label={`编辑 ${card.zh}`} small onClick={() => openEdit(card)}>
                <Pencil size={18} />
              </IconButton>
              <IconButton label={`删除 ${card.zh}`} small onClick={() => setDeleting(card)}>
                <Trash2 size={18} />
              </IconButton>
            </div>
          ))
        )}
      </section>

      <p className="text-xs muted">
        提示：卡片按分类内排序展示，新增卡片默认排在末尾。
      </p>

      {formOpen ? (
        <CardForm
          {...(editing ? { initial: editing } : {})}
          {...(filterId !== 'all' ? { defaultCategoryId: filterId } : {})}
          onClose={() => setFormOpen(false)}
        />
      ) : null}

      {deleting ? (
        <DangerConfirm
          title={`删除卡片「${deleting.zh}」`}
          description="删除后无法恢复，请确认已导出备份。"
          busy={busy}
          onConfirm={() => void confirmRemove()}
          onCancel={() => setDeleting(undefined)}
        />
      ) : null}
    </>
  );
}
