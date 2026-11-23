import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditActor {
  readonly id?: string | null;
  readonly email?: string | null;
  readonly fullName?: string | null;
  readonly role?: string | null;
}

export interface AuditRequestContext {
  readonly actor?: AuditActor;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly requestId: string | null;
}

export const auditContextStorage = new AsyncLocalStorage<AuditRequestContext>();

export const getAuditContext = (): AuditRequestContext | undefined =>
  auditContextStorage.getStore();

export const runWithAuditContext = <T>(
  ctx: AuditRequestContext,
  fn: () => T,
): T => auditContextStorage.run(ctx, fn);
