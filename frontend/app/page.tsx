'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import LoginPage from '@/components/auth/login-page';

function OAuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (oauth === 'success') {
      // Clear query parameters by doing a full navigation
      window.location.href = '/';
    } else if (error) {
      // Show error message based on error type
      let errorMessage = 'OAuth authentication failed';
      
      switch (error) {
        case 'oauth_failed':
          errorMessage = 'OAuth authentication failed. Please try again.';
          break;
        case 'oauth_not_configured':
          errorMessage = 'OAuth is not configured. Please contact support.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to exchange authorization code. Please try again.';
          break;
        case 'user_info_failed':
          errorMessage = 'Failed to fetch user information. Please try again.';
          break;
        case 'user_suspended':
          errorMessage = 'Your account has been suspended. Please contact support.';
          break;
        case 'role_mismatch':
          errorMessage = message || 'Your account role does not match the selected role.';
          break;
        case 'oauth_error':
          errorMessage = 'An error occurred during OAuth authentication. Please try again.';
          break;
        default:
          errorMessage = message || 'An error occurred during authentication.';
      }

      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Clear query parameters
      router.replace('/');
    }
  }, [searchParams, router, toast]);

  return null;
}

function HomeContent() {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user && !loading) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else if (user.role === 'teacher') {
        router.push('/teacher');
      } else if (user.role === 'student') {
        router.push('/student');
      }
    }
  }, [isAuthenticated, user, loading, router]);

  if (isAuthenticated || loading) {
    return null;
  }

  return <LoginPage />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <OAuthHandler />
      <HomeContent />
    </Suspense>
  );
}
