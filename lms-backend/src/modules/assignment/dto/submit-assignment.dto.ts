import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

const MAX_FILES = 10;

/** UC-16 / UC-17: the confirmed (READY) uploads that make up a student's submission. */
export class SubmitAssignmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_FILES)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly fileIds: string[];
}