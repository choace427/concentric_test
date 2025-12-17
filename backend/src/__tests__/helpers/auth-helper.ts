import type { JWTPayload } from '../../middleware/auth';

export function createAuthCookie(payload: JWTPayload): string {
  return `token=mock-token-${payload.userId}`;
}

export const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'admin' as const,
  suspended: false,
};

export const mockTeacherUser = {
  id: 'teacher-123',
  email: 'teacher@example.com',
  role: 'teacher' as const,
  suspended: false,
};

export const mockStudentUser = {
  id: 'student-123',
  email: 'student@example.com',
  role: 'student' as const,
  suspended: false,
};

