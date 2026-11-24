import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getAuditContext } from '../../shared/audit/context/audit-context.js';
import { HttpMetricsStore } from '../../shared/monitoring/services/http-metrics.store.js';

interface ExtractedExceptionDetails {
  status: number;
  message: string | string[];
  field?: string;
}

/** Global HTTP exception filter — catches all errors and returns a consistent JSON response. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    @Optional() private readonly httpMetricsStore?: HttpMetricsStore,
  ) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, field } = this.extractDetails(exception);

    this.logException(request.method, request.url, status, message, exception);
    if (
      status >= HttpStatus.INTERNAL_SERVER_ERROR &&
      this.httpMetricsStore &&
      !this.httpMetricsStore.shouldIgnorePath(request.originalUrl || request.url)
    ) {
      const safeMessage =
        exception instanceof Error
          ? exception.message || 'Internal server error'
          : Array.isArray(message)
            ? message.join('; ')
            : message;
      this.httpMetricsStore.recordServerError({
        occurredAt: new Date().toISOString(),
        method: request.method,
        path: (request.originalUrl || request.url).split('?')[0] || '/',
        statusCode: status,
        message: safeMessage,
        exceptionName:
          exception instanceof Error ? exception.name : 'UnknownError',
        requestId: getAuditContext()?.requestId ?? null,
      });
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(field ? { field } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractDetails(exception: unknown): ExtractedExceptionDetails {
    if (!(exception instanceof HttpException)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return { status, message: body };
    }

    if (typeof body === 'object' && body !== null) {
      const bodyObj = body as Record<string, unknown>;
      const message =
        typeof bodyObj.message === 'string' || Array.isArray(bodyObj.message)
          ? (bodyObj.message as string | string[])
          : exception.message;
      const field =
        typeof bodyObj.field === 'string' ? bodyObj.field : undefined;
      return { status, message, field };
    }

    return { status, message: exception.message };
  }

  private logException(
    method: string,
    url: string,
    status: number,
    message: string | string[],
    exception: unknown,
  ): void {
    const logMessage = Array.isArray(message) ? message.join('; ') : message;
    const logLine = `[${method}] ${url} → ${status}: ${logMessage}`;

    if (exception instanceof HttpException) {
      this.logger.warn(logLine);
      return;
    }

    const stack =
      exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(logLine, stack);
  }
}
