import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';
import { Role } from '../../../common/enums/role.enum.js';
import { LecturerStatus } from '../enums/lecturer-status.enum.js';
import { StudentStatus } from '../enums/student-status.enum.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Sort orders of the list: newest accounts first (default, for the management pages) or by name A-Z (for dropdowns). */
export const USER_SORT_FIELDS = ['createdAt', 'fullName'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

/** Every profile status a user can have (students and lecturers). */
export const USER_STATUS_VALUES: string[] = [
  ...Object.values(StudentStatus),
  ...Object.values(LecturerStatus),
];

/** Query string comes in as text: turn "true" / "false" into booleans, leave anything else for the validator to reject. */
const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

/** Query of `GET /api/users` (admin only). */
export class ListUsersQueryDto {
  @Type(() => Number)
  @IsInt({ message: ValidationMessage.IS_INT })
  @Min(1, { message: ValidationMessage.MIN })
  @IsOptional()
  readonly page: number = DEFAULT_PAGE;

  @Type(() => Number)
  @IsInt({ message: ValidationMessage.IS_INT })
  @Min(1, { message: ValidationMessage.MIN })
  @Max(MAX_PAGE_SIZE, { message: ValidationMessage.MAX })
  @IsOptional()
  readonly limit: number = DEFAULT_PAGE_SIZE;

  @IsEnum(Role, { message: ValidationMessage.IS_ENUM })
  @IsOptional()
  readonly role?: Role;

  @Transform(toBoolean)
  @IsBoolean({ message: ValidationMessage.IS_BOOLEAN })
  @IsOptional()
  readonly isActive?: boolean;

  /** `false` = pending accounts nobody has signed in to yet; `true` = accounts linked to a Google login. */
  @Transform(toBoolean)
  @IsBoolean({ message: ValidationMessage.IS_BOOLEAN })
  @IsOptional()
  readonly hasLoggedIn?: boolean;

  /** Profile status (STUDYING, WORKING, ...). Use together with `role`, e.g. WORKING lecturers for a dropdown. */
  @IsIn(USER_STATUS_VALUES, { message: ValidationMessage.IS_IN })
  @IsOptional()
  readonly status?: string;

  /** `createdAt` = newest first (default); `fullName` = A-Z. */
  @IsIn(USER_SORT_FIELDS, { message: ValidationMessage.IS_IN })
  @IsOptional()
  readonly sort?: UserSortField;

  /** Matches full name or email, case-insensitive. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: ValidationMessage.IS_STRING })
  @MaxLength(100, {
    message: ValidationMessage.MAX_LENGTH,
  })
  @IsOptional()
  readonly search?: string;
}
