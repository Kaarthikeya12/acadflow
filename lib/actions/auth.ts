'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import type { ActionResult } from '@/types/contracts';
import { signIn, signOut } from '@/lib/auth/config';
import { findCredentialUserByEmail } from '@/lib/db/queries/auth';
import { insertUser } from '@/lib/db/queries/admin';
import { loginSchema, registerStudentSchema } from '@/lib/validation/schemas';
import { zodToFieldErrors } from './helpers';
import { newRequestId } from '@/lib/log';
import { roleHomePath } from '@/lib/auth/role-home';
import { hashPassword } from '@/lib/auth/password';
import { AppError, mapPgError } from '@/lib/db/errors';
import { withTransaction } from '@/lib/db/transaction';
import {
  clearLoginFailures,
  isRateLimited,
  loginRateKey,
  recordLoginFailure,
} from '@/lib/auth/rate-limit';

const GENERIC_AUTH_MESSAGE = 'Invalid email or password.';

export async function loginAction(
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const requestId = newRequestId();
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields.',
        fieldErrors: zodToFieldErrors(parsed.error),
        requestId,
      },
    };
  }

  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'local';
  const rateKey = loginRateKey(parsed.data.email, ip);

  if (isRateLimited(rateKey)) {
    return {
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many sign-in attempts. Try again in a few minutes.',
        requestId,
      },
    };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      recordLoginFailure(rateKey);
      return {
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: GENERIC_AUTH_MESSAGE, requestId },
      };
    }
    throw error;
  }

  const user = await findCredentialUserByEmail(parsed.data.email);
  if (!user || !user.isActive) {
    return {
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: GENERIC_AUTH_MESSAGE, requestId },
    };
  }

  clearLoginFailures(rateKey);
  redirect(roleHomePath(user.role));
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}

/**
 * Public student self-registration.
 *
 * The institution may provision accounts centrally, but students are allowed to
 * create their own student account so they can join an active roster. Only the
 * `student` role can be created here; faculty and admin accounts stay admin-only.
 */
export async function registerStudentAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const requestId = newRequestId();
  const parsed = registerStudentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields.',
        fieldErrors: zodToFieldErrors(parsed.error),
        requestId,
      },
    };
  }

  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'local';
  const rateKey = `signup::${ip}`;

  if (isRateLimited(rateKey)) {
    return {
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many accounts were created from this connection. Try again later.',
        requestId,
      },
    };
  }

  const { confirmPassword: _confirmPassword, termsAccepted: _terms, ...data } = parsed.data;
  void _confirmPassword;
  void _terms;

  let userId: string;
  try {
    const passwordHash = await hashPassword(data.password);
    // A pre-generated id lets the transaction carry an actor context even though
    // the user is not signed in yet. The audit trigger is not involved here.
    userId = crypto.randomUUID();
    await withTransaction({ actorUserId: userId, requestId }, (client) =>
      insertUser(client, {
        id: userId,
        role: 'student',
        email: data.email,
        fullName: data.fullName,
        passwordHash,
        departmentId: data.departmentId,
        rollNo: data.rollNo,
        admissionYear: data.admissionYear,
        program: data.program,
        batch: data.batch ?? null,
      }),
    );
  } catch (error) {
    recordLoginFailure(rateKey);
    const appError = error instanceof AppError ? error : mapPgError(error, requestId);
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

  try {
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    // The account exists; send the student to the login page instead.
    redirect('/login?created=1');
  }

  clearLoginFailures(rateKey);
  redirect('/student/dashboard');
}
