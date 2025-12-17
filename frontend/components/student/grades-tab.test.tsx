import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GradesTab from './grades-tab';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';

vi.mock('@/contexts/auth-context');
vi.mock('@/lib/api');

describe('GradesTab', () => {
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
    vi.mocked(api.getStudentGrades).mockImplementation(
      () => new Promise(() => {})
    );

    render(<GradesTab />);
    expect(screen.getByText(/loading grades/i)).toBeInTheDocument();
  });

  it('should display grades', async () => {
    const mockGrades = {
      submissions: [
        {
          id: 'sub-1',
          assignment_id: 'assignment-1',
          grade: 85,
          feedback: 'Good work',
          assignment_title: 'Homework 1',
          class_name: 'Math 101',
          submitted_at: '2024-01-15',
        },
      ],
      average: 85,
    };

    vi.mocked(api.getStudentGrades).mockResolvedValue({
      data: mockGrades,
    });

    render(<GradesTab />);

    await waitFor(() => {
      expect(screen.getByText('Homework 1')).toBeInTheDocument();
      // Check for the specific grade "85%" (not the average "85.0%")
      const gradeElements = screen.getAllByText(/85/);
      expect(gradeElements.length).toBeGreaterThan(0);
      // Verify at least one element contains exactly "85%" or "85 %"
      const hasGrade85 = gradeElements.some(el => 
        el.textContent?.trim() === '85%' || 
        el.textContent?.includes('85%') ||
        el.textContent?.trim() === '85 %'
      );
      expect(hasGrade85).toBe(true);
    });
  });

  it('should display average grade', async () => {
    const mockGrades = {
      submissions: [],
      average: 87.5,
    };

    vi.mocked(api.getStudentGrades).mockResolvedValue({
      data: mockGrades,
    });

    render(<GradesTab />);

    await waitFor(() => {
      expect(screen.getByText(/87.5/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no grades', async () => {
    vi.mocked(api.getStudentGrades).mockResolvedValue({
      data: { submissions: [], average: 0 },
    });

    render(<GradesTab />);

    await waitFor(() => {
      expect(screen.getByText(/no grades yet/i)).toBeInTheDocument();
    });
  });
});

