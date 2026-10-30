/** 家长使用说明（v0.4 D 组 / US-A7）：一页说清六件事，纯静态，不放管理入口 */

import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GATE } from '../../../domain/constants';
import { IconButton } from '../../../shared/ui/Button';

interface Topic {
  title: string;
  body: string;
}

const TOPICS: Topic[] = [
  {
    title: '分类怎么用',
    body: '首页是一面面分类墙，点进去就是那个主题的卡片。孩子小就先逛「动物」「水果」这类图多的，汉字与古诗适合大一点再开始。收藏、练一练、听音选图都在首页顶部的三个入口。',
  },
  {
    title: '发音从哪来',
    body: '英文发音优先使用内置音频，跟着安装包一起走，换设备也有声；音频没有命中时才用设备自带的语音朗读。中文朗读使用系统的语音能力。',
  },
  {
    title: '家长管理怎么进',
    body: '首页底部「家长管理」按钮需要长按 3 秒，再通过一道小算题才进入，避免孩子误操作。管理区里可以增删分类、编辑卡片、导入导出与恢复内置内容。',
  },
  {
    title: '怎么自己加卡片',
    body: '进入家长管理 → 「卡片」页签 → 新建卡片，填中文名、拼音、英文，再选一张图片即可。新卡片会立刻出现在所属分类里，也会自动进入复习与出题的候选。',
  },
  {
    title: '导出与备份',
    body: '管理区「数据」页签可以导出成 JSON 文件，里面是全部分类与卡片；换设备时导入同一个文件即可。学习进度（收藏、标记、最近浏览）只存在这台设备上，不进导出包；清掉浏览器数据会一并没有。',
  },
  {
    title: '没声了怎么办',
    body: '先看设置页的「本机音色」那一行：如果列表里没有当前语言的音色，需要在系统语音设置里加装。朗读开关、语速都在设置页调；音频与语音都不可用时，页面会给出具体原因，不会点了没反应。',
  },
];

export function GuidePage() {
  const navigate = useNavigate();

  return (
    <>
      <header className="topbar topbar--bordered">
        <IconButton label="返回首页" plain onClick={() => navigate('/')}>
          <ArrowLeft size={26} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="topbar__title">给家长的使用说明</h1>
          <p className="topbar__sub">六件事说清楚，两分钟读完</p>
        </div>
      </header>

      <main className="page">
        {TOPICS.map((topic) => (
          <section className="panel" key={topic.title}>
            <h2 className="panel__title">{topic.title}</h2>
            <p className="muted text-sm" style={{ margin: 0 }}>
              {topic.body}
            </p>
          </section>
        ))}

        <p className="muted text-sm" style={{ textAlign: 'center' }}>
          家长门：长按 {GATE.LONG_PRESS_MS / 1000} 秒 + 一道算题；连点没通过会短暂冷却，冷却后再试即可。
        </p>

        <div className="inline" style={{ justifyContent: 'center', marginTop: 8 }}>
          <Link className="btn btn--ghost" to="/settings">
            去设置页
          </Link>
        </div>
      </main>
    </>
  );
}
