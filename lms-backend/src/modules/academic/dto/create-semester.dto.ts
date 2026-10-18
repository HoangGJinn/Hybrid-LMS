import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly semesterCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @IsDateString()
  @IsNotEmpty()
  readonly startDate: string;

  @IsDateString()
  @IsNotEmpty()
  readonly endDate: string;

  // todo: Service check endDate > startDate
}
