/**
 * 笔顺数据的类型契约（v0.9 NFR §2.2）。
 *
 * 只保留 hanzi-writer 运行时要用的两个字段：笔画轮廓与笔画中线。
 * 坐标系与 hanzi-writer 一致（900×900 视口），运行时不需要再做换算。
 */

export interface StrokeCharData {
  /** 每笔一个 SVG path，数组顺序即书写顺序 */
  strokes: string[];
  /** 每笔一条中线折线：[[x, y], ...]，与 strokes 一一对应 */
  medians: number[][][];
}

/** 一个主题组的全部字形数据：字 → 数据 */
export type StrokeGroupData = Readonly<Record<string, StrokeCharData>>;
