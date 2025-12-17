'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClassesTab from '@/components/teacher/classes-tab';
import AssignmentsTab from '@/components/teacher/assignments-tab';
import GradingTab from '@/components/teacher/grading-tab';

export default function TeacherPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'teacher') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'teacher') {
    return null;
  }

  return (
    <DashboardLayout title="Teacher Dashboard">
      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
        </TabsList>
        <TabsContent value="classes" className="space-y-4">
          <ClassesTab />
        </TabsContent>
        <TabsContent value="assignments" className="space-y-4">
          <AssignmentsTab />
        </TabsContent>
        <TabsContent value="grading" className="space-y-4">
          <GradingTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

