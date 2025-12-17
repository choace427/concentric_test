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
import { Award, TrendingUp, MessageSquare, BookOpen } from 'lucide-react';

interface Submission {
  id: string;
  assignment_id: string;
  grade: number;
  feedback: string | null;
  submitted_at: string;
  assignment_title: string;
  class_name: string;
}

export default function GradesTab() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [average, setAverage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const response = await api.getStudentGrades();
        if (response.data) {
          setSubmissions(response.data.submissions || []);
          setAverage(response.data.average || 0);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user]);

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 dark:text-green-400';
    if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
    if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading grades...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 p-2 text-white">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-3xl font-bold text-transparent">
              My Grades
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Track your academic performance
            </p>
          </div>
        </div>
        <Card className="min-w-[200px] border-2 shadow-lg">
          <div className="h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Average Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getGradeColor(average)}`}>
              {average.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {submissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No grades yet</h3>
            <p className="text-muted-foreground text-sm">
              Your assignments haven't been graded yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {submissions.map((submission) => (
            <Card
              key={submission.id}
              className="hover:border-primary/50 group overflow-hidden border-2 transition-all duration-300 hover:shadow-xl"
            >
              <div
                className={`h-2 ${
                  submission.grade >= 90
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : submission.grade >= 80
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      : submission.grade >= 70
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-red-500 to-rose-500'
                }`}
              ></div>
              <CardHeader>
                <CardTitle className="group-hover:text-primary mb-2 line-clamp-2 text-xl transition-colors">
                  {submission.assignment_title}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {submission.class_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs">
                        Grade
                      </p>
                      <p
                        className={`text-3xl font-bold ${getGradeColor(submission.grade)}`}
                      >
                        {submission.grade}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground mb-1 text-xs">
                        Submitted
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {submission.feedback && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          {submission.feedback}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
