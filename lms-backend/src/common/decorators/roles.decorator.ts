import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum.js';

export const ROLES_KEY = 'roles';

/**
 * Decorator to assign required roles to controller classes or route handlers.
 * Example: `@Roles(Role.ADMIN)` or `@Roles(Role.ADMIN, Role.LECTURER)`
 * this calls `SetMetadata('roles', [Role.ADMIN])`
 */
export const Roles = (...roles: Role[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
