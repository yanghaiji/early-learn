/**
 * 全局搜索（v0.7 US-V1）：一次搜全部卡片，命中中文 / 英文 / 拼音（可不带声调）/ 标签。
 * 复用领域层 searchCards 与卡片块，只负责取词、分页、渲染。
 */

import { useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { searchCards } from '../../../domain/services/catalog';
import { IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { CardTile } from '../../cards/ui/CardTile';

/** 与分类页一致：6 列 × 2 行 */
const PAGE_SIZE = 12;

/** 空关键词时给的例子：中文 / 英文 / 拼音 / 多字词各一 */
const SAMPLES = ['苹果', 'apple', 'pingguo', '小狗'];

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cards, categories, counts } = useCatalog();
  const inputRef = useRef<HTMLInputElement>(null);

  // URL 是唯一事实来源：不做「本地 state + 防抖 + 双向同步」，避免输入框与地址互相打架
  const keyword = searchParams.get('q') ?? '';
  const trimmed = keyword.trim();

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  // 809 张 × 5 个字段的 includes 在 200kB 文本上 < 5ms，不需要索引与防抖
  const hits = useMemo(() => (trimmed ? searchCards(cards, trimmed) : []), [cards, trimmed]);

  const pageCount = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, pageCount)
      : 1;
  const visible = hits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 分类入口：命中很少或干脆 0 条时用来接住空白，也是「换个思路找」的退路
  const browseChips = (
    <div className="search-browse__chips">
      {categories.map((category) => (
        <Link key={category.id} className="chip" to={`/c/${category.id}`}>
          {category.name}
          <span className="chip__count">{counts[category.id] ?? 0}</span>
        </Link>
      ))}
    </div>
  );

  const commit = (nextKeyword: string, nextPage = 1) => {
    const params = new URLSearchParams();
    if (nextKeyword) params.set('q', nextKeyword);
    if (nextPage > 1) params.set('page', String(nextPage));
    setSearchParams(params, { replace: true });
  };

  const gotoPage = (nextPage: number) => {
    commit(keyword, nextPage);
    window.scrollTo({ top: 0 });
  };

  const runSample = (sample: string) => {
    commit(sample);
    inputRef.current?.focus();
  };

  return (
    <>
      <header className="topbar topbar--bordered topbar--wide">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            className="search-box__input"
            type="search"
            value={keyword}
            placeholder="搜中文 / 英文 / 拼音"
            aria-label="搜索卡片"
            autoFocus
            onChange={(event) => commit(event.target.value)}
          />
          {keyword ? (
            <button
              type="button"
              className="search-box__clear"
              aria-label="清空搜索"
              onClick={() => {
                commit('');
                inputRef.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          ) : null}
        </label>
      </header>

      <main className="page page--wide">
        {!trimmed ? (
          <>
            <p className="section-hint">想找哪张卡？输入中文、英文或拼音都能搜到。</p>
            <div className="search-samples">
              {SAMPLES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="chip"
                  onClick={() => runSample(sample)}
                >
                  {sample}
                </button>
              ))}
            </div>
          </>
        ) : hits.length === 0 ? (
          <>
            <EmptyState
              emoji="🔍"
              title={`没有找到「${trimmed}」`}
              description="试试单字、英文或拼音，声调可以不写。"
            />
            {/* 0 条时最需要出口：不让家长停在一张空页上（v0.7） */}
            <div className="search-browse">
              <p className="section-hint">换个思路：按主题翻一翻</p>
              {browseChips}
            </div>
          </>
        ) : (
          <>
            <p className="section-hint" aria-live="polite">
              找到 {hits.length} 张 · 关键词「{trimmed}」
            </p>
            <div className="grid-cards">
              {visible.map((card) => {
                const category = categoryById.get(card.categoryId);
                return (
                  <CardTile
                    key={card.id}
                    card={card}
                    colorToken={category?.color}
                    categoryName={category?.name}
                  />
                );
              })}
            </div>

            {pageCount > 1 ? (
              <nav className="pager" aria-label="搜索结果翻页">
                <button
                  type="button"
                  className="pager__btn"
                  disabled={page <= 1}
                  onClick={() => gotoPage(page - 1)}
                >
                  <ChevronLeft size={20} />
                  上一页
                </button>
                <span className="pager__status">
                  第 {page} / {pageCount} 页
                </span>
                <button
                  type="button"
                  className="pager__btn"
                  disabled={page >= pageCount}
                  onClick={() => gotoPage(page + 1)}
                >
                  下一页
                  <ChevronRight size={20} />
                </button>
              </nav>
            ) : null}

            {/* 结果很少时右侧会留一大片空白：用分类入口接住，也给「换个思路找」的退路 */}
            {hits.length <= 6 ? (
              <div className="search-browse">
                <p className="section-hint">没找到想要的？按主题翻一翻</p>
                {browseChips}
              </div>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
