/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API Timing Diagnostics
 * 📄 File: apps/api/test/helpers/iam-permission-timing.fixture.ts
 *
 * 🎯 Purpose:
 * Captures opt-in IAM denial timing while real authority and IO remain active.
 *
 * 🧠 Responsibilities:
 * • observes bounded owner/Redis spans without recording arguments or results;
 * • compares wall and monotonic clocks, process CPU and event-loop delay;
 * • restores observations and preserves one report after success or deadline.
 *
 * ⚠️ Important:
 * No Auth/SQL results are substituted; original values and error identities return.
 * No sleeps, retries, deadline changes or debugger connections.
 * Runtime never imports this test fixture.
 * Pending calls remain pending; this fixture does not cancel or await them.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import type IORedis from 'ioredis';
import { writeFileSync } from 'node:fs';
import { url as inspectorUrl } from 'node:inspector';
import { resolve, sep } from 'node:path';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { PrismaService } from '@api/core/database';
import { REDIS_CONNECTION } from '@api/core/cache';
import {
  ACCESS_SESSION_VALIDATOR,
  type AccessSessionValidator,
} from '../../src/core/auth/contracts/access-session-validator.interface';
import {
  REQUEST_ACCESS_READER,
  type RequestAccessReader,
} from '../../src/core/auth/contracts/request-access-reader.interface';
import { PermissionsGuard } from '../../src/core/authorization/guards/permissions.guard';

type Span = {
  label: string;
  startWallMs: number;
  startMonotonicMs: number;
  settlement: 'pending' | 'settled' | 'rejected';
  wallMs?: number;
  monotonicMs?: number;
};

export function startIamPermissionTiming(app: INestApplication) {
  if (process.env.DSS_IAM_E2E_DIAGNOSTIC !== '1') return undefined;
  const output = resolve(process.env.DSS_IAM_E2E_REPORT ?? '');
  const cache = resolve(__dirname, '../../../../node_modules/.cache');
  if (!output.startsWith(cache + sep) || !output.endsWith('.json'))
    throw new Error(
      'Expected a unique diagnostic JSON path in workspace cache.',
    );

  const startWallMs = Date.now();
  const startMonotonicMs = performance.now();
  const initialCpu = process.cpuUsage();
  const delay = monitorEventLoopDelay({ resolution: 20 });
  delay.enable();
  const spans: Span[] = [];
  const checkpoints: { label: string; wallMs: number; monotonicMs: number }[] =
    [];
  const restore: (() => void)[] = [];
  let closed = false;
  let droppedSpans = 0;
  let queryCount = 0;
  let driverQueryMs = 0;
  let maxDriverQueryMs = 0;
  const redis = app.get<IORedis>(REDIS_CONNECTION);
  const redisSnapshot = () => ({
    status: redis.status,
    queued: redis.commandQueue.length,
  });
  const initialRedis = redisSnapshot();

  function checkpoint(label: string) {
    if (closed || checkpoints.length >= 64) return;
    checkpoints.push({
      label,
      wallMs: Date.now() - startWallMs,
      monotonicMs: performance.now() - startMonotonicMs,
    });
  }

  function observe<T>(label: string, work: () => T): T {
    if (closed) return work();
    if (spans.length >= 512) {
      droppedSpans += 1;
      return work();
    }
    const span: Span = {
      label,
      startWallMs: Date.now() - startWallMs,
      startMonotonicMs: performance.now() - startMonotonicMs,
      settlement: 'pending',
    };
    spans.push(span);
    const end = (settlement: 'settled' | 'rejected') => {
      if (closed) return;
      span.settlement = settlement;
      span.wallMs = Date.now() - startWallMs - span.startWallMs;
      span.monotonicMs =
        performance.now() - startMonotonicMs - span.startMonotonicMs;
    };
    try {
      const result = work();
      if (
        result !== null &&
        typeof result === 'object' &&
        'then' in result &&
        typeof result.then === 'function'
      ) {
        void (result as PromiseLike<unknown>).then(
          () => end('settled'),
          () => end('rejected'),
        );
      } else end('settled');
      return result;
    } catch (error) {
      end('rejected');
      throw error;
    }
  }

  const sessions = app.get<AccessSessionValidator>(ACCESS_SESSION_VALIDATOR);
  const isActive = sessions.isActive.bind(
    sessions,
  ) as AccessSessionValidator['isActive'];
  const sessionSpy = jest
    .spyOn(sessions, 'isActive')
    .mockImplementation((claim) =>
      observe('auth.session.is-active', () => isActive(claim)),
    );
  restore.push(() => sessionSpy.mockRestore());
  const access = app.get<RequestAccessReader>(REQUEST_ACCESS_READER);
  const readAccess = access.readForSubject.bind(
    access,
  ) as RequestAccessReader['readForSubject'];
  const accessSpy = jest
    .spyOn(access, 'readForSubject')
    .mockImplementation((id) =>
      observe('authorization.request.read', () => readAccess(id)),
    );
  restore.push(() => accessSpy.mockRestore());
  const send = redis.sendCommand.bind(redis) as IORedis['sendCommand'];
  const redisSpy = jest
    .spyOn(redis, 'sendCommand')
    .mockImplementation((...args) =>
      observe('redis.command', () => send(...args)),
    );
  restore.push(() => redisSpy.mockRestore());
  // Preserve the original method before spying; invoke it with each actual guard.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const decide = PermissionsGuard.prototype.canActivate;
  const guardSpy = jest
    .spyOn(PermissionsGuard.prototype, 'canActivate')
    .mockImplementation(function (this: PermissionsGuard, context) {
      return observe(
        'authorization.guard.decide',
        () => decide.call(this, context) as boolean,
      );
    });
  restore.push(() => guardSpy.mockRestore());
  app.get(PrismaService).$on('query', ({ duration }) => {
    if (closed) return;
    queryCount += 1;
    driverQueryMs += duration;
    maxDriverQueryMs = Math.max(maxDriverQueryMs, duration);
  });

  return {
    checkpoint,
    stop() {
      if (closed) return;
      const wallMs = Date.now() - startWallMs;
      const monotonicMs = performance.now() - startMonotonicMs;
      const cpu = process.cpuUsage(initialCpu);
      closed = true;
      delay.disable();
      for (const reset of restore) reset();
      const report = {
        wallMs,
        monotonicMs,
        wallMinusMonotonicMs: wallMs - monotonicMs,
        cpuUserMs: cpu.user / 1000,
        cpuSystemMs: cpu.system / 1000,
        eventLoop: { samples: delay.count, maxMs: delay.max / 1_000_000 },
        execution: {
          inspectorListening: Boolean(inspectorUrl()),
          inspectFlag: process.execArgv.some((arg) =>
            arg.startsWith('--inspect'),
          ),
          debugAutoAttachHintPresent: Boolean(
            process.env.VSCODE_INSPECTOR_OPTIONS,
          ),
        },
        redis: { initial: initialRedis, final: redisSnapshot() },
        prisma: { queryCount, driverQueryMs, maxDriverQueryMs },
        droppedSpans,
        checkpoints,
        spans,
        causeEstablished: false,
      };
      writeFileSync(output, JSON.stringify(report, null, 2) + '\n', {
        flag: 'wx',
      });
    },
  };
}
