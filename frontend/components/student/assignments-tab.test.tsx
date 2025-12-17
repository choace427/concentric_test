import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentsTab from './assignments-tab';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

vi.mock('@/contexts/auth-context');
vi.mock('@/lib/api');
vi.mock('@/hooks/use-toast');

describe('AssignmentsTab', () => {
  const mockUser = {
    id: 'student-1',
    email: 'student@example.com',
    name: 'Student',
    role: 'student' as const,
  };

  const mockToast = vi.fn();

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
    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    } as never);
  });

  it('should render loading state', () => {
    vi.mocked(api.getStudentAssignments).mockImplementation(
      () => new Promise(() => {})
    );

    render(<AssignmentsTab />);
    expect(screen.getByText(/loading assignments/i)).toBeInTheDocument();
  });

  it('should display assignments', async () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        title: 'Homework 1',
        description: 'Complete exercises',
        due_date: '2024-12-31',
        published: true,
        class_name: 'Math 101',
        submitted: false,
        submitted_at: null,
      },
    ];

    vi.mocked(api.getStudentAssignments).mockResolvedValue({
      data: { assignments: mockAssignments },
    });

    render(<AssignmentsTab />);

    await waitFor(() => {
      expect(screen.getByText('Homework 1')).toBeInTheDocument();
    });
  });

  it('should show submit button for unsubmitted assignments', async () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        title: 'Homework 1',
        description: 'Complete exercises',
        due_date: '2024-12-31',
        published: true,
        class_name: 'Math 101',
        submitted: false,
        submitted_at: null,
      },
    ];

    vi.mocked(api.getStudentAssignments).mockResolvedValue({
      data: { assignments: mockAssignments },
    });

    render(<AssignmentsTab />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });
  });

  it('should not show submit button for submitted assignments', async () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        title: 'Homework 1',
        description: 'Complete exercises',
        due_date: '2024-12-31',
        published: true,
        class_name: 'Math 101',
        submitted: true,
        submitted_at: '2024-01-15',
      },
    ];

    vi.mocked(api.getStudentAssignments).mockResolvedValue({
      data: { assignments: mockAssignments },
    });

    render(<AssignmentsTab />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
      // There are multiple "Submitted" texts (badge and date), check that at least one exists
      const submittedElements = screen.getAllByText(/submitted/i);
      expect(submittedElements.length).toBeGreaterThan(0);
    });
  });

  it('should handle submission', async () => {
    const user = userEvent.setup();
    const mockAssignments = [
      {
        id: 'assignment-1',
        title: 'Homework 1',
        description: 'Complete exercises',
        due_date: '2024-12-31',
        published: true,
        class_name: 'Math 101',
        submitted: false,
        submitted_at: null,
      },
    ];

    vi.mocked(api.getStudentAssignments).mockResolvedValue({
      data: { assignments: mockAssignments },
    });
    vi.mocked(api.submitAssignment).mockResolvedValue({
      data: { submission: { id: 'sub-1' } },
    });
    // Mock the refresh call after submission
    vi.mocked(api.getStudentAssignments).mockResolvedValueOnce({
      data: { assignments: mockAssignments },
    }).mockResolvedValueOnce({
      data: { assignments: [{ ...mockAssignments[0], submitted: true, submitted_at: '2024-01-15' }] },
    });

    render(<AssignmentsTab />);

    await waitFor(() => {
      expect(screen.getByText('Homework 1')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Submit Assignment')).toBeInTheDocument();
    });

    // Fill in the submission content
    const textarea = screen.getByPlaceholderText(/enter your submission content/i);
    await user.type(textarea, 'My submission content');

    // Click the submit button in the dialog
    const dialogSubmitButton = screen.getByRole('button', { name: /^submit$/i });
    await user.click(dialogSubmitButton);

    await waitFor(() => {
      expect(api.submitAssignment).toHaveBeenCalledWith('assignment-1', 'My submission content');
    });
  });
});

