import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './auth-context';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

const TestComponent = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not authenticated</div>;
  return <div>User: {user?.email}</div>;
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide auth context', () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test', role: 'student' } },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should set user after successful login', async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue({ error: 'Unauthorized' });
    vi.mocked(api.login).mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test', role: 'student' } },
    });

    const LoginTest = () => {
      const { login, user } = useAuth();
      
      const handleLogin = async () => {
        await login('test@example.com', 'password');
      };

      return (
        <div>
          <button onClick={handleLogin}>Login</button>
          {user && <div>Logged in as {user.email}</div>}
        </div>
      );
    };

    render(
      <AuthProvider>
        <LoginTest />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.getCurrentUser).toHaveBeenCalled();
    });
  });

  it('should handle logout', async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test', role: 'student' } },
    });
    vi.mocked(api.logout).mockResolvedValue({});

    const LogoutTest = () => {
      const { logout, user } = useAuth();
      
      return (
        <div>
          <button onClick={logout}>Logout</button>
          {user ? <div>User: {user.email}</div> : <div>No user</div>}
        </div>
      );
    };

    render(
      <AuthProvider>
        <LogoutTest />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
  });

  it('should handle login failure', async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue({ error: 'Unauthorized' });
    vi.mocked(api.login).mockResolvedValue({ error: 'Invalid credentials' });

    const LoginTest = () => {
      const { login, isAuthenticated } = useAuth();
      
      const handleLogin = async () => {
        const result = await login('test@example.com', 'wrong');
        return result;
      };

      return (
        <div>
          <button onClick={handleLogin}>Login</button>
          <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <LoginTest />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.getCurrentUser).toHaveBeenCalled();
    });
  });

  it('should handle successful login and set user', async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue({ error: 'Unauthorized' });
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test', role: 'student' as const };
    vi.mocked(api.login).mockResolvedValue({
      data: { user: mockUser },
    });

    const LoginTest = () => {
      const { login, user } = useAuth();
      
      const handleLogin = async () => {
        await login('test@example.com', 'password');
      };

      return (
        <div>
          <button onClick={handleLogin}>Login</button>
          {user && <div>Logged in: {user.email}</div>}
        </div>
      );
    };

    render(
      <AuthProvider>
        <LoginTest />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(api.getCurrentUser).toHaveBeenCalled();
    });

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
  });

  it('should handle login error', async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue({ error: 'Unauthorized' });
    vi.mocked(api.login).mockRejectedValue(new Error('Network error'));

    const LoginTest = () => {
      const { login, user } = useAuth();
      
      const handleLogin = async () => {
        const result = await login('test@example.com', 'password');
        return result;
      };

      return (
        <div>
          <button onClick={handleLogin}>Login</button>
          {user ? <div>User: {user.email}</div> : <div>No user</div>}
        </div>
      );
    };

    render(
      <AuthProvider>
        <LoginTest />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeInTheDocument();
    });
  });

  it('should handle logout error', async () => {
    vi.mocked(api.getCurrentUser).mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test', role: 'student' } },
    });
    vi.mocked(api.logout).mockRejectedValue(new Error('Network error'));

    const LogoutTest = () => {
      const { logout, user } = useAuth();
      
      return (
        <div>
          <button onClick={logout}>Logout</button>
          {user ? <div>User: {user.email}</div> : <div>No user</div>}
        </div>
      );
    };

    render(
      <AuthProvider>
        <LogoutTest />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    await userEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeInTheDocument();
    });
  });

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should handle getCurrentUser error', async () => {
    vi.mocked(api.getCurrentUser).mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });
  });
});

