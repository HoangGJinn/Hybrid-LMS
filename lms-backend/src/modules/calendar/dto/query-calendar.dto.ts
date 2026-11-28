import { IsDateString, IsOptional } from 'class-validator';
import { ValidationMessage } from '../../../common/enums/validation-message.enum.js';

/** Query parameters for the student's `GET /api/calendar/me`; both bounds are ISO 8601 date-times. */
export class QueryCalendarDto {
  /** Inclusive lower bound on `occursAt`. */
  @IsOptional()
  @IsDateString({}, { message: ValidationMessage.IS_DATE_STRING })
  readonly from?: string;

  /** Exclusive upper bound on `occursAt`. */
  @IsOptional()
  @IsDateString({}, { message: ValidationMessage.IS_DATE_STRING })
  readonly to?: string;
}