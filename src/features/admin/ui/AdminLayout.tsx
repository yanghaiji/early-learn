/** 管理区骨架：返回 / 三个子页签 / 退出管理 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { IconButton } from '../../../shared/ui/Button';
import { cx } from '../../../shared/utils/classNames';
import { clearGatePassed } from '../gateSession';

const TABS = [
  { to: '/admin', label: '分类', end: true },
  { to: '/admin/cards', label: '卡片', end: false },
  { to: '/admin/data', label: '数据', end: false },
] as const;

export function AdminLayout() {
  const navigate = useNavigate();

  const exit = () => {
    clearGatePassed();
    navigate('/');
  };

  return (
    <>
      <header className="topbar topbar--bordered">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">家长管理</h1>
          <p className="topbar__sub">编辑内容 · 导入导出 · 数据维护</p>
        </div>
        <IconButton label="退出管理" plain onClick={exit}>
          <LogOut size={22} />
        </IconButton>
      </header>

      <main className="page" style={{ maxWidth: 860 }}>
        <nav className="admin-tabs" aria-label="管理区导航">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => cx('admin-tab', isActive && 'admin-tab--active')}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </main>
    </>
  );
}
