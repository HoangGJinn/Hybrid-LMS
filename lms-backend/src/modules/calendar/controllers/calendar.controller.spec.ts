import { describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { CalendarService } from '../services/calendar.service.js';
import { CalendarController } from './calendar.controller.js';

describe('CalendarController', () => {
  it('delegates myEvents to CalendarService with current student and query', async () => {
    const events = [{ id: 'ev-1' }];
    const service = {
      listMyEvents: vi.fn().mockResolvedValue(events),
    } as unknown as CalendarService;
    const controller = new CalendarController(service);
    const user = {
      id: 'stu-1',
      email: 'sv@lms.edu.vn',
      role: Role.STUDENT,
    } as AuthenticatedUser;
    const query = { from: '2026-11-01', to: '2026-11-30' };

    const result = await controller.myEvents(user, query);

    expect(service.listMyEvents).toHaveBeenCalledWith(user, query);
    expect(result).toBe(events);
  });
});
