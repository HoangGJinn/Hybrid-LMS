import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

export const ROSTER_EXPORT_STATUSES = ['active', 'ended', 'all'] as const;
export type RosterExportStatus = (typeof ROSTER_EXPORT_STATUSES)[number];

/** Query parameters of `GET /api/classes/export/rosters`. */
export class ExportRostersQueryDto {
  /** Only classes of this semester; all semesters when left out. */
  @IsUUID(undefined, { message: ValidationMessage.IS_UUID })
  @IsOptional()
  readonly semesterId?: string;

  /** Which classes to include; defaults to the ones still running. */
  @IsIn(ROSTER_EXPORT_STATUSES, { message: ValidationMessage.IS_IN })
  @IsOptional()
  readonly status?: RosterExportStatus;
}