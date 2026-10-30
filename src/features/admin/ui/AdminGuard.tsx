/** 管理区门禁：只读模式拦截 + 家长门（PRD US-07 / §8） */

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../../../app/CatalogProvider';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ParentGate } from '../../../shared/ui/ParentGate';
import { isGatePassed, markGatePassed } from '../gateSession';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isReadOnly } = useCatalog();
  const [passed, setPassed] = useState(() => isGatePassed());

  if (isReadOnly) {
    return (
      <main className="page">
        <EmptyState
          emoji="🔒"
          title="当前为只读模式"
          description="浏览器无法保存数据时，管理区会关闭。浏览与朗读仍然可用。"
          action={
            <Link className="btn btn--primary" to="/">
              返回首页
            </Link>
          }
        />
      </main>
    );
  }

  if (!passed) {
    return (
      <main className="page" style={{ maxWidth: 560 }}>
        <ParentGate
          onPass={() => {
            markGatePassed();
            setPassed(true);
          }}
        />
        <p className="text-xs muted" style={{ textAlign: 'center', marginTop: 16 }}>
          通过后本标签页内一直有效，关闭标签页即失效
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
