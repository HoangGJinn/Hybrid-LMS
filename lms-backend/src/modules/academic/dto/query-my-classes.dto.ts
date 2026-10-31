import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

export const MY_CLASS_STATUSES = [
  'all',
  'in_progress',
  'future',
  'past',
] as const;
export type MyClassStatus = (typeof MY_CLASS_STATUSES)[number];

export const MY_CLASS_SORTS = ['last_accessed', 'name'] as const;
export type MyClassSort = (typeof MY_CLASS_SORTS)[number];

export const DEFAULT_MY_CLASSES_LIMIT = 6;
export const MAX_MY_CLASSES_LIMIT = 100;

/** Query parameters for student/lecturer's `GET /api/classes/my`. */
export class QueryMyClassesDto {
  @Type(() => Number)
  @IsInt({ message: ValidationMessage.IS_INT })
  @Min(1, { message: ValidationMessage.MIN })
  @IsOptional()
  readonly page?: number;

  @Type(() => Number)
  @IsInt({ message: ValidationMessage.IS_INT })
  @Min(1, { message: ValidationMessage.MIN })
  @Max(MAX_MY_CLASSES_LIMIT, { message: ValidationMessage.MAX })
  @IsOptional()
  readonly limit?: number;

  @IsOptional()
  @IsString({ message: ValidationMessage.IS_STRING })
  @MaxLength(100, { message: ValidationMessage.MAX_LENGTH })
  readonly search?: string;

  @IsOptional()
  @IsIn(MY_CLASS_STATUSES, { message: ValidationMessage.IS_IN })
  readonly status?: MyClassStatus;

  @IsOptional()
  @IsIn(MY_CLASS_SORTS, { message: ValidationMessage.IS_IN })
  readonly sort?: MyClassSort;
}

