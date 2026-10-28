import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { Role } from '../enums/role.enum.js';
import { AuthenticatedUser } from '../types/authenticated-user.type.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: Partial<Record<keyof Reflector, ReturnType<typeof vi.fn>>>;

  const createMockContext = (user?: AuthenticatedUser): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RolesGuard(mockReflector as unknown as Reflector);
  });

  it('allows access if no required roles are defined', () => {
    mockReflector.getAllAndOverride!.mockReturnValue(undefined);
    const context = createMockContext({
      id: 'usr-1',
      email: 'user@school.edu.vn',
      role: Role.STUDENT,
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('allows access if required roles array is empty', () => {
    mockReflector.getAllAndOverride!.mockReturnValue([]);
    const context = createMockContext({
      id: 'usr-1',
      email: 'user@school.edu.vn',
      role: Role.STUDENT,
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('denies access if user is not attached to request', () => {
    mockReflector.getAllAndOverride!.mockReturnValue([Role.ADMIN]);
    const context = createMockContext(undefined);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('denies access if user has no role property', () => {
    mockReflector.getAllAndOverride!.mockReturnValue([Role.ADMIN]);
    const context = createMockContext({} as AuthenticatedUser);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('allows access if user has one of the required roles', () => {
    mockReflector.getAllAndOverride!.mockReturnValue([
      Role.ADMIN,
      Role.LECTURER,
    ]);
    const context = createMockContext({
      id: 'lec-1',
      email: 'lecturer@school.edu.vn',
      role: Role.LECTURER,
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('denies access if user does not have any of the required roles', () => {
    mockReflector.getAllAndOverride!.mockReturnValue([Role.ADMIN]);
    const context = createMockContext({
      id: 'stu-1',
      email: 'student@school.edu.vn',
      role: Role.STUDENT,
    });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });
});
