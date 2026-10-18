import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly classCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @IsUUID()
  @IsNotEmpty()
  readonly subjectId: string;

  @IsUUID()
  @IsNotEmpty()
  readonly semesterId: string;

  @IsUUID()
  @IsNotEmpty()
  readonly lecturerId: string;

  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;
}
