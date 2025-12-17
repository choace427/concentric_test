import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardLayout from './dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';

vi.mock('@/contexts/auth-context');
vi.mock('next/navigation');

describe('DashboardLayout', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'student' as const,
  };

  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
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
    vi.mocked(useRouter).mockReturnValue(mockRouter as never);
    vi.mocked(usePathname).mockReturnValue('/student');
  });

  it('should render title', () => {
    render(<DashboardLayout title="Test Dashboard">Content</DashboardLayout>);
    expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(<DashboardLayout title="Test">Test Content</DashboardLayout>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display user name and email', async () => {
    const user = userEvent.setup();
    render(<DashboardLayout title="Test">Content</DashboardLayout>);
    
    // Open dropdown to see user info
    const avatarButtons = screen.getAllByRole('button');
    const avatarButton = avatarButtons.find(btn => btn.className.includes('rounded-full'));
    if (avatarButton) {
      await user.click(avatarButton);
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    }
  });

  it('should display user initials in avatar', () => {
    render(<DashboardLayout title="Test">Content</DashboardLayout>);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('should handle logout', async () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: mockLogout,
      handleOAuthCallback: vi.fn(),
    } as never);

    const user = userEvent.setup();
    render(<DashboardLayout title="Test">Content</DashboardLayout>);

    // Open dropdown menu - find the avatar button (rounded-full class)
    const avatarButtons = screen.getAllByRole('button');
    const avatarButton = avatarButtons.find(btn => btn.className.includes('rounded-full')) || avatarButtons[avatarButtons.length - 1];
    await user.click(avatarButton);

    // Wait for dropdown to open and click logout
    await waitFor(() => {
      const logoutButton = screen.getByText('Log out');
      expect(logoutButton).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Log out');
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('should show correct dashboard path for admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, role: 'admin' },
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      handleOAuthCallback: vi.fn(),
    } as never);

    render(<DashboardLayout title="Test">Content</DashboardLayout>);
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/admin');
  });

  it('should show correct dashboard path for teacher', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, role: 'teacher' },
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      handleOAuthCallback: vi.fn(),
    } as never);

    render(<DashboardLayout title="Test">Content</DashboardLayout>);
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/teacher');
  });

  it('should show correct dashboard path for student', () => {
    render(<DashboardLayout title="Test">Content</DashboardLayout>);
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/student');
  });
});

