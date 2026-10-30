/** 分类管理（PRD M6 / US-11）：增删改 + 上下移动排序 */

import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { ValidationError } from '../../../domain/errors';
import { COLOR_TOKENS, type Category, type CategoryInput, type ColorToken } from '../../../domain/entities/category';
import { LIMITS } from '../../../domain/constants';
import { Button, IconButton } from '../../../shared/ui/Button';
import { DangerConfirm } from '../../../shared/ui/DangerConfirm';
import { EmptyState } from '../../../shared/ui/Feedback';
import { Field } from '../../../shared/ui/Field';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { Modal } from '../../../shared/ui/Modal';
import { toast } from '../../../shared/store/toastStore';
import { categoryColorVar } from '../../../shared/utils/classNames';

interface FormProps {
  initial?: Category;
  onClose: () => void;
}

function CategoryFormModal({ initial, onClose }: FormProps) {
  const { categories, createCategory, updateCategory } = useCatalog();
  const [name, setName] = useState(initial?.name ?? '');
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '');
  const [color, setColor] = useState<ColorToken>(initial?.color ?? 'mint');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [cover, setCover] = useState(initial?.cover ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    const nextErrors: Record<string, string> = {};
    if (!trimmed) nextErrors.name = '请填写分类名称';
    else if (trimmed.length > LIMITS.CATEGORY_NAME_MAX) {
      nextErrors.name = `名称最多 ${LIMITS.CATEGORY_NAME_MAX} 个字`;
    }
    const duplicated = categories.some(
      (item) => item.id !== initial?.id && item.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (trimmed && duplicated) nextErrors.name = '分类名已存在';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: CategoryInput = {
      name: trimmed,
      color,
      ...(nameEn.trim() ? { nameEn: nameEn.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(cover.trim() ? { cover: cover.trim() } : {}),
    };

    setBusy(true);
    try {
      if (initial) {
        await updateCategory(initial.id, input);
        toast('分类已更新');
      } else {
        await createCategory(input);
        toast('分类已创建');
      }
      onClose();
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(Object.fromEntries(error.fields.map((item) => [item.field, item.message])));
      }
      toast(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? '编辑分类' : '新建分类'}
      onClose={onClose}
      dismissible={!busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <Field label="分类名称" htmlFor="category-name" error={errors.name} hint="建议 2–4 个字，如「动物」">
        <input
          id="category-name"
          className={errors.name ? 'input input--invalid' : 'input'}
          value={name}
          maxLength={LIMITS.CATEGORY_NAME_MAX}
          onChange={(event) => setName(event.target.value)}
          placeholder="动物"
        />
      </Field>
      <Field label="英文名（可选）" htmlFor="category-name-en" hint="显示在分类卡片副标题">
        <input
          id="category-name-en"
          className="input"
          value={nameEn}
          maxLength={LIMITS.CATEGORY_NAME_EN_MAX}
          onChange={(event) => setNameEn(event.target.value)}
          placeholder="Animals"
        />
      </Field>
      <Field label="主色" hint="用于分类封面与卡片底色">
        <div className="chip-row" style={{ marginBottom: 0 }}>
          {COLOR_TOKENS.map((token) => (
            <button
              key={token}
              type="button"
              className={token === color ? 'chip chip--active' : 'chip'}
              aria-pressed={token === color}
              onClick={() => setColor(token)}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: `var(--c-${token})`,
                  display: 'inline-block',
                }}
              />
              {token}
            </button>
          ))}
        </div>
      </Field>
      <Field label="封面图片路径（可选）" htmlFor="category-cover" hint="留空则用分类名首字做占位">
        <input
          id="category-cover"
          className="input"
          value={cover}
          onChange={(event) => setCover(event.target.value)}
          placeholder="assets/images/covers/animals.webp"
        />
      </Field>
      <Field label="说明（可选）" htmlFor="category-description">
        <textarea
          id="category-description"
          className="textarea"
          value={description}
          maxLength={200}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
    </Modal>
  );
}

export function CategoryAdmin() {
  const { categories, counts, removeCategory, reorderCategories } = useCatalog();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [deleting, setDeleting] = useState<Category | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setFormOpen(true);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const current = categories[index];
    const target = categories[index + direction];
    if (!current || !target) return;
    const ids = categories.map((item) => item.id);
    ids[index] = target.id;
    ids[index + direction] = current.id;
    try {
      await reorderCategories(ids);
    } catch (error) {
      toast(error instanceof Error ? error.message : '排序失败', 'error');
    }
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const result = await removeCategory(deleting.id);
      toast(`已删除「${deleting.name}」，同时移除 ${result.removedCards} 张卡片`);
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
          分类（{categories.length}）
          <Button variant="primary" onClick={openCreate}>
            <Plus size={18} />
            新建分类
          </Button>
        </h2>

        {categories.length === 0 ? (
          <EmptyState emoji="🗂️" title="还没有分类" description="先创建一个主题，再往里添加卡片。" />
        ) : (
          categories.map((category, index) => (
            <div className="row" key={category.id}>
              <div
                className="row__thumb"
                style={categoryColorVar(category.color)}
                aria-hidden="true"
              >
                <ImageWithFallback
                  src={category.cover}
                  alt={category.name}
                  fallbackText={category.name}
                  colorToken={category.color}
                />
              </div>
              <div className="row__grow">
                <p className="row__title">
                  {category.name}
                  {category.nameEn ? <span className="text-xs muted"> · {category.nameEn}</span> : null}
                </p>
                <p className="row__meta">
                  {counts[category.id] ?? 0} 张卡片 · 排序 {category.sortOrder}
                </p>
              </div>
              <IconButton label={`上移 ${category.name}`} small disabled={index === 0} onClick={() => void move(index, -1)}>
                <ArrowUp size={18} />
              </IconButton>
              <IconButton
                label={`下移 ${category.name}`}
                small
                disabled={index === categories.length - 1}
                onClick={() => void move(index, 1)}
              >
                <ArrowDown size={18} />
              </IconButton>
              <IconButton label={`编辑 ${category.name}`} small onClick={() => openEdit(category)}>
                <Pencil size={18} />
              </IconButton>
              <IconButton label={`删除 ${category.name}`} small onClick={() => setDeleting(category)}>
                <Trash2 size={18} />
              </IconButton>
            </div>
          ))
        )}
      </section>

      <p className="text-xs muted">
        删除分类会同时删除该分类下的所有卡片；操作前会自动备份一份数据到本地。
      </p>

      {formOpen ? (
        <CategoryFormModal
          {...(editing ? { initial: editing } : {})}
          onClose={() => setFormOpen(false)}
        />
      ) : null}

      {deleting ? (
        <DangerConfirm
          title={`删除分类「${deleting.name}」`}
          description={`该分类下 ${counts[deleting.id] ?? 0} 张卡片也会一并删除，且无法撤销。`}
          busy={busy}
          onConfirm={() => void confirmRemove()}
          onCancel={() => setDeleting(undefined)}
        />
      ) : null}
    </>
  );
}
