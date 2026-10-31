/**
 * 段页（v0.12）：首页段卡的二级页，把段内分类墙整页铺开（仿 AgePage 模式）。
 * 静态 import 不走 lazy（技术方案 Q-3）：首页第一跳不该让家长等一个 chunk。
 */

import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { findGroup, groupCategories } from '../../../domain/services/categoryGroups';
import { IconButton } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { CategoryTile } from './CategoryTile';

export function GroupPage() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const { categories, counts } = useCatalog();

  const group = findGroup(groupId);
  // 段内实际有卡的分类（家长删光某分类时 tile 不悬空），顺序沿用段清单
  const section = useMemo(() => {
    if (!group) return null;
    return groupCategories(categories).find((item) => item.group.id === groupId) ?? null;
  }, [group, groupId, categories]);

  if (!group) {
    return (
      <>
        <header className="topbar topbar--bordered topbar--wide">
          <IconButton label="返回首页" plain onClick={() => navigate('/')}>
            <ArrowLeft size={26} />
          </IconButton>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="topbar__title">分类段</h1>
          </div>
        </header>
        <main className="page page--wide">
          <EmptyState
            emoji="🧭"
            title="没有这个分类段"
            description="首页段卡改版过（v0.12），这一段的旧链接已失效，回首页重新挑一段吧。"
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

  const items = section?.items ?? [];
  const total = items.reduce((sum, item) => sum + (counts[item.id] ?? 0), 0);

  return (
    <>
      <header className="topbar topbar--bordered topbar--wide">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">{group.name}</h1>
          <p className="topbar__sub">
            {items.length} 个分类 · {total} 张卡片
          </p>
        </div>
      </header>

      <main className="page page--wide">
        {items.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="这一段还没有内容"
            description="段里的分类都被清空了，请家长进入管理区恢复内置内容，或者新建分类。"
            action={
              <Link className="btn btn--primary" to="/admin">
                去管理区
              </Link>
            }
          />
        ) : (
          <>
            <p className="section-hint">{group.hint}，挑一个主题开始</p>
            <div className="grid-cats">
              {items.map((category) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  count={counts[category.id] ?? 0}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
