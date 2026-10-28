import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParticipantController } from './participant.controller.js';
import { ParticipantService } from '../services/participant.service.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { Role } from '../../../common/enums/role.enum.js';

describe('ParticipantController', () => {
  let controller: ParticipantController;
  let mockService: Partial<
    Record<keyof ParticipantService, ReturnType<typeof vi.fn>>
  >;

  const user: AuthenticatedUser = {
    id: 'lec-1',
    email: 'lecturer@school.edu.vn',
    role: Role.LECTURER,
  };

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockResolvedValue([]),
      searchCandidates: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
      importParticipants: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    controller = new ParticipantController(
      mockService as unknown as ParticipantService,
    );
  });

  it('lists the participants of the class for the current user', async () => {
    await controller.list('cls-1', user, 'nguyen');

    expect(mockService.list).toHaveBeenCalledWith('cls-1', user, 'nguyen');
  });

  it('searches the candidates with the requested limit', async () => {
    await controller.candidates('cls-1', user, 'sv26', 10);

    expect(mockService.searchCandidates).toHaveBeenCalledWith(
      'cls-1',
      user,
      'sv26',
      10,
    );
  });

  it('adds a participant', async () => {
    await controller.add('cls-1', user, { studentId: 'stu-1' });

    expect(mockService.add).toHaveBeenCalledWith('cls-1', user, {
      studentId: 'stu-1',
    });
  });

  it('imports participants', async () => {
    const dto = { rows: [{ line: 2, studentCode: 'SV26000001' }], dryRun: true };

    await controller.importParticipants('cls-1', user, dto);

    expect(mockService.importParticipants).toHaveBeenCalledWith(
      'cls-1',
      user,
      dto,
    );
  });

  it('removes a participant and returns nothing', async () => {
    await expect(
      controller.remove('cls-1', 'stu-1', user),
    ).resolves.toBeUndefined();

    expect(mockService.remove).toHaveBeenCalledWith('cls-1', user, 'stu-1');
  });
});
