'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TeacherGroupsTab from '@/components/admin/teacher-groups-tab';
import UsersTab from '@/components/admin/users-tab';
import StatsTab from '@/components/admin/stats-tab';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teacher-groups">Teacher Groups</TabsTrigger>
        </TabsList>
        <TabsContent value="stats" className="space-y-4">
          <StatsTab />
        </TabsContent>
        <TabsContent value="users" className="space-y-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="teacher-groups" className="space-y-4">
          <TeacherGroupsTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
