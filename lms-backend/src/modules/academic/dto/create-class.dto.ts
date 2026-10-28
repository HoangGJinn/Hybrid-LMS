import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

export class CreateClassDto {
  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  @MaxLength(50, {
    message: ValidationMessage.MAX_LENGTH,
  })
  readonly classCode: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  @MaxLength(255, {
    message: ValidationMessage.MAX_LENGTH,
  })
  readonly name: string;

  @IsUUID('4', { message: ValidationMessage.IS_UUID })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  readonly subjectId: string;

  @IsUUID('4', { message: ValidationMessage.IS_UUID })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  readonly semesterId: string;

  @IsUUID('4', { message: ValidationMessage.IS_UUID })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  readonly lecturerId: string;

  @IsBoolean({ message: ValidationMessage.IS_BOOLEAN })
  @IsOptional()
  readonly isActive?: boolean;
}
