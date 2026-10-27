import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';
import { Role } from '../../../common/enums/role.enum.js';

export class CreateUserDto {
  @IsEmail({}, { message: ValidationMessage.IS_EMAIL })
  readonly email: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  readonly fullName: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  readonly ssoId: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  readonly ssoProvider: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @IsOptional()
  readonly avatarUrl?: string;

  @IsEnum(Role, { message: ValidationMessage.IS_ENUM })
  @IsOptional()
  readonly role?: Role;
}
