import 'server-only';
import type { z } from 'zod';
import type { ActionResult, Role } from '@/types/contracts';
import { AppError, mapPgError } from '@/lib/db/errors';
import { logServerError, newRequestId } from '@/lib/log';
import { requireUser } from '@/lib/authz/guards';
import { can, type Capability } from '@/lib/authz/matrix';
import type { SessionUser } from '@/types/contracts';
import type { PoolClient } from 'pg';

export function zodToFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    const list = fieldErrors[key] ?? [];
    list.push(issue.message);
    fieldErrors[key] = list;
  }
  return fieldErrors;
}

export function parseInput<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Check the highlighted fields.', {
      fieldErrors: zodToFieldErrors(result.error),
    });
  }
  return result.data;
}

export type ActionContext = {
  user: SessionUser;
  requestId: string;
  client: PoolClient | null;
};

type RunActionOptions<T> = {
  action: string;
  handler: (ctx: ActionContext) => Promise<T>;
  /** Role gate. When omitted, any signed-in user may call the action. */
  roles?: Role[];
  capability?: Capability;
};

/**
 * Runs a server action with the standard pipeline:
 * authenticate -> authorize -> handler -> ActionResult envelope.
 * Never returns raw PostgreSQL messages.
 */
export async function runAction<T>(options: RunActionOptions<T>): Promise<ActionResult<T>> {
  const requestId = newRequestId();
  try {
    const user = await requireUser();

    if (options.roles && !options.roles.includes(user.role)) {
      throw new AppError('FORBIDDEN');
    }
    if (options.capability && !can(user.role, options.capability)) {
      throw new AppError('FORBIDDEN');
    }

    const data = await options.handler({ user, requestId, client: null });
    return { ok: true, data };
  } catch (error) {
    const appError = error instanceof AppError ? error : mapPgError(error, requestId);
    if (appError.code === 'INTERNAL') {
      logServerError(requestId, `Action failed: ${options.action}`, {
        code: appError.code,
        cause: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        fieldErrors: appError.fieldErrors,
        requestId,
      },
    };
  }
}

export function actionFailure(
  error: AppError,
  requestId: string,
): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
      requestId,
    },
  };
}
