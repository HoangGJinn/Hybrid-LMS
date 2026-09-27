import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { AuthProvider, Role } from '../entities/user.entity.js'

export class CreateUserDto {
  @IsString()
  readonly username: string

  @IsString()
  readonly fullName: string

  @IsEmail()
  readonly email: string

  @IsString()
  @MinLength(8)
  @IsOptional()
  readonly password?: string

  @IsString()
  @IsOptional()
  readonly googleId?: string

  @IsEnum(Role)
  @IsOptional()
  readonly role?: Role

  @IsEnum(AuthProvider)
  @IsOptional()
  readonly authProvider?: AuthProvider
}
