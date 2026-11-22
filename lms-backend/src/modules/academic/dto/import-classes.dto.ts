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
const MAX_CELL_LENGTH = 500;

/**
 * One data row of the Excel file. Values are not format-checked here on purpose: a malformed row
 * must be reported in the import result, not make the whole request fail.
 */
export class ImportClassRowDto {
  /** Row number in the file, echoed back in the result so the user can find the row. */
  @IsInt()
  @Min(1)
  readonly line: number;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly classCode?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly name?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly subjectCode?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly semesterCode?: string;

  /** Lecturer code (e.g. GV26000001) or email. */
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly lecturer?: string;
}

/** Body of `POST /api/classes/import`. */
export class ImportClassesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportClassRowDto)
  readonly rows: ImportClassRowDto[];

  /** true = only report what would happen (used for the preview step); nothing is written. */
  @IsBoolean()
  @IsOptional()
  readonly dryRun?: boolean;
}