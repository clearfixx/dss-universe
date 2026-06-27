# Imports Standard

Imports should be grouped and easy to scan.

## Order

1. Node.js built-ins
2. Third-party packages
3. Workspace aliases
4. Relative imports
5. Type-only imports where appropriate

Example:

```ts
import fs from 'node:fs';

import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '@api/database';

import { UserEntity } from '../entities/user.entity';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
Exports

Prefer explicit exports.

Good:

export { AuthCoreModule } from './auth-core.module';
export { Authenticated } from './decorators/authenticated.decorator';
export type { AuthenticatedUser } from './types/authenticated-user.type';

Avoid:

export * from './auth-core.module';
```
