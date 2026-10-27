import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** Global HTTP exception filter — catches all errors and returns a consistent JSON response. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = 'Internal server error';
    let field: string | undefined;

    if (exception instanceof HttpException) {
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        if (
          typeof bodyObj.message === 'string' ||
          Array.isArray(bodyObj.message)
        ) {
          message = bodyObj.message as string | string[];
        } else {
          message = exception.message;
        }

        if (typeof bodyObj.field === 'string') {
          field = bodyObj.field;
        }
      } else {
        message = exception.message;
      }
    }

    const logMessage = Array.isArray(message) ? message.join('; ') : message;

    if (exception instanceof HttpException) {
      this.logger.warn(
        `[${request.method}] ${request.url} → ${status}: ${logMessage}`,
      );
    } else {
      this.logger.error(
        `[${request.method}] ${request.url} → ${status}: ${logMessage}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
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
}
