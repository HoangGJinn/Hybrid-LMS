import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'
import { Role } from '../../../common/enums/role.enum.js'

export class CreateUserDto {
  @IsEmail()
  readonly email: string

  @IsString()
  readonly fullName: string

  @IsString()
  readonly ssoId: string

  @IsString()
  readonly ssoProvider: string

  @IsString()
  @IsOptional()
  readonly avatarUrl?: string

  @IsEnum(Role)
  @IsOptional()
  readonly role?: Role
}
