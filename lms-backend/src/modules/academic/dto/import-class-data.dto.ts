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
import { ImportClassRowDto } from './import-classes.dto.js';
import { MAX_IMPORT_ROWS } from './import-participants.dto.js';

/** Most files in one import. */
export const MAX_IMPORT_FILES = 20;
/** Most student rows in one import, all files together. */
export const MAX_IMPORT_STUDENT_ROWS = 10000;

const MAX_CELL_LENGTH = 500;
const MAX_FILE_NAME_LENGTH = 255;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** One row of a "Students" sheet. Values are checked row by row in the import result, not here. */
export class ImportEnrollmentRowDto {
  /** Row number in the sheet, echoed back in the result. */
  @IsInt()
  @Min(1)
  readonly line: number;

  /** Class the student joins; may be left out when the file lists a single class. */
  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly classCode?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly studentCode?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(MAX_CELL_LENGTH)
  @IsOptional()
  readonly email?: string;
}

/** One uploaded file: the classes it defines and the students to put into them. */
export class ImportClassFileDto {
  /** File name, shown in the result so rows can be traced back to their file. */
  @IsString()
  @MaxLength(MAX_FILE_NAME_LENGTH)
  readonly name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportClassRowDto)
  readonly classes: ImportClassRowDto[];

  @IsArray()
  @ArrayMaxSize(MAX_IMPORT_STUDENT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportEnrollmentRowDto)
  readonly students: ImportEnrollmentRowDto[];
}

/** Body of `POST /api/classes/import-data`. */
export class ImportClassDataDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_FILES)
  @ValidateNested({ each: true })
  @Type(() => ImportClassFileDto)
  readonly files: ImportClassFileDto[];

  /** true = only report what would happen (preview); nothing is written. */
  @IsBoolean()
  @IsOptional()
  readonly dryRun?: boolean;
}