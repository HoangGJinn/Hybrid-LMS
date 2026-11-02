import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

export class LoginDto {
  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  readonly username: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  readonly password: string;
}

