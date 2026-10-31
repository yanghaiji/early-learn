/**
 * 分类块（v0.8 从 HomePage 抽出：首页与分龄墙共用同一套外观）。
 * 角标与链接都是可参数化的，首页行为保持原样。
 */

import { Link } from 'react-router-dom';
import type { Category } from '../../../domain/entities/category';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { categoryColorVar } from '../../../shared/utils/classNames';

interface Props {
  category: Category;
  count: number;
  /** 角标后缀：首页「12 张」、分龄区「6 张适龄」 */
  countSuffix?: string;
  /** 追加到链接的查询串：分龄区传 `?band=1-3` */
  search?: string;
}

export function CategoryTile({ category, count, countSuffix = '张', search = '' }: Props) {
  return (
    <Link
      className="cat-tile"
      to={`/c/${category.id}${search}`}
      aria-label={`${category.name} ${count} ${countSuffix}卡片`}
    >
      <div className="cat-tile__media" style={categoryColorVar(category.color)}>
        <ImageWithFallback
          src={category.cover}
          alt={category.name}
          fallbackText={category.name}
          colorToken={category.color}
          eager
        />
        {/* 张数压在封面角上：标题行只放名称，卡片高度全书一致（v0.7） */}
        <span className="cat-tile__count">
          {count} {countSuffix}
        </span>
      </div>
      <div className="cat-tile__foot">
        <h2 className="cat-tile__name">{category.name}</h2>
        {category.nameEn ? <span className="cat-tile__en">{category.nameEn}</span> : null}
      </div>
    </Link>
  );
}
