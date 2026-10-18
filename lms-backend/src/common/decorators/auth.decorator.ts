import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '../enums/role.enum.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from './roles.decorator.js';

/**
 * Usage:
 * - `@Auth()`: Requires valid JWT authentication (any authenticated user).
 * - `@Auth(Role.ADMIN)`: Requires valid JWT AND matching ADMIN role.
 * - `@Auth(Role.ADMIN, Role.LECTURER)`: Requires valid JWT AND matching ADMIN or LECTURER role.
 */
export const Auth = (...roles: Role[]) => {
  if (roles.length > 0) {
    return applyDecorators(
      Roles(...roles),
      UseGuards(JwtAuthGuard, RolesGuard),
    );
  }
  return applyDecorators(UseGuards(JwtAuthGuard));
};
