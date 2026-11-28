import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { QueryCalendarDto } from '../dto/query-calendar.dto.js';
import { CalendarService } from '../services/calendar.service.js';
import type { CalendarEventView } from '../types/calendar-event-view.type.js';

/** The student's calendar: assignment deadlines and exams across every class they are enrolled in. */
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('me')
  @Auth(Role.STUDENT)
  async myEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryCalendarDto,
  ): Promise<CalendarEventView[]> {
    return this.calendarService.listMyEvents(user, query);
  }
}