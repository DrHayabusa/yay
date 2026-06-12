import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Attaches a request id before guards/pipes run so every response —
 * including auth rejections — carries one for tracing.
 */
export function requestIdMiddleware(
  req: Request & { requestId?: string },
  res: Response,
  next: NextFunction,
): void {
  const id = (req.headers['x-request-id'] as string | undefined) ?? `req_${randomUUID()}`;
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
