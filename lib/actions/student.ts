'use server';

/**
 * Students intentionally have no mutation Server Actions.
 *
 * Per the contract (§6.5, D7/D8 and the authorization matrix) a student may only
 * upload a submission, and that flow is a Route Handler (`POST /api/submissions`)
 * because it handles multipart file data and streams a response.
 *
 * The only optional student action, `updateOwnProfile`, is not implemented
 * because the institution has not approved self-service profile edits.
 * Do not add student actions for marks, attendance, enrollments, or assignments.
 */
export {};
