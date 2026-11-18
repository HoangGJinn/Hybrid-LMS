import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { AcademicFacade } from '../../academic/index.js';
import { AssignmentFacade } from '../../assignment/index.js';
import { ExamFacade } from '../../exam/index.js';
import type { QueryCalendarDto } from '../dto/query-calendar.dto.js';
import type { CalendarEventView } from '../types/calendar-event-view.type.js';
import {
  compareEvents,
  isWithinRange,
  toAssignmentEvent,
  toExamEvent,
  type CalendarRange,
} from '../utils/calendar-event.mapper.js';

/** Builds the student's calendar from the assignments and exams of their classes. */
@Injectable()
export class CalendarService {
  constructor(
    private readonly academicFacade: AcademicFacade,
    private readonly assignmentFacade: AssignmentFacade,
    private readonly examFacade: ExamFacade,
  ) {}

  /** Assignment deadlines and exams of the student's classes inside the range, earliest first. */
  async listMyEvents(
    user: AuthenticatedUser,
    query: QueryCalendarDto,
  ): Promise<CalendarEventView[]> {
    const range = this.parseRange(query);
    const [classes, assignments, exams] = await Promise.all([
      this.academicFacade.getClassesByStudent(user.id),
      this.assignmentFacade.getAssignmentsOfStudent(user),
      this.examFacade.getExamsOfStudent(user),
    ]);
    const classById = new Map(
      classes.map((classRoom) => [classRoom.id, classRoom]),
    );
    return [
      ...assignments.map((assignment) =>
        toAssignmentEvent(assignment, classById.get(assignment.classId)),
      ),
      ...exams.map((exam) => toExamEvent(exam, classById.get(exam.classId))),
    ]
      .filter((event) => isWithinRange(event.occursAt, range))
      .sort(compareEvents);
  }

  private parseRange({ from, to }: QueryCalendarDto): CalendarRange {
    const range: CalendarRange = {
      from: from === undefined ? undefined : new Date(from),
      to: to === undefined ? undefined : new Date(to),
    };
    if (range.from && range.to && range.from >= range.to) {
      throw new BadRequestException('from must be earlier than to');
    }
    return range;
  }
}