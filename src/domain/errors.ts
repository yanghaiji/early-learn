/** 领域错误：由仓储/服务抛出，UI 统一转成用户可读提示 */

import type { FieldError } from './services/validation';

export class ValidationError extends Error {
  readonly fields: FieldError[];

  constructor(fields: FieldError[]) {
    super(fields[0]?.message ?? '数据校验未通过');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class NotFoundError extends Error {
  constructor(message = '内容不存在') {
    super(message);
    this.name = 'NotFoundError';
  }
}
