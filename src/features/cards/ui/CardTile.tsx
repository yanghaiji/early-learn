/**
 * 卡片块（v0.7 从 CategoryPage 抽出，搜索页成为第 4 个使用方）。
 * 分类页 / 收藏 / 最近 / 搜索共用同一套外观与返回链路。
 */

import { Link, useLocation } from 'react-router-dom';
import type { Card } from '../../../domain/entities/card';
import { ImageWithFallback } from '../../../shared/ui/ImageWithFallback';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { categoryColorVar } from '../../../shared/utils/classNames';

interface Props {
  card: Card;
  colorToken?: string;
  /** 搜索结果里标出所属分类（分类页 / 收藏 / 最近不需要，传了才显示） */
  categoryName?: string;
}

export function CardTile({ card, colorToken, categoryName }: Props) {
  const mode = useSettingsStore((state) => state.settings.displayMode);
  const location = useLocation();
  // 带上当前分组与页码：详情页按同一组内序列翻页，返回时也回到这一页
  const listUrl = `${location.pathname}${location.search}`;
  // 成语卡没有英文（v0.6）：标题回退到中文，避免看英文模式下列表出现空白块
  const english = card.en.trim();

  return (
    <Link
      className="card-tile"
      to={{ pathname: `/card/${card.id}`, search: location.search }}
      state={{ listUrl }}
      aria-label={english ? `${card.zh} ${english}` : card.zh}
    >
      <div className="card-tile__media" style={categoryColorVar(colorToken)}>
        <ImageWithFallback
          src={card.image}
          alt={card.zh}
          fallbackText={card.zh}
          colorToken={colorToken}
        />
        {/* 故事卡标出「绘本故事」，让孩子一眼看出这本可以讲（v0.2 US-S1） */}
        {card.kind === 'story' ? (
          <span className="card-tile__badge">绘本故事</span>
        ) : null}
        {categoryName ? <span className="card-tile__cat">{categoryName}</span> : null}
      </div>
      <p className="card-tile__zh">{mode === 'en' && english ? english : card.zh}</p>
      {mode === 'both' && english ? <p className="card-tile__en">{english}</p> : null}
    </Link>
  );
}
