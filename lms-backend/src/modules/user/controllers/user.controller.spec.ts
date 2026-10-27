import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserController } from './user.controller.js';
import { UserService } from '../services/user.service.js';
import { Role } from '../../../common/enums/role.enum.js';
import { ManagedUserView } from '../types/managed-user-view.type.js';
import { PaginatedResult } from '../../../common/types/paginated-result.type.js';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: Partial<
    Record<keyof UserService, ReturnType<typeof vi.fn>>
  >;

  const managedUser: ManagedUserView = {
    id: 'usr-1',
    email: 'lecturer@school.edu.vn',
    fullName: 'lecturer',
    avatarUrl: null,
    role: Role.LECTURER,
    isActive: true,
    code: 'GV123456789',
    profileStatus: 'WORKING',
    hasLoggedIn: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserService = {
      createManagedUser: vi.fn(),
      listUsers: vi.fn(),
      getManagedUser: vi.fn(),
      updateUser: vi.fn(),
      deactivateUser: vi.fn(),
      activateUser: vi.fn(),
    };
    controller = new UserController(mockUserService as unknown as UserService);
  });

  describe('create', () => {
    it('pre-provisions an account through the service', async () => {
      mockUserService.createManagedUser!.mockResolvedValue(managedUser);
      const dto = { email: 'lecturer@school.edu.vn' };

      const result = await controller.create(dto);

      expect(mockUserService.createManagedUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual(managedUser);
    });
  });

  describe('list', () => {
    it('passes the query to the service and returns the page', async () => {
      const page = PaginatedResult.of([managedUser], 1, 1, 20);
      mockUserService.listUsers!.mockResolvedValue(page);
      const query = { page: 1, limit: 20, role: Role.LECTURER };

      const result = await controller.list(query);

      expect(mockUserService.listUsers).toHaveBeenCalledWith(query);
      expect(result).toBe(page);
    });
  });

  describe('getOne', () => {
    it('returns one user', async () => {
      mockUserService.getManagedUser!.mockResolvedValue(managedUser);

      const result = await controller.getOne('usr-1');

      expect(mockUserService.getManagedUser).toHaveBeenCalledWith('usr-1');
      expect(result).toEqual(managedUser);
    });
  });

  describe('update', () => {
    it('updates a user with the body', async () => {
      mockUserService.updateUser!.mockResolvedValue(managedUser);

      const result = await controller.update('usr-1', { fullName: 'New Name' });

      expect(mockUserService.updateUser).toHaveBeenCalledWith('usr-1', {
        fullName: 'New Name',
      });
      expect(result).toEqual(managedUser);
    });
  });

  describe('deactivate / activate', () => {
    it('deactivates a user', async () => {
      const inactive = { ...managedUser, isActive: false };
      mockUserService.deactivateUser!.mockResolvedValue(inactive);

      const result = await controller.deactivate('usr-1');

      expect(mockUserService.deactivateUser).toHaveBeenCalledWith('usr-1');
      expect(result.isActive).toBe(false);
    });

    it('activates a user', async () => {
      mockUserService.activateUser!.mockResolvedValue(managedUser);

      const result = await controller.activate('usr-1');

      expect(mockUserService.activateUser).toHaveBeenCalledWith('usr-1');
      expect(result.isActive).toBe(true);
    });
  });
});
