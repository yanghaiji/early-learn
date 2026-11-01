/** 分龄浏览 · 分类墙（v0.8 US-W2）：只露出该龄段有卡的分类。
 * v0.13：平铺改「按段分组」——段是年龄页内的组织方式（首页不再铺段卡），
 * 段头链到 /group/:id 看该段全量（不带 band）。分组在 UI 层组合
 * `groupCategories` + 本档适龄计数，不加领域函数（技术方案 R-4）。
 * v0.14：顶栏加档位切换 chips（S-3，URL 唯一事实源不加全局状态），
 * 段头 meta 紧跟段名 + 行尾「看全部」CTA span（S-4，整行仍单链接）。 */

import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { AGE_BANDS, AGE_BAND_LABEL, AGE_BAND_NAME } from '../../../domain/entities/card';
import { isAgeBand, matchesBand } from '../../../domain/services/catalog';
import { groupCategories } from '../../../domain/services/categoryGroups';
import { IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { CategoryTile } from './CategoryTile';

export function AgePage() {
  const { band = '' } = useParams();
  const navigate = useNavigate();
  const { categories, cards } = useCatalog();

  // 每分类的适龄张数：0 张的分类不渲染（避免家长点进去看到空墙）
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    if (!isAgeBand(band)) return result;
    for (const card of cards) {
      if (!matchesBand(card, band)) continue;
      result.set(card.categoryId, (result.get(card.categoryId) ?? 0) + 1);
    }
    return result;
  }, [band, cards]);

  const total = useMemo(
    () => [...counts.values()].reduce((sum, count) => sum + count, 0),
    [counts],
  );

  // 按段分组：段内只留本档有卡的分类，整段无卡则过滤掉（顺序沿用 CATEGORY_GROUPS 清单）
  const groups = useMemo(() => {
    if (!isAgeBand(band)) return [];
    return groupCategories(categories)
      .map((section) => {
        const items = section.items.filter((category) => (counts.get(category.id) ?? 0) > 0);
        const groupTotal = items.reduce((sum, category) => sum + (counts.get(category.id) ?? 0), 0);
        return { group: section.group, items, groupTotal };
      })
      .filter((section) => section.items.length > 0);
  }, [band, categories, counts]);

  if (!isAgeBand(band)) {
    return (
      <>
        <header className="topbar topbar--bordered topbar--wide">
          <IconButton label="返回首页" plain onClick={() => navigate('/')}>
            <ArrowLeft size={26} />
          </IconButton>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="topbar__title">分龄浏览</h1>
          </div>
        </header>
        <main className="page page--wide">
          <EmptyState
            emoji="🧭"
            title="没有这一档年龄"
            description="分龄浏览只有「1–3 岁」与「3–6 岁」两档，回首页重新选一档吧。"
            action={
              <Link className="btn btn--primary" to="/">
                返回首页
              </Link>
            }
          />
        </main>
      </>
    );
  }

  return (
    <>
      <header className="topbar topbar--bordered topbar--wide">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">
            {AGE_BAND_LABEL[band]} · {AGE_BAND_NAME[band]}
          </h1>
          <p className="topbar__sub">{total} 张适龄卡片</p>
        </div>
        {/* 档位切换（v0.14 S-3）：复用分类页既有 .chip 样式，当前档 is-active */}
        <div className="chips" role="group" aria-label="切换年龄档">
          {AGE_BANDS.map((option) => (
            <Link
              key={option}
              className={option === band ? 'chip is-active' : 'chip'}
              to={`/age/${option}`}
            >
              {AGE_BAND_LABEL[option]}
            </Link>
          ))}
        </div>
      </header>

      <main className="page page--wide">
        {groups.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="这一档还没有内容"
            description="请家长进入管理区给卡片标上难度，或者先看看另一档。"
            action={
              <Link className="btn btn--primary" to="/admin/cards">
                去管理卡片
              </Link>
            }
          />
        ) : (
          <>
            <p className="section-hint">按主题段浏览，点段名可看该段全部</p>
            {groups.map(({ group, items, groupTotal }) => (
              <section key={group.id} className="band-group">
                <Link
                  className="band-group__head"
                  to={`/group/${group.id}`}
                  aria-label={`${group.name} 全部 ${groupTotal} 张卡片`}
                >
                  <h2 className="band-group__name">{group.name}</h2>
                  <span className="band-group__meta">
                    {items.length} 类 · 本档 {groupTotal} 张
                  </span>
                  {/* v0.14 S-4：「看全部」是挂在整行 Link 内的 span，不是嵌套链接 */}
                  <span className="band-group__cta">
                    看全部 <ArrowRight size={18} aria-hidden />
                  </span>
                </Link>
                <div className="grid-cats">
                  {items.map((category) => (
                    <CategoryTile
                      key={category.id}
                      category={category}
                      count={counts.get(category.id) ?? 0}
                      countSuffix="张适龄"
                      search={`?band=${band}`}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}
