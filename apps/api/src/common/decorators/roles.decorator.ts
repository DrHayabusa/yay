import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
/** Coarse RBAC; object-level checks still happen in every service. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
