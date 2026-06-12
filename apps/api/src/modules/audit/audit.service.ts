import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface AuditEntry {
  actorUserId?: string;
  actorRole?: Role;
  onBehalfOfUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  requestId?: string;
}

/**
 * Append-only audit trail for privileged mutations. Best-effort: an audit
 * write failure is logged but never blocks the business operation (the
 * StatusHistory table remains the hard audit source for case transitions,
 * written transactionally).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.auditLog.create({
        data: {
          actorUserId: entry.actorUserId,
          actorRole: entry.actorRole,
          onBehalfOfUserId: entry.onBehalfOfUserId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: entry.before === undefined ? undefined : (entry.before as Prisma.InputJsonValue),
          after: entry.after === undefined ? undefined : (entry.after as Prisma.InputJsonValue),
          ipAddress: entry.ipAddress,
          requestId: entry.requestId,
        },
      });
    } catch (err) {
      if (tx) throw err; // inside a transaction, audit is mandatory
      this.logger.error(`Audit write failed for ${entry.action} ${entry.entityType}/${entry.entityId}`);
    }
  }
}
