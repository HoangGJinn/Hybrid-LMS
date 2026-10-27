import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';
import { Role } from '../../../common/enums/role.enum.js';

/** Roles an admin may provision. Admin accounts are never created through the API (see ADMIN_EMAILS). */
export const PROVISIONABLE_ROLES = [Role.LECTURER, Role.STUDENT] as const;

export type ProvisionableRole = (typeof PROVISIONABLE_ROLES)[number];

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Body of `POST /api/users` (admin only): pre-provisions an account before the person has ever logged in.
 * Only the email is required. The account is claimed by the first Google login with the same email.
 */
export class CreateManagedUserDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: ValidationMessage.IS_EMAIL })
  @MaxLength(255, {
    message: ValidationMessage.MAX_LENGTH,
  })
  readonly email: string;

  /** Defaults to LECTURER, the main use case of pre-provisioning. */
  @IsIn(PROVISIONABLE_ROLES, { message: ValidationMessage.ROLE_INVALID })
  @IsOptional()
  readonly role?: ProvisionableRole;

  /** Optional: replaced by the Google profile name on first login when omitted. */
  @Transform(trim)
  @IsString({ message: ValidationMessage.IS_STRING })
  @MinLength(1, { message: ValidationMessage.MIN_LENGTH })
  @MaxLength(255, {
    message: ValidationMessage.MAX_LENGTH,
  })
  @IsOptional()
  readonly fullName?: string;

  /** Lecturer or student code in the standard 10-char format: SVyyNNNNNN / GVyyNNNNNN.
   * Generated automatically when omitted. */
  @Transform(trim)
  @Matches(/^(SV|GV)\d{8}$/, {
    message: ValidationMessage.CODE_FORMAT,
  })
  @IsOptional()
  readonly code?: string;
}
