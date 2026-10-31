/** CSV 解析器单测（NFR/v0.9 §4.1） */

import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

function table(text: string) {
  const result = parseCsv(text);
  if (!result.ok) throw new Error(`期望解析成功，实际：${result.message}`);
  return result.data;
}

function fail(text: string) {
  const result = parseCsv(text);
  if (result.ok) throw new Error('期望解析失败，实际成功');
  return result.message;
}

describe('parseCsv', () => {
  it('should_strip_bom_and_trim_header_when_excel_saved_the_file', () => {
    const data = table('\uFEFF category , zh \r\ndog,狗\r\n');
    expect(data.header).toEqual(['category', 'zh']);
    expect(data.rows).toEqual([{ line: 2, cells: ['dog', '狗'] }]);
  });

  it('should_count_physical_lines_when_rows_use_crlf', () => {
    const data = table('a,b\r\nc,d\r\ne,f\r\n');
    expect(data.rows.map((row) => row.line)).toEqual([2, 3]);
    expect(data.rows[1]?.cells).toEqual(['e', 'f']);
  });

  it('should_unescape_doubled_quote_when_field_is_quoted', () => {
    const data = table('a,b\n"say ""hi""",2\n');
    expect(data.rows[0]?.cells).toEqual(['say "hi"', '2']);
  });

  it('should_keep_newline_inside_field_when_value_is_quoted', () => {
    const data = table('a,b\nx,"one\ntwo"\ny,z\n');
    expect(data.rows[0]?.cells).toEqual(['x', 'one\ntwo']);
    // 字段内换行占掉第 3 行，下一条记录从第 4 行开始
    expect(data.rows[1]).toEqual({ line: 4, cells: ['y', 'z'] });
  });

  it('should_drop_trailing_blank_rows_when_file_ends_with_empty_lines', () => {
    const data = table('a,b\nc,d\n\n\n');
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]?.cells).toEqual(['c', 'd']);
  });

  it('should_report_header_error_when_file_is_semicolon_separated', () => {
    expect(fail('category;zh\n动物;狗\n')).toBe('表头不正确，请下载模板');
    expect(fail('sep=;\na,b\n')).toBe('表头不正确，请下载模板');
  });

  it('should_report_unclosed_quote_when_quote_never_closes', () => {
    expect(fail('a,b\nx,"没有收尾\n')).toBe('第 2 行的引号没有闭合');
  });

  it('should_report_empty_file_when_only_blank_lines_given', () => {
    expect(fail('\n\n')).toBe('CSV 是空的，请先下载模板');
  });
});
