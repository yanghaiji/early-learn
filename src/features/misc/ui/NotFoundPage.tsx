/** 404：未知路径兜底（PRD §9 异常场景） */

import { Link } from 'react-router-dom';
import { EmptyState } from '../../../shared/ui/Feedback';

export function NotFoundPage() {
  return (
    <main className="page">
      <EmptyState
        emoji="🧭"
        title="页面走丢了"
        description="地址可能拼错了，回到首页重新选一个主题吧。"
        action={
          <Link className="btn btn--primary" to="/">
            回到首页
          </Link>
        }
      />
    </main>
  );
}
