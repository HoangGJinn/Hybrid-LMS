import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import {
  CreateAssignmentDto,
  MAX_ATTACHMENTS,
} from './create-assignment.dto.js';

/**
 * What a lecturer submits to edit an assignment. It carries the same fields as creation;
 * `fileIds` are the newly uploaded attachments and `keptFileIds` the existing ones to keep.
 */
export class UpdateAssignmentDto extends CreateAssignmentDto {
  /** Attachments already on the assignment that stay; the others are removed. */
  @IsArray()
  @ArrayMaxSize(MAX_ATTACHMENTS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly keptFileIds: string[];
}