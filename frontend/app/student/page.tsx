'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClassesTab from '@/components/student/classes-tab';
import AssignmentsTab from '@/components/student/assignments-tab';
import GradesTab from '@/components/student/grades-tab';

export default function StudentPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'student') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'student') {
    return null;
  }

  return (
    <DashboardLayout title="Student Dashboard">
      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">My Classes</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>
        <TabsContent value="classes" className="space-y-4">
          <ClassesTab />
        </TabsContent>
        <TabsContent value="assignments" className="space-y-4">
          <AssignmentsTab />
        </TabsContent>
        <TabsContent value="grades" className="space-y-4">
          <GradesTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

