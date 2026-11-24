import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';
import { AuditAction } from '../enums/audit-action.enum.js';
import { AuditCategory } from '../enums/audit-category.enum.js';
import { AuditEntityType } from '../enums/audit-entity-type.enum.js';
import { AuditResult } from '../enums/audit-result.enum.js';

export const DEFAULT_AUDIT_PAGE = 1;
export const DEFAULT_AUDIT_LIMIT = 20;
export const MAX_AUDIT_LIMIT = 100;

export class ListAuditLogsQueryDto {
  @Type(() => Number)
  @IsInt({ message: ValidationMessage.IS_INT })
  @Min(1, { message: ValidationMessage.MIN })
  @IsOptional()
  readonly page: number = DEFAULT_AUDIT_PAGE;

  @Type(() => Number)
  @IsInt({ message: ValidationMessage.IS_INT })
  @Min(1, { message: ValidationMessage.MIN })
  @Max(MAX_AUDIT_LIMIT, { message: ValidationMessage.MAX })
  @IsOptional()
  readonly limit: number = DEFAULT_AUDIT_LIMIT;

  @IsEnum(AuditCategory, { message: ValidationMessage.IS_ENUM })
  @IsOptional()
  readonly category?: AuditCategory;

  @IsEnum(AuditAction, { message: ValidationMessage.IS_ENUM })
  @IsOptional()
  readonly action?: AuditAction;

  @IsEnum(AuditEntityType, { message: ValidationMessage.IS_ENUM })
  @IsOptional()
  readonly entityType?: AuditEntityType;

  @IsString({ message: ValidationMessage.IS_STRING })
  @MaxLength(100, { message: ValidationMessage.MAX_LENGTH })
  @IsOptional()
  readonly entityId?: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @MaxLength(100, { message: ValidationMessage.MAX_LENGTH })
  @IsOptional()
  readonly parentId?: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @MaxLength(100, { message: ValidationMessage.MAX_LENGTH })
  @IsOptional()
  readonly relatedId?: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @MaxLength(100, { message: ValidationMessage.MAX_LENGTH })
  @IsOptional()
  readonly actorId?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: ValidationMessage.IS_STRING })
  @MaxLength(100, { message: ValidationMessage.MAX_LENGTH })
  @IsOptional()
  readonly requestId?: string;

  @IsEnum(AuditResult, { message: ValidationMessage.IS_ENUM })
  @IsOptional()
  readonly result?: AuditResult;

  @IsDateString({}, { message: ValidationMessage.IS_DATE_STRING })
  @IsOptional()
  readonly from?: string;

  @IsDateString({}, { message: ValidationMessage.IS_DATE_STRING })
  @IsOptional()
  readonly to?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: ValidationMessage.IS_STRING })
  @MaxLength(100, { message: ValidationMessage.MAX_LENGTH })
  @IsOptional()
  readonly search?: string;
}
