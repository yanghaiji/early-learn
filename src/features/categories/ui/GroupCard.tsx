/**
 * 段卡（v0.12）：首页一段 = 一张摘要卡，点进二级页 /group/:groupId。
 * 替代 v0.10 的「认物 17 tile 整行 + 字卡/诗文/绘本三列横卡」双轨——
 * 七类内容同一套网格（L-1 入口倒挂、L-2 段失衡一并消掉）。
 * 封面复用段内首分类的现有 cover，零新图（技术方案 Q-4）。
 */

import { Link } from 'react-router-dom';
import type { CategoryGroupSection } from '../../../domain/services/categoryGroups';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { categoryColorVar } from '../../../shared/utils/classNames';

interface Props {
  section: CategoryGroupSection;
  /** 段内各分类卡片数合计，由首页从 counts 汇总后传入 */
  cardCount: number;
}

/** 段内前三个分类名串成预览行，其余折成 +N */
function previewText(section: CategoryGroupSection): string {
  const names = section.items.slice(0, 3).map((item) => item.name);
  const rest = section.items.length - names.length;
  return names.join(' · ') + (rest > 0 ? ` +${rest}` : '');
}

export function GroupCard({ section, cardCount }: Props) {
  const { group, items } = section;
  // 空段已被 groupCategories 过滤，首分类必在；它就是段卡封面代表
  const cover = items[0];
  return (
    <Link
      className="group-card"
      to={`/group/${group.id}`}
      aria-label={`${group.name}，${items.length} 个分类 ${cardCount} 张卡片`}
    >
      <div className="group-card__media" style={categoryColorVar(cover?.color)}>
        <ImageWithFallback
          src={cover?.cover}
          alt={group.name}
          fallbackText={group.name}
          colorToken={cover?.color}
          eager
        />
        <span className="group-card__count">
          {cardCount} 张 · {items.length} 类
        </span>
      </div>
      <div className="group-card__foot">
        <h2 className="group-card__name">{group.name}</h2>
        <p className="group-card__preview">{previewText(section)}</p>
      </div>
    </Link>
  );
}
