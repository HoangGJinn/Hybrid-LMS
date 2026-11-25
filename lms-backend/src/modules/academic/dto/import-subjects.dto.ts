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

/** Generous cap that only protects the request size; exact limits are reported per row in the result. */
const MAX_CELL_LENGTH = 5000;

/** One data row of a subject file. Cells are checked row by row in the result, not here. */
export class ImportSubjectRowDto {
  /** Row number in the file, echoed back in the result so the admin can find the row. */
  @IsInt()
  @Min(1)
  readonly line: number;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly subjectCode?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly name?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly description?: string;
}

/** Body of `POST /api/subjects/import`. */
export class ImportSubjectsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportSubjectRowDto)
  readonly rows: ImportSubjectRowDto[];

  /** true = only report what would happen (preview); nothing is written. */
  @IsBoolean()
  @IsOptional()
  readonly dryRun?: boolean;
}
