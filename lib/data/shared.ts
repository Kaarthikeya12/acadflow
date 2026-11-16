import 'server-only';
import type {
  GradeChangeDTO,
  OfferingDTO,
  PageQuery,
  Paginated,
  SessionUser,
  TermDTO,
} from '@/types/contracts';
import { AppError } from '@/lib/db/errors';
import { listTerms } from '@/lib/db/queries/admin';
import { getOfferingById } from '@/lib/db/queries/offerings';
import { requireOfferingRead } from '@/lib/authz/guards';
import { listGradeChanges } from '@/lib/db/queries/assessment';

/** Terms are visible to admins and faculty (needed for filters). */
export async function listTermsForViewer(viewer: SessionUser): Promise<TermDTO[]> {
  if (viewer.role !== 'admin' && viewer.role !== 'faculty') {
    throw new AppError('FORBIDDEN');
  }
  return listTerms();
}

/** Offering detail, scoped: admin any, faculty assigned, student enrolled. */
export async function getOfferingForViewer(
  viewer: SessionUser,
  offeringId: string,
): Promise<OfferingDTO> {
  await requireOfferingRead(offeringId, viewer);
  const offering = await getOfferingById(offeringId);
  if (!offering) throw new AppError('NOT_FOUND');
  return offering;
}

/**
 * Grade-change audit: Admin sees all; faculty see only offerings they teach.
 * Students have no access.
 */
export async function listGradeChangesForViewer(
  viewer: SessionUser,
  query: PageQuery & { offeringId?: string; studentUserId?: string; courseCode?: string } = {},
): Promise<Paginated<GradeChangeDTO>> {
  if (viewer.role === 'admin') return listGradeChanges(query);
  if (viewer.role === 'faculty') {
    return listGradeChanges({ ...query, facultyUserId: viewer.id });
  }
  throw new AppError('FORBIDDEN');
}
