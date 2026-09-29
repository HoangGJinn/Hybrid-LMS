import { Role } from '../enums/role.enum.js'

/**
 * Represents the authenticated user attached to the request after JWT validation.
 *
 * NOTE: Intentionally a `class` (not an interface) because it is used as a
 * parameter type inside decorated controller methods. With `emitDecoratorMetadata`
 * enabled, TypeScript must emit a runtime reference for the type, which requires
 * a real JavaScript value — interfaces are erased at compile time and would cause
 * error TS1272.
 */
export class AuthenticatedUser {
  readonly id: string
  readonly email: string
  readonly role: Role
}
