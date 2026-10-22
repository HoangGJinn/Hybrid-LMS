import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserController } from './user.controller.js';
import { UserFacade } from '../facades/user.facade.js';
import { Role } from '../../../common/enums/role.enum.js';
import { UserView } from '../types/user-view.type.js';

describe('UserController', () => {
  let controller: UserController;
  let mockUserFacade: Partial<Record<keyof UserFacade, ReturnType<typeof vi.fn>>>;

  const sampleUserView: UserView = {
    id: 'usr-1',
    email: 'test@school.edu.vn',
    fullName: 'Test User',
    avatarUrl: null,
    role: Role.STUDENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserFacade = {
      findUsers: vi.fn(),
    };
    controller = new UserController(mockUserFacade as unknown as UserFacade);
  });


  describe('getUsers', () => {
    it('returns all users when no role filter is provided', async () => {
      mockUserFacade.findUsers!.mockResolvedValue([sampleUserView]);

      const result = await controller.getUsers(undefined);

      expect(mockUserFacade.findUsers).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([sampleUserView]);
    });

    it('returns users filtered by role when role is provided', async () => {
      const lecturerView: UserView = { ...sampleUserView, role: Role.LECTURER };
      mockUserFacade.findUsers!.mockResolvedValue([lecturerView]);

      const result = await controller.getUsers(Role.LECTURER);

      expect(mockUserFacade.findUsers).toHaveBeenCalledWith(Role.LECTURER);
      expect(result).toEqual([lecturerView]);
    });
  });
});
