/**
 * 分类块（v0.8 从 HomePage 抽出：首页与分龄墙共用同一套外观）。
 * 角标与链接都是可参数化的，首页行为保持原样。
 * v0.10 加 `row` 横排变体：首页字卡 / 诗文 / 绘本三段只有 1–2 张卡，
 * 按竖卡铺在 6 列网格里会留出大半行空白，改成横卡三列并排。
 */

import { Link } from 'react-router-dom';
import type { Category } from '../../../domain/entities/category';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { categoryColorVar, cx } from '../../../shared/utils/classNames';

interface Props {
  category: Category;
  count: number;
  /** 角标后缀：首页「12 张」、分龄区「6 张适龄」 */
  countSuffix?: string;
  /** 追加到链接的查询串：分龄区传 `?band=1-3` */
  search?: string;
  /** 横排变体（v0.10）：封面缩成左侧方块，名称与张数在右 */
  row?: boolean;
}

export function CategoryTile({ category, count, countSuffix = '张', search = '', row }: Props) {
  return (
    <Link
      className={cx('cat-tile', row && 'cat-tile--row')}
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
