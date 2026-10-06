/**
 * Supplementary profile fields not covered by `types/auth.types.ts`'s `User` (name/email/role -
 * already available, real, from the auth session; deliberately not duplicated here). None of
 * these have a backend field yet except `mobileNumber` (maps to the real `User.mobile` - see
 * backend/prisma/schema.prisma) and `designation` (closest analog: `User.department`, nullable
 * today) - both still placeholder here since nothing in the current auth contract exposes them to
 * the mobile app yet. `employeeId`/`assignedHub` have no backend equivalent at all.
 */
export interface TechnicianProfile {
  employeeId: string;
  assignedHub: string;
  designation: string;
  mobileNumber: string;
  profilePhotoUrl: string | null;
}
