/** 首页 · 分类墙（PRD M1 / US-01） */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Languages, Lock } from 'lucide-react';
import { useCatalog } from '../../../app/CatalogProvider';
import { APP_SLOGAN } from '../../../app/version';
import type { Category } from '../../../domain/entities/category';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { IconButton, Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/Feedback';
import { Modal } from '../../../shared/ui/Modal';
import { ParentGate } from '../../../shared/ui/ParentGate';
import { categoryColorVar } from '../../../shared/utils/classNames';
import { markGatePassed } from '../../admin/gateSession';
import { ProgressEntries, ProgressStatsLine } from '../../learn/ui/ProgressStats';
import { DisplayModeSwitch } from '../../settings/ui/DisplayModeSwitch';

function CategoryTile({ category, count }: { category: Category; count: number }) {
  return (
    <Link className="cat-tile" to={`/c/${category.id}`} aria-label={`${category.name} ${count} 张卡片`}>
      <div className="cat-tile__media" style={categoryColorVar(category.color)}>
        <ImageWithFallback
          src={category.cover}
          alt={category.name}
          fallbackText={category.name}
          colorToken={category.color}
          eager
        />
      </div>
      <div>
        <h2 className="cat-tile__name">
          {category.name}
          {category.nameEn ? <span className="cat-tile__en">{category.nameEn}</span> : null}
        </h2>
        <span className="cat-tile__count">{count} 张</span>
      </div>
    </Link>
  );
}

export function HomePage() {
  const { categories, counts, isReadOnly } = useCatalog();
  const [displayOpen, setDisplayOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const navigate = useNavigate();

  const onPass = () => {
    markGatePassed();
    setGateOpen(false);
    navigate('/admin');
  };

  return (
    <>
      <header className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">童识 · 认知卡片</h1>
          <p className="topbar__sub">{APP_SLOGAN}</p>
        </div>
        <IconButton label="切换显示语言" plain onClick={() => setDisplayOpen(true)}>
          <Languages size={26} />
        </IconButton>
      </header>

      <main className="page">
        <ProgressEntries />

        {categories.length === 0 ? (
          <EmptyState
            emoji="🗂️"
            title="还没有分类"
            description="请家长进入管理区创建第一个分类，或者恢复内置内容。"
            action={
              <Button variant="primary" onClick={() => setGateOpen(true)}>
                进入家长管理
              </Button>
            }
          />
        ) : (
          <>
            <p className="muted text-sm" style={{ marginTop: 0 }}>
              选一个主题开始吧
            </p>
            <div className="grid-cats">
              {categories.map((category) => (
                <CategoryTile key={category.id} category={category} count={counts[category.id] ?? 0} />
              ))}
            </div>
          </>
        )}

        <div className="inline" style={{ justifyContent: 'center', marginTop: 32 }}>
          <Button variant="ghost" onClick={() => setGateOpen(true)} disabled={isReadOnly}>
            <Lock size={18} />
            家长管理
          </Button>
          <Link className="btn btn--ghost" to="/settings">
            更多设置
          </Link>
          <Link className="btn btn--ghost" to="/guide">
            给家长的使用说明
          </Link>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressStatsLine />
        </div>
        {isReadOnly ? (
          <p className="text-xs muted" style={{ textAlign: 'center' }}>
            只读模式下无法进入管理区
          </p>
        ) : null}
      </main>

      <DisplayModeSwitch open={displayOpen} onClose={() => setDisplayOpen(false)} />

      {gateOpen ? (
        <Modal title="家长管理" onClose={() => setGateOpen(false)}>
          <ParentGate onPass={onPass} />
        </Modal>
      ) : null}
    </>
  );
}
