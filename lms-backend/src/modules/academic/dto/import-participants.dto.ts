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

/** Largest import file: one request, one insert. */
export const MAX_IMPORT_ROWS = 1000;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * One data row of the file. Values are not format-checked here on purpose: a malformed row must be
 * reported in the import result, not make the whole request fail.
 */
export class ImportParticipantRowDto {
  /** Row number in the file, echoed back in the result so the user can find the row. */
  @IsInt()
  @Min(1)
  readonly line: number;

  @Transform(trim)
  @IsString()
  @MaxLength(50)
  @IsOptional()
  readonly studentCode?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(255)
  @IsOptional()
  readonly email?: string;
}

/** Body of `POST /api/classes/:classId/participants/import`. */
export class ImportParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportParticipantRowDto)
  readonly rows: ImportParticipantRowDto[];

  /** true = only report what would happen (used for the preview step); nothing is written. */
  @IsBoolean()
  @IsOptional()
  readonly dryRun?: boolean;
}
