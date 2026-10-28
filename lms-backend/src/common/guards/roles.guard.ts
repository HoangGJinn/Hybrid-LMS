import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AuthenticatedUser } from '../types/authenticated-user.type.js';

/**
 * Global or per-controller guard that compares the authenticated user's role
 * against the roles specified in the `@Roles()` decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), //higher priority for method (override class roles)
      context.getClass(), //lower priority for class
    ]);

    // If no roles are specified, allow access.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // Deny access if user is not authenticated or role does not match.
    if (!user?.role) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
