import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * Consistent error envelope:
 * { statusCode, error, message, details?, requestId }
 * Never leaks stack traces, SQL, or personal data to the client.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = Array.isArray(b.message)
          ? (b.message as string[]).join('; ')
          : String(b.message ?? exception.message);
        error = String(b.error ?? defaultCode(status));
        details = b.details;
        if (Array.isArray(b.message)) {
          error = 'VALIDATION_FAILED';
          details = b.message;
        }
      }
    } else {
      // Log full internals server-side only — no PII in the message line.
      this.logger.error(
        `Unhandled exception (requestId=${requestId})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({ statusCode: status, error, message, details, requestId });
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_FAILED';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'ERROR';
  }
}
