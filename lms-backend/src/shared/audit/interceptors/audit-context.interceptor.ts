import { randomUUID } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import {
  auditContextStorage,
  type AuditRequestContext,
} from '../context/audit-context.js';
import { PresenceService } from '../services/presence.service.js';

const MAX_IP_LENGTH = 45;

const pickFirstForwarded = (
  forwarded: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(forwarded)) return forwarded[0];
  if (typeof forwarded === 'string') return forwarded.split(',')[0];
  return undefined;
};

const nonEmpty = (value: string | undefined): string | undefined =>
  value && value.length > 0 ? value : undefined;

const extractIp = (req: Request): string | null => {
  const firstForwarded = pickFirstForwarded(req.headers['x-forwarded-for']);
  const raw =
    nonEmpty(firstForwarded?.trim()) ??
    nonEmpty(req.ip) ??
    nonEmpty(req.socket?.remoteAddress);
  return raw ? raw.slice(0, MAX_IP_LENGTH) : null;
};

const extractHeader = (
  req: Request,
  name: string,
): string | null => {
  const value = req.headers[name];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
};

/**
 * Captures request metadata (IP, User-Agent, Request ID, authenticated user)
 * into AsyncLocalStorage so domain services can record audit logs without passing `req`.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(
    @Optional() private readonly presenceService?: PresenceService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    if (req.user?.id) {
      this.presenceService?.touch(req.user.id).catch(() => undefined);
    }
    const ctx: AuditRequestContext = {
      actor: req.user
        ? {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
          }
        : undefined,
      ipAddress: extractIp(req),
      userAgent: extractHeader(req, 'user-agent'),
      requestId: extractHeader(req, 'x-request-id')?.slice(0, 64) ?? randomUUID(),
    };

    return new Observable((subscriber) =>
      auditContextStorage.run(ctx, () => next.handle().subscribe(subscriber)),
    );
  }
}
