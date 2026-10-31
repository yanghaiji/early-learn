/**
 * CSV 解析器（RFC 4180 常用子集）。对应 NFR/v0.9 §4.1。
 *
 * 只做「文本 → 表头 + 行」，列语义与业务校验交给 cardCsv.ts。
 * 支持：逗号分隔、`"` 包裹、`""` 转义、字段内换行、CRLF / LF、UTF-8 BOM、尾随空行。
 * 不支持：分号分隔、Excel 的 `sep=` 头 —— 一律按「表头不正确」拒绝。
 */

import type { ParseResult } from './validation';

export interface CsvRow {
  /** 该行在文件里的起始行号（表头算第 1 行），用于错误定位 */
  line: number;
  cells: string[];
}

export interface CsvTable {
  header: string[];
  rows: CsvRow[];
}

const EMPTY_FILE = 'CSV 是空的，请先下载模板';
const HEADER_ERROR = '表头不正确，请下载模板';

function isBlankRow(row: CsvRow): boolean {
  return row.cells.every((cell) => cell.trim().length === 0);
}

export function parseCsv(raw: string): ParseResult<CsvTable> {
  // Excel 存 UTF-8 CSV 会带 BOM，先剥掉，否则第一列名会变成「\uFEFFcategory」
  const text = raw.replace(/^\uFEFF/, '');

  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let field = '';
  let quoted = false;
  let started = false;
  let line = 1;
  let rowLine = 1;
  let quoteLine = 0;

  const endRow = () => {
    cells.push(field);
    rows.push({ line: rowLine, cells });
    cells = [];
    field = '';
    started = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        // `""` 是转义后的一个引号，否则就是字段结束
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
        continue;
      }
      // 字段内换行合法，但行号仍要推进，后面的错误定位才准
      if (ch === '\n') line += 1;
      field += ch;
      continue;
    }

    if (ch === '"' && field.length === 0) {
      quoted = true;
      started = true;
      quoteLine = line;
      continue;
    }
    if (ch === ',') {
      cells.push(field);
      field = '';
      started = true;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      endRow();
      // CRLF 只算一次换行
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      line += 1;
      rowLine = line;
      continue;
    }
    field += ch;
    started = true;
  }

  if (quoted) return { ok: false, message: `第 ${quoteLine} 行的引号没有闭合` };
  if (started) endRow();

  // 尾随空行（Excel 常见）不算数据行
  while (rows.length > 0 && isBlankRow(rows[rows.length - 1] as CsvRow)) rows.pop();
  if (rows.length === 0) return { ok: false, message: EMPTY_FILE };

  const first = rows[0] as CsvRow;
  const header = first.cells.map((cell) => cell.trim());
  // 单列多半是分号分隔；`sep=;` 是 Excel 的方言声明，两者都按表头错处理
  if (header.length < 2 || (header[0] ?? '').toLowerCase().startsWith('sep=')) {
    return { ok: false, message: HEADER_ERROR };
  }
  return { ok: true, data: { header, rows: rows.slice(1) } };
}
