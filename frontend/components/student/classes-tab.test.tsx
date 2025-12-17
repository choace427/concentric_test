import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ClassesTab from './classes-tab';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';

vi.mock('@/contexts/auth-context');
vi.mock('@/lib/api');

describe('ClassesTab', () => {
  const mockUser = {
    id: 'student-1',
    email: 'student@example.com',
    name: 'Student',
    role: 'student' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      handleOAuthCallback: vi.fn(),
    } as never);
  });

  it('should render loading state', () => {
    vi.mocked(api.getStudentClasses).mockImplementation(
      () => new Promise(() => {})
    );

    render(<ClassesTab />);
    expect(screen.getByText('Loading classes...')).toBeInTheDocument();
  });

  it('should display classes', async () => {
    const mockClasses = [
      {
        id: 'class-1',
        name: 'Math 101',
        description: 'Mathematics',
        teacher_id: 'teacher-1',
        teacher_name: 'Teacher',
        enrolled_at: '2024-01-01',
      },
    ];

    vi.mocked(api.getStudentClasses).mockResolvedValue({
      data: { classes: mockClasses },
    });

    render(<ClassesTab />);

    await waitFor(() => {
      expect(screen.getByText('Math 101')).toBeInTheDocument();
    });
  });

  it('should display empty state when no classes', async () => {
    vi.mocked(api.getStudentClasses).mockResolvedValue({
      data: { classes: [] },
    });

    render(<ClassesTab />);

    await waitFor(() => {
      expect(screen.getByText('No classes enrolled')).toBeInTheDocument();
    });
  });

  it('should not fetch when user is not available', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      handleOAuthCallback: vi.fn(),
    } as never);

    render(<ClassesTab />);

    expect(api.getStudentClasses).not.toHaveBeenCalled();
  });
});

