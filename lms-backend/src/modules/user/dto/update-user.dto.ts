import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Body of `PATCH /api/users/:id` (admin only). Every field is optional; only the ones sent are changed.
 * Only fullName, email (before first login), and profile status can be edited. Role and code are permanent.
 */
export class UpdateUserDto {
  @Transform(trim)
  @IsString({ message: ValidationMessage.IS_STRING })
  @MinLength(1, { message: ValidationMessage.MIN_LENGTH })
  @MaxLength(255, {
    message: ValidationMessage.MAX_LENGTH,
  })
  @IsOptional()
  readonly fullName?: string;

  /** Only accepted while the account has not been claimed by a Google login. */
  @Transform(normalizeEmail)
  @IsEmail({}, { message: ValidationMessage.IS_EMAIL })
  @MaxLength(255, {
    message: ValidationMessage.MAX_LENGTH,
  })
  @IsOptional()
  readonly email?: string;

  /**
   * Profile status: STUDYING | GRADUATED | SUSPENDED | RESERVED for students,
   * WORKING | RESIGNED | ON_LEAVE for lecturers. Checked against the user's role in the service.
   */
  @IsString({ message: ValidationMessage.IS_STRING })
  @IsOptional()
  readonly status?: string;
}
