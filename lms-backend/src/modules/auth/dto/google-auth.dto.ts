import { IsNotEmpty, IsString } from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

export class GoogleAuthDto {
  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  readonly idToken: string;
}
