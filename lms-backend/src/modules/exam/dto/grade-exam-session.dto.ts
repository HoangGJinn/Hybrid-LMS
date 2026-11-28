import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Payload sent by a lecturer to grade (or re-grade) an exam attempt on a 10-point scale. */
export class GradeExamSessionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  readonly score: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  readonly comment?: string | null;
}

