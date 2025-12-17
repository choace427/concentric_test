'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Calendar, BookOpen } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string;
  published: boolean;
  class_name: string;
  submitted: boolean;
  submitted_at: string | null;
}

export default function AssignmentsTab() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const response = await api.getStudentAssignments();
        if (response.data?.assignments) {
          setAssignments(response.data.assignments);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load assignments',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user, toast]);

  const handleSubmit = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setIsSubmitDialogOpen(true);
  };

  const handleSaveSubmission = async () => {
    if (!selectedAssignment || !user || !submissionContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter submission content',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.submitAssignment(
        selectedAssignment.id,
        submissionContent
      );

      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Assignment submitted successfully',
      });

      setIsSubmitDialogOpen(false);
      setSelectedAssignment(null);
      setSubmissionContent('');

      const refreshResponse = await api.getStudentAssignments();
      if (refreshResponse.data?.assignments) {
        setAssignments(refreshResponse.data.assignments);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit assignment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 p-2 text-white">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h2 className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent">
            Assignments
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            View and submit your assignments
          </p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No assignments yet</h3>
            <p className="text-muted-foreground text-sm">
              Your teacher hasn't assigned any work yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => {
            const dueDate = new Date(assignment.due_date);
            const isOverdue =
              dueDate < new Date() &&
              !assignment.submitted &&
              assignment.published;
            const daysUntilDue = Math.ceil(
              (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <Card
                key={assignment.id}
                className="hover:border-primary/50 group overflow-hidden border-2 transition-all duration-300 hover:shadow-xl"
              >
                <div
                  className={`h-2 ${
                    assignment.submitted
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : isOverdue
                        ? 'bg-gradient-to-r from-red-500 to-rose-500'
                        : daysUntilDue <= 3
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
                  }`}
                ></div>
                <CardHeader>
                  <CardTitle className="group-hover:text-primary mb-2 line-clamp-2 text-xl transition-colors">
                    {assignment.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {assignment.class_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                      <Calendar
                        className={`h-5 w-5 ${isOverdue ? 'text-red-600' : 'text-primary'}`}
                      />
                      <div>
                        <p
                          className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : ''}`}
                        >
                          Due: {dueDate.toLocaleDateString()}
                        </p>
                        {!assignment.submitted && assignment.published && (
                          <p className="text-muted-foreground text-xs">
                            {isOverdue
                              ? 'Overdue'
                              : daysUntilDue === 0
                                ? 'Due today'
                                : daysUntilDue === 1
                                  ? 'Due tomorrow'
                                  : `${daysUntilDue} days left`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          assignment.submitted
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : assignment.published
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {assignment.submitted
                          ? '✓ Submitted'
                          : assignment.published
                            ? 'Pending'
                            : 'Draft'}
                      </span>

                      {assignment.published && !assignment.submitted && (
                        <Button
                          onClick={() => handleSubmit(assignment)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          size="sm"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Submit
                        </Button>
                      )}
                      {assignment.submitted && (
                        <span className="text-muted-foreground text-xs">
                          Submitted{' '}
                          {assignment.submitted_at
                            ? new Date(
                                assignment.submitted_at
                              ).toLocaleDateString()
                            : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Submit Assignment</DialogTitle>
            <DialogDescription className="text-base">
              {selectedAssignment?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Description</Label>
              <div className="bg-muted/50 min-h-[4rem] rounded-lg border p-4">
                {selectedAssignment?.description || 'No description provided'}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className="text-base font-semibold">
                Your Submission
              </Label>
              <Textarea
                id="content"
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Enter your submission content..."
                className="min-h-[8rem]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubmitDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSubmission}
              disabled={submitting || !submissionContent.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
