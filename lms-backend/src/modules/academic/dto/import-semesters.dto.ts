import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_IMPORT_ROWS } from './import-participants.dto.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const MAX_CELL_LENGTH = 500;

/**
 * One data row of a semester file. Dates are text (`dd/MM/yyyy` or `yyyy-MM-dd`, Vietnam time) and
 * are checked row by row in the result, so one bad date does not fail the whole request.
 */
export class ImportSemesterRowDto {
  /** Row number in the file, echoed back in the result so the admin can find the row. */
  @IsInt()
  @Min(1)
  readonly line: number;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly semesterCode?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly name?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly startDate?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly endDate?: string;
}

/** Body of `POST /api/semesters/import`. */
export class ImportSemestersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportSemesterRowDto)
  readonly rows: ImportSemesterRowDto[];

  /** true = only report what would happen (preview); nothing is written. */
  @IsBoolean()
  @IsOptional()
  readonly dryRun?: boolean;
}
