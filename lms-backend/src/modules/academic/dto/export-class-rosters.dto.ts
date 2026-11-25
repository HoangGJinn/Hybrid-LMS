import { IsIn, IsOptional, IsUUID } from 'class-validator';

export const CLASS_EXPORT_STATUSES = ['active', 'ended', 'all'] as const;
export type ClassExportStatus = (typeof CLASS_EXPORT_STATUSES)[number];

/** Query of `GET /api/exports/class-rosters`. */
export class ExportClassRostersQueryDto {
  /** Leave out for every semester. */
  @IsUUID()
  @IsOptional()
  readonly semesterId?: string;

  /** Running classes, ended classes, or both (default). */
  @IsIn(CLASS_EXPORT_STATUSES)
  @IsOptional()
  readonly status?: ClassExportStatus;
}
