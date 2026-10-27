import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

export class CreateSemesterDto {
  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  @MaxLength(50, {
    message: ValidationMessage.MAX_LENGTH,
  })
  readonly semesterCode: string;

  @IsString({ message: ValidationMessage.IS_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  @MaxLength(255, {
    message: ValidationMessage.MAX_LENGTH,
  })
  readonly name: string;

  @IsDateString({}, { message: ValidationMessage.IS_DATE_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  readonly startDate: string;

  @IsDateString({}, { message: ValidationMessage.IS_DATE_STRING })
  @IsNotEmpty({ message: ValidationMessage.REQUIRED })
  readonly endDate: string;
}
