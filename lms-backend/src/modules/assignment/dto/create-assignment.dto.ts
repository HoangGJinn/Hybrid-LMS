import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const MAX_ATTACHMENTS = 10;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** UC-33: what a lecturer fills in to create an assignment. */
export class CreateAssignmentDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title: string;

  /** The brief / note shown to students. */
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  readonly instruction: string;

  @IsDateString()
  readonly openAt: string;

  @IsDateString()
  readonly endAt: string;

  /** Confirmed (READY) uploads that belong to the lecturer. */
  @IsArray()
  @ArrayMaxSize(MAX_ATTACHMENTS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly fileIds: string[];
}