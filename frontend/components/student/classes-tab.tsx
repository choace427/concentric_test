'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookOpen, User } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  teacher_name: string;
  enrolled_at: string;
}

export default function ClassesTab() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const response = await api.getStudentClasses();
        if (response.data?.classes) {
          setClasses(response.data.classes);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2 text-white">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
            My Classes
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            View all your enrolled classes
          </p>
        </div>
      </div>
      {classes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No classes enrolled</h3>
            <p className="text-muted-foreground text-sm">
              Your teacher will assign you to classes soon
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className="hover:border-primary/50 group overflow-hidden border-2 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <CardHeader>
                <CardTitle className="group-hover:text-primary mb-2 text-xl transition-colors">
                  {cls.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-[3rem]">
                  {cls.description || 'No description available'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                    <User className="text-primary h-5 w-5" />
                    <div>
                      <p className="text-muted-foreground text-xs">Teacher</p>
                      <p className="text-sm font-semibold">
                        {cls.teacher_name}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-muted-foreground text-xs">
                      Enrolled: {new Date(cls.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
