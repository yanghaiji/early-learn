/** 卡片表单（PRD M7 / US-12）：新建与编辑共用，前端先校验再落库 */

import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { LIMITS } from '../../../domain/constants';
import type { Card, CardInput, CardKind, Difficulty } from '../../../domain/entities/card';
import { DIFFICULTIES } from '../../../domain/entities/card';
import { ValidationError } from '../../../domain/errors';
import { validateCardRules } from '../../../domain/services/validation';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { Modal } from '../../../shared/ui/Modal';
import { toast } from '../../../shared/store/toastStore';
import { formatBytes, readImageAsDataUrl } from '../../../shared/utils/image';

interface Props {
  initial?: Card;
  defaultCategoryId?: string;
  onClose: () => void;
}

function splitList(text: string): string[] {
  return text
    .split(/[,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 诗词正文：一行一句 */
function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CardForm({ initial, defaultCategoryId, onClose }: Props) {
  const { categories, cards, createCard, updateCard } = useCatalog();
  const isEdit = Boolean(initial);

  const [kind, setKind] = useState<CardKind>(initial?.kind ?? 'object');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '');
  const [zh, setZh] = useState(initial?.zh ?? '');
  const [pinyin, setPinyin] = useState(initial?.pinyin ?? '');
  const [en, setEn] = useState(initial?.en ?? '');
  const [phonetic, setPhonetic] = useState(initial?.phonetic ?? '');
  const [image, setImage] = useState(initial?.image ?? '');
  const [tagText, setTagText] = useState((initial?.tags ?? []).join('，'));
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 1);
  const [strokes, setStrokes] = useState(initial?.strokes !== undefined ? String(initial.strokes) : '');
  const [words, setWords] = useState((initial?.words ?? []).join('，'));
  const [radical, setRadical] = useState(initial?.radical ?? '');
  const [author, setAuthor] = useState(initial?.author ?? '');
  const [dynasty, setDynasty] = useState(initial?.dynasty ?? '');
  const [linesText, setLinesText] = useState((initial?.lines ?? []).join('\n'));
  const [translation, setTranslation] = useState(initial?.translation ?? '');
  const [moral, setMoral] = useState(initial?.moral ?? '');
  const [pagesText, setPagesText] = useState((initial?.pages ?? []).map((page) => page.text).join('\n'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const picked = await readImageAsDataUrl(file);
      setImage(picked.dataUrl);
      toast(`已选择图片（${formatBytes(picked.bytes)}）`);
    } catch (error) {
      toast(error instanceof Error ? error.message : '图片读取失败', 'error');
    }
  };

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!categoryId) nextErrors.categoryId = '请选择分类';
    if (!zh.trim()) nextErrors.zh = '请填写中文';
    if (!pinyin.trim()) nextErrors.pinyin = '请填写拼音（带声调）';
    if (!en.trim()) nextErrors.en = '请填写英文';
    if (!image.trim()) nextErrors.image = '请上传图片或填写图片路径';
    if (kind === 'poem') {
      if (!author.trim()) nextErrors.author = '请填写作者';
      if (!dynasty.trim()) nextErrors.dynasty = '请填写朝代';
      if (splitLines(linesText).length < LIMITS.POEM_LINES_MIN) {
        nextErrors.lines = `正文至少 ${LIMITS.POEM_LINES_MIN} 行`;
      }
      if (!translation.trim()) nextErrors.translation = '请填写白话译文';
    }
    if (kind === 'story') {
      const pages = splitLines(pagesText);
      if (pages.length < LIMITS.STORY_PAGES_MIN) {
        nextErrors.pages = `故事至少 ${LIMITS.STORY_PAGES_MIN} 段`;
      } else if (pages.length > LIMITS.STORY_PAGES_MAX) {
        nextErrors.pages = `故事最多 ${LIMITS.STORY_PAGES_MAX} 段`;
      } else if (pages.some((page) => [...page].length > LIMITS.STORY_PAGE_TEXT_MAX)) {
        nextErrors.pages = `每一段最多 ${LIMITS.STORY_PAGE_TEXT_MAX} 个字`;
      }
    }
    setErrors(nextErrors);

    const input: CardInput = {
      kind,
      categoryId,
      zh: zh.trim(),
      pinyin: pinyin.trim(),
      en: en.trim(),
      image: image.trim(),
      tags: splitList(tagText),
      difficulty,
      ...(phonetic.trim() ? { phonetic: phonetic.trim() } : {}),
      ...(kind === 'character' && strokes.trim() ? { strokes: Number(strokes) } : {}),
      ...(kind === 'character' && words.trim() ? { words: splitList(words) } : {}),
      ...(kind === 'character' && radical.trim() ? { radical: radical.trim() } : {}),
      ...(kind === 'poem' && author.trim() ? { author: author.trim() } : {}),
      ...(kind === 'poem' && dynasty.trim() ? { dynasty: dynasty.trim() } : {}),
      ...(kind === 'poem' && linesText.trim() ? { lines: splitLines(linesText) } : {}),
      ...(kind === 'poem' && translation.trim() ? { translation: translation.trim() } : {}),
      ...(kind === 'story' && moral.trim() ? { moral: moral.trim() } : {}),
      ...(kind === 'story' && splitLines(pagesText).length > 0
        ? { pages: splitLines(pagesText).map((text) => ({ text })) }
        : {}),
    };

    if (Object.keys(nextErrors).length === 0) {
      const ruleErrors = validateCardRules(input);
      if (ruleErrors.length > 0) {
        setErrors(Object.fromEntries(ruleErrors.map((item) => [item.field, item.message])));
        return;
      }
    } else {
      return;
    }

    setBusy(true);
    try {
      if (initial) {
        await updateCard(initial.id, input);
        toast('卡片已更新');
      } else {
        await createCard(input);
        toast('卡片已创建');
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

  const siblings = cards.filter(
    (card) => card.categoryId === categoryId && card.id !== initial?.id,
  );

  return (
    <Modal
      title={isEdit ? `编辑卡片 · ${initial?.zh ?? ''}` : '新建卡片'}
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
      <Field label="卡片类型">
        <div className="chip-row" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={kind === 'object' ? 'chip chip--active' : 'chip'}
            aria-pressed={kind === 'object'}
            onClick={() => setKind('object')}
          >
            认物 / 认词
          </button>
          <button
            type="button"
            className={kind === 'character' ? 'chip chip--active' : 'chip'}
            aria-pressed={kind === 'character'}
            onClick={() => setKind('character')}
          >
            认汉字
          </button>
          <button
            type="button"
            className={kind === 'poem' ? 'chip chip--active' : 'chip'}
            aria-pressed={kind === 'poem'}
            onClick={() => {
              setKind('poem');
              setCategoryId((current) =>
                categories.some((item) => item.id === current) ? current : 'poems',
              );
            }}
          >
            古诗词
          </button>
          <button
            type="button"
            className={kind === 'story' ? 'chip chip--active' : 'chip'}
            aria-pressed={kind === 'story'}
            onClick={() => {
              setKind('story');
              setCategoryId((current) =>
                categories.some((item) => item.id === current) ? current : 'stories',
              );
            }}
          >
            故事绘本
          </button>
        </div>
      </Field>

      <Field label="所属分类" htmlFor="card-category" error={errors.categoryId}>
        <select
          id="card-category"
          className={errors.categoryId ? 'select input--invalid' : 'select'}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">请选择</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <span className="field__hint">该分类已有 {siblings.length} 张卡片，新卡片自动排在最后</span>
      </Field>

      <Field
        label={kind === 'poem' ? '标题' : kind === 'story' ? '故事标题' : '中文'}
        htmlFor="card-zh"
        error={errors.zh}
        hint={
          kind === 'character'
            ? '汉字卡只能填 1 个字'
            : kind === 'poem'
              ? `可含词牌与副题，最多 ${LIMITS.ZH_MAX_POEM} 个字`
              : kind === 'story'
                ? `绘本名，最多 ${LIMITS.STORY_TITLE_MAX} 个字`
                : undefined
        }
      >
        <input
          id="card-zh"
          className={errors.zh ? 'input input--invalid' : 'input'}
          value={zh}
          maxLength={
            kind === 'poem'
              ? LIMITS.ZH_MAX_POEM
              : kind === 'story'
                ? LIMITS.STORY_TITLE_MAX
                : LIMITS.ZH_MAX
          }
          onChange={(event) => setZh(event.target.value)}
          placeholder={
            kind === 'character' ? '人' : kind === 'poem' ? '静夜思' : kind === 'story' ? '三只小猪' : '苹果'
          }
        />
      </Field>

      <Field label="拼音（带声调）" htmlFor="card-pinyin" error={errors.pinyin} hint="例如 píng guǒ / rén">
        <input
          id="card-pinyin"
          className={errors.pinyin ? 'input input--invalid' : 'input'}
          value={pinyin}
          maxLength={LIMITS.PINYIN_MAX}
          onChange={(event) => setPinyin(event.target.value)}
        />
      </Field>

      <Field label="英文" htmlFor="card-en" error={errors.en} hint={`最多 ${LIMITS.EN_MAX_WORDS} 个单词`}>
        <input
          id="card-en"
          className={errors.en ? 'input input--invalid' : 'input'}
          value={en}
          onChange={(event) => setEn(event.target.value)}
        />
      </Field>

      <Field label="音标（可选）" htmlFor="card-phonetic">
        <input
          id="card-phonetic"
          className="input"
          value={phonetic}
          onChange={(event) => setPhonetic(event.target.value)}
          placeholder="/ˈæp.əl/"
        />
      </Field>

      <Field label="图片" error={errors.image} hint={`支持 jpg/png/webp，单张 ≤ ${formatBytes(LIMITS.IMAGE_MAX_BYTES)}`}>
        <div className="inline">
          <div className="row__thumb" style={{ width: 72, height: 72 }}>
            <ImageWithFallback src={image} alt={zh || '卡片图片'} fallbackText={zh || '占位'} />
          </div>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <ImagePlus size={18} />
            上传图片
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void pickImage(event.target.files?.[0])}
            />
          </label>
          {image ? (
            <Button variant="ghost" onClick={() => setImage('')}>
              <X size={18} />
              清除
            </Button>
          ) : null}
        </div>
        <input
          className={errors.image ? 'input input--invalid' : 'input'}
          value={image.startsWith('data:') ? '' : image}
          onChange={(event) => setImage(event.target.value)}
          placeholder="或填写图片路径：assets/images/animals/cat.webp"
          aria-label="图片路径"
        />
      </Field>

      <Field label="标签（可选）" htmlFor="card-tags" hint={`逗号分隔，最多 ${LIMITS.TAG_MAX} 个`}>
        <input
          id="card-tags"
          className="input"
          value={tagText}
          onChange={(event) => setTagText(event.target.value)}
          placeholder="宠物，会叫"
        />
      </Field>

      <Field label="难度">
        <div className="chip-row" style={{ marginBottom: 0 }}>
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              className={level === difficulty ? 'chip chip--active' : 'chip'}
              aria-pressed={level === difficulty}
              onClick={() => setDifficulty(level)}
            >
              {'⭐'.repeat(level)}
            </button>
          ))}
        </div>
      </Field>

      {kind === 'character' ? (
        <>
          <Field label="笔画数" htmlFor="card-strokes" error={errors.strokes}>
            <input
              id="card-strokes"
              className={errors.strokes ? 'input input--invalid' : 'input'}
              type="number"
              min={LIMITS.STROKES_MIN}
              max={LIMITS.STROKES_MAX}
              value={strokes}
              onChange={(event) => setStrokes(event.target.value)}
            />
          </Field>
          <Field label="组词（可选）" htmlFor="card-words" hint={`逗号分隔，最多 ${LIMITS.WORDS_MAX} 个`}>
            <input
              id="card-words"
              className="input"
              value={words}
              onChange={(event) => setWords(event.target.value)}
              placeholder="大人，人们"
            />
          </Field>
          <Field label="部首（可选）" htmlFor="card-radical">
            <input
              id="card-radical"
              className="input"
              value={radical}
              maxLength={2}
              onChange={(event) => setRadical(event.target.value)}
            />
          </Field>
        </>
      ) : null}

      {kind === 'poem' ? (
        <>
          <Field label="作者" htmlFor="card-author" error={errors.author}>
            <input
              id="card-author"
              className={errors.author ? 'input input--invalid' : 'input'}
              value={author}
              maxLength={LIMITS.AUTHOR_MAX}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="李白"
            />
          </Field>
          <Field label="朝代" htmlFor="card-dynasty" error={errors.dynasty}>
            <input
              id="card-dynasty"
              className={errors.dynasty ? 'input input--invalid' : 'input'}
              value={dynasty}
              maxLength={LIMITS.DYNASTY_MAX}
              onChange={(event) => setDynasty(event.target.value)}
              placeholder="唐"
            />
          </Field>
          <Field
            label="正文"
            htmlFor="card-lines"
            error={errors.lines}
            hint={`一行一句，最多 ${LIMITS.POEM_LINES_MAX} 行、每行 ${LIMITS.POEM_LINE_MAX} 字`}
          >
            <textarea
              id="card-lines"
              className={errors.lines ? 'textarea input--invalid' : 'textarea'}
              value={linesText}
              onChange={(event) => setLinesText(event.target.value)}
              placeholder={'床前明月光，疑是地上霜。\n举头望明月，低头思故乡。'}
            />
          </Field>
          <Field
            label="白话译文"
            htmlFor="card-translation"
            error={errors.translation}
            hint={`一句话讲给孩子听，最多 ${LIMITS.TRANSLATION_MAX} 字`}
          >
            <textarea
              id="card-translation"
              className={errors.translation ? 'textarea input--invalid' : 'textarea'}
              value={translation}
              maxLength={LIMITS.TRANSLATION_MAX}
              onChange={(event) => setTranslation(event.target.value)}
            />
          </Field>
        </>
      ) : null}

      {kind === 'story' ? (
        <>
          <Field
            label="一句寓意（可选）"
            htmlFor="card-moral"
            error={errors.moral}
            hint={`展示在正文之后，最多 ${LIMITS.STORY_MORAL_MAX} 字`}
          >
            <textarea
              id="card-moral"
              className={errors.moral ? 'textarea input--invalid' : 'textarea'}
              value={moral}
              maxLength={LIMITS.STORY_MORAL_MAX}
              onChange={(event) => setMoral(event.target.value)}
              placeholder="做事要认真，结实的房子才挡得住大风。"
            />
          </Field>
          <Field
            label="正文段落"
            htmlFor="card-pages"
            error={errors.pages}
            hint={`一行一段，${LIMITS.STORY_PAGES_MIN}–${LIMITS.STORY_PAGES_MAX} 段、每段最多 ${LIMITS.STORY_PAGE_TEXT_MAX} 字（已写 ${splitLines(pagesText).length} 段）`}
          >
            <textarea
              id="card-pages"
              className={errors.pages ? 'textarea input--invalid' : 'textarea'}
              style={{ minHeight: 160 }}
              value={pagesText}
              onChange={(event) => setPagesText(event.target.value)}
              placeholder={
                '猪妈妈对三只小猪说：你们长大了，去盖自己的房子吧。\n猪大哥用稻草盖了一座房子，一会儿就盖好了。'
              }
            />
          </Field>
        </>
      ) : null}
    </Modal>
  );
}
