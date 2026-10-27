import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

export class CreateSubjectDto {
  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  @MaxLength(50, {
    message: ValidationMessage.MAX_LENGTH,
  })
  readonly subjectCode: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  @MaxLength(255, {
    message: ValidationMessage.MAX_LENGTH,
  })
  readonly name: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @IsOptional()
  readonly description?: string | null;
}
