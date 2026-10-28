import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExtractedExceptionDetails {
  status: number;
  message: string | string[];
  field?: string;
}

/** Global HTTP exception filter — catches all errors and returns a consistent JSON response. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, field } = this.extractDetails(exception);

    this.logException(request.method, request.url, status, message, exception);

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
